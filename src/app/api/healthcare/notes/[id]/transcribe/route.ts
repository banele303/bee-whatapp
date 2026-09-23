import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/healthcare/notes/[id]/transcribe
 *
 * Accepts an audio file (from WhatsApp voice note URL or browser recording),
 * transcribes it using OpenAI Whisper, and appends the result to the note's
 * raw_transcript field.
 *
 * Body: multipart/form-data OR JSON { audio_url: string }
 *   - audio_url: URL of a WhatsApp/Supabase audio file to transcribe
 *   - audio_file: Binary audio blob (from browser mic recording)
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`healthcare-transcribe:${userId}`, RATE_LIMITS.ai)
    if (!limit.success) return rateLimitResponse(limit)

    const { id } = await params

    // Confirm note belongs to the account
    const { data: note, error: noteErr } = await supabase
      .from('clinical_notes')
      .select('id, raw_transcript, account_id')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (noteErr || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Load the account's AI config — we use their OpenAI key for Whisper
    const { data: aiConfig } = await supabase
      .from('ai_configs')
      .select('api_key, provider, is_active')
      .eq('account_id', accountId)
      .maybeSingle()

    if (!aiConfig || !aiConfig.is_active) {
      return NextResponse.json(
        { error: 'AI (OpenAI) must be configured and active to use transcription.' },
        { status: 422 },
      )
    }

    // Determine audio source
    const contentType = request.headers.get('content-type') ?? ''
    let audioBlob: Blob
    let filename = 'audio.ogg'

    if (contentType.includes('multipart/form-data')) {
      // Browser mic recording uploaded as form data
      const formData = await request.formData()
      const file = formData.get('audio_file')
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ error: 'audio_file is required in form data' }, { status: 400 })
      }
      audioBlob = file
      filename = (file as File).name || 'recording.webm'
    } else {
      // WhatsApp voice note URL — fetch the audio
      const body = await request.json().catch(() => null)
      if (!body?.audio_url) {
        return NextResponse.json(
          { error: 'Either multipart audio_file or JSON audio_url is required' },
          { status: 400 },
        )
      }

      const audioResponse = await fetch(body.audio_url)
      if (!audioResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch audio from URL' }, { status: 502 })
      }
      audioBlob = await audioResponse.blob()
      filename = 'whatsapp_voice.ogg'
    }

    // Call OpenAI Whisper API
    const formData = new FormData()
    formData.append('file', audioBlob, filename)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')
    formData.append('language', 'en') // Can be made configurable

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiConfig.api_key}`,
      },
      body: formData,
    })

    if (!whisperResponse.ok) {
      const err = await whisperResponse.text()
      console.error('[healthcare/transcribe] Whisper error:', err)
      return NextResponse.json(
        { error: 'Transcription failed. Check your OpenAI API key and try again.' },
        { status: 502 },
      )
    }

    const transcribedText = await whisperResponse.text()

    // Append to existing transcript (with a separator)
    const existingTranscript = note.raw_transcript ?? ''
    const separator = existingTranscript.length > 0 ? '\n\n---\n\n' : ''
    const timestamp = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
    const newTranscript =
      `${existingTranscript}${separator}[Transcribed Voice Note — ${timestamp}]\n${transcribedText}`

    const { data: updated, error: updateErr } = await supabase
      .from('clinical_notes')
      .update({ raw_transcript: newTranscript })
      .eq('id', id)
      .eq('account_id', accountId)
      .select('id, raw_transcript')
      .single()

    if (updateErr) {
      console.error('[healthcare/transcribe PUT]', updateErr)
      return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 })
    }

    return NextResponse.json({
      transcribedText,
      rawTranscript: updated.raw_transcript,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
