import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/healthcare/specialist-directory
 * List all specialists for the account.
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('viewer')
    const { searchParams } = new URL(request.url)
    const specialty = searchParams.get('specialty')

    let query = supabase
      .from('specialist_directory')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('specialty', { ascending: true })
      .order('name', { ascending: true })

    if (specialty) {
      query = query.ilike('specialty', `%${specialty}%`)
    }

    const { data, error } = await query
    if (error) {
      console.warn('[specialist-directory] query error:', error.message)
      return NextResponse.json({ specialists: [] })
    }

    return NextResponse.json({ specialists: data ?? [] })
  } catch (err) {
    return NextResponse.json({ specialists: [] })
  }
}

/**
 * POST /api/healthcare/specialist-directory
 * Add a new specialist to the directory.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')

    const body = await request.json().catch(() => null)
    if (!body?.name || !body?.specialty) {
      return NextResponse.json({ error: 'name and specialty are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('specialist_directory')
      .insert({
        account_id: accountId,
        name: body.name,
        specialty: body.specialty,
        clinic_name: body.clinic_name ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        whatsapp_number: body.whatsapp_number ?? null,
        address: body.address ?? null,
        notes: body.notes ?? null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[specialist-directory POST]', error)
      return NextResponse.json({ error: 'Failed to add specialist' }, { status: 500 })
    }

    return NextResponse.json({ specialist: data }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * PUT /api/healthcare/specialist-directory
 * Update a specialist (pass id in body).
 */
export async function PUT(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')

    const body = await request.json().catch(() => null)
    if (!body?.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { id, ...fields } = body
    const allowed = ['name', 'specialty', 'clinic_name', 'phone', 'email', 'whatsapp_number', 'address', 'notes', 'is_active']
    const update: Record<string, unknown> = {}
    for (const k of allowed) {
      if (k in fields) update[k] = fields[k]
    }

    const { data, error } = await supabase
      .from('specialist_directory')
      .update(update)
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update specialist' }, { status: 500 })
    }

    return NextResponse.json({ specialist: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/healthcare/specialist-directory
 * Remove a specialist (pass ?id=... in query string).
 */
export async function DELETE(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('admin')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('specialist_directory')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete specialist' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
