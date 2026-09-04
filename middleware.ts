import { NextResponse, type NextRequest } from 'next/server'

/**
 * Edge middleware. The Firebase Admin SDK can't run here, so we only check
 * that the `__session` cookie exists for protected routes; server components
 * and API routes verify it for real (see lib/firebase/session.ts).
 */
const SESSION_COOKIE = '__session'
const protectedRoutes = ['/hub', '/profile', '/events', '/resources', '/robot']

export function middleware(request: NextRequest) {
    const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))
    const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value

    if (!hasSession && isProtectedRoute) {
        // Redirect to login if accessing a protected route without a session
        const url = request.nextUrl.clone()
        url.pathname = '/auth/sign-in'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
