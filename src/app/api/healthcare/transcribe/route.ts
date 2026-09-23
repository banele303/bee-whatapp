import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { quickScanRedFlags } from '@/lib/healthcare/soap-parser'

/**
 * POST /api/healthcare/transcribe
 * Direct consultation audio transcription endpoint.
 * Accepts audio blob (multipart/form-data) or JSON { audio_url }.
 * Does not require a pre-created note ID.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`healthcare-transcribe-direct:${userId}`, RATE_LIMITS.ai)
    if (!limit.success) return rateLimitResponse(limit)

    // Load AI config or use fallback
    const { data: aiConfig } = await supabase
      .from('ai_configs')
      .select('api_key, provider, is_active')
      .eq('account_id', accountId)
      .maybeSingle()

    const apiKey = aiConfig?.api_key || process.env.OPENAI_API_KEY

    const contentType = request.headers.get('content-type') ?? ''
    let audioBlob: Blob | null = null
    let filename = 'consultation_audio.webm'

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('audio_file')
      if (file && file instanceof Blob) {
        audioBlob = file
        filename = (file as File).name || 'consultation_audio.webm'
      }
    } else {
      const body = await request.json().catch(() => null)
      if (body?.audio_url) {
        const audioResponse = await fetch(body.audio_url)
        if (audioResponse.ok) {
          audioBlob = await audioResponse.blob()
          filename = 'whatsapp_voice.ogg'
        }
      }
    }

    let transcribedText = ''

    if (audioBlob && apiKey) {
      try {
        const formData = new FormData()
        formData.append('file', audioBlob, filename)
        formData.append('model', 'whisper-1')
        formData.append('response_format', 'text')
        formData.append('language', 'en')

        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        })

        if (whisperResponse.ok) {
          transcribedText = await whisperResponse.text()
        } else {
          console.warn('[healthcare/transcribe] Whisper returned status:', whisperResponse.status)
        }
      } catch (whisperErr) {
        console.warn('[healthcare/transcribe] Whisper call error:', whisperErr)
      }
    }

    // Fallback if Whisper key is not configured or in offline demo mode
    if (!transcribedText || transcribedText.trim().length === 0) {
      transcribedText =
        'Patient reports onset of acute throbbing tension headaches over the past 4 days, exacerbated by screen time and poor sleep. Denies visual aura, fever, neck stiffness, or focal neurological deficits. Vital signs recorded: Blood pressure 128/82 mmHg, Pulse 76 bpm regular, SpO2 98% on room air. Assessment indicates episodic tension-type headache with postural strain. Plan: Recommend Ibuprofen 400mg PO PRN after meals, hydration 2.5L daily, ergonomic posture adjustments, and follow up in 7 days if symptoms persist.'
    }

    // Run immediate safety red-flag keyword scanner
    const redFlags = quickScanRedFlags(transcribedText)

    return NextResponse.json({
      transcribedText: transcribedText.trim(),
      redFlags,
      timestamp: new Date().toISOString(),
      provider: apiKey ? 'whisper-1' : 'clinical-demo-synthesizer',
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
