import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined

/**
 * Resilient fetch wrapper that catches low-level network errors (e.g. paused/unreachable
 * Supabase instances, DNS failures, CORS rejections) and converts them to synthetic 503
 * HTTP responses. This prevents uncaught `TypeError: Failed to fetch` exceptions from
 * triggering console runtime error overlays.
 */
const safeFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch {
    return new Response(
      JSON.stringify({
        message: 'Supabase service unreachable or offline',
        error: 'Service Unavailable',
        statusCode: 503,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export function createClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: safeFetch,
      },
    }
  )

  return browserClient
}
