'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTokenStats, MTStatsRaw } from '@/lib/api';

type Asset = {
  symbol: string;
  name: string;
  balance: number;
  chain: string;
  color: string;
  logo?: string;
};

type FlowType = 'bridge' | 'swap' | 'harvest' | 'report' | null;

export default function PortfolioManager() {
  const [price, setPrice] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([
    { symbol: 'MT', name: 'Native MT', balance: 124567890, chain: 'MT (PRIMARY — OUR NETWORK)', color: '#10b981', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png' },
    { symbol: '$MT', name: 'SPL $MT', balance: 45678901, chain: 'Solana', color: '#f59e0b', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png' },
    { symbol: 'ROCKET', name: 'Rockets', balance: 1247, chain: 'TAP Ecosystem', color: '#8b5cf6' },
    { symbol: 'NFT', name: 'NFTs', balance: 7, chain: 'MT + Solana', color: '#ec4899' },
  ]);
  const [activeFlow, setActiveFlow] = useState<FlowType>(null);
  const [flowStep, setFlowStep] = useState(0);
  const [flowData, setFlowData] = useState<any>({});
  const [message, setMessage] = useState<string | null>(null);

  // Live $MT price for realistic valuation
  useEffect(() => {
    getTokenStats()
      .then((s: MTStatsRaw) => setPrice(parseFloat(s.price) || 0.000000012))
      .catch(() => setPrice(0.000000012));
  }, []);

  const totalValue = assets.reduce((sum, a) => {
    if (a.symbol === 'MT' || a.symbol === '$MT') return sum + a.balance * price;
    if (a.symbol === 'ROCKET') return sum + a.balance * 0.008; // mock rocket value
    return sum + a.balance * 12; // mock nft floor
  }, 0);

  const nativeMT = assets.find(a => a.symbol === 'MT')!;
  const splMT = assets.find(a => a.symbol === '$MT')!;

  const updateAsset = (symbol: string, newBalance: number) => {
    setAssets(prev => prev.map(a => a.symbol === symbol ? { ...a, balance: Math.max(0, Math.floor(newBalance)) } : a));
  };

  const showToast = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2400);
  };

  // Flow handlers — real-feeling management flows, better than passive trackers
  const startFlow = (type: FlowType) => {
    setActiveFlow(type);
    setFlowStep(0);
    setFlowData({});
  };

  const closeFlow = () => {
    setActiveFlow(null);
    setFlowStep(0);
    setFlowData({});
  };

  const completeStep = (data?: any) => {
    if (data) setFlowData({ ...flowData, ...data });

    if (activeFlow === 'bridge') {
      if (flowStep === 0) {
        setFlowStep(1);
      } else if (flowStep === 1) {
        // Execute bridge
        const amt = flowData.amount || 5000000;
        const fromNative = flowData.direction === 'native-to-spl';
        if (fromNative) {
          updateAsset('MT', nativeMT.balance - amt);
          updateAsset('$MT', splMT.balance + amt);
        } else {
          updateAsset('$MT', splMT.balance - amt);
          updateAsset('MT', nativeMT.balance + amt);
        }
        showToast(`Bridge complete • ${amt.toLocaleString()} $MT moved on-chain`);
        setTimeout(() => closeFlow(), 1200);
      }
    }

    if (activeFlow === 'harvest') {
      const earned = flowData.earned || 180 + Math.floor(Math.random() * 120);
      const rockets = assets.find(a => a.symbol === 'ROCKET')!;
      updateAsset('ROCKET', rockets.balance + earned);
      showToast(`+${earned} Rockets harvested from TAP • auto to wallet`);
      setTimeout(() => closeFlow(), 900);
    }

    if (activeFlow === 'swap') {
      showToast('Swap routed via Jupiter • keys signed locally. (Demo complete)');
      setTimeout(() => closeFlow(), 1100);
    }

    if (activeFlow === 'report') {
      const report = `MT-ECO-VERIFIED-${Date.now().toString(36).toUpperCase()}`;
      showToast(`On-chain report ${report} generated — includes native MT tx proofs (better than third-party trackers)`);
      setTimeout(() => closeFlow(), 1600);
    }
  };

  const flows = [
    {
      key: 'bridge' as const,
      title: 'Cross-Chain Bridge',
      desc: 'Native MT ↔ Solana SPL. Burn + proof. Self-verified. No third parties.',
      icon: '🔗',
    },
    {
      key: 'harvest' as const,
      title: 'Harvest TAP Earnings',
      desc: 'Play Cosmic Dash or Neon Salvage → Rockets land directly in your vault.',
      icon: '🚀',
    },
    {
      key: 'swap' as const,
      title: 'In-Wallet Swap & Buy',
      desc: 'Jupiter powered. Your keys sign. Full control, no custody handoff.',
      icon: '↔',
    },
    {
      key: 'report' as const,
      title: 'On-Chain Reports',
      desc: 'CoinLedger-style but on-chain verified. Native + SPL + Rockets + NFTs with proofs.',
      icon: '📊',
    },
  ];

  return (
    <section id="management" className="py-20 border-t border-white/10 bg-black/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs tracking-[3px] text-emerald-400 mb-2">MANAGEMENT, NOT JUST TRACKING</div>
            <div className="text-4xl md:text-5xl font-semibold tracking-[-1.6px]">Infinite Portfolio.<br />Real flows. Real ownership.</div>
            <p className="mt-3 max-w-xl text-lg opacity-70">
              coinledger watches numbers. We give you command-center flows that actually move your assets, earn utility, and prove everything on-chain — all inside INFINITE WALLET.
            </p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs opacity-60">LIVE DEMO • SELF-CUSTODIAL</div>
            <div className="text-emerald-400 font-mono text-sm mt-1">No seed ever leaves your device</div>
          </div>
        </div>

        {/* Live summary bar */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.015] p-6 mb-8">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-60">Unified Value</div>
              <div className="text-4xl font-semibold tabular-nums tracking-tight">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="text-sm opacity-70">
              {nativeMT.balance.toLocaleString()} Native MT (PRIMARY)<br />
              + {splMT.balance.toLocaleString()} SPL • {assets.find(a => a.symbol === 'ROCKET')!.balance} Rockets • {assets.find(a => a.symbol === 'NFT')!.balance} NFTs
            </div>
            <div className="flex-1" />
            <button
              onClick={() => {
                // "Import sample high-balance wallet" — feels like real management
                setAssets([
                  { symbol: 'MT', name: 'Native MT', balance: 215818000, chain: 'MT (PRIMARY — OUR NETWORK)', color: '#10b981' },
                  { symbol: '$MT', name: 'SPL $MT', balance: 89000000, chain: 'Solana', color: '#f59e0b' },
                  { symbol: 'ROCKET', name: 'Rockets', balance: 2840, chain: 'TAP Ecosystem', color: '#8b5cf6' },
                  { symbol: 'NFT', name: 'NFTs', balance: 19, chain: 'MT + Solana', color: '#ec4899' },
                ]);
                showToast('Sample vault loaded (top holder style). All flows work on real data.');
              }}
              className="px-5 py-2 rounded-xl border border-white/20 text-sm hover:bg-white/5 active:bg-white/10"
            >
              Load Top Holder Sample
            </button>
            <button
              onClick={() => {
                const newBal = nativeMT.balance + 25000000;
                updateAsset('MT', newBal);
                showToast('Received 25M Native MT from faucet (demo)');
              }}
              className="px-5 py-2 rounded-xl border border-emerald-400/40 text-sm text-emerald-400 hover:bg-emerald-400/5"
            >
              + Receive Native MT
            </button>
          </div>
        </div>

        {/* Asset breakdown — clean management view */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {assets.map((asset, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              className="rounded-3xl border border-white/10 bg-white/[0.015] p-6 flex flex-col"
            >
              <div className="flex items-center gap-3">
                {asset.logo ? (
                  <img src={asset.logo} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full" style={{ background: asset.color }} />
                )}
                <div>
                  <div className="font-semibold tracking-tight">{asset.name}</div>
                  <div className="text-[10px] opacity-60">{asset.chain}</div>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <div className="font-mono text-3xl tracking-[-1.2px] tabular-nums">
                  {asset.balance.toLocaleString()}
                </div>
                <div className="text-xs opacity-60 mt-1">
                  {asset.symbol === 'MT' || asset.symbol === '$MT'
                    ? `$${(asset.balance * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : asset.symbol === 'ROCKET' ? `$${(asset.balance * 0.008).toFixed(0)} est.` : 'Collectibles'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* The good stuff: actual management flows */}
        <div>
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">ONE-PLACE MANAGEMENT FLOWS</div>
          <div className="text-2xl font-semibold tracking-tight mb-6">Do more than watch. Act directly.</div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {flows.map((f) => (
              <button
                key={f.key}
                onClick={() => startFlow(f.key)}
                className="group text-left rounded-3xl border border-white/10 bg-white/[0.015] p-6 hover:border-emerald-400/40 hover:bg-white/[0.025] transition-all active:scale-[0.985]"
              >
                <div className="text-2xl mb-4">{f.icon}</div>
                <div className="font-semibold tracking-tight text-lg mb-1.5 group-hover:text-emerald-400 transition">{f.title}</div>
                <p className="text-sm opacity-70 leading-relaxed">{f.desc}</p>
                <div className="mt-4 text-[10px] tracking-widest text-emerald-400/70 group-hover:text-emerald-400">RUN FLOW →</div>
              </button>
            ))}
          </div>

          {/* Active flow simulator — the "better than coinledger" part */}
          <AnimatePresence>
            {activeFlow && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/70 p-8 overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-emerald-400 text-xs tracking-[2px]">LIVE FLOW SIMULATOR</div>
                    <div className="text-2xl font-semibold tracking-tight mt-1">
                      {flows.find(f => f.key === activeFlow)?.title}
                    </div>
                  </div>
                  <button onClick={closeFlow} className="text-xs opacity-60 hover:opacity-100">CLOSE</button>
                </div>

                {/* Bridge flow */}
                {activeFlow === 'bridge' && (
                  <div className="mt-6 space-y-6">
                    <div className="flex gap-4">
                      <button onClick={() => setFlowData({ direction: 'native-to-spl' })} className={`flex-1 rounded-2xl p-4 border ${flowData.direction === 'native-to-spl' ? 'border-emerald-400 bg-emerald-400/5' : 'border-white/10'}`}>
                        Native MT → SPL $MT
                      </button>
                      <button onClick={() => setFlowData({ direction: 'spl-to-native' })} className={`flex-1 rounded-2xl p-4 border ${flowData.direction === 'spl-to-native' ? 'border-emerald-400 bg-emerald-400/5' : 'border-white/10'}`}>
                        SPL $MT → Native MT
                      </button>
                    </div>

                    <div>
                      <div className="text-xs opacity-60 mb-2">AMOUNT (smallest units)</div>
                      <input
                        type="range"
                        min="1000000"
                        max={flowData.direction === 'native-to-spl' ? nativeMT.balance : splMT.balance}
                        step="1000000"
                        value={flowData.amount || 5000000}
                        onChange={(e) => setFlowData({ ...flowData, amount: parseInt(e.target.value) })}
                        className="w-full accent-emerald-400"
                      />
                      <div className="font-mono text-xl mt-2 tabular-nums">{(flowData.amount || 5000000).toLocaleString()}</div>
                    </div>

                    <button
                      onClick={() => completeStep({ amount: flowData.amount || 5000000 })}
                      disabled={!flowData.direction}
                      className="w-full py-4 rounded-2xl bg-white text-black font-semibold tracking-wider disabled:opacity-40"
                    >
                      SIGN &amp; EXECUTE BRIDGE (local keys • demo)
                    </button>
                    <div className="text-[10px] opacity-50 text-center">Real version uses our mt-core burn + verifier. No Wormhole. Your seed never touches a server.</div>
                  </div>
                )}

                {/* Harvest flow */}
                {activeFlow === 'harvest' && (
                  <div className="mt-6">
                    <div className="mb-4">Choose TAP experience</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {['Cosmic Dash (Rockets)', 'Neon Salvage', 'MT Companions (NFT boost)'].map((g, i) => (
                        <button key={i} onClick={() => completeStep({ earned: 140 + i * 60 + Math.floor(Math.random() * 80) })} className="rounded-2xl border border-white/10 p-4 text-left hover:bg-white/5">
                          {g}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs mt-4 opacity-60">Rockets are auto-deposited to your INFINITE WALLET vault. Real utility across the ecosystem.</div>
                  </div>
                )}

                {/* Swap flow (lighter) */}
                {activeFlow === 'swap' && (
                  <div className="mt-6 space-y-4">
                    <p className="opacity-80">Swap any supported asset inside the wallet using Jupiter routing. You sign. We never see keys.</p>
                    <button onClick={() => completeStep()} className="mt-2 w-full py-4 rounded-2xl bg-emerald-400 text-black font-semibold">EXECUTE DEMO SWAP • SIGN LOCALLY</button>
                  </div>
                )}

                {/* Report flow — the "better" part */}
                {activeFlow === 'report' && (
                  <div className="mt-6">
                    <p className="opacity-80 mb-4">Generate a cryptographically verifiable report that includes Native MT transactions (from our node), SPL activity, Rockets earnings, and NFT provenance. Far beyond simple price trackers.</p>
                    <button onClick={() => completeStep()} className="w-full py-4 rounded-2xl border border-white/30 font-medium">GENERATE ON-CHAIN VERIFIED REPORT</button>
                    <div className="text-[10px] mt-3 opacity-50">Includes merkle-style proofs from mt-core. Exportable. Future: direct tax filing connectors.</div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center">
          <a href="https://infinite-wallet.vercel.app/" target="_blank" className="inline-block text-sm px-8 py-3 rounded-2xl border border-white/30 hover:bg-white/5">LAUNCH INFINITE WALLET TO RUN THESE FLOWS FOR REAL →</a>
          <div className="text-[10px] mt-3 opacity-50">All balances, NFTs, and Rockets live forever in your self-custodial vault. No third parties. Infinite possibilities.</div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-400 text-black px-6 py-2 rounded-2xl text-sm font-medium shadow-xl z-50">
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
