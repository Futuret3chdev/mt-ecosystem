'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/footer/Footer';
import { WalletAdapterProvider } from '@/components/wallet/WalletAdapterProvider';
import MtTracker from '@/components/analytics/MtTracker';

/** Claims uses direct injected wallets (Lucky Reels style) — skip wallet-adapter here. */
export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isClaims = pathname === '/claims' || pathname?.startsWith('/claims/');

  if (isClaims) {
    return (
      <>
        <MtTracker />
        <header className="w-full border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-5 flex items-center justify-between text-sm">
            <a href="/" className="font-semibold tracking-tight flex items-center gap-2 hover:opacity-80 transition">
              <span className="text-emerald-400">MT</span> ECO SYSTEM
            </a>
            <a href="/" className="text-sky-400 hover:underline text-xs">
              ← Home
            </a>
          </div>
        </header>
        <main className="min-h-screen">{children}</main>
        <Footer />
      </>
    );
  }

  return (
    <WalletAdapterProvider>
      <MtTracker />
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </WalletAdapterProvider>
  );
}