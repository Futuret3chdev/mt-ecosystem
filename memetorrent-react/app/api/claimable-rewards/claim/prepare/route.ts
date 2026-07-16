import { NextRequest } from 'next/server';
import { getTrackingDb, getUserDb, WALLET_RE } from '@/lib/rewards-db';
import { buildUserPaidClaimTransaction, treasuryConfigured } from '@/lib/treasury-send';

export async function POST(request: NextRequest) {
  if (!(await treasuryConfigured())) {
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
      `SELECT id, username, wallet_address FROM user_details WHERE wallet_address = ? LIMIT 1`,
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
    const [rows] = await trackConn.execute(
      'SELECT claimable_mt FROM daily_checkins WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const claimable = Number((rows as any[])[0]?.claimable_mt) || 0;
    if (claimable <= 0) {
      return Response.json(
        { error: 'nothing_to_claim', message: 'No $MT rewards available for this wallet.' },
        { status: 400 }
      );
    }

    const prepared = await buildUserPaidClaimTransaction(wallet, claimable);

    return Response.json({
      success: true,
      user_id: userId,
      username: user.username,
      amount_mt: claimable,
      transaction_base64: prepared.transactionBase64,
      blockhash: prepared.blockhash,
      last_valid_block_height: prepared.lastValidBlockHeight,
      needs_ata: prepared.needsAta,
      estimated_user_sol: prepared.estimatedUserSol,
      fee_note: prepared.needsAta
        ? 'Your wallet pays ~0.002 SOL once to create your $MT token account, plus a small network fee.'
        : 'Your wallet pays a small Solana network fee (~0.00001 SOL).',
      sender_wallet: prepared.senderWallet,
    });
  } catch (err: any) {
    console.error('claim prepare', err?.message);
    return Response.json(
      { error: 'prepare_failed', message: err?.message || 'Could not build claim transaction' },
      { status: 500 }
    );
  } finally {
    if (userConn) await userConn.end();
    if (trackConn) await trackConn.end();
  }
}