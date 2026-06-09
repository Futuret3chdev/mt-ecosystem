'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WhitepaperPage() {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    { 
      title: "Introduction", 
      content: "The MT ECO SYSTEM is a self-built, self-hosted on-chain network powered by the native $MT token. No third parties. Infinite possibilities. Everything from the node to the wallet to the bridges is built in-house." 
    },
    { 
      title: "Tokenomics", 
      content: "1,000,000,000 TOTAL SUPPLY. Presale 18%, Liquidity 10%, Staking 20%, Mining 45%, Airdrops 4%, Development 2.5%, Team 0.5%. All details in the full document. $MT is the universal access key across the entire ecosystem." 
    },
    { 
      title: "Utility", 
      content: "$MT is the universal key for P2E Mining, NFT Digital Identity, Physical/Digital Store, MT-CHAIN (coming), Weekly Drops, Safety layer, Launchpad Access, and Vault & Rewards. Real utility that powers games, identity and commerce." 
    },
    { 
      title: "Technology", 
      content: "Self-built node, INFINITE WALLET, bridges, NFTs, Rockets economy. Client-side keys and signing. On-chain proofs. Fixed 1¢ fees. No rented chains, no rented wallets, no rented trust. The best chain is the one you fully own." 
    },
  ];

  const goToPage = (index: number) => {
    setCurrentPage((index + pages.length) % pages.length);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return (
    <main className="min-h-screen">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">OFFICIAL DOCUMENT</div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-1.6px]">MT ECO SYSTEM Whitepaper</h1>
          <p className="mt-2 opacity-70">Interactive flip book • Turn the pages. Open the full PDF anytime.</p>
        </div>

        {/* Our own custom interactive flip book (no watermarks) */}
        <div className="relative mx-auto max-w-3xl">
          <div className="relative bg-gradient-to-br from-zinc-950 via-black to-zinc-950 border border-white/10 rounded-3xl p-8 sm:p-12 min-h-[520px] shadow-2xl overflow-hidden">
            {/* Book spine / decorative elements */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400/30 via-emerald-400/10 to-emerald-400/30" />
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white/5 to-transparent" />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 40, rotateY: 8 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: -40, rotateY: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div className="text-xs tracking-[3px] opacity-50 mb-2">PAGE {currentPage + 1} OF {pages.length}</div>
                <div className="text-3xl sm:text-4xl font-semibold tracking-[-1.2px] mb-6 text-emerald-400/90">
                  {pages[currentPage].title}
                </div>
                <div className="text-lg sm:text-xl leading-relaxed opacity-85 max-w-[46ch]">
                  {pages[currentPage].content}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Page turn controls - book style */}
            <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between">
              <button
                onClick={prevPage}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-white/15 text-sm hover:border-emerald-400/40 hover:text-emerald-400 transition active:scale-[0.985]"
              >
                <span className="group-hover:-translate-x-0.5 transition">←</span> PREVIOUS PAGE
              </button>

              <div className="flex gap-1.5">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === currentPage ? 'bg-emerald-400 w-5' : 'bg-white/20 hover:bg-white/40'}`}
                    aria-label={`Go to page ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={nextPage}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-white/15 text-sm hover:border-emerald-400/40 hover:text-emerald-400 transition active:scale-[0.985]"
              >
                NEXT PAGE <span className="group-hover:translate-x-0.5 transition">→</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a 
              href="https://memetorrent.futuret3ch.com.au/whitepaper.pdf" 
              target="_blank" 
              className="inline-block px-8 py-3 rounded-2xl bg-white text-black font-semibold tracking-wider text-sm min-h-[44px] flex items-center justify-center hover:bg-white/90 transition"
            >
              OPEN FULL WHITEPAPER PDF →
            </a>
            <div className="text-[10px] mt-3 opacity-50">Tap arrows or page dots to flip • No watermarks • Self-hosted document viewer</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-8 text-center text-[10px] opacity-40">
        <Link href="/" className="hover:text-white">← Back to MT ECO SYSTEM</Link>
      </div>
    </main>
  );
}
