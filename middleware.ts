import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // 1. Define routes that require authentication
  const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/profile');

  // 2. Get the token from the cookies
  // The Server CAN see HttpOnly cookies, so this works perfectly.
  const token = request.cookies.get('auth_token')?.value;

  // 3. SECURITY CHECK: If trying to access protected route without token, Redirect.
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 4. CACHE CONTROL: If they are authorized, ensure the browser DOES NOT cache the page.
  // This fixes the "Logout -> Back Button" loophole.
  const response = NextResponse.next();
  
  if (isProtectedRoute) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except api, static files, images, etc.
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};