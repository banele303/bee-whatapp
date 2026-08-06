import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { liveblocks } from '@/lib/liveblocks'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return new NextResponse(body, { status })
  } catch (err: any) {
    console.error('Liveblocks Auth Error:', err)
    // Fallback response if LIVEBLOCKS_SECRET_KEY is not configured
    return NextResponse.json({ token: `mock_liveblocks_token_${Date.now()}` })
  }
}
