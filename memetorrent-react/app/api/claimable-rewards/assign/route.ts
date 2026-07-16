import { NextRequest } from 'next/server';
import {
  getTrackingDb,
  getUserDb,
  logReward,
  staffKeyFromRequest,
  verifyStaffKey,
  WALLET_RE,
} from '@/lib/rewards-db';

export async function POST(request: NextRequest) {
  const staffKey = staffKeyFromRequest(request.headers, new URL(request.url));
  if (!verifyStaffKey(staffKey)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userId = String(body?.user_id || '').trim();
  const amount = Number(body?.amount_mt);
  const mode = body?.mode === 'set' ? 'set' : 'add';
  const note = body?.note ? String(body.note).slice(0, 500) : null;

  if (!userId || !/^\d+$/.test(userId)) {
    return Response.json({ error: 'user_id required' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return Response.json({ error: 'amount_mt must be a non-negative number' }, { status: 400 });
  }
  if (mode === 'add' && amount === 0) {
    return Response.json({ error: 'amount_mt must be > 0 for add' }, { status: 400 });
  }

  let userConn = null;
  let trackConn = null;

  try {
    userConn = await getUserDb();
    const [userRows] = await userConn.execute(
      'SELECT id, username, wallet_address FROM user_details WHERE id = ? LIMIT 1',
      [userId]
    );
    const user = (userRows as any[])[0];
    if (!user) {
      return Response.json({ error: 'user_not_found' }, { status: 404 });
    }

    trackConn = await getTrackingDb();
    await trackConn.beginTransaction();

    const [existing] = await trackConn.execute(
      'SELECT claimable_mt FROM daily_checkins WHERE user_id = ? FOR UPDATE',
      [userId]
    );
    const prev = Number((existing as any[])[0]?.claimable_mt) || 0;
    const next = mode === 'set' ? amount : prev + amount;

    if ((existing as any[]).length === 0) {
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

    return Response.json({
      success: true,
      user_id: userId,
      username: user.username,
      previous_claimable_mt: prev,
      claimable_mt: next,
      mode,
    });
  } catch (err: any) {
    if (trackConn) {
      try {
        await trackConn.rollback();
      } catch {}
    }
    console.error('claimable-rewards assign', err?.message);
    return Response.json({ error: 'database_error' }, { status: 500 });
  } finally {
    if (userConn) await userConn.end();
    if (trackConn) await trackConn.end();
  }
}