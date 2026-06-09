'use client';

export default function MediaPage() {
  return (
    <main className="min-h-screen bg-black text-[#eef6ff] py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">ECOSYSTEM MEDIA</div>
        <h1 className="text-4xl font-semibold tracking-[-1.5px] mb-8">Videos, Feeds &amp; Content</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Videos */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-8">
            <div className="text-emerald-400 text-sm mb-2">VIDEOS</div>
            <div className="font-semibold mb-4">Watch the latest ecosystem videos and demos</div>
            <a 
              href="https://futuret3ch.com.au/videos" 
              target="_blank"
              className="inline-block px-6 py-3 rounded-2xl border border-white/20 hover:bg-white/5 text-sm"
            >
              Open Videos Library →
            </a>
            <div className="mt-6 text-xs text-white/50">Full archive of walkthroughs, updates, and community content hosted on the main Futuret3ch site.</div>
          </div>

          {/* X / Twitter Feeds */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-8">
            <div className="text-emerald-400 text-sm mb-2">LIVE FEEDS</div>
            <div className="font-semibold mb-4">Follow real-time updates on X</div>

            <div className="space-y-3 text-sm">
              <a 
                href="https://x.com/MemeTorrent" 
                target="_blank"
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5"
              >
                <div>
                  <div className="font-medium">@MemeTorrent</div>
                  <div className="text-xs text-white/50">Official MemeTorrent updates</div>
                </div>
                <div className="text-emerald-400">→</div>
              </a>

              <a 
                href="https://x.com/futuret3chdev" 
                target="_blank"
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5"
              >
                <div>
                  <div className="font-medium">@futuret3chdev</div>
                  <div className="text-xs text-white/50">Futuret3ch development &amp; ecosystem news</div>
                </div>
                <div className="text-emerald-400">→</div>
              </a>
            </div>

            <div className="mt-6 text-xs text-white/50">Direct links to the official accounts for the fastest news and updates.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
