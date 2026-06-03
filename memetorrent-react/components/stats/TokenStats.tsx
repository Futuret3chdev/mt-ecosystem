'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTokenStats, getTopHolders, MTStatsRaw, Holder } from '@/lib/api';

// 100+ chains we plan to bridge with (logos via public or text for now)
const BRIDGE_CHAINS = [
  'Solana', 'Ethereum', 'Base', 'Arbitrum', 'Optimism', 'Polygon', 'Avalanche', 'BSC',
  'Bitcoin', 'Cardano', 'Polkadot', 'Cosmos', 'Near', 'Aptos', 'Sui', 'Sei',
  'TON', 'Tron', 'Fantom', 'Gnosis', 'Linea', 'Scroll', 'Blast', 'Mode',
  'Mantle', 'zkSync', 'Starknet', 'Celestia', 'Injective', 'Osmosis', 'dYdX', 'Juno',
  'Kava', 'Akash', 'Secret', 'Persistence', 'Stride', 'Quicksilver', 'Neutron', 'Archway',
  'Berachain', 'Monad', 'Movement', 'Eclipse', 'Hyperliquid', 'Kamino', 'Jito', 'Drift',
  'Tensor', 'Magic Eden', 'Metaplex', 'Helium', 'Render', 'Akord', 'Filecoin', 'Arweave',
  'The Graph', 'Chainlink', 'Pyth', 'Wormhole', 'LayerZero', 'Axelar', 'CCIP', 'deBridge',
  'Across', 'Synapse', 'Hop', 'Connext', 'Orbiter', 'Socket', 'LI.FI', 'Rango',
  '1inch', '0x', 'Paraswap', 'CowSwap', 'Uniswap', 'Sushi', 'Curve', 'Balancer',
  'Aave', 'Compound', 'Maker', 'Spark', 'Morpho', 'Pendle', 'Ethena', 'EigenLayer',
  'Symbiotic', 'Karak', 'Renzo', 'Puffer', 'Mantle', 'Blast', 'Zora', 'Farcaster',
  'Lens', 'Friend.tech', 'Pump.fun', 'Moonshot', 'Believe', 'Clanker', 'Bags', 'Moon',
  'And 40+ more L1s/L2s coming via our self-built bridge verifier...'
];

export default function TokenStats() {
  const [stats, setStats] = useState<MTStatsRaw | null>(null);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [showHolders, setShowHolders] = useState(false);
  const [loadingHolders, setLoadingHolders] = useState(false);

  useEffect(() => {
    getTokenStats().then(setStats).catch(console.error);
    const i = setInterval(() => {
      getTokenStats().then(setStats).catch(console.error);
    }, 15000);

    return () => clearInterval(i);
  }, []);

  const loadHolders = async () => {
    if (holders.length > 0) {
      setShowHolders(!showHolders);
      return;
    }
    setLoadingHolders(true);
    try {
      const h = await getTopHolders();
      setHolders(h);
      setShowHolders(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHolders(false);
    }
  };

  if (!stats) return null;

  const priceNum = parseFloat(stats.price || '0');
  const marketCapNum = parseFloat((stats.market_cap || '$0').replace(/[$,]/g, ''));

  return (
    <section className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto px-6"
      >
        <div
          className="rounded-3xl p-8 border border-white/10 bg-white/[0.015] cursor-pointer"
          onClick={loadHolders}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-emerald-400 text-xs tracking-[3px] mb-1">LIVE ON SOLANA • PUMP.FUN</div>
              <div className="text-4xl font-semibold tracking-tight">MT Token Stats</div>
              <div className="text-xs opacity-60 mt-1">Tap for top holders • Auto-refreshes every 15s</div>
            </div>
            <div className="text-right text-xs opacity-60">
              {stats.name} ({stats.symbol})<br />
              24h Buys/Sells: {stats.total_buys || 0}/{stats.total_sells || 0}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Stat label="Price" value={`$${stats.price}`} sub={`~${(priceNum * 1e9).toFixed(0)} per 1B`} />
            <Stat label="Market Cap" value={stats.market_cap} sub={marketCapNum > 0 ? `FDV ~${stats.market_cap}` : ''} />
            <Stat label="Total Supply" value={stats.total_supply} sub="1T max • Burnable" />
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-4 text-xs opacity-70">
            <div>24h Buy Vol: {stats.total_buy_volume}</div>
            <div>24h Sell Vol: {stats.total_sell_volume}</div>
            <div className="text-emerald-400">Click box for live top 10 holders →</div>
          </div>

          <AnimatePresence>
            {showHolders && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 overflow-hidden"
              >
                <div className="text-xs uppercase tracking-widest mb-3 opacity-60">Top 10 Holders (on-chain)</div>
                {loadingHolders ? (
                  <div className="text-sm opacity-60">Loading holders from Solana RPC...</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {holders.length > 0 ? holders.map((h, i) => (
                      <div key={i} className="flex justify-between bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                        <span className="truncate text-emerald-300/80">{h.address.slice(0, 6)}...{h.address.slice(-4)}</span>
                        <span className="tabular-nums text-right">{h.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    )) : <div className="opacity-60">No holder data (RPC fallback used)</div>}
                  </div>
                )}
                <div className="text-[10px] mt-2 opacity-50">Data via public Solana RPCs + DexScreener. Not financial advice.</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Marquee of 100+ bridge chains - infinite possibilities */}
          <div className="mt-8 pt-6 border-t border-white/10 overflow-hidden">
            <div className="text-xs uppercase tracking-[3px] opacity-60 mb-3">COMING SOON: SELF-BUILT BRIDGES TO 100+ CHAINS</div>
            <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
              <div className="flex animate-[marquee_40s_linear_infinite] gap-8 text-sm opacity-80 whitespace-nowrap">
                {[...BRIDGE_CHAINS, ...BRIDGE_CHAINS].map((chain, idx) => (
                  <span key={idx} className="flex items-center gap-2 px-4 py-1 rounded-full border border-white/10 bg-white/5">
                    🌐 {chain}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-[10px] mt-2 opacity-50 text-center">Tap • Shop • Match • Transport • And dozens more utilities across chains</div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5 bg-black/30">
      <div className="text-xs uppercase tracking-wide opacity-60 mb-1">{label}</div>
      <div className="text-3xl font-semibold tabular-nums tracking-[-1px]">{value}</div>
      {sub && <div className="text-xs opacity-50 mt-1">{sub}</div>}
    </div>
  );
}
