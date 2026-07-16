import { authenticator } from 'otplib';

authenticator.options = { window: 1 };

const ISSUER = 'MemeTorrent Admin';

export function isAdmin2faEnabled(): boolean {
  if (process.env.REQUIRE_ADMIN_2FA === 'false') return false;
  const secret = process.env.ADMIN_TOTP_SECRET?.trim();
  if (secret) return true;
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_ADMIN_2FA === 'true';
}

export function admin2faConfigured(): boolean {
  return !!process.env.ADMIN_TOTP_SECRET?.trim();
}

export function verifyAdminTotp(code: string | null | undefined): boolean {
  const secret = process.env.ADMIN_TOTP_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== 'production' && process.env.REQUIRE_ADMIN_2FA !== 'true';
  }
  const token = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return false;
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export function admin2faSetupHint(): { issuer: string; configured: boolean } {
  return { issuer: ISSUER, configured: admin2faConfigured() };
}