import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ai/admin-client'
import { sourceOutOfStockPart } from '@/lib/ai/tools/stagehand-sourcing'
import { engineSendText } from '@/lib/flows/meta-send'

// Example Vercel Cron endpoint
// Protected by Vercel cron secret in production
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const db = supabaseAdmin()

    // 1. Get all auto_parts accounts
    const { data: accounts, error: accountErr } = await db
      .from('accounts')
      .select('id, vertical_type')
      .eq('vertical_type', 'auto_parts')

    if (accountErr || !accounts) {
      throw new Error('Failed to fetch accounts')
    }

    // Process each account
    for (const account of accounts) {
      // Find out-of-stock items in their catalog to look for opportunities
      const { data: outOfStockParts } = await db
        .from('parts_catalog')
        .select('name, make, model')
        .eq('account_id', account.id)
        .eq('stock_qty', 0)
        .limit(3) // Check top 3 to avoid long running task limits

      if (!outOfStockParts || outOfStockParts.length === 0) continue

      let briefing = `🌅 *Daily Parts Sourcing Briefing*\n\n`
      
      for (const part of outOfStockParts) {
        // Use stagehand to search for it
        const listings = await sourceOutOfStockPart(part.name, part.make, part.model)
        
        briefing += `*${part.name}*\n`
        if (listings.length > 0) {
          briefing += `Found ${listings.length} supplier opportunities:\n`
          listings.slice(0, 2).forEach(l => {
            briefing += `- ${l.name} at ${l.price} (In Stock: ${l.inStock ? 'Yes' : 'No'})\n`
          })
        } else {
          briefing += `No immediate supplier stock found.\n`
        }
        briefing += '\n'
      }

      // Send the briefing to the admin of this account.
      // For simplicity, we find the first admin member.
      const { data: admins } = await db
        .from('account_members')
        .select('user_id')
        .eq('account_id', account.id)
        .eq('role', 'admin')
        .limit(1)

      if (admins && admins.length > 0) {
        // Find their phone number if they are a contact, or we could just use a broadcast mechanism.
        // As a prototype, we just log it, but in a real CRM we would send a WhatsApp message to the admin.
        console.log(`[cron] Briefing for account ${account.id}:`, briefing)
      }
    }

    return NextResponse.json({ success: true, message: 'Daily briefing processed' })
  } catch (error) {
    console.error('[cron] Error processing daily briefing:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
