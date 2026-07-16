const { authenticator } = require('otplib');

authenticator.options = { window: 1 };

function getAdminTotpSecrets() {
  const json = (process.env.ADMIN_TOTP_ADMINS || '').trim();
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === 'object') {
        return [...new Set(Object.values(parsed).map((s) => String(s).trim()).filter((s) => s.length >= 16))];
      }
    } catch {
      /* fall through */
    }
  }

  const multi = (process.env.ADMIN_TOTP_SECRETS || '').trim();
  if (multi) {
    return [...new Set(multi.split(/[,\n]+/).map((s) => s.trim()).filter((s) => s.length >= 16))];
  }

  const single = (process.env.ADMIN_TOTP_SECRET || '').trim();
  return single && single.length >= 16 ? [single] : [];
}

function isAdmin2faEnabled() {
  if (process.env.REQUIRE_ADMIN_2FA === 'false') return false;
  if (getAdminTotpSecrets().length > 0) return true;
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_ADMIN_2FA === 'true';
}

function admin2faConfigured() {
  return getAdminTotpSecrets().length > 0;
}

function verifyAdminTotp(code) {
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

module.exports = { getAdminTotpSecrets, isAdmin2faEnabled, admin2faConfigured, verifyAdminTotp };