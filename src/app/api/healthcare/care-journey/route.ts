import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { buildCareJourneySequence, calculateSendAt } from '@/lib/healthcare/care-journey'
import { engineSendText } from '@/lib/flows/meta-send'
import { supabaseAdmin } from '@/lib/ai/admin-client'

/**
 * POST /api/healthcare/care-journey
 *
 * Triggers a personalized post-consultation care journey for a patient.
 * Creates the scheduled message sequence in the DB and sends the Day 0
 * message immediately via WhatsApp.
 *
 * Body:
 *   - clinical_note_id: string (required)
 *   - contact_id: string (required)
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`healthcare-journey:${userId}`, RATE_LIMITS.send)
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    if (!body?.clinical_note_id || !body?.contact_id) {
      return NextResponse.json(
        { error: 'clinical_note_id and contact_id are required' },
        { status: 400 },
      )
    }

    const { clinical_note_id, contact_id } = body

    // Fetch the clinical note
    const { data: note } = await supabase
      .from('clinical_notes')
      .select('id, soap_note, ai_suggestions, action_items, note_type, status')
      .eq('id', clinical_note_id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (!note) {
      return NextResponse.json({ error: 'Clinical note not found' }, { status: 404 })
    }

    // Fetch contact (patient) info
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, name, phone_number')
      .eq('id', contact_id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Fetch account info
    const { data: account } = await supabase
      .from('accounts')
      .select('name, vertical_type, vertical_config')
      .eq('id', accountId)
      .maybeSingle()

    const vertical =
      account?.vertical_type === 'dentist' ? 'dentist' :
      account?.vertical_type === 'medspa' ? 'medspa' : 'general'

    // Fetch WhatsApp config for sending
    const { data: waConfig } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, phone_number')
      .eq('account_id', accountId)
      .maybeSingle()

    if (!waConfig) {
      return NextResponse.json(
        { error: 'WhatsApp is not configured for this account' },
        { status: 422 },
      )
    }

    // Determine journey parameters from note analysis
    const hasMedications = (note.ai_suggestions ?? []).some(
      (s: { type: string }) => s.type === 'medication'
    )
    const hasFollowUp = (note.ai_suggestions ?? []).some(
      (s: { type: string }) => s.type === 'follow_up'
    ) || (note.action_items ?? []).some(
      (a: { text: string }) => a.text.toLowerCase().includes('follow-up') || a.text.toLowerCase().includes('follow up')
    )

    const consultationSummary = note.soap_note?.plan
      ? `Assessment: ${note.soap_note.assessment ?? ''}\n\nPlan: ${note.soap_note.plan}`
      : 'Thank you for your consultation today.'

    // Build the care journey sequence
    const clinicPhone = (account?.vertical_config as Record<string, string>)?.clinic_phone ?? waConfig.phone_number ?? ''
    const sequence = buildCareJourneySequence({
      vertical,
      patientName: contact.name,
      clinicName: account?.name ?? 'Your Clinic',
      consultationSummary,
      serviceType: note.note_type,
      hasMedications,
      hasFollowUpRequired: hasFollowUp,
      clinicPhone,
    })

    const now = new Date()

    // Calculate absolute send timestamps for each message
    const messagesWithTimes = sequence.messages.map((msg) => ({
      ...msg,
      scheduledAt: calculateSendAt(now, msg.dayOffset).toISOString(),
    }))

    // Determine next_send_at (first pending message after Day 0)
    const pendingAfterDay0 = messagesWithTimes.filter((m) => m.dayOffset > 0)
    const nextSendAt = pendingAfterDay0.length > 0 ? pendingAfterDay0[0].scheduledAt : null

    // Create the care journey record
    const { data: journey, error: journeyErr } = await supabase
      .from('care_journey_messages')
      .insert({
        account_id: accountId,
        contact_id,
        clinical_note_id,
        message_sequence: messagesWithTimes,
        status: 'active',
        next_send_at: nextSendAt,
      })
      .select()
      .single()

    if (journeyErr) {
      console.error('[healthcare/care-journey POST]', journeyErr)
      return NextResponse.json({ error: 'Failed to create care journey' }, { status: 500 })
    }

    // Send Day 0 message immediately via WhatsApp
    const day0Message = sequence.messages.find((m) => m.dayOffset === 0)
    if (day0Message && contact.phone_number) {
      try {
        const db = supabaseAdmin()
        const { data: fullConfig } = await db
          .from('whatsapp_config')
          .select('access_token, phone_number_id')
          .eq('account_id', accountId)
          .maybeSingle()

        if (fullConfig) {
          const { data: conv } = await db
            .from('conversations')
            .select('id')
            .eq('account_id', accountId)
            .eq('contact_id', contact_id)
            .maybeSingle()

          if (conv) {
            await engineSendText({
              accountId,
              userId,
              conversationId: conv.id,
              contactId: contact_id,
              text: day0Message.messageText,
            })
          }

          // Mark Day 0 as sent in the sequence
          const updatedSequence = messagesWithTimes.map((m) =>
            m.dayOffset === 0 ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m,
          )
          await supabase
            .from('care_journey_messages')
            .update({ message_sequence: updatedSequence })
            .eq('id', journey.id)
        }
      } catch (sendErr) {
        console.error('[healthcare/care-journey] Day 0 send failed:', sendErr)
        // Non-fatal — journey is still created, Day 0 failed but rest continues
      }
    }

    // Mark the note as complete
    await supabase
      .from('clinical_notes')
      .update({ status: 'complete' })
      .eq('id', clinical_note_id)
      .eq('account_id', accountId)

    return NextResponse.json({ journey, success: true }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * GET /api/healthcare/care-journey
 * List care journeys, optionally filtered by contact_id.
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('viewer')
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contact_id')

    let query = supabase
      .from('care_journey_messages')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (contactId) query = query.eq('contact_id', contactId)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch care journeys' }, { status: 500 })
    }

    return NextResponse.json({ journeys: data ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}
