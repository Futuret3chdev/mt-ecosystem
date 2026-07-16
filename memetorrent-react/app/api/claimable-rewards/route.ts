import { NextRequest } from 'next/server';
import {
  fetchAllClaimableUsers,
  staffKeyFromRequest,
  verifyStaffKey,
} from '@/lib/rewards-db';
import { treasuryConfigured } from '@/lib/treasury-send';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const staffKey = staffKeyFromRequest(request.headers, url);
  const isStaff = verifyStaffKey(staffKey);

  try {
    const users = await fetchAllClaimableUsers();
    const withBalance = users.filter((u) => u.claimable_mt > 0);
    const pendingTotal = withBalance.reduce((s, u) => s + u.claimable_mt, 0);

    const treasuryReady = await treasuryConfigured();

    const payload = {
      updated_at: new Date().toISOString(),
      treasury_configured: treasuryReady,
      treasury_can_send: treasuryReady,
      user_pays_sol_fees: true,
      summary: {
        total_users: users.length,
        users_with_balance: withBalance.length,
        pending_mt_total: pendingTotal,
        wallets_linked: users.filter((u) => u.wallet_linked).length,
      },
      users: users.map((u) => ({
        user_id: u.user_id,
        username: u.username,
        claimable_mt: u.claimable_mt,
        current_streak: u.current_streak,
        max_streak: u.max_streak,
        total_checkins: u.total_checkins,
        last_checkin: u.last_checkin,
        verified: u.verified,
        wallet_linked: u.wallet_linked,
        wallet_short: u.wallet_address
          ? `${u.wallet_address.slice(0, 4)}…${u.wallet_address.slice(-4)}`
          : null,
        wallet_address: isStaff ? u.wallet_address : undefined,
      })),
    };

    return Response.json(payload);
  } catch (err: any) {
    console.error('claimable-rewards GET', err?.message);
    return Response.json({ error: 'database_error' }, { status: 500 });
  }
}