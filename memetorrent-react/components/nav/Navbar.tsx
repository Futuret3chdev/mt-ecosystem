import ThemeToggle from '@/components/theme/ThemeToggle';
import { LINKS } from '@/lib/constants';

export default function Navbar() {
  return (
    <header className="w-full border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-sm">
        <div className="font-semibold tracking-tight flex items-center gap-2">
          <span className="text-emerald-400">MT</span> ECO SYSTEM
        </div>

        <div className="flex items-center gap-6 text-sm">
          <a href="#stats" className="opacity-70 hover:opacity-100">LIVE $MT</a>
          <a href="#tokenomics" className="opacity-70 hover:opacity-100">TOKENOMICS</a>
          <a href="#utilities" className="opacity-70 hover:opacity-100">UTILITIES</a>
          <a href="#tap" className="opacity-70 hover:opacity-100">TAP</a>
          <a href="#tap" className="opacity-70 hover:opacity-100">P2E</a>
          <a href="#safety" className="opacity-70 hover:opacity-100">SAFETY</a>
          <a href="/contact" className="opacity-70 hover:opacity-100">CONTACT</a>
          <a href={LINKS.wallet} target="_blank" className="font-medium px-4 py-1.5 rounded-xl border border-white/30 hover:bg-white/5">Launch Infinite Wallet</a>
          <ThemeToggle />
        </div>
      </div>

      {/* Social icons row under the main nav links, spaced across top under MT ECO SYSTEM nav */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-x-6 text-sm">
          <a href="https://discord.com/invite/FxT7q7fpkT" target="_blank" rel="noopener" className="flex items-center gap-1.5 opacity-70 hover:opacity-100 hover:text-white" title="Discord">
            <span className="text-lg">💬</span>
            <span className="text-xs tracking-widest">DISCORD</span>
          </a>
          <a href="https://x.com/MemeTorrent" target="_blank" rel="noopener" className="flex items-center gap-1.5 opacity-70 hover:opacity-100 hover:text-white" title="X">
            <span className="text-lg">𝕏</span>
            <span className="text-xs tracking-widest">X</span>
          </a>
          <a href="https://t.me/MemeTorrentPortal" target="_blank" rel="noopener" className="flex items-center gap-1.5 opacity-70 hover:opacity-100 hover:text-white" title="Telegram">
            <span className="text-lg">✈️</span>
            <span className="text-xs tracking-widest">TELEGRAM</span>
          </a>
          <div className="flex-1" />
          <span className="text-[10px] opacity-50">Direct $MT purchase in LIVE $MT + ONE-PLACE MANAGEMENT FLOWS</span>
        </div>
      </div>
    </header>
  );
}
