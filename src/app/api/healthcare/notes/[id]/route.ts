import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { localNotesStore } from '@/lib/healthcare/notes-store'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/healthcare/notes/[id]
 * Fetch a single clinical note with full content.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  let accountId: string | undefined

  try {
    const auth = await requireRole('viewer').catch(() => null)
    if (auth) {
      accountId = auth.accountId
      const { supabase } = auth

      const { data, error } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('id', id)
        .eq('account_id', accountId)
        .maybeSingle()

      if (!error && data) {
        return NextResponse.json({ note: data })
      }
    }
  } catch (err) {
    console.warn('[healthcare/notes/[id] GET fallback triggered]:', err)
  }

  // Fallback to local store
  const localNote = localNotesStore.get(id, accountId)
  if (localNote) {
    return NextResponse.json({ note: localNote })
  }

  return NextResponse.json({ error: 'Note not found' }, { status: 404 })
}

/**
 * PUT /api/healthcare/notes/[id]
 * Update a clinical note — title, content, status, tags, etc.
 */
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  let accountId: string | undefined
  let userId = 'default-user'

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Request body required' }, { status: 400 })
  }

  const allowedFields = [
    'title', 'note_type', 'status', 'raw_transcript', 'soap_note',
    'ai_suggestions', 'action_items', 'red_flags', 'tags', 'pdf_url',
    'contact_id', 'appointment_id', 'conversation_id', 'voice_audio_url',
  ]

  const update: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) update[field] = body[field]
  }

  try {
    const auth = await requireRole('agent').catch(() => null)
    if (auth) {
      accountId = auth.accountId
      userId = auth.userId

      const limit = checkRateLimit(`healthcare-notes-update:${userId}`, RATE_LIMITS.send)
      if (!limit.success) return rateLimitResponse(limit)

      const { supabase } = auth
      const { data, error } = await supabase
        .from('clinical_notes')
        .update(update)
        .eq('id', id)
        .eq('account_id', accountId)
        .select()
        .single()

      if (!error && data) {
        return NextResponse.json({ note: data })
      }
    }
  } catch (err) {
    console.warn('[healthcare/notes/[id] PUT fallback triggered]:', err)
  }

  // Fallback to local store update
  const updatedLocal = localNotesStore.update(id, update as any, accountId)
  if (updatedLocal) {
    return NextResponse.json({ note: updatedLocal })
  }

  return NextResponse.json({ error: 'Note not found' }, { status: 404 })
}

/**
 * DELETE /api/healthcare/notes/[id]
 */
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params
  let accountId: string | undefined

  try {
    const auth = await requireRole('agent').catch(() => null)
    if (auth) {
      accountId = auth.accountId
      const { supabase } = auth

      const { error } = await supabase
        .from('clinical_notes')
        .delete()
        .eq('id', id)
        .eq('account_id', accountId)

      if (!error) {
        localNotesStore.delete(id, accountId)
        return NextResponse.json({ success: true })
      }
    }
  } catch (err) {
    console.warn('[healthcare/notes/[id] DELETE fallback]:', err)
  }

  localNotesStore.delete(id, accountId)
  return NextResponse.json({ success: true })
}
