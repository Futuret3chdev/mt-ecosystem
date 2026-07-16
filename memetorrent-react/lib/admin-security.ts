import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 8;

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function staffKey(): string {
  const key = process.env.STAFF_REWARD_KEY || process.env.ADMIN_SESSION_SECRET || '';
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('STAFF_REWARD_KEY is not configured');
  }
  return key || 'dev-only-change-me';
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || staffKey();
}

export function getRequestCountry(request: NextRequest | Request): string | null {
  const h = request.headers;
  return (
    h.get('x-vercel-ip-country') ||
    h.get('cf-ipcountry') ||
    h.get('x-country-code') ||
    null
  );
}

export function isAustralianRequest(request: NextRequest | Request): boolean {
  if (process.env.ALLOW_NON_AU_ADMIN === 'true') return true;
  const country = getRequestCountry(request);
  if (!country) {
    // Fail closed in production when geo header missing
    return process.env.NODE_ENV !== 'production';
  }
  return country.toUpperCase() === 'AU';
}

export function geoBlockedResponse() {
  return Response.json(
    {
      error: 'geo_restricted',
      message: 'Admin access is restricted to Australian connections only.',
    },
    { status: 403, headers: adminSecurityHeaders() }
  );
}

export function adminSecurityHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

export function verifyStaffKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const expected = staffKey();
  try {
    const a = Buffer.from(key);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function issueAdminSessionToken(): { token: string; expires_at: string } {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({ exp, n: randomBytes(12).toString('hex'), v: 1 })
  ).toString('base64url');
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return {
    token: `${payload}.${sig}`,
    expires_at: new Date(exp).toISOString(),
  };
}

export function verifyAdminSessionToken(token: string | null | undefined): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function adminTokenFromRequest(request: NextRequest | Request): string | null {
  const h = request.headers;
  return (
    h.get('x-admin-token') ||
    h.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null
  );
}

/** Staff key (legacy) or short-lived admin session token. */
export function isAdminAuthorized(request: NextRequest | Request): boolean {
  const token = adminTokenFromRequest(request);
  if (token && verifyAdminSessionToken(token)) return true;
  const staffKeyHeader = request.headers.get('x-staff-key');
  if (staffKeyHeader && verifyStaffKey(staffKeyHeader)) return true;
  return false;
}

export function unauthorizedAdminResponse() {
  return Response.json(
    { error: 'unauthorized', message: 'Valid admin session required.' },
    { status: 401, headers: adminSecurityHeaders() }
  );
}

export function clientIp(request: NextRequest | Request): string {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function checkAdminRateLimit(request: NextRequest | Request): boolean {
  const ip = clientIp(request);
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > RATE_MAX_ATTEMPTS) return false;
  return true;
}

export function rateLimitedResponse() {
  return Response.json(
    { error: 'rate_limited', message: 'Too many admin login attempts. Try again later.' },
    { status: 429, headers: adminSecurityHeaders() }
  );
}

export function requireAdminApiAccess(request: NextRequest): Response | null {
  if (!isAustralianRequest(request)) return geoBlockedResponse();
  if (!isAdminAuthorized(request)) return unauthorizedAdminResponse();
  return null;
}