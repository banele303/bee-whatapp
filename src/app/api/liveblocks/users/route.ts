import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json()
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json([])
    }

    const supabase = await createClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds)

    const userMap: Record<string, { name: string; avatar?: string }> = {}
    profiles?.forEach(p => {
      userMap[p.user_id] = {
        name: p.full_name || 'Automations Member',
        avatar: p.avatar_url || undefined,
      }
    })

    const results = userIds.map(id => userMap[id] || { name: 'Automations Member' })
    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json([])
  }
}
