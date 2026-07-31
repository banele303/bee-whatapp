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

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 })

    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 })

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const row: Record<string, any> = { account_id: profile.account_id }
      
      headers.forEach((header, idx) => {
        const val = values[idx]?.trim() || ''
        // Map common CSV headers to DB columns
        const mapping: Record<string, string> = {
          'sku': 'sku',
          'oem_number': 'oem_number',
          'oem': 'oem_number',
          'name': 'name',
          'part_name': 'name',
          'description': 'name',
          'category': 'category',
          'brand': 'brand',
          'cost_price': 'cost_price',
          'cost': 'cost_price',
          'selling_price': 'selling_price',
          'price': 'selling_price',
          'stock_qty': 'stock_qty',
          'stock': 'stock_qty',
          'quantity': 'stock_qty',
          'warehouse_location': 'warehouse_location',
          'location': 'warehouse_location',
        }
        const dbCol = mapping[header]
        if (dbCol) {
          if (['cost_price', 'selling_price', 'stock_qty'].includes(dbCol)) {
            row[dbCol] = Number(val) || 0
          } else {
            row[dbCol] = val
          }
        }
      })

      if (row.sku && row.name) rows.push(row)
    }

    if (rows.length === 0) return NextResponse.json({ error: 'No valid rows found. CSV must have sku and name columns.' }, { status: 400 })

    // Upsert in batches of 100
    let imported = 0
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100)
      const { error } = await supabase
        .from('parts_catalog')
        .upsert(batch, { onConflict: 'account_id,sku' })
      if (error) {
        console.error('[catalog import] batch error:', error)
        // Try inserting individually on conflict
        for (const row of batch) {
          const { error: singleErr } = await supabase.from('parts_catalog').upsert(row, { onConflict: 'account_id,sku' })
          if (!singleErr) imported++
        }
      } else {
        imported += batch.length
      }
    }

    return NextResponse.json({ message: `Successfully imported ${imported} products`, imported })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
