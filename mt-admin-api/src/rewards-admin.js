const crypto = require('crypto');
const mysql = require('mysql2/promise');
const { isAdmin2faEnabled, admin2faConfigured, verifyAdminTotp, getAdminTotpSecrets } = require('./admin-totp');

const DB_HOST = process.env.REWARDS_DB_HOST || '50.6.160.248';
const DB_USER = process.env.REWARDS_DB_USER || 'tcvkxete_admin';
const DB_PASS = process.env.REWARDS_DB_PASS || 'Shinhwa1@@';
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function staffRewardKey() {
  return (
    process.env.STAFF_REWARD_KEY ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_API_KEY ||
    ''
  );
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || staffRewardKey();
}

function verifyStaffKey(key) {
  if (!key) return false;
  const expected = staffRewardKey();
  if (!expected) return false;
  try {
    const a = Buffer.from(String(key));
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function issueRewardsAdminToken() {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({ exp, n: crypto.randomBytes(12).toString('hex'), v: 2, mfa: true })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return {
    token: `${payload}.${sig}`,
    expires_at: new Date(exp).toISOString(),
  };
}

function verifyRewardsAdminToken(token) {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
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

function adminTokenFromRequest(req) {
  return (
    req.headers['x-admin-token'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
    null
  );
}

function isRewardsAdminAuthorized(req) {
  const token = adminTokenFromRequest(req);
  return !!(token && verifyRewardsAdminToken(token));
}

async function getUserDb() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: 'tcvkxete_userdb',
    connectTimeout: 8000,
  });
}

async function getTrackingDb() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: 'tcvkxete_message_tracking',
    connectTimeout: 8000,
  });
}

async function ensureRewardLogTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS community_reward_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      platform VARCHAR(16) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      username VARCHAR(255) DEFAULT NULL,
      recipient_wallet VARCHAR(64) NOT NULL,
      amount_mt DECIMAL(24,6) NOT NULL,
      tx_signature VARCHAR(128) NOT NULL,
      sender_wallet VARCHAR(64) NOT NULL,
      note VARCHAR(500) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_platform_user (platform, user_id),
      INDEX idx_tx (tx_signature)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function logReward(conn, entry) {
  await ensureRewardLogTable(conn);
  await conn.execute(
    `INSERT INTO community_reward_log
      (platform, user_id, username, recipient_wallet, amount_mt, tx_signature, sender_wallet, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.platform.slice(0, 16),
      String(entry.user_id).slice(0, 64),
      entry.username ? entry.username.slice(0, 255) : null,
      entry.recipient_wallet.slice(0, 64),
      entry.amount_mt,
      entry.tx_signature.slice(0, 128),
      entry.sender_wallet.slice(0, 64),
      entry.note ? entry.note.slice(0, 500) : null,
    ]
  );
}

async function fetchAllClaimableUsers() {
  const conn = await getUserDb();
  try {
    const [rows] = await conn.execute(
      `SELECT
         u.id AS user_id,
         u.username,
         u.wallet_address,
         u.verified,
         COALESCE(dc.claimable_mt, 0) AS claimable_mt,
         COALESCE(dc.current_streak, 0) AS current_streak,
         COALESCE(dc.max_streak, 0) AS max_streak,
         COALESCE(dc.total_checkins, 0) AS total_checkins,
         dc.last_checkin
       FROM user_details u
       LEFT JOIN tcvkxete_message_tracking.daily_checkins dc ON u.id = dc.user_id
       ORDER BY
         CASE
           WHEN (u.username IS NULL OR TRIM(u.username) = '' OR LOWER(TRIM(u.username)) = 'user')
                AND (u.wallet_address IS NULL OR TRIM(u.wallet_address) = '')
                AND COALESCE(dc.total_checkins, 0) = 0
                AND COALESCE(dc.current_streak, 0) = 0
                AND COALESCE(dc.claimable_mt, 0) = 0 THEN 2
           WHEN COALESCE(dc.claimable_mt, 0) > 0 THEN 1
           ELSE 0
         END,
         COALESCE(dc.claimable_mt, 0) DESC,
         u.username ASC,
         u.id ASC`
    );
    return rows.map((r) => {
      const wallet = (r.wallet_address || '').trim();
      const linked = !!wallet && WALLET_RE.test(wallet);
      return {
        user_id: String(r.user_id),
        username: r.username || null,
        wallet_address: linked ? wallet : null,
        wallet_linked: linked,
        verified: !!r.verified,
        claimable_mt: Number(r.claimable_mt) || 0,
        current_streak: Number(r.current_streak) || 0,
        max_streak: Number(r.max_streak) || 0,
        total_checkins: Number(r.total_checkins) || 0,
        last_checkin: r.last_checkin ? String(r.last_checkin).slice(0, 10) : null,
      };
    });
  } finally {
    await conn.end();
  }
}

async function assignClaimableReward({ userId, amount, mode, note }) {
  let userConn = null;
  let trackConn = null;
  try {
    userConn = await getUserDb();
    const [userRows] = await userConn.execute(
      'SELECT id, username, wallet_address FROM user_details WHERE id = ? LIMIT 1',
      [userId]
    );
    const user = userRows[0];
    if (!user) return { error: 'user_not_found', status: 404 };

    trackConn = await getTrackingDb();
    await trackConn.beginTransaction();

    const [existing] = await trackConn.execute(
      'SELECT claimable_mt FROM daily_checkins WHERE user_id = ? FOR UPDATE',
      [userId]
    );
    const prev = Number(existing[0]?.claimable_mt) || 0;
    const next = mode === 'set' ? amount : prev + amount;

    if (existing.length === 0) {
      await trackConn.execute(
        `INSERT INTO daily_checkins
          (user_id, claimable_mt, last_checkin, current_streak, max_streak, total_checkins)
         VALUES (?, ?, CURDATE(), 0, 0, 0)`,
        [userId, next]
      );
    } else {
      await trackConn.execute(
        'UPDATE daily_checkins SET claimable_mt = ?, updated_at = NOW() WHERE user_id = ?',
        [next, userId]
      );
    }

    const wallet = (user.wallet_address || '').trim();
    const walletValid = wallet && WALLET_RE.test(wallet);

    await logReward(userConn, {
      platform: 'telegram',
      user_id: userId,
      username: user.username || null,
      recipient_wallet: walletValid ? wallet : 'unlinked',
      amount_mt: mode === 'set' ? next - prev : amount,
      tx_signature: 'ADMIN_ASSIGN',
      sender_wallet: 'admin_panel',
      note: note || `Admin ${mode}: ${mode === 'set' ? next : amount} MT (balance now ${next})`,
    });

    await trackConn.commit();

    return {
      success: true,
      user_id: userId,
      username: user.username,
      previous_claimable_mt: prev,
      claimable_mt: next,
      mode,
    };
  } catch (err) {
    if (trackConn) {
      try {
        await trackConn.rollback();
      } catch {}
    }
    console.error('rewards-admin assign', err?.message);
    return { error: 'database_error', status: 500 };
  } finally {
    if (userConn) await userConn.end().catch(() => {});
    if (trackConn) await trackConn.end().catch(() => {});
  }
}

function authConfig() {
  const secrets = getAdminTotpSecrets();
  return {
    requires_2fa: isAdmin2faEnabled(),
    totp_configured: admin2faConfigured(),
    admin_count: secrets.length,
    issuer: 'MemeTorrent Admin',
  };
}

function handleAuthGet() {
  return authConfig();
}

function handleAuthPost(body) {
  const key = String(body?.staff_key || '').trim();
  if (!verifyStaffKey(key)) {
    return { error: 'unauthorized', message: 'Invalid staff credentials.', status: 401 };
  }
  if (isAdmin2faEnabled()) {
    if (!admin2faConfigured()) {
      return {
        error: '2fa_not_configured',
        message: 'ADMIN_TOTP_ADMINS must be set on the server before admin login is allowed.',
        status: 503,
      };
    }
    if (!verifyAdminTotp(body?.totp_code)) {
      return { error: 'invalid_2fa', message: 'Invalid or expired authenticator code.', status: 401 };
    }
  }
  const session = issueRewardsAdminToken();
  return {
    success: true,
    token: session.token,
    expires_at: session.expires_at,
    region: 'AU',
    mfa: true,
  };
}

module.exports = {
  WALLET_RE,
  verifyStaffKey,
  isRewardsAdminAuthorized,
  fetchAllClaimableUsers,
  assignClaimableReward,
  handleAuthGet,
  handleAuthPost,
};