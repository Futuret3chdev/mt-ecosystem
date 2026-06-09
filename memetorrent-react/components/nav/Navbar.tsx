import ThemeToggle from '@/components/theme/ThemeToggle';
import { LINKS } from '@/lib/constants';

export default function Navbar() {
  return (
    <header className="w-full border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-sm">
        <div className="font-semibold tracking-tight flex items-center gap-2">
          <span className="text-emerald-400">MT</span> ECO SYSTEM
        </div>

        <div className="flex items-center gap-8 text-sm">
          <a href="#stats" className="opacity-70 hover:opacity-100">Live $MT</a>
          <a href="#tap" className="opacity-70 hover:opacity-100">TAP</a>
          <a href={LINKS.wallet} target="_blank" className="opacity-70 hover:opacity-100">INFINITE WALLET</a>
          <a href="#safety" className="opacity-70 hover:opacity-100">Safety</a>
          <a href="/contact" className="opacity-70 hover:opacity-100">Contact</a>
          <a href={LINKS.wallet} target="_blank" className="font-medium px-4 py-1.5 rounded-xl border border-white/30 hover:bg-white/5">Launch Infinite Wallet</a>
          <ThemeToggle />
        </div>

        {/* Social links up top under the navbar (as requested) */}
        <div className="border-t border-white/10 text-[11px]">
          <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center gap-x-5 opacity-60">
            <span className="tracking-widest text-[9px] mr-1">COMMUNITY</span>
            <a href="https://discord.com/invite/FxT7q7fpkT" target="_blank" rel="noopener" className="hover:opacity-100 hover:text-white">Discord</a>
            <a href="https://x.com/MemeTorrent" target="_blank" rel="noopener" className="hover:opacity-100 hover:text-white">X</a>
            <a href="https://t.me/MemeTorrentPortal" target="_blank" rel="noopener" className="hover:opacity-100 hover:text-white">Telegram</a>
            <span className="flex-1" />
            <span className="text-[9px] opacity-40">Direct $MT purchase available in Live $MT + ONE-PLACE MANAGEMENT FLOWS (no third-party handoff)</span>
          </div>
        </div>
      </div>
    </header>
  );
}
