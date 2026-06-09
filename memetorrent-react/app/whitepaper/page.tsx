'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function WhitepaperPage() {
  const [currentPage, setCurrentPage] = useState(0);
  const pages = [
    { title: "Introduction", content: "The MT ECO SYSTEM is a self-built, self-hosted on-chain network powered by the native $MT token. No third parties. Infinite possibilities." },
    { title: "Tokenomics", content: "1,000,000,000 TOTAL SUPPLY. Presale 18%, Liquidity 10%, Staking 20%, Mining 45%, Airdrops 4%, Development 2.5%, Team 0.5%. All details in the full document." },
    { title: "Utility", content: "$MT is the universal key for P2E Mining, NFT Identity, Physical/Digital Store, MT-CHAIN, Weekly Drops, Safety, Launchpad, Vault & Rewards." },
    { title: "Technology", content: "Self-built node, INFINITE WALLET, bridges, NFTs, Rockets economy. Client-side keys, on-chain proofs. 1¢ fees." },
  ];

  const nextPage = () => setCurrentPage((currentPage + 1) % pages.length);
  const prevPage = () => setCurrentPage((currentPage - 1 + pages.length) % pages.length);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <Link href="/" className="font-semibold tracking-tight flex items-center gap-2">
            <span className="text-emerald-400">MT</span> ECO SYSTEM
          </Link>
          <div className="flex items-center gap-3 sm:gap-6 text-sm">
            <Link href="/" className="opacity-70 hover:opacity-100">Back to Home</Link>
            <a href="https://wallet.futuret3ch.com.au/" target="_blank" className="font-medium px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-white/30 hover:bg-white/5 text-xs sm:text-sm">Launch Infinite Wallet</a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">OFFICIAL DOCUMENT</div>
          <h1 className="text-5xl font-semibold tracking-[-1.6px]">MT ECO SYSTEM Whitepaper</h1>
          <p className="mt-2 opacity-70">Interactive viewer • Flip through key sections or open the full PDF</p>
        </div>

        {/* Interactive flip / page viewer */}
        <div className="max-w-2xl mx-auto">
          <div className="relative bg-gradient-to-br from-emerald-900/30 to-black border border-white/20 rounded-3xl p-5 sm:p-8 min-h-[360px] sm:min-h-[420px] flex flex-col">
            <div className="flex-1">
              <div className="text-xs tracking-widest opacity-60 mb-1">PAGE {currentPage + 1} / {pages.length}</div>
              <div className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3 sm:mb-4">{pages[currentPage].title}</div>
              <div className="text-base sm:text-lg opacity-80 leading-relaxed">{pages[currentPage].content}</div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/10">
              <button onClick={prevPage} className="px-5 py-2 min-h-[44px] rounded-2xl border border-white/20 text-sm hover:bg-white/5">← Previous</button>
              <button onClick={nextPage} className="px-5 py-2 min-h-[44px] rounded-2xl border border-white/20 text-sm hover:bg-white/5">Next →</button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <a 
              href="https://memetorrent.futuret3ch.com.au/whitepaper.pdf" 
              target="_blank" 
              className="inline-block px-6 sm:px-8 py-3 rounded-2xl bg-white text-black font-semibold tracking-wider text-sm min-h-[44px] flex items-center justify-center"
            >
              OPEN FULL WHITEPAPER PDF →
            </a>
            <div className="text-[10px] mt-2 opacity-50">Tap arrows to "flip" through key sections. Full document linked above.</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-8 text-center text-[10px] opacity-40">
        <Link href="/" className="hover:text-white">← Back to MT ECO SYSTEM</Link>
      </div>
    </main>
  );
}
