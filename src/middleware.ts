import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth_token')?.value;

    // No token, redirect to login
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    // Verify token
    const payload = await verifyToken(token);

    // Invalid token, redirect to login
    if (!payload) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);

      // Clear invalid cookie
      const response = NextResponse.redirect(url);
      response.cookies.delete('auth_token');
      return response;
    }

    // Token valid, allow access
    return NextResponse.next();
  }

  // For non-dashboard routes, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)',
  ],
};
