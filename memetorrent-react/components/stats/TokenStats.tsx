'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTokenStats, MTStatsRaw } from '@/lib/api';

// 100+ chains we plan to bridge with. Binance prominently included. Real images (not just names).
const BRIDGE_CHAINS: string[] = [
  'Binance Smart Chain (BSC)',
  'Solana', 'Ethereum', 'Base', 'Arbitrum', 'Optimism', 'Polygon', 'Avalanche',
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
  'Symbiotic', 'Karak', 'Renzo', 'Puffer', 'Zora', 'Farcaster', 'Lens', 'Friend.tech',
  'Pump.fun', 'Moonshot', 'Believe', 'Clanker', 'Bags', 'Moon',
  // More L1s/L2s/DeFi + infra to reach 100+
  'Cronos', 'OKX Chain', 'Celo', 'Moonbeam', 'Harmony', 'Klaytn', 'IoTeX', 'VeChain',
  'Flow', 'Tezos', 'Algorand', 'Hedera', 'Theta', 'EOS', 'Waves', 'ICON',
  'Qtum', 'NEO', 'Zilliqa', 'Elrond', 'Astar', 'Shiden', 'Karura', 'Acala',
  'Phala', 'Unique', 'Quartz', 'Bifrost', 'Interlay', 'Parallel', 'Centrifuge', 'Nodle',
  'Subspace', 'Aleph Zero', 'Kusama', 'Rococo', 'Westend', 'Litentry', 'Robonomics',
  'And dozens more L1s, L2s, app-chains & bridges via our self-built verifier...'
];

function getChainLogo(chain: string): string {
  const key = chain.toLowerCase().replace(/[^a-z]/g, '');
  const logos: Record<string, string> = {
    binancesmartchainbsc: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
    solana: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
    ethereum: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    base: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
    arbitrum: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    optimism: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
    polygon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    avalanche: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
    bitcoin: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
    cardano: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cardano/info/logo.png',
    polkadot: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polkadot/info/logo.png',
    cosmos: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cosmos/info/logo.png',
    near: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/near/info/logo.png',
    aptos: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/aptos/info/logo.png',
    sui: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png',
    sei: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sei/info/logo.png',
    tron: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png',
    fantom: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/info/logo.png',
    gnosis: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/gnosis/info/logo.png',
    linea: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/linea/info/logo.png',
    scroll: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/scroll/info/logo.png',
    blast: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/blast/info/logo.png',
    mantle: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/mantle/info/logo.png',
    zksync: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zksync/info/logo.png',
    starknet: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/starknet/info/logo.png',
    celestia: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celestia/info/logo.png',
    injective: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/injective/info/logo.png',
    osmosis: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/osmosis/info/logo.png',
    dydx: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/dydx/info/logo.png',
    juno: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/juno/info/logo.png',
    kava: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/kava/info/logo.png',
    akash: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/akash/info/logo.png',
    filecoin: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/filecoin/info/logo.png',
    arweave: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arweave/info/logo.png',
    thegraph: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/graph/info/logo.png',
    chainlink: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/chainlink/info/logo.png',
    pyth: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/pyth/info/logo.png',
    wormhole: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/wormhole/info/logo.png',
    layerzero: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/layerzero/info/logo.png',
    axelar: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/axelar/info/logo.png',
    // add more as trustwallet/assets grows; fallback to symbol for the rest
  };
  return logos[key] || '';
}

export default function TokenStats() {
  const [stats, setStats] = useState<MTStatsRaw | null>(null);

  // Only chains that have actual logo images (no names at all in the UI)
  const displayChains = BRIDGE_CHAINS.filter(
    (c) => !c.toLowerCase().includes('more') && !c.toLowerCase().includes('dozens')
  );
  const logoChains = displayChains.filter((c) => !!getChainLogo(c));

  useEffect(() => {
    getTokenStats().then(setStats).catch(console.error);
    const i = setInterval(() => {
      getTokenStats().then(setStats).catch(console.error);
    }, 15000);

    return () => clearInterval(i);
  }, []);

  // Always render the card; use fallbacks if live data fails (e.g. network/DNS issues)
  const safeStats = stats || {
    price: '0.000000012',
    market_cap: '$0',
    total_supply: '1,000,000,000,000',
    name: 'MT',
    symbol: '$MT',
    total_buys: '0',
    total_sells: '0',
    total_buy_volume: '$0',
    total_sell_volume: '$0',
  };

  const priceNum = parseFloat(safeStats.price || '0');
  const marketCapNum = parseFloat((safeStats.market_cap || '$0').replace(/[$,]/g, ''));

  return (
    <section id="stats" className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto px-6"
      >
        <div
          className="rounded-3xl p-5 sm:p-8 border border-white/10 bg-white/[0.015]"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-y-3 mb-6">
            <div>
              <div className="text-emerald-400 text-xs tracking-[3px] mb-1">LIVE ON SOLANA • PUMP.FUN</div>
              <div className="text-3xl sm:text-4xl font-semibold tracking-tight">MT Token Stats</div>
              <div className="text-xs opacity-60 mt-1">Live from DexScreener • Auto-refreshes every 15s</div>
              {/* Contract Address - short display + copy for mobile friendliness */}
              <div className="mt-3 p-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5">
                <div className="text-[10px] opacity-70 mb-0.5 tracking-widest">CONTRACT ADDRESS (COPY)</div>
                <button 
                  onClick={() => navigator.clipboard.writeText('ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump')} 
                  className="font-mono text-sm sm:text-base text-emerald-400 hover:text-emerald-300 active:text-white font-semibold break-all text-left w-full"
                  title="Click to copy full $MT contract"
                >
                  ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump
                </button>
              </div>
            </div>
            <div className="text-left sm:text-right text-xs opacity-60">
              {safeStats.name} ({safeStats.symbol})<br />
              24h Buys/Sells: {safeStats.total_buys || 0}/{safeStats.total_sells || 0}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Stat label="Price" value={`$${safeStats.price}`} sub={`~${(priceNum * 1e9).toFixed(0)} per 1B`} />
            <Stat label="Market Cap" value={safeStats.market_cap} sub={marketCapNum > 0 ? `FDV ~${safeStats.market_cap}` : ''} />
            <Stat label="Total Supply" value={safeStats.total_supply} sub="1T max • Burnable" />
          </div>

          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-white/10 flex flex-col sm:flex-row flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
            <div>24h Buy Vol: {safeStats.total_buy_volume}</div>
            <div>24h Sell Vol: {safeStats.total_sell_volume}</div>
          </div>

          {/* Pure icon logos marquee - only actual logos, no names. Very slow floating + gentle dancing bobs */}
          <div className="mt-8 pt-6 border-t border-white/10 overflow-hidden">
            <div className="text-xs uppercase tracking-[3px] opacity-60 mb-3">COMING SOON: SELF-BUILT BRIDGES TO 100+ CHAINS</div>
            <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)] py-2">
              <div className="flex gap-10 text-sm opacity-75 whitespace-nowrap marquee-scroll">
                {[...logoChains, ...logoChains].map((chain, idx) => {
                  const logo = getChainLogo(chain);
                  if (!logo) return null;
                  return (
                    <img
                      key={idx}
                      src={logo}
                      alt={chain}
                      className="w-7 h-7 md:w-8 md:h-8 object-contain logo-dance"
                      style={{ animationDelay: `-${((idx % 9) * 0.35)}s` }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  );
                })}
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
    <div className="rounded-2xl border border-white/10 p-4 sm:p-5 bg-black/30">
      <div className="text-xs uppercase tracking-wide opacity-60 mb-1">{label}</div>
      <div className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-[-1px]">{value}</div>
      {sub && <div className="text-xs opacity-50 mt-1">{sub}</div>}
    </div>
  );
}
