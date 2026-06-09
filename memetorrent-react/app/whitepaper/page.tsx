'use client';

import Link from 'next/link';

export default function WhitepaperPage() {
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-6">
          <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">OFFICIAL DOCUMENT</div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-1.6px]">MT ECO SYSTEM Whitepaper</h1>
          <p className="mt-2 opacity-70">Interactive viewer • Flip through key sections or open the full PDF</p>
        </div>

        {/* Real interactive flip book embed (Flowpaper) */}
        <div className="w-full mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/40" style={{ height: '75vh', minHeight: '520px' }}>
          <a
            href="https://a2470a22-trial.flowpaper.com/whitepaper/"
            className="fp-embed"
            data-fp-width="100%"
            data-fp-height="100%"
            style={{ maxWidth: '100%', display: 'block', height: '100%' }}
          ></a>
          <script async defer src="https://cdn-online.flowpaper.com/zine/3.9.7/js/embed.min.js"></script>
        </div>

        <div className="mt-4 text-center">
          <a
            href="https://memetorrent.futuret3ch.com.au/whitepaper.pdf"
            target="_blank"
            className="inline-block px-6 sm:px-8 py-3 rounded-2xl bg-white text-black font-semibold tracking-wider text-sm min-h-[44px] flex items-center justify-center"
          >
            OPEN FULL WHITEPAPER PDF →
          </a>
          <div className="text-[10px] mt-2 opacity-50">Use the embedded flip book above • arrows / swipe to turn pages. Direct PDF link for download.</div>
        </div>
      </div>

      <div className="border-t border-white/10 py-8 text-center text-[10px] opacity-40">
        <Link href="/" className="hover:text-white">← Back to MT ECO SYSTEM</Link>
      </div>
    </main>
  );
}
