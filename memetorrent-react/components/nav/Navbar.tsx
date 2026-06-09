'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { LINKS } from '@/lib/constants';
import { Connection, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

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

  // ==================== MANUAL WALLET CONNECT (from your SolanaReels game pattern) ====================
  // This makes BUY $MT NOW actually pick up Phantom / Solflare / Backpack on mobile + desktop via deeplinks + injected
  const SOLANA_RPC_URL =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SOLANA_RPC_URL) ||
    'https://api.mainnet-beta.solana.com';
  const BUY_CONNECTION = new Connection(SOLANA_RPC_URL, 'confirmed');

  const [connectedWallet, setConnectedWallet] = useState<{ address: string; provider: any } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<{ signature?: string; error?: string } | null>(null);

  const getProvider = (name: 'phantom' | 'solflare' | 'backpack') => {
    if (typeof window === 'undefined') return null;
    const w = window as any;

    if (name === 'phantom') {
      return w.phantom?.solana || (w.solana?.isPhantom ? w.solana : null);
    }
    if (name === 'solflare') {
      return w.solflare?.isSolflare ? w.solflare : (w.solflare || null);
    }
    if (name === 'backpack') {
      return w.backpack?.solana || w.backpack || null;
    }
    return null;
  };

  const openWalletDeeplink = (name: 'phantom' | 'solflare' | 'backpack') => {
    const current = typeof window !== 'undefined' ? window.location.href : 'https://memetorrent.futuret3ch.com.au';
    const encoded = encodeURIComponent(current);
    let url = '';
    if (name === 'phantom') url = `https://phantom.app/ul/browse/${encoded}`;
    else if (name === 'solflare') url = `https://solflare.com/ul/browse/${encoded}?ref=mt`;
    else url = `https://backpack.app/ul/browse/${encoded}`;
    window.open(url, '_blank');
  };

  const connectWalletForBuy = async (name: 'phantom' | 'solflare' | 'backpack') => {
    setBuyResult(null);
    const provider = getProvider(name);

    if (!provider) {
      // No injected provider — use deeplink so user can connect from inside the wallet app (exactly like the game)
      openWalletDeeplink(name);
      setBuyResult({ error: `No ${name} injected provider found. Opened deeplink — connect inside the ${name} browser then tap Connect ${name} again.` });
      return;
    }

    try {
      // Explicit connect call — this is what often fixes Solflare "stuck connecting" vs auto-detect in widgets
      const resp = await provider.connect();
      const pk = resp?.publicKey?.toString?.() || resp?.publicKey?.toBase58?.();
      if (!pk) throw new Error('No public key returned from wallet');

      // Fetch SOL balance
      let bal = 0;
      try {
        const lamports = await BUY_CONNECTION.getBalance(new PublicKey(pk));
        bal = lamports / LAMPORTS_PER_SOL;
      } catch {}

      setConnectedWallet({ address: pk, provider });
      setWalletBalance(bal);
      setBuyResult(null);
    } catch (e: any) {
      const msg = e?.message || 'Failed to connect';
      setBuyResult({ error: msg });
      // On failure, still offer the deeplink as escape hatch
      if (isMobile) openWalletDeeplink(name);
    }
  };

  const disconnectWalletForBuy = () => {
    const prov = connectedWallet?.provider;
    setConnectedWallet(null);
    setWalletBalance(null);
    setBuyResult(null);
    try { prov?.disconnect?.(); } catch {}
  };

  // Real self-custodial buy using Jupiter quote + swap API + manual sign (like the game does real transfers)
  const quickBuyMT = async (solAmount: number) => {
    if (!connectedWallet?.provider || !connectedWallet.address) {
      setBuyResult({ error: 'Connect a wallet first' });
      return;
    }

    setBuying(true);
    setBuyResult(null);

    try {
      const inputMint = 'So11111111111111111111111111111111111111112'; // wSOL / SOL
      const outputMint = MT_MINT;
      const amount = Math.floor(solAmount * 1_000_000_000);

      // 1. Get quote from Jupiter (public API, no plugin)
      const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=100&swapMode=ExactIn`;
      const quoteResp = await fetch(quoteUrl);
      if (!quoteResp.ok) throw new Error('Failed to get quote from Jupiter');
      const quote = await quoteResp.json();

      // 2. Get serialized swap transaction
      const swapResp = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: connectedWallet.address,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 10000,
        }),
      });
      if (!swapResp.ok) throw new Error('Failed to build swap transaction');
      const { swapTransaction } = await swapResp.json();

      // 3. Deserialize, sign with the manually connected provider (this is the key for Solflare mobile)
      // Use atob + Uint8Array so we don't depend on global Buffer (works in browser)
      const binary = atob(swapTransaction);
      const txBuffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) txBuffer[i] = binary.charCodeAt(i);
      const transaction = VersionedTransaction.deserialize(txBuffer);

      const signedTx = await connectedWallet.provider.signTransaction(transaction);

      // 4. Send (self-custodial — user signed it)
      const raw = signedTx.serialize();
      const signature = await BUY_CONNECTION.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 3 });

      // Confirm
      await BUY_CONNECTION.confirmTransaction(signature, 'confirmed');

      setBuyResult({ signature });
      // Refresh balance
      try {
        const newLamports = await BUY_CONNECTION.getBalance(new PublicKey(connectedWallet.address));
        setWalletBalance(newLamports / LAMPORTS_PER_SOL);
      } catch {}
    } catch (e: any) {
      setBuyResult({ error: e?.message || 'Swap failed. Try a smaller amount or use the Jupiter widget below.' });
    } finally {
      setBuying(false);
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

  // Wallet mobile app links
  const walletApps = {
    phantom: { label: 'Phantom', url: 'https://phantom.app/' },
    solflare: { label: 'Solflare', url: 'https://solflare.com/' },
    backpack: { label: 'Backpack', url: 'https://backpack.app/' },
  };

  return (
    <header className="w-full border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-5 flex items-center justify-between text-sm">
        <Link href="/" className="font-semibold tracking-tight flex items-center gap-2 hover:opacity-80 transition">
          <span className="text-emerald-400">MT</span> ECO SYSTEM
        </Link>

        <div className="flex items-center gap-3 sm:gap-6 text-sm">
          {/* Desktop nav links - use /# so they work correctly even from /contact or /whitepaper */}
          <div className="hidden md:flex items-center gap-6">
            <a href="/#stats" className="opacity-70 hover:opacity-100">LIVE $MT</a>
            <a href="/#tokenomics" className="opacity-70 hover:opacity-100">TOKENOMICS</a>
            <a href="/#utilities" className="opacity-70 hover:opacity-100">UTILITIES</a>
            <a href="/#tap" className="opacity-70 hover:opacity-100">TAP</a>
            <a href="/#tap" className="opacity-70 hover:opacity-100">P2E</a>
            <a href="/#safety" className="opacity-70 hover:opacity-100">SAFETY</a>
            <a href="/contact" className="opacity-70 hover:opacity-100">CONTACT</a>
            <a href="/whitepaper" className="opacity-70 hover:opacity-100">WHITEPAPER</a>
            <a href="/developers" className="opacity-70 hover:opacity-100">API</a>
          </div>

          <a href={LINKS.wallet} target="_blank" className="font-medium px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-white/30 hover:bg-white/5 text-xs sm:text-sm">Launch</a>

          {/* Small icons for Login and Register — clean and minimal */}
          <button 
            onClick={() => openAuth('login')} 
            className="opacity-70 hover:opacity-100 p-1 text-base" 
            title="Login"
            aria-label="Login"
          >
            👤
          </button>
          <button 
            onClick={() => openAuth('register')} 
            className="opacity-70 hover:opacity-100 p-1 text-base" 
            title="Register / Sign up"
            aria-label="Register"
          >
            ✚
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

      {/* Mobile nav menu - use /# so anchors work from subpages like /contact /whitepaper */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black px-4 py-3 flex flex-col gap-2 text-sm">
          <a href="/#stats" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">LIVE $MT</a>
          <a href="/#tokenomics" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">TOKENOMICS</a>
          <a href="/#utilities" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">UTILITIES</a>
          <a href="/#tap" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">TAP</a>
          <a href="/#tap" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">P2E</a>
          <a href="/#safety" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">SAFETY</a>
          <a href="/contact" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">CONTACT</a>
          <a href="/whitepaper" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">WHITEPAPER</a>
          <a href="/developers" onClick={() => setMobileMenuOpen(false)} className="py-1 opacity-70 hover:opacity-100">API</a>
          <button 
            onClick={() => { setMobileMenuOpen(false); setShowBuyPanel(true); }}
            className="py-1 text-left font-medium text-emerald-400 hover:opacity-100"
          >
            BUY $MT NOW
          </button>
          <a href={LINKS.wallet} target="_blank" onClick={() => setMobileMenuOpen(false)} className="py-1 font-medium">Launch Infinite Wallet</a>
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
          <a href="https://t.me/MemeTorrentPortal" target="_blank" rel="noopener" title="Telegram" style={{ color: '#26A5E4' }}>
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

            {/* MANUAL CONNECT SECTION — this is the important part for mobile Solflare/Phantom/Backpack */}
            <div className="mb-3">
              <div className="text-[10px] tracking-[2px] opacity-60 mb-1.5">CONNECT WALLET (works on mobile + desktop)</div>

              {!connectedWallet ? (
                <div className="flex flex-wrap gap-2">
                  {(['phantom', 'solflare', 'backpack'] as const).map((name) => (
                    <button
                      key={name}
                      onClick={() => connectWalletForBuy(name)}
                      className="px-3 py-1.5 text-xs rounded-2xl border border-white/20 hover:bg-white/5 active:bg-white/10"
                    >
                      {name === 'phantom' ? 'Phantom' : name === 'solflare' ? 'Solflare' : 'Backpack'}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-emerald-400 break-all">{connectedWallet.address}</div>
                      {walletBalance !== null && <div className="opacity-70">Balance: {walletBalance.toFixed(4)} SOL</div>}
                    </div>
                    <button onClick={disconnectWalletForBuy} className="text-[10px] underline opacity-70">Disconnect</button>
                  </div>

                  {/* Quick buy amounts + execute button using the manually connected wallet */}
                  <div className="mt-3">
                    <div className="text-[10px] opacity-60 mb-1">Quick Buy $MT (signs real swap tx)</div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[0.05, 0.1, 0.25, 0.5, 1].map((amt) => (
                        <button
                          key={amt}
                          disabled={buying}
                          onClick={() => quickBuyMT(amt)}
                          className="px-2.5 py-1 text-xs rounded-xl border border-white/15 hover:bg-white/5 disabled:opacity-50"
                        >
                          {amt} SOL
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={buying}
                      onClick={() => quickBuyMT(0.1)}
                      className="w-full py-2 rounded-2xl bg-emerald-400 text-black text-sm font-medium disabled:opacity-60"
                    >
                      {buying ? 'Swapping...' : 'Buy $MT with 0.1 SOL (manual sign)'}
                    </button>
                  </div>

                  {buyResult?.signature && (
                    <div className="mt-2 text-[10px] text-emerald-400 break-all">
                      Success! Tx: <a href={`https://solscan.io/tx/${buyResult.signature}`} target="_blank" className="underline">view on Solscan</a>
                    </div>
                  )}
                  {buyResult?.error && (
                    <div className="mt-2 text-[10px] text-amber-400">{buyResult.error}</div>
                  )}
                </div>
              )}
            </div>

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

            {/* Mobile tip + extra deeplinks (helps when injected is not present) */}
            <div className="mt-2 text-[10px] opacity-70 text-center space-y-1">
              {isMobile && (
                <div>On mobile: best results when you open this site from inside Phantom / Solflare / Backpack browser.</div>
              )}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {(['phantom', 'solflare', 'backpack'] as const).map((name) => (
                  <button
                    key={name}
                    onClick={() => openWalletDeeplink(name)}
                    className="px-2 py-0.5 text-[10px] rounded border border-white/15 hover:bg-white/5"
                  >
                    Open in {name}
                  </button>
                ))}
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
