import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import {
  buildReferralLetterPrompt,
  suggestSpecialtyFromFlags,
  type ReferralLetterData,
} from '@/lib/healthcare/referral-generator'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

/**
 * POST /api/healthcare/referral
 *
 * Generates a professional referral letter using AI, based on
 * a clinical note and patient data.
 *
 * Body:
 *   - clinical_note_id: string (required)
 *   - contact_id: string (required)
 *   - specialist_id?: string (from specialist_directory)
 *   - specialist_specialty: string (required if no specialist_id)
 *   - urgency: 'routine' | 'urgent' | 'emergency'
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`healthcare-referral:${userId}`, RATE_LIMITS.ai)
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    if (!body?.clinical_note_id || !body?.contact_id) {
      return NextResponse.json(
        { error: 'clinical_note_id and contact_id are required' },
        { status: 400 },
      )
    }

    const {
      clinical_note_id,
      contact_id,
      specialist_id,
      specialist_specialty,
      urgency = 'routine',
    } = body

    // Fetch clinical note
    const { data: note } = await supabase
      .from('clinical_notes')
      .select('*')
      .eq('id', clinical_note_id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (!note) {
      return NextResponse.json({ error: 'Clinical note not found' }, { status: 404 })
    }

    // Fetch contact / patient
    const { data: contact } = await supabase
      .from('contacts')
      .select('name, phone_number')
      .eq('id', contact_id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Fetch risk profile for history
    const { data: riskProfile } = await supabase
      .from('patient_risk_profiles')
      .select('chronic_conditions, medication_history, allergy_flags')
      .eq('contact_id', contact_id)
      .eq('account_id', accountId)
      .maybeSingle()

    // Fetch specialist if provided
    let specialist = null
    if (specialist_id) {
      const { data: spec } = await supabase
        .from('specialist_directory')
        .select('name, specialty, clinic_name')
        .eq('id', specialist_id)
        .eq('account_id', accountId)
        .maybeSingle()
      specialist = spec
    }

    // Fetch account and clinician info
    const { data: account } = await supabase
      .from('accounts')
      .select('name, vertical_config')
      .eq('id', accountId)
      .maybeSingle()

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle()

    const soap = note.soap_note as Record<string, string> | null
    const verticalConfig = (account?.vertical_config as Record<string, string>) ?? {}

    const letterData: Omit<ReferralLetterData, 'letterText' | 'generatedAt'> = {
      patientName: contact.name,
      patientPhone: contact.phone_number,
      referringClinicianName: profile?.full_name ?? 'Attending Clinician',
      referringClinicName: account?.name ?? 'Our Clinic',
      referringClinicPhone: verticalConfig.clinic_phone ?? '',
      referringClinicAddress: verticalConfig.clinic_address ?? '',
      specialistName: specialist?.name ?? undefined,
      specialistSpecialty: specialist?.specialty ?? specialist_specialty ?? 'Specialist',
      specialistClinic: specialist?.clinic_name ?? undefined,
      reasonForReferral: soap?.assessment ?? 'Please see the clinical notes attached.',
      relevantHistory: [
        soap?.subjective ?? '',
        riskProfile?.chronic_conditions?.length
          ? `Chronic conditions: ${riskProfile.chronic_conditions.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
      currentMedications: riskProfile?.medication_history?.length
        ? (riskProfile.medication_history as Array<{ name: string; dosage?: string }>)
            .map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`)
            .join(', ')
        : 'None documented',
      allergies: riskProfile?.allergy_flags?.length
        ? (riskProfile.allergy_flags as string[]).join(', ')
        : 'NKDA (No Known Drug Allergies)',
      urgency,
    }

    // Load AI config
    const { data: aiConfig } = await supabase
      .from('ai_configs')
      .select('api_key, provider, model, is_active')
      .eq('account_id', accountId)
      .maybeSingle()

    if (!aiConfig?.is_active) {
      return NextResponse.json({ error: 'AI must be configured and active.' }, { status: 422 })
    }

    const prompt = buildReferralLetterPrompt(letterData)

    let letterText: string
    if (aiConfig.provider === 'openai') {
      const openai = createOpenAI({ apiKey: aiConfig.api_key })
      const result = await generateText({
        model: openai(aiConfig.model),
        prompt,
      })
      letterText = result.text
    } else if (aiConfig.provider === 'anthropic') {
      const anthropic = createAnthropic({ apiKey: aiConfig.api_key })
      const result = await generateText({
        model: anthropic(aiConfig.model),
        prompt,
      })
      letterText = result.text
    } else {
      const deepseek = createOpenAI({
        apiKey: aiConfig.api_key,
        baseURL: 'https://api.deepseek.com/v1',
      })
      const result = await generateText({
        model: deepseek(aiConfig.model || 'deepseek-chat'),
        prompt,
      })
      letterText = result.text
    }

    // Detect suggested specialties from conditions
    const conditions = (riskProfile?.chronic_conditions as string[]) ?? []
    const redFlagSymptoms =
      (note.red_flags as Array<{ symptom: string }> ?? []).map((f) => f.symptom)
    const suggestedSpecialties = suggestSpecialtyFromFlags(conditions, redFlagSymptoms)

    return NextResponse.json({
      letterText,
      letterData,
      suggestedSpecialties,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * GET /api/healthcare/referral
 * Return suggested specialties for a contact based on their risk profile.
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('viewer')
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contact_id')

    if (!contactId) {
      return NextResponse.json({ error: 'contact_id is required' }, { status: 400 })
    }

    const { data: riskProfile } = await supabase
      .from('patient_risk_profiles')
      .select('chronic_conditions')
      .eq('contact_id', contactId)
      .eq('account_id', accountId)
      .maybeSingle()

    const conditions = (riskProfile?.chronic_conditions as string[]) ?? []
    const suggested = suggestSpecialtyFromFlags(conditions, [])

    return NextResponse.json({ suggestedSpecialties: suggested })
  } catch (err) {
    return toErrorResponse(err)
  }
}
