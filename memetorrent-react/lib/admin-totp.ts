import { authenticator } from 'otplib';

authenticator.options = { window: 1 };

const ISSUER = 'MemeTorrent Admin';

/** All registered admin TOTP secrets (one per person). */
export function getAdminTotpSecrets(): string[] {
  const json = process.env.ADMIN_TOTP_ADMINS?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as Record<string, string>;
      if (parsed && typeof parsed === 'object') {
        return [...new Set(Object.values(parsed).map((s) => String(s).trim()).filter((s) => s.length >= 16))];
      }
    } catch {
      /* fall through */
    }
  }

  const multi = process.env.ADMIN_TOTP_SECRETS?.trim();
  if (multi) {
    return [...new Set(multi.split(/[,\n]+/).map((s) => s.trim()).filter((s) => s.length >= 16))];
  }

  const single = process.env.ADMIN_TOTP_SECRET?.trim();
  return single && single.length >= 16 ? [single] : [];
}

export function isAdmin2faEnabled(): boolean {
  if (process.env.REQUIRE_ADMIN_2FA === 'false') return false;
  if (getAdminTotpSecrets().length > 0) return true;
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_ADMIN_2FA === 'true';
}

export function admin2faConfigured(): boolean {
  return getAdminTotpSecrets().length > 0;
}

export function verifyAdminTotp(code: string | null | undefined): boolean {
  const secrets = getAdminTotpSecrets();
  if (!secrets.length) {
    return process.env.NODE_ENV !== 'production' && process.env.REQUIRE_ADMIN_2FA !== 'true';
  }
  const token = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return false;
  return secrets.some((secret) => {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  });
}

export function admin2faSetupHint(): { issuer: string; configured: boolean; admin_count: number } {
  const secrets = getAdminTotpSecrets();
  return { issuer: ISSUER, configured: secrets.length > 0, admin_count: secrets.length };
}