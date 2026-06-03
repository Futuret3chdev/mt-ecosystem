'use client';

import { motion } from 'framer-motion';

const TAP_FEATURES = [
  { name: 'TAP Shop', desc: 'In-game & cross-game item marketplace powered by INFINITE WALLET. Buy, sell, trade with $MT or Rockets.' },
  { name: 'TAP Match', desc: 'Skill-based PvP & co-op matchmaking. Earn Rockets on-chain. Anti-cheat via our node.' },
  { name: 'TAP Transport', desc: 'Seamless asset & identity bridging between games & chains. Self-built, no third parties.' },
  { name: 'TAP Studio', desc: 'Creator tools: mint NFTs, design Rockets rewards, launch mini-games. 1¢ fees.' },
];

const NFTS_GAMES = [
  { title: 'Cosmic Dash', type: 'Game', status: 'Live • Earn Rockets' },
  { title: 'Neon Salvage', type: 'Game', status: 'Live • NFT Rewards' },
  { title: 'MT Companions', type: 'NFT Collection', status: 'Minting Now • 1¢ fee' },
  { title: 'Rockets Pass', type: 'Utility NFT', status: 'Season 1 • Boost earnings' },
  { title: 'Future: TAP Arena', type: 'Game', status: 'Q3 • Multi-chain' },
  { title: 'Future: Bridge Quests', type: 'NFT + Game', status: 'Coming • 100+ chains' },
];

export default function TapEcosystem() {
  return (
    <section id="tap" className="py-20 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-xs tracking-[3px] text-emerald-400 mb-3">TAP ECO SYSTEM — COMING SOON</div>
        <div className="text-4xl font-semibold tracking-[-1.5px] max-w-3xl mb-4">
          Games. NFTs. Utilities. All powered by INFINITE WALLET.
        </div>
        <p className="max-w-2xl opacity-70 mb-10">
          The full TAP ecosystem: shop, match, transport, studio — everything on-chain, self-built, infinite possibilities.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {TAP_FEATURES.map((f, i) => (
            <div key={i} className="rounded-3xl border border-white/10 p-7 bg-white/[0.015]">
              <div className="font-semibold text-xl mb-2 tracking-tight">{f.name}</div>
              <p className="text-sm opacity-70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-4">LIVE &amp; UPCOMING • NFTS + GAMES</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NFTS_GAMES.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl border border-white/10 p-5 bg-zinc-950/60 flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold tracking-tight">{item.title}</div>
                  <div className="text-xs opacity-60 mt-1">{item.type}</div>
                </div>
                <div className="mt-6 text-emerald-400 text-xs tracking-widest">{item.status}</div>
              </motion.div>
            ))}
          </div>
          <div className="text-center text-xs mt-6 opacity-50">All assets live forever in your INFINITE WALLET. Mint, earn, bridge, trade — no third parties.</div>
        </div>
      </div>
    </section>
  );
}
