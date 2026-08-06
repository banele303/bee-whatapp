import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { liveblocks } from '@/lib/liveblocks'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fallback immediately if no valid Liveblocks key is set in env
    const secretKey = process.env.LIVEBLOCKS_SECRET_KEY || ''
    if (!secretKey || secretKey === 'sk_test_mock' || !secretKey.startsWith('sk_')) {
      return NextResponse.json({ token: `mock_liveblocks_token_${Date.now()}` })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, account_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const accountId = profile?.account_id || user.id
    const userName = profile?.full_name || user.email || 'Automations Member'

    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: userName,
        avatar: profile?.avatar_url || undefined,
      },
    })

    session.allow(`${accountId}*`, session.FULL_ACCESS)
    session.allow(`wf-*`, session.FULL_ACCESS)

    const { status, body } = await session.authorize()
    if (status >= 400) {
      return NextResponse.json({ token: `mock_liveblocks_token_${Date.now()}` })
    }

    return new NextResponse(body, { status: 200 })
  } catch (err: any) {
    console.warn('Liveblocks Auth fallback active:', err?.message)
    return NextResponse.json({ token: `mock_liveblocks_token_${Date.now()}` })
  }
}
