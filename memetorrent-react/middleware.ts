import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PAGE = '/admin-rewards.html';
const ADMIN_API_PREFIXES = [
  '/api/claimable-rewards/assign',
  '/api/reward-log',
  '/api/staff-wallets',
  '/api/admin/',
  '/api/wallet-lookup',
];

function isAdminSurface(pathname: string): boolean {
  if (pathname === ADMIN_PAGE) return true;
  return ADMIN_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function countryFrom(request: NextRequest): string | null {
  return (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isAdminSurface(pathname)) return NextResponse.next();

  const allowBypass = process.env.ALLOW_NON_AU_ADMIN === 'true';
  const country = countryFrom(request);

  if (!allowBypass) {
    if (!country) {
      return NextResponse.json(
        {
          error: 'geo_unknown',
          message: 'Admin access requires an Australian connection. Geo lookup unavailable.',
        },
        { status: 403 }
      );
    }
    if (country.toUpperCase() !== 'AU') {
      return NextResponse.json(
        {
          error: 'geo_restricted',
          message: 'Admin access is restricted to Australian connections only.',
        },
        { status: 403 }
      );
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  if (pathname === ADMIN_PAGE) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    '/admin-rewards.html',
    '/api/claimable-rewards/assign',
    '/api/reward-log',
    '/api/staff-wallets',
    '/api/admin/:path*',
    '/api/wallet-lookup',
  ],
};