import { NextRequest } from 'next/server';
import {
  adminSecurityHeaders,
  checkAdminRateLimit,
  geoBlockedResponse,
  isAustralianRequest,
  issueAdminSessionToken,
  rateLimitedResponse,
  verifyStaffKey,
} from '@/lib/admin-security';
import {
  admin2faConfigured,
  admin2faSetupHint,
  isAdmin2faEnabled,
  verifyAdminTotp,
} from '@/lib/admin-totp';

export async function GET(request: NextRequest) {
  if (!isAustralianRequest(request)) return geoBlockedResponse();
  const hint = admin2faSetupHint();
  return Response.json(
    {
      requires_2fa: isAdmin2faEnabled(),
      totp_configured: hint.configured,
      issuer: hint.issuer,
    },
    { headers: adminSecurityHeaders() }
  );
}

export async function POST(request: NextRequest) {
  if (!isAustralianRequest(request)) return geoBlockedResponse();
  if (!checkAdminRateLimit(request)) return rateLimitedResponse();

  let body: { staff_key?: string; totp_code?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: adminSecurityHeaders() });
  }

  const key = String(body?.staff_key || '').trim();
  if (!verifyStaffKey(key)) {
    return Response.json(
      { error: 'unauthorized', message: 'Invalid staff credentials.' },
      { status: 401, headers: adminSecurityHeaders() }
    );
  }

  if (isAdmin2faEnabled()) {
    if (!admin2faConfigured()) {
      return Response.json(
        {
          error: '2fa_not_configured',
          message: 'ADMIN_TOTP_SECRET must be set on the server before admin login is allowed.',
        },
        { status: 503, headers: adminSecurityHeaders() }
      );
    }
    if (!verifyAdminTotp(body?.totp_code)) {
      return Response.json(
        { error: 'invalid_2fa', message: 'Invalid or expired authenticator code.' },
        { status: 401, headers: adminSecurityHeaders() }
      );
    }
  }

  const session = issueAdminSessionToken();
  return Response.json(
    {
      success: true,
      token: session.token,
      expires_at: session.expires_at,
      region: 'AU',
      mfa: true,
    },
    { headers: adminSecurityHeaders() }
  );
}