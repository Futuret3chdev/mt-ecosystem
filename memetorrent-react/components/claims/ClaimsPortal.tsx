'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
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
  const { publicKey, connected, connect, disconnect, select, wallets } = useWallet();
  const [allUsers, setAllUsers] = useState<ClaimUser[]>([]);
  const [myRow, setMyRow] = useState<MyRow | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [statusErr, setStatusErr] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState<{ amount: number; tx: string; solscan: string } | null>(null);
  const [summary, setSummary] = useState({ pending: 0, withBalance: 0, total: 0 });
  const [treasuryReady, setTreasuryReady] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState('Phantom');

  const walletAddress = publicKey?.toBase58() ?? null;

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
    setClaiming(true);
    setSuccess(null);
    setStatus('Sending $MT to your wallet…');
    setStatusErr(false);
    try {
      const res = await fetch('/api/claimable-rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Claim failed');
      setSuccess({
        amount: data.amount_mt,
        tx: data.tx_signature,
        solscan: data.solscan_url,
      });
      setStatus('Success! Balance updated on-chain.');
      setStatusErr(false);
      await loadList();
      await matchWallet(walletAddress);
    } catch (e: any) {
      setStatus(e.message || 'Claim failed');
      setStatusErr(true);
    } finally {
      setClaiming(false);
    }
  }

  const filtered = allUsers.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return String(u.user_id).includes(q) || (u.username || '').toLowerCase().includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Claim Your $MT Rewards
        </h1>
        <p className="mt-3 text-sm sm:text-base opacity-70 max-w-xl mx-auto">
          Connect the wallet you set with <code className="text-emerald-400">/setwallet</code> in Telegram — claim straight to your wallet.
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

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search @username or user ID…"
          className="w-full mb-4 px-4 py-2.5 rounded-xl border border-white/15 bg-black/40 text-sm focus:outline-none focus:border-violet-400/50"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase opacity-60 border-b border-white/10">
                <th className="pb-2 pr-2">User</th>
                <th className="pb-2 pr-2">Streak</th>
                <th className="pb-2 pr-2">Check-ins</th>
                <th className="pb-2 pr-2">Wallet</th>
                <th className="pb-2 text-right">Claimable $MT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center opacity-50">No matches</td></tr>
              ) : (
                filtered.map((u) => {
                  const isYou = myRow?.user_id === u.user_id;
                  return (
                    <tr
                      key={u.user_id}
                      className={`border-b border-white/5 ${isYou ? 'bg-emerald-400/10' : ''} ${u.claimable_mt > 0 ? '' : 'opacity-70'}`}
                    >
                      <td className="py-2.5 pr-2">
                        @{u.username || 'user'}
                        <div className="text-[11px] opacity-50">{u.user_id}</div>
                      </td>
                      <td className="py-2.5 pr-2">{u.current_streak}d <span className="opacity-50">(max {u.max_streak})</span></td>
                      <td className="py-2.5 pr-2">{u.total_checkins}</td>
                      <td className="py-2.5 pr-2">
                        {u.wallet_linked ? (
                          <span className="text-xs"><span className="text-emerald-400">Linked</span> {u.wallet_short}</span>
                        ) : (
                          <span className="text-xs opacity-50">None</span>
                        )}
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${u.claimable_mt > 0 ? 'text-emerald-400' : ''}`}>
                        {u.claimable_mt > 0 ? u.claimable_mt.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}