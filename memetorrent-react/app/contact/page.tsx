'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [botInput, setBotInput] = useState('');
  const [botLog, setBotLog] = useState<string[]>(["Hello! I'm the MT ECO SYSTEM assistant. Ask me about $MT, the wallet, utilities, bridges, or how to get involved."]);
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

  const sendToBot = async () => {
    const q = botInput.trim();
    if (!q) return;

    const userMsg = `> ${q}`;
    setBotLog(l => [...l, userMsg, '> Thinking...']);
    const currentInput = q;
    setBotInput('');

    try {
      const res = await fetch('/api/grokchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput }),
      });

      const data = await res.json();

      setBotLog(l => {
        // Remove the last "Thinking..." line and append the real reply
        const withoutThinking = l.slice(0, -1);
        return [...withoutThinking, `> ${data.reply || 'No reply received.'}`];
      });
    } catch (err) {
      setBotLog(l => {
        const withoutThinking = l.slice(0, -1);
        return [...withoutThinking, '> Error – AI service temporarily unavailable. Please try again.'];
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendToBot();
    }
  };

  return (
    <main className="min-h-screen">
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-end text-sm">
          {/* Back to Home and Launch Infinite Wallet aligned to the right. No extra MT ECO SYSTEM text here (main navbar already provides the branding at top). */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="opacity-70 hover:opacity-100">Back to Home</Link>
            <a href="https://mt.futuret3ch.com.au/" target="_blank" className="font-medium px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-white/30 hover:bg-white/5 text-xs sm:text-sm">Launch Infinite Wallet</a>
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
          <div className="font-semibold tracking-tight text-xl mb-2">MT ECO SYSTEM Assistant</div>
          <div className="text-xs opacity-60 mb-4">Hello! I'm the MT ECO SYSTEM assistant. Ask me about $MT, the wallet, utilities, bridges, or how to get involved.</div>

          <div className="rounded-2xl border border-white/10 bg-black/70 p-4 text-sm font-mono h-48 overflow-auto space-y-1 mb-4">
            {botLog.map((line, idx) => (
              <div key={idx} className={line.startsWith('>') ? 'opacity-70' : 'text-emerald-300'}>{line}</div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              value={botInput}
              onChange={(e) => setBotInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the MT ECO SYSTEM assistant anything..."
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
          All core infrastructure is self-hosted.
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
