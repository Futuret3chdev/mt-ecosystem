'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { LINKS } from '@/lib/constants';

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

  // Mobile detection for wallet links
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  // Buy states and logic (duplicated here for top panel to work independently; real Jupiter buy)
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [buySolAmount, setBuySolAmount] = useState(0.1);
  const [jupQuote, setJupQuote] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecutingSwap, setIsExecutingSwap] = useState(false);

  const MT_MINT = 'ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump';

  const connectWallet = async (walletType: 'phantom' | 'solflare' | 'backpack') => {
    try {
      let provider: any = null;
      if (walletType === 'phantom') {
        provider = (window as any).phantom?.solana;
      } else if (walletType === 'solflare') {
        provider = (window as any).solflare;
      } else if (walletType === 'backpack') {
        provider = (window as any).backpack?.solana;
      }
      if (!provider) {
        alert(`Please install the ${walletType} wallet.`);
        return;
      }
      const resp = await provider.connect();
      const address = resp.publicKey?.toString() || resp.publicKey;
      setWalletAddress(address);
      setConnectedWallet(walletType);
    } catch (err) {
      alert('Failed to connect wallet');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setConnectedWallet(null);
    setJupQuote(null);
  };

  const getRaydiumQuote = async () => {
    if (!buySolAmount || buySolAmount <= 0) return;
    setIsLoadingQuote(true);
    try {
      // Use dexscreener for price estimate (avoids Jupiter DNS issues)
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MT_MINT}`);
      const data = await res.json();
      const pair = data.pairs?.[0];
      let outAmount = '0';
      if (pair) {
        const tokenPriceUsd = parseFloat(pair.priceUsd || '0');
        // Approximate SOL price
        const solRes = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
        const solData = await solRes.json();
        const solPriceUsd = parseFloat(solData.pairs?.[0]?.priceUsd || '140');
        const amountOut = Math.floor((buySolAmount * solPriceUsd) / tokenPriceUsd);
        outAmount = (amountOut * 1_000_000).toString(); // 6 decimals for the token
      }
      setJupQuote({ outAmount });
    } catch (e) {
      alert('Failed to get quote (network). Use the Raydium link below.');
      setJupQuote(null);
    }
    setIsLoadingQuote(false);
  };

  const executeRealBuy = async () => {
    if (!walletAddress || !connectedWallet) {
      alert('Connect wallet first.');
      return;
    }
    setIsExecutingSwap(true);
    try {
      const { Connection, PublicKey } = await import('@solana/web3.js');
      const { Raydium, TxVersion } = await import('@raydium-io/raydium-sdk-v2');

      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const owner = new PublicKey(walletAddress);

      let provider: any = null;
      if (connectedWallet === 'phantom') provider = (window as any).phantom?.solana;
      else if (connectedWallet === 'solflare') provider = (window as any).solflare;
      else if (connectedWallet === 'backpack') provider = (window as any).backpack?.solana;
      if (!provider) throw new Error('Provider not available');

      const signAllTransactions = async (txs: any[]) => {
        const signedTxs = [];
        for (const tx of txs) {
          const signed = await provider.signTransaction(tx);
          signedTxs.push(signed);
        }
        return signedTxs;
      };

      const raydium = await Raydium.load({
        connection,
        owner,
        signAllTransactions,
      });

      // Use Raydium SDK v2 as per docs for direct on-chain swap (avoids Jupiter)
      const { execute } = await (raydium.tradeV2.swap as any)({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: MT_MINT,
        amountIn: BigInt(Math.floor(buySolAmount * 1_000_000_000)),
        slippageBps: 100,
        txVersion: TxVersion.V0,
      });

      const { txId } = await execute({ sendAndConfirm: true });
      alert(`Buy successful! Tx: ${txId}`);
      setJupQuote(null);
    } catch (err: any) {
      console.error('Swap error:', err);
      alert('Swap failed: ' + (err.message || 'Use Raydium link.'));
    }
    setIsExecutingSwap(false);
  };

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
          Form (connect) first, then the full THE WALLET IS THE GATEWAY block below it. */}
      {showBuyPanel && (
        <div ref={buyPanelRef} className="border-t border-white/10 bg-zinc-950/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 text-sm">
            {/* Header with close for mobile/desktop */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm font-medium">Direct on-chain buy — self-custodial</div>
              <button onClick={() => setShowBuyPanel(false)} className="text-xl leading-none opacity-60 hover:opacity-100 px-2" aria-label="Close buy panel">×</button>
            </div>
            <div className="text-[10px] opacity-60 mb-3">Your wallet signs the transaction. No third party holds your keys or funds. Swap executes directly on Solana.</div>

            {/* Connect buttons - work best inside wallet in-app browser on mobile */}
            <div className="mb-3 sm:mb-4">
              <div className="text-[10px] opacity-70 mb-1.5">Connect a self-custodial Solana wallet. No third party will ever see or hold your keys.</div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <button onClick={() => connectWallet('phantom')} className="px-4 py-2 min-h-[44px] text-sm rounded-xl border border-white/20 hover:bg-white/5 active:bg-white/10">👻 Phantom</button>
                <button onClick={() => connectWallet('solflare')} className="px-4 py-2 min-h-[44px] text-sm rounded-xl border border-white/20 hover:bg-white/5 active:bg-white/10">☀️ Solflare</button>
                <button onClick={() => connectWallet('backpack')} className="px-4 py-2 min-h-[44px] text-sm rounded-xl border border-white/20 hover:bg-white/5 active:bg-white/10">🎒 Backpack</button>
              </div>
              {walletAddress && (
                <div className="mt-2 text-xs">Connected: {connectedWallet} {walletAddress.slice(0,6)}... <button onClick={disconnectWallet} className="underline ml-1">Disconnect</button></div>
              )}

              {/* Mobile-specific app links so users can find & open the wallets */}
              {isMobile && (
                <div className="mt-2 text-[10px] opacity-70">
                  On mobile: open this page <span className="font-medium">inside your wallet app's browser</span> for connect to work.
                  <div className="mt-1 flex flex-wrap gap-x-3">
                    <a href={walletApps.phantom.url} target="_blank" className="text-emerald-400 underline">Get Phantom app →</a>
                    <a href={walletApps.solflare.url} target="_blank" className="text-emerald-400 underline">Get Solflare app →</a>
                    <a href={walletApps.backpack.url} target="_blank" className="text-emerald-400 underline">Get Backpack app →</a>
                  </div>
                </div>
              )}
              {!isMobile && (
                <div className="text-[10px] opacity-60 mt-1">Tip: On mobile, open this page inside your wallet app's browser for seamless on-chain signing.</div>
              )}
            </div>

            {/* THE WALLET IS THE GATEWAY block just below the form in the panel - full original text */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 text-xs sm:text-sm">
              <div className="text-emerald-400 text-[10px] sm:text-xs tracking-[3px]">THE WALLET IS THE GATEWAY</div>
              <div className="font-semibold tracking-tight mt-0.5 sm:mt-1 text-sm sm:text-base">INFINITE WALLET<br />For infinite possibilities.<br />Truly ours.</div>
              <ul className="mt-1 sm:mt-2 space-y-0.5 text-[10px] sm:text-xs opacity-80">
                <li>• 100% self-built. No injected providers.</li>
                <li>• Create, import, send, mint NFTs, earn &amp; spend Rockets.</li>
                <li>• Native MT chain + Solana $MT + future bridges.</li>
                <li>• Keys encrypted locally. Seed never leaves your device.</li>
              </ul>
              <a href={LINKS.wallet} target="_blank" className="mt-2 sm:mt-3 inline-block text-xs sm:text-sm text-emerald-400 hover:underline">OPEN INFINITE WALLET →</a>
            </div>

            <div className="mt-3 text-[10px] opacity-70 border border-white/10 rounded-xl p-3 bg-white/[0.01]">
              <strong>No third parties hold your assets.</strong> The buy is a direct on-chain transaction on Solana. 
              You sign with your wallet. Liquidity is sourced from decentralized pools. 
              This aligns with our mission: self-custodial, no custody, no middlemen.
            </div>

            {/* Buy controls if connected - responsive */}
            {walletAddress && (
              <div className="mt-3 sm:mt-4">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span>Amount (SOL)</span>
                  <input type="range" min="0.01" max="5" step="0.01" value={buySolAmount} onChange={e => setBuySolAmount(parseFloat(e.target.value))} className="flex-1 accent-emerald-400" />
                  <span className="font-mono text-xs sm:text-sm">{buySolAmount}</span>
                </div>
                <button onClick={getRaydiumQuote} disabled={isLoadingQuote} className="w-full py-2.5 min-h-[44px] text-xs sm:text-sm border border-white/20 rounded-xl mb-2 active:bg-white/5">Get On-Chain Quote</button>
                {jupQuote && <div className="text-xs mb-2">~{(Number(jupQuote.outAmount)/1e6).toFixed(0)} $MT</div>}
                <button onClick={executeRealBuy} disabled={isExecutingSwap} className="w-full py-2.5 min-h-[44px] bg-emerald-400 text-black text-xs sm:text-sm font-semibold rounded-xl active:opacity-90">SIGN &amp; SEND ON-CHAIN BUY</button>
                <div className="text-center mt-1">
                  <a href={`https://raydium.io/swap/?inputMint=sol&outputMint=${MT_MINT}`} target="_blank" className="text-xs sm:text-sm text-emerald-400 underline">Or buy directly on Raydium</a>
                </div>
                <div className="mt-2 text-center text-[10px] opacity-70">
                  Fully self-custodial • Your keys sign the tx • No custody by any service<br />
                  <a href="https://docs.raydium.io/solana-fundamentals" target="_blank" className="text-emerald-400/80 hover:text-emerald-400 underline">Learn how Solana on-chain buys work →</a>
                </div>
              </div>
            )}
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
