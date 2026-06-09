'use client';

import { motion } from 'framer-motion';

const TAP_FEATURES = [
  { name: 'TAP Shop', desc: 'In-game & cross-game item marketplace powered by INFINITE WALLET. Buy, sell, trade with $MT or Rockets.' },
  { name: 'TAP Match', desc: 'Skill-based PvP & co-op matchmaking. Earn Rockets on-chain. Anti-cheat via our node.' },
  { name: 'TAP Transport', desc: 'Seamless asset & identity bridging between games & chains. Self-built, no third parties.' },
  { name: 'TAP Studio', desc: 'Creator tools: mint NFTs, design Rockets rewards, launch mini-games. 1¢ fees.' },
];

const NFTS_GAMES = [
  { title: 'Pet', type: 'Game', status: 'Live • Virtual Pets', desc: 'Adopt and raise unique digital pets. Interact, breed, and earn $MT and Rockets through daily care and adventures in the MT ecosystem.' },
  { title: 'Marketplace', type: 'Game', status: 'Live • Trade & Auction', desc: 'Decentralized marketplace for buying, selling, and auctioning pets, NFTs, and in-game items powered by $MT.' },
  { title: 'Soccer', type: 'Game', status: 'Live • Team Matches', desc: 'Build your dream team and compete in fast-paced soccer matches. Earn Rockets, NFTs, and climb global leaderboards.' },
  { title: 'Puck', type: 'Game', status: 'Live • Strategic Sports', desc: 'High-energy puck-based gameplay with team strategy, power plays, and on-chain rewards for winners.' },
  { title: 'Tap', type: 'Game', status: 'Live • Core Progression', desc: 'The foundational tapping experience for earning Rockets, unlocking features, and progressing in the MT world.' },
  { title: 'Pacman', type: 'Arcade', status: 'Live • Maze Action', desc: 'Classic maze-chomping arcade fun with MT-themed power-ups, collectibles, and competitive scoring.' },
  { title: 'Tetrismob', type: 'Arcade', status: 'Live • Block Stacking', desc: 'Strategic block placement with combos, power-ups, and seasonal events that reward on-chain achievements.' },
  { title: 'Racer', type: 'Game', status: 'Live • High-Speed Racing', desc: 'Customizable NFT vehicle racing with upgrades, multiplayer races, and Rocket earnings for top drivers.' },
  { title: 'Tetris', type: 'Arcade', status: 'Live • Classic Blocks', desc: 'Timeless block-stacking action with modern MT twists, leaderboards, and exclusive NFT rewards.' },
  { title: 'FruitNinja', type: 'Arcade', status: 'Live • Slicing Fun', desc: 'Addictive fruit-slicing arcade with combos, special items, and on-chain progression systems.' },
  { title: 'Dash', type: 'Game', status: 'Live • Endless Runner', desc: 'Fast-paced endless running with character unlocks, power-ups, and collectible Rockets along the way.' },
  { title: 'Chicken', type: 'Game', status: 'Live • Farm Adventure', desc: 'Humorous chicken-themed runner and collector game with unique MT ecosystem twists and rewards.' },
  { title: 'Clubpool', type: 'Game', status: 'In Development • Multiplayer Pool', desc: 'Strategic billiards and pool gameplay with friends, tournaments, and $MT-powered betting mechanics.' },
  { title: 'MT WORLD', type: 'Game', status: 'In Development • Open Metaverse', desc: 'Explore, build, and socialize in the expansive MT metaverse with on-chain land ownership and assets.' },
  { title: 'NEON SALVAGE', type: 'Game', status: 'Live • Neon Crafting', desc: 'Salvage resources, craft items, and survive in vibrant neon worlds while earning NFTs and Rockets.' },
  { title: 'BLOCKCRAFT', type: 'Game', status: 'In Development • Creative World', desc: 'Build and craft in a block-based universe. Own your creations as NFTs and collaborate on-chain with others.' },
  { title: 'Artillery', type: 'Strategy', status: 'In Development • Tactical Combat', desc: 'Projectile and angle-based combat gameplay for tactical and competitive play sessions.' },
  { title: 'Astroids', type: 'Arcade', status: 'In Development • Space Survival', desc: 'Space arcade action inspired by classic asteroid-dodging and survival mechanics.' },
  { title: 'BlackJack', type: 'Cards', status: 'Planned • Casino Variety', desc: 'Card-based gameplay module intended to add casino-style variety to the ecosystem.' },
  { title: 'Block Kuzushi', type: 'Arcade', status: 'In Development • Brick Breaker', desc: 'Brick-breaking arcade gameplay designed for fast sessions and progression-based scoring.' },
  { title: 'GunaDuck', type: 'Action', status: 'Planned • Humorous Arcade', desc: 'Action-based arcade concept expanding the humor and variety of the MT games catalog.' },
  { title: 'EmojiSaviour', type: 'Reaction', status: 'In Development • Mobile Rescue', desc: 'Emoji-based reaction and rescue gameplay aimed at mobile-friendly engagement.' },
];

export default function TapEcosystem() {
  return (
    <section id="tap" className="py-12 sm:py-20 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-xs tracking-[3px] text-emerald-400 mb-3">TAP ECO SYSTEM — COMING SOON</div>
        <div className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-1.5px] max-w-3xl mb-3 sm:mb-4">
          Games. NFTs. Utilities. All powered by INFINITE WALLET.
        </div>
        <p className="max-w-2xl opacity-70 mb-8 sm:mb-10 text-sm sm:text-base">
          The full TAP ecosystem: shop, match, transport, studio — everything on-chain, self-built, infinite possibilities.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10 sm:mb-16">
          {TAP_FEATURES.map((f, i) => (
            <div key={i} className="rounded-3xl border border-white/10 p-7 bg-white/[0.015]">
              <div className="font-semibold text-xl mb-2 tracking-tight">{f.name}</div>
              <p className="text-sm opacity-70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-4">LIVE &amp; UPCOMING • NFTS + GAMES</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {NFTS_GAMES.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl border border-white/10 p-5 bg-zinc-950/60 flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold tracking-tight">{item.title}</div>
                  <div className="text-xs opacity-60 mt-1">{item.type}</div>
                  <p className="mt-2 text-xs opacity-70 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-4 text-emerald-400 text-xs tracking-widest">{item.status}</div>
              </motion.div>
            ))}
          </div>
          <div className="text-center text-xs mt-6 opacity-50">All assets live forever in your INFINITE WALLET. Mint, earn, bridge, trade — no third parties.</div>
        </div>
      </div>
    </section>
  );
}
