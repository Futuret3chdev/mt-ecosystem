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
            <a href="https://wallet.futuret3ch.com.au/" target="_blank" className="font-medium px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-white/30 hover:bg-white/5 text-xs sm:text-sm">Launch Infinite Wallet</a>
          </div>
        </div>
      </div>

      {/* Fancy Hero Title Section - inspired by the official whitepaper graphics */}
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#0a2a1f] via-black to-black py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-block mb-4 px-4 py-1 rounded-full border border-emerald-400/30 text-emerald-400 text-xs tracking-[3px] font-mono">OFFICIAL DOCUMENT</div>
          
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-[-3.5px] mb-2">
            <span className="text-white">MT ECO SYSTEM</span>
          </h1>
          <div className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-2px] text-emerald-400 mb-4">
            $MT Whitepaper
          </div>
          
          <p className="max-w-2xl mx-auto text-lg sm:text-xl opacity-70">
            The complete interactive flipbook experience. Turn pages, zoom, browse thumbnails &amp; contents. 
            Built for clarity and immersion.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a 
              href="https://memetorrent.futuret3ch.com.au/whitepaper.pdf" 
              target="_blank" 
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-black font-semibold tracking-wider text-sm hover:bg-white/90 active:scale-[0.985] transition"
            >
              DOWNLOAD FULL PDF
            </a>
            <a 
              href="#flipbook" 
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-white/20 hover:bg-white/5 text-sm font-medium transition"
            >
              OPEN THE FLIPBOOK BELOW →
            </a>
          </div>
        </div>

        {/* Subtle decorative lines matching the promo graphics */}
        <div className="absolute top-8 right-8 hidden lg:block opacity-20">
          <div className="w-24 h-px bg-white mb-1" />
          <div className="w-16 h-px bg-white ml-auto" />
        </div>
      </div>

      {/* The Fancy Embedded Flipbook */}
      <div id="flipbook" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-1">INTERACTIVE EXPERIENCE</div>
            <div className="text-2xl font-semibold tracking-tight">Official $MT Whitepaper Flipbook</div>
          </div>
          <div className="hidden sm:block text-xs opacity-50 font-mono">11 pages • Swipe • Zoom • Keyboard arrows</div>
        </div>

        {/* Fancy frame around the user's flipbook */}
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

          {/* Bottom bar with controls hint + PDF */}
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-y-2 text-xs sm:text-sm px-1">
            <div className="opacity-60">
              Use the toolbar inside the book • Click thumbnails or contents • Press ← → arrows or scroll wheel to flip
            </div>
            <a 
              href="https://memetorrent.futuret3ch.com.au/whitepaper.pdf" 
              target="_blank" 
              className="font-medium text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
            >
              Download the full PDF version →
            </a>
          </div>
        </div>

        <div className="text-center mt-4 text-[10px] opacity-40">
          This is the official interactive whitepaper flipbook created for the MT ECO SYSTEM.
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-white/10 py-8 text-center text-[10px] opacity-40">
        <Link href="/" className="hover:text-white hover:underline">← Back to MT ECO SYSTEM</Link>
      </div>
    </main>
  );
}
