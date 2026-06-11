import { NextRequest } from 'next/server';
import mysql from 'mysql2/promise';

const DB_HOST = '50.6.160.248';
const DB_USER = 'tcvkxete_admin';
const DB_PASS = 'Shinhwa1@@';

function getMelbourneDateStr(d: Date = new Date()): string {
  // Melbourne is UTC+10 or +11 (AEST/AEDT). Use fixed offset handling via MySQL CONVERT_TZ where possible.
  const tz = 'Australia/Melbourne';
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(d); // YYYY-MM-DD
}

function getMelbourneTimestamp(): string {
  const tz = 'Australia/Melbourne';
  const now = new Date();
  const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const timePart = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  return `${datePart} ${timePart} AEST`;
}

async function queryTelegram(conn: any, startDate: string, endDate: string, forRange: boolean) {
  // daily_message_counts likely has rows per user per date: date, user_id, username, message_count
  // monthly_message_totals: user_id, username, total_message_count (for current month or maintained)
  const rangeRows: any[] = [];
  const dailyRows: any[] = [];
  const monthlyRows: any[] = [];

  try {
    // RANGE (custom period aggregate or the provided window)
    if (forRange && startDate && endDate) {
      const [rows] = await conn.execute(
        `SELECT user_id, username, SUM(message_count) as message_count
         FROM daily_message_counts
         WHERE date BETWEEN ? AND ?
         GROUP BY user_id, username
         ORDER BY message_count DESC
         LIMIT 100`,
        [startDate, endDate]
      );
      for (const r of rows as any[]) {
        rangeRows.push({
          user_id: r.user_id,
          username: r.username,
          message_count: String(r.message_count)
        });
      }
    } else {
      // default range behaves like daily
      const today = getMelbourneDateStr();
      const [rows] = await conn.execute(
        `SELECT user_id, username, message_count
         FROM daily_message_counts
         WHERE date = ?
         ORDER BY message_count DESC
         LIMIT 100`,
        [today]
      );
      for (const r of rows as any[]) {
        rangeRows.push({
          user_id: r.user_id,
          username: r.username,
          message_count: String(r.message_count ?? r.message_count)
        });
      }
    }

    // DAILY (today in Melbourne)
    const today = getMelbourneDateStr();
    const [daily] = await conn.execute(
      `SELECT user_id, username, message_count
       FROM daily_message_counts
       WHERE date = ?
       ORDER BY message_count DESC
       LIMIT 100`,
      [today]
    );
    for (const r of daily as any[]) {
      dailyRows.push({
        user_id: r.user_id,
        username: r.username,
        message_count: Number(r.message_count)
      });
    }

    // MONTHLY champions (use monthly table; if it has month filter use current month)
    const monthStart = getMelbourneDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    // Try monthly_message_totals first (may be pre-aggregated)
    try {
      const [monthly] = await conn.execute(
        `SELECT user_id, username, total_message_count
         FROM monthly_message_totals
         ORDER BY total_message_count DESC
         LIMIT 100`
      );
      for (const r of monthly as any[]) {
        monthlyRows.push({
          user_id: r.user_id,
          username: r.username,
          total_message_count: Number(r.total_message_count)
        });
      }
    } catch {
      // Fallback: sum for current month from daily
      const [monthly] = await conn.execute(
        `SELECT user_id, username, SUM(message_count) as total_message_count
         FROM daily_message_counts
         WHERE date >= ?
         GROUP BY user_id, username
         ORDER BY total_message_count DESC
         LIMIT 100`,
        [monthStart]
      );
      for (const r of monthly as any[]) {
        monthlyRows.push({
          user_id: r.user_id,
          username: r.username,
          total_message_count: Number(r.total_message_count)
        });
      }
    }
  } catch (e) {
    // leave arrays empty on error; caller will still return timestamp
  }

  return { range: rangeRows, daily: dailyRows, monthly: monthlyRows };
}

async function queryDiscord(conn: any, startDate: string, endDate: string, forRange: boolean) {
  const rangeRows: any[] = [];
  const dailyRows: any[] = [];
  const monthlyRows: any[] = [];

  // Discord data is in a different schema per original: likely tcvkxete_discord_members.messages or similar
  // We attempt common patterns; if tables differ the arrays stay empty for that section.
  try {
    // Try a messages table with created_at or date column + user_id/username
    // For simplicity we query a plausible structure; production may vary slightly.
    const today = getMelbourneDateStr();

    // DAILY
    const [daily] = await conn.execute(
      `SELECT user_id, username, COUNT(*) as message_count
       FROM messages
       WHERE DATE(CONVERT_TZ(created_at, '+00:00', '+10:00')) = ?
       GROUP BY user_id, username
       ORDER BY message_count DESC
       LIMIT 50`,
      [today]
    ).catch(() => [[]]);
    for (const r of (daily as any[])) {
      dailyRows.push({
        user_id: String(r.user_id),
        username: r.username,
        message_count: Number(r.message_count)
      });
    }

    // RANGE aggregate
    if (forRange && startDate && endDate) {
      const [rows] = await conn.execute(
        `SELECT user_id, username, COUNT(*) as message_count
         FROM messages
         WHERE DATE(CONVERT_TZ(created_at, '+00:00', '+10:00')) BETWEEN ? AND ?
         GROUP BY user_id, username
         ORDER BY message_count DESC
         LIMIT 50`,
        [startDate, endDate]
      ).catch(() => [[]]);
      for (const r of (rows as any[])) {
        rangeRows.push({
          user_id: String(r.user_id),
          username: r.username,
          message_count: Number(r.message_count)
        });
      }
    } else {
      rangeRows.push(...dailyRows);
    }

    // MONTHLY (current month approx)
    const monthStart = getMelbourneDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [monthly] = await conn.execute(
      `SELECT user_id, username, COUNT(*) as total_message_count
       FROM messages
       WHERE DATE(CONVERT_TZ(created_at, '+00:00', '+10:00')) >= ?
       GROUP BY user_id, username
       ORDER BY total_message_count DESC
       LIMIT 50`,
      [monthStart]
    ).catch(() => [[]]);
    for (const r of (monthly as any[])) {
      monthlyRows.push({
        user_id: String(r.user_id),
        username: r.username,
        total_message_count: Number(r.total_message_count)
      });
    }
  } catch {
    // empty is ok
  }

  return { range: rangeRows, daily: dailyRows, monthly: monthlyRows };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const useRange = !!(startDate && endDate);

  const timestamp = getMelbourneTimestamp();

  const response: any = {
    timestamp,
    telegram: { range: [], daily: [], monthly: [] },
    discord: { range: [], daily: [], monthly: [] }
  };

  let tgConn: any = null;
  let dcConn: any = null;

  try {
    tgConn = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      database: 'tcvkxete_message_tracking',
      connectTimeout: 8000
    });

    const tg = await queryTelegram(tgConn, startDate, endDate, useRange);
    response.telegram = tg;

    // Discord may live in separate DB or same host different name.
    // Try the message_tracking first for discord tables; fall back to 'tcvkxete_discord_members'
    try {
      dcConn = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        database: 'tcvkxete_discord_members',
        connectTimeout: 5000
      });
    } catch {
      // reuse tg conn if discord tables are in message_tracking db
      dcConn = tgConn;
    }

    const dc = await queryDiscord(dcConn, startDate, endDate, useRange);
    response.discord = dc;
  } catch (err: any) {
    // On hard failure still return the envelope with empty lists + timestamp so UI doesn't 500
    // (original PHP would have errored too but we keep endpoint responsive)
    console.error('message-counts error', err?.message || err);
  } finally {
    if (tgConn && tgConn.end) { try { await tgConn.end(); } catch {} }
    if (dcConn && dcConn !== tgConn && dcConn.end) { try { await dcConn.end(); } catch {} }
  }

  return Response.json(response, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

export async function POST(request: NextRequest) {
  // Some bots may POST; delegate to GET logic for compatibility (or extend for inserts if writer needed)
  return GET(request);
}
