'use client';

import { useState } from 'react';
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

          {/* Small icons for Login and Register — clean and minimal */}
          <button 
            onClick={() => openAuth('login')} 
            className="opacity-70 hover:opacity-100 p-1" 
            title="Login"
            aria-label="Login"
          >
            👤
          </button>
          <button 
            onClick={() => openAuth('register')} 
            className="opacity-70 hover:opacity-100 p-1" 
            title="Register / Sign up"
            aria-label="Register"
          >
            ✚
          </button>

          <ThemeToggle />
        </div>
      </div>

      {/* Social icons row under the main nav links - using original Font Awesome icons in brand colors */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-x-6 text-sm social-row">
          <a href="https://discord.gg/FxT7q7fpkT" target="_blank" rel="noopener" title="Discord" style={{ color: '#5865F2' }}>
            <i className="fab fa-discord text-xl"></i>
          </a>
          <a href="https://twitter.com/MemeTorrent" target="_blank" rel="noopener" title="X / Twitter" style={{ color: '#1DA1F2' }}>
            <i className="fab fa-twitter text-xl"></i>
          </a>
          <a href="https://t.me/MemeTorrentPortal" target="_blank" rel="noopener" title="Telegram" style={{ color: '#26A5E4' }}>
            <i className="fab fa-telegram text-xl"></i>
          </a>

          {/* Contract address near social icons, slightly away */}
          <div className="ml-4 pl-4 border-l border-white/20 flex items-center gap-2 text-[11px]">
            <span className="opacity-60">Contract Address:</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText('ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump');
                // Fallback feedback
                const btn = event?.currentTarget as HTMLElement;
                const origText = btn?.innerText;
                if (btn) btn.innerText = 'Copied!';
                setTimeout(() => { if (btn) btn.innerText = origText || 'ELyw...pump'; }, 1500);
              }}
              className="font-mono text-emerald-400 hover:text-emerald-300 active:text-white transition"
              title="Copy $MT contract address"
            >
              ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump
            </button>
          </div>

          <div className="flex-1" />

          {/* BUY $MT NOW - clickable, replaces the long text; clicking shows the purpose */}
          <a 
            href="#management" 
            className="font-medium text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
            onClick={() => {
              // Optional: could dispatch an event to highlight buy area
            }}
          >
            BUY $MT NOW
          </a>
        </div>
      </div>

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
