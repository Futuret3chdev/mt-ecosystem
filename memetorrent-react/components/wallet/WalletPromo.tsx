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
            <p className="mt-6 text-lg opacity-70 max-w-md">MT Wallet is the official gateway. Full control. Built from the ground up for the MT ECO SYSTEM. Looks and feels like the best — because we made it.</p>

            <a href={LINKS.wallet} target="_blank" className="mt-8 inline-block px-9 py-4 rounded-2xl bg-white text-black font-semibold text-sm tracking-wider">LAUNCH MT WALLET</a>
            <div className="text-xs mt-3 opacity-50">Opens the production wallet at wallet.futuret3ch.com.au</div>
          </div>

          <div className="rounded-3xl border border-white/10 p-8 bg-zinc-950/60 text-sm">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="font-mono text-emerald-400 text-xs mb-1">CORE</div>
                <ul className="space-y-1.5 opacity-80">
                  <li>Seed phrase + password vault (AES encrypted)</li>
                  <li>Local ed25519 signing (matches our node)</li>
                  <li>Send / Receive with QR</li>
                  <li>Live MT native balance + Solana $MT</li>
                </ul>
              </div>
              <div>
                <div className="font-mono text-emerald-400 text-xs mb-1">UNIQUE TO MT</div>
                <ul className="space-y-1.5 opacity-80">
                  <li>Mint NFTs directly in wallet</li>
                  <li>Rockets balance (game earnings)</li>
                  <li>Self-built Solana bridge stub</li>
                  <li>Zero third-party custody ever</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-xs text-emerald-400/80">Future: Hardware wallet support, browser extension, in-wallet game launcher, full cross-chain.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
