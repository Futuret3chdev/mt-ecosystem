'use client';

import { LINKS } from '@/lib/constants';

export default function WalletPromo() {
  return (
    <section className="py-20 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-10 items-center">
          <div>
            <div className="uppercase text-emerald-400 text-xs tracking-[3px] mb-2">START HERE</div>
            <div className="text-5xl font-semibold tracking-[-1.8px] leading-none">Your keys.<br />Your chain.<br />Your wallet.</div>
            <p className="mt-6 text-lg opacity-70 max-w-md">INFINITE WALLET is the official gateway. Full control. Built from the ground up for the MT-ECO SYSTEM by Futuret3ch and MemeTorrent. Looks and feels like the best — because we made it. Infinite possibilities.</p>

            <a href={LINKS.wallet} target="_blank" className="mt-8 inline-block px-9 py-4 rounded-2xl bg-white text-black font-semibold text-sm tracking-wider">LAUNCH INFINITE WALLET</a>
            <div className="text-xs mt-3 opacity-50">Opens the preview copy at https://mt.futuret3ch.com.au/ (sign-in coming soon)</div>
          </div>

          <div className="rounded-3xl border border-white/10 p-8 bg-zinc-950/60 text-sm">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="font-mono text-emerald-400 text-xs mb-1">CORE</div>
                <ul className="space-y-1.5 opacity-80">
                  <li>Email + Phone account (real signup)</li>
                  <li>Multiple wallets per account</li>
                  <li>Access the same wallets from any device</li>
                  <li>Live MT native + Solana $MT balances</li>
                </ul>
              </div>
              <div>
                <div className="font-mono text-emerald-400 text-xs mb-1">LIVE &amp; REAL</div>
                <ul className="space-y-1.5 opacity-80">
                  <li>Mint real on-chain NFTs in wallet</li>
                  <li>Buy / Sell $MT fully inside the wallet (Jupiter routing, your keys sign)</li>
                  <li>Rockets (cross-game utility)</li>
                  <li>Self-built everything — no fake metrics</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-xs text-emerald-400/80">Login with email/phone on any device. Keys stay encrypted &amp; client-side.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
