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

export async function POST(request: NextRequest) {
  if (!isAustralianRequest(request)) return geoBlockedResponse();
  if (!checkAdminRateLimit(request)) return rateLimitedResponse();

  let body: { staff_key?: string };
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

  const session = issueAdminSessionToken();
  return Response.json(
    {
      success: true,
      token: session.token,
      expires_at: session.expires_at,
      region: 'AU',
    },
    { headers: adminSecurityHeaders() }
  );
}