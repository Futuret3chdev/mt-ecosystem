'use client';

import Link from 'next/link';

export default function DevelopersPage() {
  const downloads = [
    { label: 'SOFTWARE', desc: 'Desktop tools & SDKs' },
    { label: 'ANDROID', desc: 'Mobile integration library' },
    { label: 'IOS', desc: 'iOS SDK & examples' },
    { label: 'BROWSER EXTENSIONS', desc: 'Wallet & dApp extensions' },
  ];

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">FOR BUILDERS</div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-1.6px] mb-4">Develop on MT-ECO SYSTEM</h1>
        <p className="opacity-70 max-w-2xl mb-8">
          Build applications, games, tools, bridges and extensions that integrate directly with the self-built MT network, 
          INFINITE WALLET, native $MT token, Rockets economy, and on-chain NFTs.
        </p>

        <div className="rounded-3xl border border-white/10 bg-white/[0.015] p-6 sm:p-8 mb-10">
          <div className="text-sm font-semibold tracking-tight mb-3">Licenses</div>
          <p className="text-sm opacity-70 leading-relaxed mb-4">
            To develop on MT-ECO SYSTEM you will need the appropriate licenses for the core components, 
            node software, SDKs and integration modules. All development happens against our self-hosted infrastructure.
          </p>
          <div className="text-xs opacity-60">Full license details and access requirements will be provided with the developer resources.</div>
        </div>

        <div>
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">RESOURCES &amp; DOWNLOADS</div>
          <div className="text-2xl font-semibold tracking-tight mb-6">Coming Soon</div>

          <div className="grid sm:grid-cols-2 gap-4">
            {downloads.map((item, i) => (
              <div 
                key={i} 
                className="rounded-2xl border border-white/10 bg-white/[0.01] p-5 opacity-50 cursor-not-allowed"
              >
                <div className="font-semibold tracking-tight mb-1">{item.label}</div>
                <div className="text-sm opacity-70 mb-4">{item.desc}</div>
                <div className="inline-block px-4 py-2 text-xs rounded-xl border border-white/20">Download (Coming Soon)</div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs opacity-50">
            All developer tools, SDKs, documentation and example code are in active preparation. 
            Check back here or watch the official channels for updates.
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/10 text-sm">
          <a href="/whitepaper" className="text-emerald-400 hover:underline">Read the $MT Whitepaper →</a>
          <div className="mt-2 opacity-60">Core architecture, token mechanics and integration concepts are documented there.</div>
        </div>
      </div>

      <div className="border-t border-white/10 py-8 text-center text-[10px] opacity-40">
        <Link href="/" className="hover:text-white">← Back to MT ECO SYSTEM</Link>
      </div>
    </main>
  );
}
