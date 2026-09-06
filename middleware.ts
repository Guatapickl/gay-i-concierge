import { NextResponse, type NextRequest } from 'next/server'

/**
 * Edge middleware. The Firebase Admin SDK can't run here, so we only check
 * that the `__session` cookie exists for protected routes; server components
 * and API routes verify it for real (see lib/firebase/session.ts).
 */
const SESSION_COOKIE = '__session'
const protectedRoutes = ['/hub', '/profile', '/events', '/resources', '/robot']

export function middleware(request: NextRequest) {
    // Firebase App Hosting preserves the public hostname in this proxy header.
    const hostname = (request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.hostname).split(',')[0].trim().split(':')[0].toLowerCase()
    if (hostname === 'www.gayiclub.com') {
        const canonical = request.nextUrl.clone()
        canonical.protocol = 'https:'
        canonical.hostname = 'gayiclub.com'
        canonical.port = ''
        return NextResponse.redirect(canonical, 308)
    }
    const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/'))
    const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value

    if (!hasSession && isProtectedRoute) {
        // Redirect to login if accessing a protected route without a session
        const url = request.nextUrl.clone()
        url.pathname = '/auth/sign-in'
        return NextResponse.redirect(url)
    }

    const response = NextResponse.next()
    if (hostname !== 'gayiclub.com' && hostname !== 'www.gayiclub.com') {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    }
    return response
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
