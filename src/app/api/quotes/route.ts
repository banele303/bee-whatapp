import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single()
    if (!profile?.account_id) return NextResponse.json({ error: 'No account' }, { status: 400 })

    const { data, error } = await supabase
      .from('quotes_and_invoices')
      .select('*')
      .eq('account_id', profile.account_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single()
    if (!profile?.account_id) return NextResponse.json({ error: 'No account' }, { status: 400 })

    const body = await req.json()
    const { customer_name, phone_number, items, status: quoteStatus } = body

    if (!customer_name || !items || items.length === 0) {
      return NextResponse.json({ error: 'Customer name and items are required' }, { status: 400 })
    }

    const subtotal = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0)
    const vat = subtotal * 0.15
    const total = subtotal + vat
    const quoteNumber = `QT-${Math.floor(1000 + Math.random() * 9000)}`

    const { data, error } = await supabase
      .from('quotes_and_invoices')
      .insert({
        account_id: profile.account_id,
        quote_number: quoteNumber,
        customer_name,
        phone_number: phone_number || '',
        items,
        subtotal,
        vat_amount: vat,
        total_amount: total,
        status: quoteStatus || 'draft',
        currency: 'ZAR',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('quotes_and_invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
