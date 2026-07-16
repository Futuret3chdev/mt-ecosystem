import { NextRequest } from 'next/server';
import {
  getTrackingDb,
  getUserDb,
  logReward,
  WALLET_RE,
} from '@/lib/rewards-db';
import { treasuryConfigured, verifyClaimTransaction } from '@/lib/treasury-send';

export async function POST(request: NextRequest) {
  if (!(await treasuryConfigured())) {
    return Response.json({ error: 'treasury_not_configured' }, { status: 503 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const wallet = String(body?.wallet_address || '').trim();
  const signature = String(body?.tx_signature || '').trim();
  if (!wallet || !WALLET_RE.test(wallet)) {
    return Response.json({ error: 'Valid wallet_address required' }, { status: 400 });
  }
  if (!signature || signature.length < 80) {
    return Response.json({ error: 'Valid tx_signature required' }, { status: 400 });
  }

  let userConn = null;
  let trackConn = null;

  try {
    userConn = await getUserDb();
    const [userRows] = await userConn.execute(
      `SELECT id, username, wallet_address FROM user_details WHERE wallet_address = ? LIMIT 1`,
      [wallet]
    );
    const user = (userRows as any[])[0];
    if (!user) {
      return Response.json({ error: 'wallet_not_registered' }, { status: 404 });
    }

    const userId = String(user.id);
    trackConn = await getTrackingDb();
    await trackConn.beginTransaction();

    const [rows] = await trackConn.execute(
      'SELECT claimable_mt FROM daily_checkins WHERE user_id = ? FOR UPDATE',
      [userId]
    );
    const claimable = Number((rows as any[])[0]?.claimable_mt) || 0;
    if (claimable <= 0) {
      await trackConn.rollback();
      return Response.json(
        { error: 'nothing_to_claim', message: 'No $MT rewards available for this wallet.' },
        { status: 400 }
      );
    }

    const ok = await verifyClaimTransaction(signature, wallet, claimable);
    if (!ok) {
      await trackConn.rollback();
      return Response.json(
        {
          error: 'tx_not_verified',
          message: 'Transaction not confirmed or amount mismatch. Balance unchanged.',
        },
        { status: 400 }
      );
    }

    await trackConn.execute(
      'UPDATE daily_checkins SET claimable_mt = 0, updated_at = NOW() WHERE user_id = ?',
      [userId]
    );
    await trackConn.commit();

    const senderWallet = body?.sender_wallet || 'treasury';

    await logReward(userConn, {
      platform: 'telegram',
      user_id: userId,
      username: user.username || null,
      recipient_wallet: wallet,
      amount_mt: claimable,
      tx_signature: signature,
      sender_wallet: senderWallet,
      note: 'Self-claim (user-paid SOL fees)',
    });

    return Response.json({
      success: true,
      user_id: userId,
      username: user.username,
      amount_mt: claimable,
      tx_signature: signature,
      solscan_url: `https://solscan.io/tx/${signature}`,
    });
  } catch (err: any) {
    if (trackConn) {
      try {
        await trackConn.rollback();
      } catch {}
    }
    console.error('claim confirm', err?.message);
    return Response.json({ error: 'confirm_failed' }, { status: 500 });
  } finally {
    if (userConn) await userConn.end();
    if (trackConn) await trackConn.end();
  }
}