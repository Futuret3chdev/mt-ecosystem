'use client';

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-black text-[#eef6ff] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">ECOSYSTEM</div>
        <h1 className="text-4xl font-semibold tracking-[-1.5px] mb-8">Updates &amp; Changelog</h1>

        <div className="space-y-8 text-sm">
          <div>
            <div className="text-[#19d37e] text-xs mb-1">JUNE 2026</div>
            <div className="font-medium">Wallet Adapter Integration &amp; Buy Panel Polish</div>
            <ul className="mt-2 space-y-1 text-[#97a7c6]">
              <li>• Added explicit mobile deeplink support for Phantom, Solflare &amp; Backpack in the buy panel</li>
              <li>• Cleaned buy panel UI — removed clutter while keeping connect options for mobile</li>
              <li>• Status page now renders live service data from public feed</li>
            </ul>
          </div>

          <div>
            <div className="text-[#19d37e] text-xs mb-1">ONGOING</div>
            <div className="font-medium">Core Infrastructure &amp; Self-Built Services</div>
            <p className="mt-2 text-[#97a7c6]">
              All services listed on the <a href="/status" className="text-emerald-400 hover:underline">Status page</a> remain fully self-hosted.
              Follow real-time updates on X.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-xs text-white/50">
          For the latest announcements follow <a href="https://x.com/MemeTorrent" target="_blank" className="text-emerald-400 hover:underline">@MemeTorrent</a> and <a href="https://x.com/futuret3chdev" target="_blank" className="text-emerald-400 hover:underline">@futuret3chdev</a>.
        </div>
      </div>
    </main>
  );
}
