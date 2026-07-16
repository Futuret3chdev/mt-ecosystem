import { NextRequest } from 'next/server';
import {
  getTrackingDb,
  getUserDb,
  logReward,
  WALLET_RE,
} from '@/lib/rewards-db';
import { sendMtFromTreasury, treasuryConfigured } from '@/lib/treasury-send';

export async function POST(request: NextRequest) {
  if (!treasuryConfigured()) {
    return Response.json(
      { error: 'treasury_not_configured', message: 'Rewards wallet not set up yet. Try again soon.' },
      { status: 503 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const wallet = String(body?.wallet_address || '').trim();
  if (!wallet || !WALLET_RE.test(wallet)) {
    return Response.json({ error: 'Valid wallet_address required' }, { status: 400 });
  }

  let userConn = null;
  let trackConn = null;

  try {
    userConn = await getUserDb();
    const [userRows] = await userConn.execute(
      `SELECT id, username, wallet_address, verified
       FROM user_details
       WHERE wallet_address = ?
       LIMIT 1`,
      [wallet]
    );
    const user = (userRows as any[])[0];
    if (!user) {
      return Response.json(
        {
          error: 'wallet_not_registered',
          message: 'This wallet is not linked. Set it in Telegram with /setwallet first.',
        },
        { status: 404 }
      );
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

    await trackConn.execute(
      'UPDATE daily_checkins SET claimable_mt = 0, updated_at = NOW() WHERE user_id = ?',
      [userId]
    );
    await trackConn.commit();

    let signature: string;
    let senderWallet: string;
    try {
      const sent = await sendMtFromTreasury(wallet, claimable);
      signature = sent.signature;
      senderWallet = sent.senderWallet;
    } catch (sendErr: any) {
      await trackConn.beginTransaction();
      await trackConn.execute(
        'UPDATE daily_checkins SET claimable_mt = ? WHERE user_id = ?',
        [claimable, userId]
      );
      await trackConn.commit();
      console.error('claim send failed, restored balance', sendErr?.message);
      return Response.json(
        { error: 'send_failed', message: sendErr?.message || 'On-chain send failed' },
        { status: 500 }
      );
    }

    await logReward(userConn, {
      platform: 'telegram',
      user_id: userId,
      username: user.username || null,
      recipient_wallet: wallet,
      amount_mt: claimable,
      tx_signature: signature,
      sender_wallet: senderWallet,
      note: 'Self-claim from rewards portal',
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
    console.error('claimable-rewards claim', err?.message);
    return Response.json({ error: 'claim_failed' }, { status: 500 });
  } finally {
    if (userConn) await userConn.end();
    if (trackConn) await trackConn.end();
  }
}