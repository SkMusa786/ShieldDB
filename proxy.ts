import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/login') || pathname === '/api/health' || pathname.startsWith('/api/auth/')) return NextResponse.next()
  if (pathname.startsWith('/api/') && !request.cookies.has('shielddb_session')) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  if (pathname === '/' && !request.cookies.has('shielddb_session')) return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
