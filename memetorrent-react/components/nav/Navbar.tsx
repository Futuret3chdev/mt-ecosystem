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

      {/* Social icons row under the main nav links */}
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
