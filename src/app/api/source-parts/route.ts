import { NextResponse } from 'next/server'
import { sourceOutOfStockPart } from '@/lib/ai/tools/stagehand-sourcing'

export async function POST(req: Request) {
  try {
    const { partName, make, model } = await req.json()
    if (!partName) {
      return NextResponse.json({ error: 'Part name is required' }, { status: 400 })
    }

    // Call the same Stagehand scraper that the AI uses
    const results = await sourceOutOfStockPart(partName, make, model)
    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('API /source-parts error:', error)
    return NextResponse.json({ error: error.message || 'Failed to source parts' }, { status: 500 })
  }
}
