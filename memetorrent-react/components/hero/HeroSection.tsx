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
              href="#tokenomics"
              className="inline-flex items-center justify-center px-8 h-12 rounded-2xl border border-white/30 font-medium text-sm hover:bg-white/5"
            >
              VIEW TOKENOMICS
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

      {/* Portal Login — styled like the original memetorrent site */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="text-center mb-4">
          <div className="inline-block px-3 py-0.5 rounded-full border border-white/20 text-xs tracking-[2px] text-emerald-400">PORTAL ACCESS</div>
          <div className="text-2xl font-semibold tracking-tight mt-1">Enter the MT Eco System</div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Email only style */}
          <form onSubmit={(e) => { e.preventDefault(); alert('Entered MT Eco System (demo login). Use INFINITE WALLET for full self-custodial access.'); }} className="rounded-3xl border border-white/10 bg-black/60 p-6">
            <div className="text-sm font-semibold mb-4 tracking-widest opacity-80">Enter the MT Eco System</div>
            <div className="space-y-4">
              <div>
                <div className="text-xs opacity-60 mb-1">Email:</div>
                <input type="email" defaultValue="jason.c@futuret3ch.com.au" className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-400/50" />
              </div>
              <div>
                <div className="text-xs opacity-60 mb-1">Password:</div>
                <input type="password" defaultValue="•••••••••••" className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-400/50" />
              </div>
            </div>
            <button type="submit" className="mt-5 w-full py-2.5 rounded-2xl border border-white/30 text-sm hover:bg-white/5">ENTER PORTAL</button>
          </form>

          {/* Username + Email style */}
          <form onSubmit={(e) => { e.preventDefault(); alert('Entered MT Eco System (demo login). Use INFINITE WALLET for full self-custodial access.'); }} className="rounded-3xl border border-white/10 bg-black/60 p-6">
            <div className="text-sm font-semibold mb-4 tracking-widest opacity-80">Enter the MT Eco System</div>
            <div className="space-y-4">
              <div>
                <div className="text-xs opacity-60 mb-1">Username:</div>
                <input type="text" defaultValue="testuser1" className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-400/50" />
              </div>
              <div>
                <div className="text-xs opacity-60 mb-1">Email:</div>
                <input type="email" defaultValue="wallet@email.com" className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-400/50" />
              </div>
              <div>
                <div className="text-xs opacity-60 mb-1">Password:</div>
                <input type="password" defaultValue="" placeholder="•••••••••••" className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-400/50" />
              </div>
            </div>
            <button type="submit" className="mt-5 w-full py-2.5 rounded-2xl border border-white/30 text-sm hover:bg-white/5">ENTER PORTAL</button>
          </form>
        </div>
        <div className="text-center text-[10px] mt-3 opacity-50">Demo only. Real access &amp; flows live in INFINITE WALLET.</div>
      </div>
    </section>
  );
}
