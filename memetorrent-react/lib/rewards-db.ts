import mysql from 'mysql2/promise';

export const DB_HOST = '50.6.160.248';
export const DB_USER = 'tcvkxete_admin';
export const DB_PASS = 'Shinhwa1@@';
export const STAFF_KEY = process.env.STAFF_REWARD_KEY || 'Hiptonic1@@';
export const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function verifyStaffKey(key: string | null | undefined): boolean {
  return !!key && key === STAFF_KEY;
}

export function staffKeyFromRequest(headers: Headers, url: URL): string | null {
  return headers.get('x-staff-key') || url.searchParams.get('staff_key');
}

export async function getUserDb() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: 'tcvkxete_userdb',
    connectTimeout: 8000,
  });
}

export async function getTrackingDb() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: 'tcvkxete_message_tracking',
    connectTimeout: 8000,
  });
}

export type ClaimableUserRow = {
  user_id: string;
  username: string | null;
  wallet_address: string | null;
  wallet_linked: boolean;
  verified: boolean;
  claimable_mt: number;
  current_streak: number;
  max_streak: number;
  total_checkins: number;
  last_checkin: string | null;
};

export async function fetchClaimableByWallet(
  wallet: string
): Promise<ClaimableUserRow | null> {
  const w = wallet.trim();
  if (!w || !WALLET_RE.test(w)) return null;

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
       WHERE u.wallet_address = ?
       LIMIT 1`,
      [w]
    );
    const r = (rows as any[])[0];
    if (!r) return null;
    const linkedWallet = (r.wallet_address || '').trim();
    if (!linkedWallet || !WALLET_RE.test(linkedWallet)) return null;
    return {
      user_id: String(r.user_id),
      username: r.username || null,
      wallet_address: linkedWallet,
      wallet_linked: true,
      verified: !!r.verified,
      claimable_mt: Number(r.claimable_mt) || 0,
      current_streak: Number(r.current_streak) || 0,
      max_streak: Number(r.max_streak) || 0,
      total_checkins: Number(r.total_checkins) || 0,
      last_checkin: r.last_checkin
        ? String(r.last_checkin).slice(0, 10)
        : null,
    };
  } finally {
    await conn.end();
  }
}

export async function fetchAllClaimableUsers(): Promise<ClaimableUserRow[]> {
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
    return (rows as any[]).map((r) => {
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
        last_checkin: r.last_checkin
          ? String(r.last_checkin).slice(0, 10)
          : null,
      };
    });
  } finally {
    await conn.end();
  }
}

export async function ensureRewardLogTable(conn: mysql.Connection) {
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

export async function logReward(
  conn: mysql.Connection,
  entry: {
    platform: string;
    user_id: string;
    username: string | null;
    recipient_wallet: string;
    amount_mt: number;
    tx_signature: string;
    sender_wallet: string;
    note: string | null;
  }
) {
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