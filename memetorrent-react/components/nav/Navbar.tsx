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
          <a href="#features" className="opacity-70 hover:opacity-100">Features</a>
          <a href="#management" className="opacity-70 hover:opacity-100">Management</a>
          <a href="#ecosystem" className="opacity-70 hover:opacity-100">Ecosystem</a>
          <a href="#stats" className="opacity-70 hover:opacity-100">Live $MT</a>
          <a href="#tap" className="opacity-70 hover:opacity-100">TAP</a>
          <a href={LINKS.wallet} target="_blank" className="opacity-70 hover:opacity-100">INFINITE WALLET</a>
          <a href={LINKS.jupiter} target="_blank" className="opacity-70 hover:opacity-100">Buy $MT</a>
          <a href="#security" className="opacity-70 hover:opacity-100">Security</a>
          <a href={LINKS.wallet} target="_blank" className="font-medium px-4 py-1.5 rounded-xl border border-white/30 hover:bg-white/5">Launch Infinite Wallet</a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
