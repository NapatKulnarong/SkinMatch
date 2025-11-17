import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define which routes require login
const protectedRoutes = ['/quiz', '/account', '/routine', '/profile']

export function middleware(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value // adjust name to your actual cookie/JWT

  // If visiting protected route and not logged in → redirect to login
  if (protectedRoutes.some((path) => req.nextUrl.pathname.startsWith(path)) && !token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', req.nextUrl.pathname) // optional redirect back
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Limit middleware to only these routes
export const config = {
  matcher: ['/quiz/:path*', '/account/:path*', '/routine/:path*', '/profile/:path*'],
}
