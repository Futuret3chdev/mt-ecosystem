'use client';

import { motion } from 'framer-motion';
import { LINKS } from '@/lib/constants';

export default function HeroSection() {
  return (
    <section className="min-h-[88vh] flex items-center pt-10">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-x-12 items-center">
        <div className="md:col-span-7">
          <div className="inline-block px-3 py-1 rounded-full border border-white/15 text-xs tracking-[2px] mb-6 text-emerald-400">MT-ECO SYSTEM</div>

          <h1 className="text-6xl md:text-[78px] font-bold leading-[0.92] tracking-[-4.4px]">
            The on-chain<br />network.<br />Built different.
          </h1>

          <p className="mt-8 max-w-lg text-xl opacity-75">
            Own your $MT. Own your wallet. Earn Rockets in games that live forever in your vault.
            1 cent SOL-equivalent fees. No third parties. Everything built in-house.
          </p>

          <div className="flex flex-wrap gap-4 mt-9">
            <a
              href={LINKS.wallet}
              target="_blank"
              className="inline-flex items-center justify-center px-8 h-12 rounded-2xl bg-white text-black font-semibold tracking-wider text-sm active:opacity-90"
            >
              LAUNCH INFINITE WALLET →
            </a>
            <a
              href={LINKS.jupiter}
              target="_blank"
              className="inline-flex items-center justify-center px-8 h-12 rounded-2xl border border-white/30 font-medium text-sm hover:bg-white/5"
            >
              BUY $MT ON JUPITER
            </a>
          </div>

          <div className="mt-8 text-xs opacity-50 font-mono tracking-widest">ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump • FIXED 1¢ FEES • SELF-CUSTODIAL</div>
        </div>

        <div className="md:col-span-5 mt-12 md:mt-0">
          <div className="rounded-3xl p-8 border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="text-xs tracking-[2px] text-emerald-400 mb-3">THE WALLET IS THE GATEWAY</div>
            <div className="text-4xl font-semibold tracking-tight leading-none">INFINITE WALLET<br />For infinite possibilities.<br />Truly ours.</div>

            <ul className="mt-8 space-y-3 text-sm opacity-80">
              <li className="flex gap-3">• 100% self-built. No injected providers.</li>
              <li className="flex gap-3">• Create, import, send, mint NFTs, earn &amp; spend Rockets.</li>
              <li className="flex gap-3">• Native MT chain + Solana $MT + future bridges.</li>
              <li className="flex gap-3">• Keys encrypted locally. Seed never leaves your device.</li>
            </ul>

            <a href={LINKS.wallet} target="_blank" className="mt-8 block text-center py-3 rounded-2xl bg-emerald-400 text-black font-semibold tracking-wider text-sm">OPEN INFINITE WALLET</a>
          </div>
        </div>
      </div>
    </section>
  );
}
