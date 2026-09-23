import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedPaths = [
  '/dashboard',
  '/inbox',
  '/contacts',
  '/pipelines',
  '/broadcasts',
  '/automations',
  '/settings',
  '/agents',
  '/appointments',
  '/catalog',
  '/flows',
  '/jarvis',
  '/notifications',
  '/quotes',
  '/session',
  '/sessions',
  '/transcribe',
  '/health-notes',
  '/health-analytics',
  '/specialist-directory',
]

export async function middleware(request: NextRequest) {
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  const isAuthProtectedApi =
    request.nextUrl.pathname.startsWith('/api/whatsapp/') &&
    !request.nextUrl.pathname.includes('/webhook')

  // Dev bypass mode: allows local testing when Supabase is paused or unreachable
  const isDevBypass = request.cookies.get('wacrm-dev-bypass')?.value === 'true'
  if (isDevBypass) {
    if (
      request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/signup'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  // Fast-path cookie check: If there are no Supabase session cookies present,
  // we know without a network round-trip to Supabase that the user is unauthenticated.
  const allCookies = request.cookies.getAll()
  const hasSupabaseCookie = allCookies.some(
    (c) => (c.name.startsWith('sb-') || c.name.includes('auth-token')) && Boolean(c.value)
  )

  if (!hasSupabaseCookie) {
    if (isProtectedPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (isAuthProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Retrieve user with a safety timeout race to prevent hanging requests.
  let user = null
  let isNetworkOrTimeout = false

  try {
    const userPromise = supabase
      .auth
      .getUser()
      .then((res) => res.data?.user ?? null)
      .catch((err) => {
        console.warn('[middleware] getUser failed network request:', err?.message || err)
        isNetworkOrTimeout = true
        return null
      })

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        isNetworkOrTimeout = true
        resolve(null)
      }, 4000)
    )

    user = await Promise.race([userPromise, timeoutPromise])
  } catch (e) {
    console.warn('[middleware] network error:', e)
    isNetworkOrTimeout = true
    user = null
  }

  const withRefreshedCookies = <T extends NextResponse>(response: T): T => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  // Auth pages - redirect to dashboard/onboarding if already logged in.
  if (
    user &&
    (request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/signup' ||
      request.nextUrl.pathname === '/forgot-password')
  ) {
    const url = request.nextUrl.clone()
    const inviteToken = request.nextUrl.searchParams.get('invite')
    if (
      inviteToken &&
      (request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/signup')
    ) {
      url.pathname = `/join/${encodeURIComponent(inviteToken)}`
      url.search = ''
    } else {
      url.pathname = '/dashboard'
      url.search = ''
    }
    return withRefreshedCookies(NextResponse.redirect(url))
  }

  // Protected pages - redirect to login ONLY if genuinely not authenticated.
  // CRITICAL: If the user has a Supabase auth cookie and getUser() failed due to a network
  // timeout or intermittent connection glitch, DO NOT wipe their cookies and DO NOT redirect.
  // Allow them to proceed so that normal page navigation is never interrupted.
  if (!user && isProtectedPath) {
    if (isNetworkOrTimeout && hasSupabaseCookie) {
      console.warn('[middleware] Supabase auth timed out or network glitched; preserving session cookie and allowing navigation.')
      return supabaseResponse
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectRes = NextResponse.redirect(url)
    allCookies.forEach((c) => {
      if (c.name.startsWith('sb-') || c.name.includes('auth-token')) {
        redirectRes.cookies.delete(c.name)
      }
    })
    return redirectRes
  }

  // API routes that need auth (not webhooks)
  if (!user && isAuthProtectedApi) {
    if (isNetworkOrTimeout && hasSupabaseCookie) {
      return supabaseResponse
    }
    return withRefreshedCookies(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json|csv|txt|xml|webmanifest|map)$).*)',
  ],
}
