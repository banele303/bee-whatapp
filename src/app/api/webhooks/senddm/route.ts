import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ai/admin-client'
import { dispatchInboundToAiReply } from '@/lib/ai/auto-reply'
import { sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils'

/**
 * Inbound Webhook for Built-in Direct DM / Send.dm Gateway.
 * Receives incoming customer DMs and auto-syncs them into the CRM Inbox & fires AI Auto-Reply.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = supabaseAdmin()

    // Extract payload details from Send.dm format
    const fromPhone = sanitizePhoneForMeta(body.from || body.sender || body.phone || '')
    const messageText = body.text || body.message || body.body || body.content || ''
    const messageId = body.id || body.messageId || `dm_in_${Date.now()}`
    const accountId = body.accountId || body.account_id || null

    if (!fromPhone || !messageText) {
      return NextResponse.json({ status: 'ignored', reason: 'Missing phone or text' })
    }

    // Find account by ID or match whatsapp_config row with provider='senddm' / phone_number_id='senddm'
    let targetAccountId = accountId
    if (!targetAccountId) {
      const { data: cfg } = await db
        .from('whatsapp_config')
        .select('account_id')
        .or('phone_number_id.eq.senddm,provider.eq.senddm')
        .limit(1)
        .maybeSingle()
      targetAccountId = cfg?.account_id
    }

    if (!targetAccountId) {
      const { data: firstAcct } = await db.from('accounts').select('id').limit(1).single()
      targetAccountId = firstAcct?.id
    }

    if (!targetAccountId) {
      return NextResponse.json({ status: 'error', reason: 'No account found' }, { status: 400 })
    }

    // 1. Find or create Contact
    let { data: contact } = await db
      .from('contacts')
      .select('id')
      .eq('account_id', targetAccountId)
      .eq('phone', fromPhone)
      .maybeSingle()

    if (!contact) {
      const { data: newContact } = await db
        .from('contacts')
        .insert({
          account_id: targetAccountId,
          phone: fromPhone,
          name: fromPhone,
        })
        .select('id')
        .single()
      contact = newContact
    }

    if (!contact) {
      return NextResponse.json({ status: 'error', reason: 'Failed contact creation' }, { status: 500 })
    }

    // 2. Find or create Conversation
    let { data: conv } = await db
      .from('conversations')
      .select('id')
      .eq('account_id', targetAccountId)
      .eq('contact_id', contact.id)
      .maybeSingle()

    if (!conv) {
      const { data: newConv } = await db
        .from('conversations')
        .insert({
          account_id: targetAccountId,
          contact_id: contact.id,
          status: 'open',
        })
        .select('id')
        .single()
      conv = newConv
    }

    if (!conv) {
      return NextResponse.json({ status: 'error', reason: 'Failed conversation creation' }, { status: 500 })
    }

    // 3. Save incoming message
    await db.from('messages').insert({
      conversation_id: conv.id,
      sender_type: 'customer',
      content_type: 'text',
      content_text: messageText,
      message_id: messageId,
      status: 'delivered',
    })

    // 4. Update conversation timestamp
    await db
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conv.id)

    // 5. Trigger AI Auto-Reply in background
    const { data: owner } = await db
      .from('whatsapp_config')
      .select('user_id')
      .eq('account_id', targetAccountId)
      .maybeSingle()

    void dispatchInboundToAiReply({
      accountId: targetAccountId,
      conversationId: conv.id,
      contactId: contact.id,
      configOwnerUserId: owner?.user_id || 'system',
    })

    return NextResponse.json({ status: 'success', messageId })
  } catch (err: any) {
    console.error('Send.dm Webhook Error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
