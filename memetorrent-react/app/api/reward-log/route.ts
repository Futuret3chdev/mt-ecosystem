import { NextRequest } from 'next/server';
import mysql from 'mysql2/promise';
import { requireAdminApiAccess } from '@/lib/admin-security';

const DB_HOST = '50.6.160.248';
const DB_USER = 'tcvkxete_admin';
const DB_PASS = 'Shinhwa1@@';

let tableReady = false;

async function ensureTable(conn: mysql.Connection) {
  if (tableReady) return;
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
  tableReady = true;
}

export async function POST(request: NextRequest) {
  const denied = requireAdminApiAccess(request);
  if (denied) return denied;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    platform,
    user_id,
    username,
    recipient_wallet,
    amount_mt,
    tx_signature,
    sender_wallet,
    note
  } = body || {};

  if (
    !platform ||
    !user_id ||
    !recipient_wallet ||
    !tx_signature ||
    !sender_wallet ||
    amount_mt == null ||
    Number(amount_mt) <= 0
  ) {
    return Response.json({ error: 'Missing required reward fields' }, { status: 400 });
  }

  let conn: mysql.Connection | null = null;

  try {
    conn = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      database: 'tcvkxete_userdb',
      connectTimeout: 8000
    });

    await ensureTable(conn);

    await conn.execute(
      `INSERT INTO community_reward_log
        (platform, user_id, username, recipient_wallet, amount_mt, tx_signature, sender_wallet, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(platform).slice(0, 16),
        String(user_id).slice(0, 64),
        username ? String(username).slice(0, 255) : null,
        String(recipient_wallet).slice(0, 64),
        Number(amount_mt),
        String(tx_signature).slice(0, 128),
        String(sender_wallet).slice(0, 64),
        note ? String(note).slice(0, 500) : null
      ]
    );

    return Response.json({ success: true });
  } catch (err: any) {
    console.error('reward-log error', err?.message);
    return Response.json({ error: 'database_error' }, { status: 500 });
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {}
    }
  }
}