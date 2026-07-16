'use client';

import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import Link from 'next/link';

type ClaimUser = {
  user_id: string;
  username: string | null;
  claimable_mt: number;
  current_streak: number;
  max_streak: number;
  total_checkins: number;
  wallet_linked: boolean;
  wallet_short: string | null;
};

type MyRow = {
  user_id: string;
  username: string | null;
  claimable_mt: number;
};

export default function ClaimsPortal() {
  const { connection } = useConnection();
  const { publicKey, connected, connect, disconnect, select, wallets, signTransaction, sendTransaction } =
    useWallet();
  const [allUsers, setAllUsers] = useState<ClaimUser[]>([]);
  const [myRow, setMyRow] = useState<MyRow | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [statusErr, setStatusErr] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState<{ amount: number; tx: string; solscan: string } | null>(null);
  const [summary, setSummary] = useState({ pending: 0, withBalance: 0, total: 0 });
  const [treasuryReady, setTreasuryReady] = useState(true);
  const [feeHint, setFeeHint] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState('Phantom');
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [memberPage, setMemberPage] = useState(0);
  const MEMBERS_PER_PAGE = 50;

  const walletAddress = publicKey?.toBase58() ?? null;

  const isBlankMember = (u: ClaimUser) => {
    const name = (u.username || '').trim().toLowerCase();
    return (
      (!name || name === 'user') &&
      !u.wallet_linked &&
      u.total_checkins === 0 &&
      u.current_streak === 0 &&
      u.claimable_mt === 0
    );
  };

  /** Active members first → rewards to claim → blank @user rows last */
  const memberTier = (u: ClaimUser) => {
    if (isBlankMember(u)) return 2;
    if (u.claimable_mt > 0) return 1;
    return 0;
  };

  const sortForDisplay = (users: ClaimUser[]) =>
    [...users].sort((a, b) => {
      const tierDiff = memberTier(a) - memberTier(b);
      if (tierDiff !== 0) return tierDiff;
      if (a.claimable_mt !== b.claimable_mt) return b.claimable_mt - a.claimable_mt;
      const nameCmp = (a.username || '').localeCompare(b.username || '');
      if (nameCmp !== 0) return nameCmp;
      return String(a.user_id).localeCompare(String(b.user_id));
    });

  const withRewards = allUsers
    .filter((u) => u.claimable_mt > 0)
    .sort((a, b) => b.claimable_mt - a.claimable_mt);

  const loadList = useCallback(async () => {
    const res = await fetch('/api/claimable-rewards');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Load failed');
    setAllUsers(data.users || []);
    setSummary({
      pending: data.summary?.pending_mt_total || 0,
      withBalance: data.summary?.users_with_balance || 0,
      total: data.summary?.total_users || 0,
    });
    if (!data.treasury_configured) {
      setStatus('Rewards wallet is being set up — balances show below; claims open once treasury is live.');
      setStatusErr(false);
      setTreasuryReady(false);
    } else {
      setTreasuryReady(true);
      setFeeHint(
        data.user_pays_sol_fees
          ? 'You pay a small SOL network fee when claiming (~0.00001 SOL, or ~0.002 SOL first time to open your $MT token account).'
          : null
      );
    }
  }, []);

  const matchWallet = useCallback(async (addr: string | null) => {
    if (!addr) {
      setMyRow(null);
      return;
    }
    const res = await fetch('/api/claimable-rewards/lookup?wallet=' + encodeURIComponent(addr));
    const data = await res.json();
    if (!res.ok) {
      setMyRow(null);
      setStatus(data.message || 'Wallet not linked — use /setwallet in Telegram first.');
      setStatusErr(true);
      return;
    }
    setMyRow(data);
    if (data.claimable_mt <= 0) {
      setStatus(`@${data.username || 'you'}: no rewards to claim right now. Keep checking in!`);
      setStatusErr(false);
    } else {
      setStatus(`Ready — ${data.claimable_mt.toLocaleString()} $MT available for @${data.username || 'you'}`);
      setStatusErr(false);
    }
  }, []);

  useEffect(() => {
    loadList().catch((e) => {
      setStatus(e.message);
      setStatusErr(true);
    });
  }, [loadList]);

  useEffect(() => {
    if (connected && walletAddress) {
      matchWallet(walletAddress);
    } else {
      setMyRow(null);
    }
  }, [connected, walletAddress, matchWallet]);

  async function handleConnect() {
    try {
      select(selectedWallet as any);
      await connect();
    } catch (e: any) {
      setStatus(e.message || 'Connect failed');
      setStatusErr(true);
    }
  }

  async function handleClaim() {
    if (!walletAddress || !myRow || myRow.claimable_mt <= 0) return;
    if (!signTransaction && !sendTransaction) {
      setStatus('Your wallet does not support signing — try Phantom, Solflare, or Backpack.');
      setStatusErr(true);
      return;
    }
    setClaiming(true);
    setSuccess(null);
    setStatus('Preparing claim — approve in your wallet…');
    setStatusErr(false);
    try {
      const prepRes = await fetch('/api/claimable-rewards/claim/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });
      const prep = await prepRes.json();
      if (!prepRes.ok) {
        if (prep.error === 'use_prepare_confirm' || prepRes.status === 404) {
          throw new Error(
            'Claims are updating — refresh in a minute, then connect your wallet and approve the popup.'
          );
        }
        throw new Error(prep.message || prep.error || 'Prepare failed');
      }

      if (prep.fee_note) setFeeHint(prep.fee_note);

      const tx = Transaction.from(Buffer.from(prep.transaction_base64, 'base64'));
      setStatus('Approve the transaction in your wallet…');

      let sig: string;
      if (sendTransaction) {
        sig = await sendTransaction(tx, connection, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        });
      } else {
        const signed = await signTransaction!(tx);
        setStatus('Submitting transaction…');
        sig = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        });
      }

      await connection.confirmTransaction(
        {
          signature: sig,
          blockhash: prep.blockhash,
          lastValidBlockHeight: prep.last_valid_block_height,
        },
        'confirmed'
      );

      const confirmRes = await fetch('/api/claimable-rewards/claim/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          tx_signature: sig,
          sender_wallet: prep.sender_wallet,
        }),
      });
      const data = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(data.message || data.error || 'Confirm failed');

      setSuccess({
        amount: data.amount_mt,
        tx: data.tx_signature,
        solscan: data.solscan_url,
      });
      setStatus('Success! $MT sent — you paid the SOL network fee.');
      setStatusErr(false);
      await loadList();
      await matchWallet(walletAddress);
    } catch (e: any) {
      const msg = e?.message || 'Claim failed';
      if (msg.includes('User rejected') || msg.includes('rejected')) {
        setStatus('Claim cancelled — no SOL charged, balance unchanged.');
      } else {
        setStatus(msg);
      }
      setStatusErr(true);
    } finally {
      setClaiming(false);
    }
  }

  const q = search.toLowerCase().trim();
  const filteredMembers = sortForDisplay(
    allUsers.filter((u) => {
      if (u.claimable_mt > 0) return false;
      if (!q) return true;
      return String(u.user_id).includes(q) || (u.username || '').toLowerCase().includes(q);
    })
  );
  const memberSlice = filteredMembers.slice(
    memberPage * MEMBERS_PER_PAGE,
    (memberPage + 1) * MEMBERS_PER_PAGE
  );
  const memberPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE));

  function UserRow({ u, highlightYou }: { u: ClaimUser; highlightYou?: boolean }) {
    const isYou = highlightYou && myRow?.user_id === u.user_id;
    return (
      <tr
        className={`border-b border-white/5 ${isYou ? 'bg-emerald-400/10' : ''} ${u.claimable_mt > 0 ? '' : 'opacity-70'}`}
      >
        <td className="py-2.5 pr-2">
          @{u.username || 'user'}
          <div className="text-[11px] opacity-50">{u.user_id}</div>
        </td>
        <td className="py-2.5 pr-2">
          {u.current_streak}d <span className="opacity-50">(max {u.max_streak})</span>
        </td>
        <td className="py-2.5 pr-2">{u.total_checkins}</td>
        <td className="py-2.5 pr-2">
          {u.wallet_linked ? (
            <span className="text-xs">
              <span className="text-emerald-400">Linked</span> {u.wallet_short}
            </span>
          ) : (
            <span className="text-xs opacity-50">None</span>
          )}
        </td>
        <td className={`py-2.5 text-right font-semibold ${u.claimable_mt > 0 ? 'text-emerald-400' : ''}`}>
          {u.claimable_mt > 0
            ? u.claimable_mt.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : '—'}
        </td>
      </tr>
    );
  }

  const tableHead = (
    <thead>
      <tr className="text-left text-[11px] uppercase opacity-60 border-b border-white/10">
        <th className="pb-2 pr-2">User</th>
        <th className="pb-2 pr-2">Streak</th>
        <th className="pb-2 pr-2">Check-ins</th>
        <th className="pb-2 pr-2">Wallet</th>
        <th className="pb-2 text-right">Claimable $MT</th>
      </tr>
    </thead>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Claim Your $MT Rewards
        </h1>
        <p className="mt-3 text-sm sm:text-base opacity-70 max-w-xl mx-auto">
          Connect the wallet you set with <code className="text-emerald-400">/setwallet</code> in Telegram.
          You approve the claim in your wallet — you pay the small SOL fee, not our treasury.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/tally.html" className="text-sky-400 hover:underline">Leaderboard</Link>
          <a href="https://t.me/mod_futuret3ch_bot" className="text-sky-400 hover:underline" target="_blank" rel="noopener">Telegram Bot</a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Pending $MT', value: summary.pending.toLocaleString() },
          { label: 'With rewards', value: summary.withBalance },
          { label: 'Members', value: summary.total },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
            <div className="text-xl sm:text-2xl font-semibold text-emerald-400">{s.value}</div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wide opacity-50 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6 mb-6">
        <div className="flex flex-wrap gap-2 items-center justify-center">
          {wallets.map((w) => (
            <button
              key={w.adapter.name}
              type="button"
              onClick={() => setSelectedWallet(w.adapter.name)}
              className={`px-3 py-1.5 rounded-lg text-xs border ${
                selectedWallet === w.adapter.name
                  ? 'border-emerald-400/60 bg-emerald-400/10'
                  : 'border-white/20 hover:bg-white/5'
              }`}
            >
              {w.adapter.name}
            </button>
          ))}
          {!connected ? (
            <button
              type="button"
              onClick={handleConnect}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 font-semibold text-sm"
            >
              Connect wallet
            </button>
          ) : (
            <>
              <span className="font-mono text-xs text-emerald-300">
                {walletAddress?.slice(0, 4)}…{walletAddress?.slice(-4)}
              </span>
              <button type="button" onClick={() => disconnect()} className="px-3 py-1.5 rounded-lg text-xs border border-white/20">
                Disconnect
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleClaim}
            disabled={!connected || !myRow || myRow.claimable_mt <= 0 || claiming || !treasuryReady}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 font-semibold text-sm disabled:opacity-40"
          >
            {myRow && myRow.claimable_mt > 0
              ? `Claim ${myRow.claimable_mt.toLocaleString()} $MT`
              : 'Claim my $MT'}
          </button>
        </div>
        {feeHint && !statusErr && (
          <p className="mt-3 text-center text-xs opacity-60">{feeHint}</p>
        )}
        {status && (
          <p className={`mt-3 text-center text-sm ${statusErr ? 'text-red-300' : 'text-emerald-300'}`}>{status}</p>
        )}
        {success && (
          <div className="mt-4 p-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10">
            <p className="font-semibold text-emerald-300">Claim successful!</p>
            <p className="text-sm mt-1">{success.amount.toLocaleString()} $MT sent to your wallet</p>
            <p className="font-mono text-[11px] mt-2 break-all opacity-80">{success.tx}</p>
            <a href={success.solscan} target="_blank" rel="noopener" className="inline-block mt-3 text-sm text-sky-400 hover:underline">
              View on Solscan →
            </a>
          </div>
        )}
      </div>

      {withRewards.length > 0 && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4 sm:p-6 mb-6">
          <h2 className="text-sm font-semibold text-emerald-300 mb-3">
            Members with rewards to claim ({withRewards.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {tableHead}
              <tbody>
                {withRewards.map((u) => (
                  <UserRow key={u.user_id} u={u} highlightYou />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <button
          type="button"
          onClick={() => {
            setShowAllMembers((v) => !v);
            setMemberPage(0);
          }}
          className="w-full flex items-center justify-between text-left text-sm font-medium opacity-80 hover:opacity-100 py-1"
        >
          <span>All members ({(summary.total - withRewards.length).toLocaleString()}) — blank accounts last</span>
          <span className="text-xs opacity-60">{showAllMembers ? 'Hide ▲' : 'Show ▼'}</span>
        </button>

        {showAllMembers && (
          <>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setMemberPage(0);
              }}
              placeholder="Search @username or user ID…"
              className="w-full mt-4 mb-4 px-4 py-2.5 rounded-xl border border-white/15 bg-black/40 text-sm focus:outline-none focus:border-violet-400/50"
            />
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                {tableHead}
                <tbody>
                  {memberSlice.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center opacity-50">No matches</td></tr>
                  ) : (
                    memberSlice.map((u) => <UserRow key={u.user_id} u={u} highlightYou />)
                  )}
                </tbody>
              </table>
            </div>
            {memberPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4 text-xs opacity-70">
                <button
                  type="button"
                  disabled={memberPage === 0}
                  onClick={() => setMemberPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 rounded-lg border border-white/15 disabled:opacity-30"
                >
                  Prev
                </button>
                <span>
                  Page {memberPage + 1} of {memberPages}
                </span>
                <button
                  type="button"
                  disabled={memberPage >= memberPages - 1}
                  onClick={() => setMemberPage((p) => Math.min(memberPages - 1, p + 1))}
                  className="px-3 py-1 rounded-lg border border-white/15 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}