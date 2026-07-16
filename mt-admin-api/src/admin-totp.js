const { authenticator } = require('otplib');

authenticator.options = { window: 1 };

function isAdmin2faEnabled() {
  if (process.env.REQUIRE_ADMIN_2FA === 'false') return false;
  const secret = (process.env.ADMIN_TOTP_SECRET || '').trim();
  if (secret) return true;
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_ADMIN_2FA === 'true';
}

function admin2faConfigured() {
  return !!(process.env.ADMIN_TOTP_SECRET || '').trim();
}

function verifyAdminTotp(code) {
  const secret = (process.env.ADMIN_TOTP_SECRET || '').trim();
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

module.exports = { isAdmin2faEnabled, admin2faConfigured, verifyAdminTotp };