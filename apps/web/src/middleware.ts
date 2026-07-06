import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  TRAINER: '/trainer',
  STUDIO_OWNER: '/studio',
  NUTRITIONIST: '/nutritionist',
  STUDENT: '/student',
};

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

const ROLE_PREFIXES: Record<string, string[]> = {
  ADMIN: ['/admin'],
  TRAINER: ['/trainer'],
  STUDIO_OWNER: ['/studio'],
  NUTRITIONIST: ['/nutritionist'],
  STUDENT: ['/student'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuth = request.cookies.get('fitlynutri-auth')?.value === '1';
  const role = request.cookies.get('fitlynutri-role')?.value || '';

  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isDashboardRedirect = pathname === '/dashboard';
  const isRootPath = pathname === '/';
  const isProtected = Object.values(ROLE_PREFIXES).flat().some((p) => pathname.startsWith(p));

  // Root path → redirect to login if not authenticated, or to dashboard if authenticated
  if (isRootPath) {
    if (!isAuth || !role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const home = ROLE_HOME[role] || '/login';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Logged-in user trying to access auth pages → redirect to their dashboard
  if (isAuth && role && isAuthPath) {
    const home = ROLE_HOME[role] || '/login';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // /dashboard → redirect to role-specific home
  if (isDashboardRedirect) {
    if (!isAuth || !role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const home = ROLE_HOME[role] || '/login';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Protected route without auth → login
  if (isProtected && !isAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged-in user accessing a role they don't own → redirect to their dashboard
  if (isProtected && isAuth && role) {
    const allowedPrefixes = ROLE_PREFIXES[role] || [];
    const allowed = allowedPrefixes.some((p) => pathname.startsWith(p));
    if (!allowed) {
      const home = ROLE_HOME[role] || '/login';
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/admin/:path*',
    '/trainer/:path*',
    '/nutritionist/:path*',
    '/student/:path*',
    '/studio/:path*',
  ],
};
