import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const { sku, oem_number, name, category, brand, cost_price, selling_price, stock_qty, warehouse_location, image_url } = body

    if (!sku || !name) {
      return NextResponse.json({ error: 'SKU and name are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('parts_catalog')
      .insert({
        account_id: profile.account_id,
        sku,
        oem_number: oem_number || null,
        name,
        category: category || 'General',
        brand: brand || 'Aftermarket',
        cost_price: Number(cost_price) || 0,
        selling_price: Number(selling_price) || 0,
        stock_qty: Number(stock_qty) || 0,
        warehouse_location: warehouse_location || 'Warehouse',
        image_url: image_url || null,
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

    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('parts_catalog')
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

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })

    const { error } = await supabase
      .from('parts_catalog')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
