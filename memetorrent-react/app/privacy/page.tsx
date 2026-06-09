'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link href="/" className="text-sm opacity-60 hover:opacity-100">← MT ECO SYSTEM</Link>
        <h1 className="text-4xl font-semibold tracking-tight mt-4 mb-8">Privacy Policy</h1>

        <div className="prose prose-invert text-sm opacity-80 space-y-6">
          <p>We believe in radical transparency and minimal data collection.</p>
          <p>All keys, seeds, and sensitive operations happen client-side in your browser. Nothing ever leaves your device unless you explicitly sign and broadcast a transaction.</p>
          <p>We do not use third-party analytics, trackers, or advertising pixels on our core properties. Self-hosted infrastructure means we control the logs — and we minimize them.</p>
          <p>When you use the contact form or InnoBot, messages are only processed for the purpose of support and are not stored long-term or sold.</p>
          <p>Your on-chain activity is public by design (as with any blockchain), but we never associate it with personal identity unless you choose to (e.g. via optional social login recovery features in the future).</p>
          <p>For questions: Support@MemeTorrent.com</p>
        </div>

        <div className="mt-12 text-xs opacity-50">Last updated: 2026 • Self-built. Self-hosted. No third parties.</div>
      </div>
    </main>
  );
}
