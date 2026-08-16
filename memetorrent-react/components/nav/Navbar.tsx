'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { LINKS } from '@/lib/constants';
import { Connection, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import servicesData from '@/app/status/services.json';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setFormData({ username: '', email: '', password: '' });
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeAuth();
    // Demo only
    const msg = authMode === 'login' 
      ? 'Welcome back to the MT Eco System (demo). Full access & flows in INFINITE WALLET.' 
      : 'Account created (demo). Welcome — use INFINITE WALLET for real self-custodial experience.';
    // Simple toast via alert for now (or we can reuse global toast if exposed)
    alert(msg);
  };

  // Buy $MT form state (compact at top, below BUY $MT NOW)
  const [showBuyPanel, setShowBuyPanel] = useState(false);
  const buyPanelRef = useRef<HTMLDivElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const MT_MINT = 'ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump';

  // Mobile detection for tips
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    }
  }, []);

  // Wallet adapter for manual connect buttons (needed for mobile deeplinks for Phantom/Solflare/Backpack)
  const { select, connect: adapterConnect } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWalletForBuy = async (walletType: 'phantom' | 'solflare' | 'backpack') => {
    setIsConnecting(true);

    try {
      const adapterName = walletType === 'phantom' ? 'Phantom' : walletType === 'solflare' ? 'Solflare' : 'Backpack';
      select(adapterName as any);
      await adapterConnect();
      // Success if we get here (provider was available)
    } catch (error: any) {
      console.error('Adapter connect failed, attempting mobile deep link fallback:', error);
      // Fallback for mobile: deep link to open the dapp in the wallet's in-app browser
      // Using ref param to help wallets recognize it as a dapp link (prevents opening wallet home/swap instead of the site)
      if (/iPhone|Android/i.test(navigator.userAgent)) {
        const currentUrl = window.location.href;
        const ref = encodeURIComponent(window.location.origin);
        let deepLink = '';
        if (walletType === 'phantom') {
          deepLink = `https://phantom.app/ul/v1/browse/${encodeURIComponent(currentUrl)}?ref=${ref}`;
        } else if (walletType === 'solflare') {
          deepLink = `https://solflare.com/ul/v1/browse/${encodeURIComponent(currentUrl)}?ref=${ref}`;
        } else if (walletType === 'backpack') {
          deepLink = `https://backpack.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${ref}`;
        }
        if (deepLink) {
          window.location.href = deepLink;
          return; // page will reload in the wallet app/browser
        }
      }
      // Fallback: open install page
      const installUrls: Record<string, string> = {
        phantom: 'https://phantom.app/',
        solflare: 'https://solflare.com/',
        backpack: 'https://backpack.app/',
      };
      window.open(installUrls[walletType], '_blank');
    } finally {
      setIsConnecting(false);
    }
  };

  // Jupiter Plugin init effect (replaces all previous custom buy logic that was erroring)
  useEffect(() => {
    if (!showBuyPanel) {
      if (typeof window !== 'undefined' && (window as any).Jupiter && typeof (window as any).Jupiter.destroy === 'function') {
        try { (window as any).Jupiter.destroy(); } catch (e) {}
      }
      return;
    }

    const initJupiterPlugin = () => {
      if (typeof window !== 'undefined' && (window as any).Jupiter) {
        try {
          if (typeof (window as any).Jupiter.destroy === 'function') (window as any).Jupiter.destroy();
        } catch (e) {}
        (window as any).Jupiter.init({
          displayMode: "integrated",
          integratedTargetId: "jupiter-buy-container",
          formProps: {
            initialInputMint: "So11111111111111111111111111111111111111112",
            initialOutputMint: MT_MINT,
          },
          branding: {
            logoUri: "https://futuret3ch.com.au/assets/img/logo.png",
            name: "MT-ECOSYSTEM",
          },
        });
      }
    };

    if (typeof window !== 'undefined') {
      if (!(window as any).Jupiter) {
        const script = document.createElement('script');
        script.src = 'https://plugin.jup.ag/plugin-v1.js';
        script.async = true;
        script.onload = initJupiterPlugin;
        document.head.appendChild(script);
      } else {
        initJupiterPlugin();
      }
    }
  }, [showBuyPanel]);

  // Close buy panel on outside click (mouse + touch for mobile). User closes with X only - no auto scroll close.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (buyPanelRef.current && !buyPanelRef.current.contains(event.target as Node)) {
        setShowBuyPanel(false);
      }
    };

    if (showBuyPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [showBuyPanel]);

  return (
    <header className="w-full border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-5 flex items-center justify-between text-sm">
        <Link href="/" className="font-semibold tracking-tight flex items-center gap-2 hover:opacity-80 transition">
          <span className="text-emerald-400">MT</span> ECO SYSTEM
        </Link>

        <div className="flex items-center gap-3 sm:gap-6 text-sm">
          {/* Desktop nav links - use /# so they work correctly even from /contact */}
          <div className="hidden md:flex items-center gap-6">
            <a href="/#stats" className="opacity-70 hover:opacity-100">LIVE $MT</a>
            <a href="/#tokenomics" className="opacity-70 hover:opacity-100">TOKENOMICS</a>
            <a href="/#utilities" className="opacity-70 hover:opacity-100">UTILITIES</a>
            <a href="/#tap" className="opacity-70 hover:opacity-100">TAP</a>
            <a href="/#tap" className="opacity-70 hover:opacity-100">P2E</a>
            <a href="/#safety" className="opacity-70 hover:opacity-100">SAFETY</a>
            <a href="/claims" className="opacity-70 hover:opacity-100">CLAIM $MT</a>
            <a href="/contact" className="opacity-70 hover:opacity-100">CONTACT</a>
            <a href="/software" className="opacity-70 hover:opacity-100">SOFTWARE</a>
            <a href="/developers" className="opacity-70 hover:opacity-100">API</a>
          </div>

          {/* Status icon (replaces Launch) — pulls live summary from /status services.json */}
          <a 
            href="/status" 
            className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1 rounded-xl border border-white/20 hover:bg-white/5"
            title="System Status"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#19d37e]"></span>
            <span>Status <span className="text-[#19d37e]">{servicesData.services.length}/7</span></span>
          </a>

          {/* Unified account icon (replaces separate Login + Register) */}
          <button 
            onClick={() => openAuth('login')} 
            className="opacity-70 hover:opacity-100 p-1 text-base" 
            title="Account"
            aria-label="Account"
          >
            👤
          </button>

          <ThemeToggle />

          {/* Mobile hamburger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 text-xl leading-none"
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile nav menu - use /# so anchors work from subpages like /contact */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black px-4 py-3 flex flex-col gap-2 text-sm">
          <a href="/#stats" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">LIVE $MT</a>
          <a href="/#tokenomics" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">TOKENOMICS</a>
          <a href="/#utilities" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">UTILITIES</a>
          <a href="/#tap" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">TAP</a>
          <a href="/#tap" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">P2E</a>
          <a href="/#safety" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">SAFETY</a>
          <a href="/claims" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">CLAIM $MT</a>
          <a href="/contact" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">CONTACT</a>
          <a href="/software" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">SOFTWARE</a>
          <a href="/developers" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">API</a>
          <a href="/status" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">Status</a>
          <button 
            onClick={() => { setMobileMenuOpen(false); setShowBuyPanel(true); }}
            className="py-1 text-left font-medium text-emerald-400 hover:opacity-100"
          >
            BUY $MT NOW
          </button>
          <a href={LINKS.wallet} target="_blank" onClick={() => setMobileMenuOpen(false)} className="py-1 font-medium">Infinite Wallet</a>
        </div>
      )}

      {/* Social icons row under the main nav links - using original Font Awesome icons in brand colors */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-x-3 sm:gap-x-5 text-xs sm:text-sm social-row">
          <a href="https://discord.gg/FxT7q7fpkT" target="_blank" rel="noopener" title="Discord" style={{ color: '#5865F2' }}>
            <i className="fab fa-discord text-lg sm:text-xl"></i>
          </a>
          <a href="https://twitter.com/MemeTorrent" target="_blank" rel="noopener" title="X / Twitter" style={{ color: '#1DA1F2' }}>
            <i className="fab fa-twitter text-lg sm:text-xl"></i>
          </a>
          <a href="https://t.me/+hxWzh5DZbfhiYWM9" target="_blank" rel="noopener" title="Telegram Portal" style={{ color: '#26A5E4' }}>
            <i className="fab fa-telegram text-lg sm:text-xl"></i>
          </a>

          {/* Contract address near social icons - short display on mobile to avoid overflow, full on copy/title */}
          <div className="ml-1 sm:ml-3 pl-2 sm:pl-3 border-l border-white/20 flex items-center gap-1 text-[10px] sm:text-[11px] min-w-0">
            <span className="opacity-60 shrink-0">Contract:</span>
            <button
              onClick={(e) => {
                navigator.clipboard.writeText('ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump');
                const btn = e.currentTarget as HTMLElement;
                const origText = btn?.innerText;
                if (btn) btn.innerText = 'Copied!';
                setTimeout(() => { if (btn) btn.innerText = origText || 'ELyw...pump'; }, 1500);
              }}
              className="font-mono text-emerald-400 hover:text-emerald-300 active:text-white transition truncate max-w-[110px] sm:max-w-none"
              title="ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump — tap to copy"
            >
              ELyw...pump
            </button>
          </div>

          <div className="flex-1" />

          {/* BUY $MT NOW - toggles the compact form panel just below */}
          <button 
            onClick={() => setShowBuyPanel(!showBuyPanel)}
            className="font-medium text-emerald-400 hover:text-emerald-300 transition cursor-pointer text-xs sm:text-sm px-2 py-1 border border-emerald-400/30 rounded whitespace-nowrap"
          >
            BUY $MT NOW
          </button>
        </div>
      </div>

      {/* Compact buy form panel - shows just below BUY $MT NOW, hides on click off.
          Manual wallet connect (Phantom/Solflare/Backpack + deeplinks) is now primary so mobile actually works.
          Jupiter widget kept as secondary / visual option. */}
      {showBuyPanel && (
        <div ref={buyPanelRef} className="border-t border-white/10 bg-zinc-950/95 backdrop-blur max-w-[480px] md:max-w-[620px] ml-auto mr-4 shadow-2xl rounded-b-xl z-50">
          <div className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
            {/* Header with close for mobile/desktop */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm font-medium">Direct on-chain buy — self-custodial (SOL → $MT)</div>
              <button onClick={() => setShowBuyPanel(false)} className="text-xl leading-none opacity-60 hover:opacity-100 px-2" aria-label="Close buy panel">×</button>
            </div>

            {/* Manual connect buttons — only on mobile for deeplink support (Phantom/Solflare/Backpack).
                Uses polling + conditional deep link (v1 for Solflare) per wallet-adapter and your game logic.
                No clutter: no address, no Disconnect, no Quick Buy, no error messages in panel. */}
            {isMobile && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {(['phantom', 'solflare', 'backpack'] as const).map((name) => (
                    <button
                      key={name}
                      disabled={isConnecting}
                      onClick={() => connectWalletForBuy(name)}
                      className="px-3 py-1.5 text-xs rounded-2xl border border-white/20 hover:bg-white/5 active:bg-white/10 disabled:opacity-50"
                    >
                      {isConnecting ? 'Connecting...' : (name === 'phantom' ? 'Phantom' : name === 'solflare' ? 'Solflare' : 'Backpack')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Desktop: Gateway (THE WALLET IS THE GATEWAY) on LEFT expanding to fill gap, Jupiter swap box on RIGHT.
                Mobile: stacks naturally. */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              {/* Gateway block on left, flex-1 to expand and fill left/center space on desktop */}
              <div className="md:flex-1">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-3 text-xs sm:text-sm h-full">
                  <div className="text-emerald-400 text-[10px] sm:text-xs tracking-[3px]">THE WALLET IS THE GATEWAY</div>
                  <div className="font-semibold tracking-tight mt-0.5 text-sm sm:text-base">INFINITE WALLET<br />For infinite possibilities.<br />Truly ours.</div>
                  <ul className="mt-1 space-y-0.5 text-[10px] sm:text-xs opacity-80">
                    <li>• 100% self-built. No injected providers.</li>
                    <li>• Create, import, send, mint NFTs, earn &amp; spend Rockets.</li>
                    <li>• Native MT chain + Solana $MT + future bridges.</li>
                    <li>• Keys encrypted locally. Seed never leaves your device.</li>
                  </ul>
                  <a href={LINKS.wallet} target="_blank" className="mt-1 inline-block text-xs sm:text-sm text-emerald-400 hover:underline">OPEN INFINITE WALLET →</a>
                </div>
              </div>

              {/* Swap box (Jupiter plugin) on right — kept as visual / advanced alternative */}
              <div className="md:w-[280px]">
                <div id="jupiter-buy-container" style={{ width: '100%', height: '340px', borderRadius: '12px', overflow: 'hidden', background: '#000' }} />
                <div className="text-[10px] opacity-50 mt-1 text-center">Jupiter widget (alternative)</div>
              </div>
            </div>

            {/* CSS vars to theme the Jupiter plugin to match the site's dark + emerald look */}
            <style>{`
              :root {
                --jupiter-plugin-primary: 199, 242, 132;
                --jupiter-plugin-background: 0, 0, 0;
                --jupiter-plugin-primary-text: 232, 249, 255;
                --jupiter-plugin-warning: 251, 191, 36;
                --jupiter-plugin-interactive: 33, 42, 54;
                --jupiter-plugin-module: 16, 23, 31;
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Auth Modal / Popup — clean, good looking, hidden until icon clicked */}
      <AnimatePresence>
        {authOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeAuth}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-semibold tracking-tight">Enter the MT Eco System</div>
                <button onClick={closeAuth} className="opacity-60 hover:opacity-100 text-xl leading-none">×</button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10 mb-6">
                <button
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 pb-3 text-sm font-medium ${authMode === 'login' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'opacity-70 hover:opacity-100'}`}
                >
                  Login
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 pb-3 text-sm font-medium ${authMode === 'register' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'opacity-70 hover:opacity-100'}`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <div className="text-xs opacity-60 mb-1">Username</div>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="testuser1"
                      required
                      className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400/60"
                    />
                  </div>
                )}

                <div>
                  <div className="text-xs opacity-60 mb-1">Email</div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={authMode === 'login' ? "jason.c@futuret3ch.com.au" : "wallet@email.com"}
                    required
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400/60"
                  />
                </div>

                <div>
                  <div className="text-xs opacity-60 mb-1">Password</div>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="•••••••••••"
                    required
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400/60"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full py-3.5 rounded-2xl bg-white text-black font-semibold tracking-wider text-sm active:opacity-90"
                >
                  {authMode === 'login' ? 'ENTER PORTAL' : 'CREATE ACCOUNT'}
                </button>
              </form>

              <div className="text-center text-[10px] mt-4 opacity-50">
                Demo only. Real self-custodial access lives in INFINITE WALLET.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
