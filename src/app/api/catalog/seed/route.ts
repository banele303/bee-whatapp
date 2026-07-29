import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch default demo account id or first account in DB
    const { data: accounts } = await supabase.from('accounts').select('id').limit(1)
    const accountId = accounts?.[0]?.id || '00000000-0000-0000-0000-000000000000'

    const SA_PARTS_SEED = [
      {
        account_id: accountId,
        sku: 'BP-TOY-4145',
        oem_number: '04465-0K280',
        name: '2021 Toyota Hilux 2.8 GD-6 Front Brake Pad Set',
        category: 'Braking System',
        brand: 'Ferodo / Bosch',
        description: 'Heavy duty ceramic front brake pads for Hilux 2.8 GD-6 4x4.',
        cost_price: 450.00,
        selling_price: 650.00,
        stock_qty: 18,
        warehouse_location: 'Bin A-12',
        image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop',
      },
      {
        account_id: accountId,
        sku: 'HL-TOY-81110',
        oem_number: '81110-0E050',
        name: '2023 Toyota Fortuner LED Headlight Assembly (Left)',
        category: 'Lighting & Body',
        brand: 'Depo / OEM Toyota',
        description: 'Complete LED headlight unit with integrated DRL.',
        cost_price: 3200.00,
        selling_price: 4500.00,
        stock_qty: 4,
        warehouse_location: 'Rack L-03',
        image_url: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=600&auto=format&fit=crop',
      },
      {
        account_id: accountId,
        sku: 'WP-VW-06H12',
        oem_number: '06H121026DD',
        name: 'VW Polo 1.2 TSI Engine Water Pump Assembly',
        category: 'Cooling System',
        brand: 'Febi Bilstein',
        description: 'Engine cooling water pump with thermostat housing & gasket.',
        cost_price: 1200.00,
        selling_price: 1750.00,
        stock_qty: 0, // 0 Stock triggers Stagehand Browser Sourcing!
        warehouse_location: 'Bin C-04',
        image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&auto=format&fit=crop',
      },
      {
        account_id: accountId,
        sku: 'CK-FORD-32',
        oem_number: 'AB39-7540-BB',
        name: 'Ford Ranger 3.2 TDCi Heavy Duty Clutch Kit',
        category: 'Transmission',
        brand: 'LUK / Sachs',
        description: 'Complete clutch pressure plate, friction disc & release bearing.',
        cost_price: 3800.00,
        selling_price: 5200.00,
        stock_qty: 6,
        warehouse_location: 'Rack T-08',
        image_url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop',
      },
      {
        account_id: accountId,
        sku: 'ALT-ISZ-110',
        oem_number: '8-98013-817-0',
        name: 'Isuzu D-Max 3.0 DTEQ 12V 110A Alternator',
        category: 'Electrical & Charging',
        brand: 'Denso Original',
        description: 'High output 110A charging alternator for D-Max 3.0.',
        cost_price: 2400.00,
        selling_price: 3500.00,
        stock_qty: 3,
        warehouse_location: 'Bin E-01',
        image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop',
      },
      {
        account_id: accountId,
        sku: 'BD-BMW-320F',
        oem_number: '34116792217',
        name: 'BMW 320i F30 Vented Front Brake Disc Pair',
        category: 'Braking System',
        brand: 'Brembo / Zimmermann',
        description: 'Vented high-carbon coated front brake disc rotors.',
        cost_price: 1800.00,
        selling_price: 2600.00,
        stock_qty: 12,
        warehouse_location: 'Bin B-09',
        image_url: 'https://images.unsplash.com/photo-1600706432520-22c608f654b6?w=600&auto=format&fit=crop',
      },
      {
        account_id: accountId,
        sku: 'OF-BENZ-W205',
        oem_number: '2701800109',
        name: 'Mercedes C200 W205 Engine Oil Filter Cartridge',
        category: 'Consumables & Filters',
        brand: 'Mann Filter',
        description: 'Premium synthetic oil filter element with O-rings.',
        cost_price: 180.00,
        selling_price: 280.00,
        stock_qty: 45,
        warehouse_location: 'Bin F-02',
        image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&auto=format&fit=crop',
      },
      {
        account_id: accountId,
        sku: 'FF-TOY-23300',
        oem_number: '23390-0L041',
        name: 'Toyota Hilux 2.4 D-4D Diesel Fuel Filter Element',
        category: 'Consumables & Filters',
        brand: 'GUD Filters SA',
        description: 'High efficiency diesel fuel separator filter element.',
        cost_price: 220.00,
        selling_price: 350.00,
        stock_qty: 28,
        warehouse_location: 'Bin F-05',
        image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop',
      }
    ]

    // Upsert items into parts_catalog
    const { data: inserted, error } = await supabase
      .from('parts_catalog')
      .upsert(SA_PARTS_SEED, { onConflict: 'account_id,sku' })
      .select()

    if (error) {
      console.error('[seed-catalog error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: inserted?.length || SA_PARTS_SEED.length,
      message: `Successfully seeded ${SA_PARTS_SEED.length} South African automotive parts into parts_catalog table.`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to seed catalog' }, { status: 500 })
  }
}
