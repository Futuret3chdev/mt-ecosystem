'use client';

import Link from 'next/link';

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Consistent site header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <Link href="/" className="font-semibold tracking-tight flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-emerald-400">MT</span> ECO SYSTEM
          </Link>
          <div className="flex items-center gap-3 sm:gap-6 text-sm">
            <Link href="/" className="opacity-70 hover:opacity-100">Back to Home</Link>
            <a href="https://mt.futuret3ch.com.au/" target="_blank" className="font-medium px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-white/30 hover:bg-white/5 text-xs sm:text-sm">Launch Infinite Wallet</a>
          </div>
        </div>
      </div>

      {/* Simplified header focused on Download White Paper */}
      <div className="text-center py-8 border-b border-white/10">
        <a 
          href="https://memetorrent.futuret3ch.com.au/whitepaper.pdf" 
          target="_blank" 
          className="inline-block px-8 py-3 rounded-2xl bg-emerald-400 text-black font-semibold tracking-wider text-sm hover:bg-emerald-300 active:scale-[0.985] transition"
        >
          Download White Paper (PDF)
        </a>
      </div>

      {/* The Embedded Flipbook (user's custom flipbook.html) */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
        {/* Fancy frame around the flipbook */}
        <div className="relative rounded-3xl border border-white/10 bg-zinc-950/70 p-3 sm:p-4 shadow-2xl overflow-hidden">
          {/* Subtle inner glow / book frame effect */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl ring-1 ring-inset ring-white/5" />
          
          <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#FAF8F5]" style={{ boxShadow: '0 25px 60px -15px rgb(0 0 0 / 0.5), inset 0 1px 0 0 rgb(255 255 255 / 0.05)' }}>
            <iframe 
              src="/whitepaper/flipbook.html" 
              className="w-full block"
              style={{ 
                height: '78vh', 
                minHeight: '620px',
                border: 'none',
                background: '#FAF8F5'
              }}
              title="MT ECO SYSTEM $MT Whitepaper Interactive Flipbook"
              allow="fullscreen"
            />
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-white/10 py-8 text-center text-[10px] opacity-40">
        <Link href="/" className="hover:text-white hover:underline">← Back to MT ECO SYSTEM</Link>
      </div>
    </main>
  );
}
