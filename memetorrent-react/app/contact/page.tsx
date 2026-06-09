'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [botInput, setBotInput] = useState('');
  const [botLog, setBotLog] = useState<string[]>(['Hello human. What do you seek?']);
  const [message, setMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2200);
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      showToast(`Copied ${email}`);
    }).catch(() => showToast(email));
  };

  const sendToBot = () => {
    const q = botInput.trim();
    if (!q) return;
    setBotLog(l => [...l, `> ${q}`]);
    setBotInput('');
    setTimeout(() => {
      const replies = [
        'The Overlords are aware. Stand by.',
        'Utility acknowledged. $MT to the moon.',
        'Your query has been logged in the MT-CHAIN queue.',
        'Soon™ — but real progress happening now.',
        'Message received. We move faster than the market.',
        'Support ticket opened. Expect a response in under 69 minutes.',
      ];
      setBotLog(l => [...l, replies[Math.floor(Math.random() * replies.length)]]);
    }, 520);
  };

  return (
    <main className="min-h-screen">
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <Link href="/" className="font-semibold tracking-tight flex items-center gap-2">
            <span className="text-emerald-400">MT</span> ECO SYSTEM
          </Link>
          <div className="flex items-center gap-3 sm:gap-6 text-sm">
            <Link href="/" className="opacity-70 hover:opacity-100">Back to Home</Link>
            <a href="https://wallet.futuret3ch.com.au/" target="_blank" className="font-medium px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-white/30 hover:bg-white/5 text-xs sm:text-sm">Launch Infinite Wallet</a>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">MEME OVERLORDS</div>
        <h1 className="text-5xl font-semibold tracking-[-1.6px] mb-4">Contact the Meme Overlords</h1>
        <p className="opacity-70 mb-10">We reply faster than a dev sells at ATH — usually under 69 minutes.</p>

        <div className="space-y-4 mb-10">
          {['Support@MemeTorrent.com', 'Michael@MemeTorrent.com'].map((e, i) => (
            <div key={i} className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.015] px-6 py-4">
              <div className="font-mono">{e}</div>
              <button
                onClick={() => copyEmail(e)}
                className="text-xs px-4 py-2 rounded-2xl border border-white/20 hover:bg-white/5 active:bg-white/10"
              >
                COPY
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-8">
          <div className="font-semibold tracking-tight text-xl mb-2">Message InnoBot-AI</div>
          <div className="text-xs opacity-60 mb-4">Hello human. What do you seek?</div>

          <div className="rounded-2xl border border-white/10 bg-black/70 p-4 text-sm font-mono h-48 overflow-auto space-y-1 mb-4">
            {botLog.map((line, idx) => (
              <div key={idx} className={line.startsWith('>') ? 'opacity-70' : 'text-emerald-300'}>{line}</div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              value={botInput}
              onChange={(e) => setBotInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendToBot(); }}
              placeholder="Type your message to the Overlords..."
              className="flex-1 bg-white/5 border border-white/15 rounded-2xl px-4 sm:px-5 py-3 text-sm focus:outline-none focus:border-emerald-400/60 min-h-[44px]"
            />
            <button
              onClick={sendToBot}
              className="px-6 sm:px-8 rounded-2xl border border-emerald-400/40 hover:bg-emerald-400/10 font-medium min-h-[44px]"
            >
              SEND
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-xs opacity-50">
          Or open a ticket via the INFINITE WALLET support flows. All core infrastructure is self-hosted.
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-400 text-black px-6 py-2 rounded-2xl text-sm font-medium shadow-xl z-50">
          {message}
        </div>
      )}

      <div className="border-t border-white/10 py-8 text-center text-[10px] opacity-40">
        <Link href="/" className="hover:text-white">← Back to MT ECO SYSTEM</Link>
      </div>
    </main>
  );
}
