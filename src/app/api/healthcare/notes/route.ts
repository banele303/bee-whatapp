import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { localNotesStore } from '@/lib/healthcare/notes-store'

/**
 * GET /api/healthcare/notes
 * List clinical notes for the account. Supports filtering by contact_id,
 * note_type, status, and pagination.
 */
export async function GET(request: Request) {
  let accountId: string | undefined
  const { searchParams } = new URL(request.url)
  const contactId = searchParams.get('contact_id')
  const noteType = searchParams.get('note_type')
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    const auth = await requireRole('viewer').catch(() => null)
    if (auth) {
      accountId = auth.accountId
      const { supabase } = auth

      let query = supabase
        .from('clinical_notes')
        .select(
          `id, title, note_type, status, tags, created_at, updated_at, clinician_id,
           contact_id, appointment_id, conversation_id, pdf_url,
           soap_note, ai_suggestions, action_items, red_flags`,
          { count: 'exact' }
        )
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (contactId) query = query.eq('contact_id', contactId)
      if (noteType) query = query.eq('note_type', noteType)
      if (status) query = query.eq('status', status)

      const { data, error, count } = await query

      if (!error && data && data.length > 0) {
        return NextResponse.json({ notes: data, total: count ?? data.length })
      }
    }
  } catch (err) {
    console.warn('[healthcare/notes GET fallback]', err)
  }

  // Fallback to local persistent store if Supabase table is not migrated or unavailable
  const localResult = localNotesStore.list(accountId, { contactId, noteType, status, limit, offset })
  return NextResponse.json({ notes: localResult.notes, total: localResult.total })
}

/**
 * POST /api/healthcare/notes
 * Create a new clinical note.
 */
export async function POST(request: Request) {
  let accountId = 'default-account'
  let userId = 'default-user'

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Request body required' }, { status: 400 })
  }

  const {
    title = 'Consultation Note',
    note_type = 'consultation',
    contact_id,
    appointment_id,
    conversation_id,
    raw_transcript,
    soap_note,
    ai_suggestions,
    action_items,
    red_flags,
    tags,
    status = 'draft',
  } = body

  try {
    const auth = await requireRole('agent').catch(() => null)
    if (auth) {
      accountId = auth.accountId
      userId = auth.userId

      const limit = checkRateLimit(`healthcare-notes:${userId}`, RATE_LIMITS.send)
      if (!limit.success) return rateLimitResponse(limit)

      const { supabase } = auth
      const { data, error } = await supabase
        .from('clinical_notes')
        .insert({
          account_id: accountId,
          title,
          note_type,
          contact_id: contact_id ?? null,
          appointment_id: appointment_id ?? null,
          conversation_id: conversation_id ?? null,
          raw_transcript: raw_transcript ?? null,
          soap_note: soap_note ?? {},
          ai_suggestions: ai_suggestions ?? [],
          action_items: action_items ?? [],
          red_flags: red_flags ?? [],
          tags: tags ?? [],
          status,
          clinician_id: userId,
        })
        .select()
        .single()

      if (!error && data) {
        return NextResponse.json({ note: data }, { status: 201 })
      } else if (error) {
        console.warn('[healthcare/notes POST Supabase error, falling back to local storage]:', error.message || error)
      }
    }
  } catch (err) {
    console.warn('[healthcare/notes POST fallback triggered]:', err)
  }

  // Graceful local store fallback
  const newNote = localNotesStore.create({
    account_id: accountId,
    clinician_id: userId,
    title,
    note_type,
    contact_id,
    appointment_id,
    conversation_id,
    raw_transcript,
    soap_note,
    ai_suggestions,
    action_items,
    red_flags,
    tags,
    status,
  })

  return NextResponse.json({ note: newNote }, { status: 201 })
}
