import { NextRequest } from 'next/server';
import { fetchClaimableByWallet, WALLET_RE } from '@/lib/rewards-db';

export async function GET(request: NextRequest) {
  const wallet = new URL(request.url).searchParams.get('wallet')?.trim() || '';
  if (!wallet || !WALLET_RE.test(wallet)) {
    return Response.json({ error: 'Valid wallet query required' }, { status: 400 });
  }

  try {
    const user = await fetchClaimableByWallet(wallet);
    if (!user) {
      return Response.json(
        {
          error: 'wallet_not_registered',
          message: 'This wallet is not linked. Set it in Telegram with /setwallet first.',
        },
        { status: 404 }
      );
    }

    return Response.json({
      user_id: user.user_id,
      username: user.username,
      claimable_mt: user.claimable_mt,
      current_streak: user.current_streak,
      max_streak: user.max_streak,
      total_checkins: user.total_checkins,
      last_checkin: user.last_checkin,
      verified: user.verified,
      wallet_linked: user.wallet_linked,
      wallet_address: user.wallet_address,
    });
  } catch (err: any) {
    console.error('claimable-rewards lookup', err?.message);
    return Response.json({ error: 'database_error' }, { status: 500 });
  }
}