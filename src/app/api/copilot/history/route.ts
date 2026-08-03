import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/ai/admin-client';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ messages: [] });
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from('copilot_conversations')
      .select('messages')
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({ messages: data.messages || [] });
  } catch (err: any) {
    console.error('[API /api/copilot/history GET Error]:', err);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accountId, messages } = body;

    if (!accountId || !Array.isArray(messages)) {
      return NextResponse.json({ success: false, error: 'Missing accountId or messages' }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Upsert into copilot_conversations for this account
    const { data: existing } = await db
      .from('copilot_conversations')
      .select('id')
      .eq('account_id', accountId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await db
        .from('copilot_conversations')
        .update({
          messages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await db
        .from('copilot_conversations')
        .insert({
          account_id: accountId,
          messages,
        });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API /api/copilot/history POST Error]:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    if (accountId) {
      const db = supabaseAdmin();
      await db.from('copilot_conversations').delete().eq('account_id', accountId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
