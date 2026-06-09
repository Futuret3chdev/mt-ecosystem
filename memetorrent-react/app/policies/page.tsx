'use client';

import Link from 'next/link';

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link href="/" className="text-sm opacity-60 hover:opacity-100">← MT ECO SYSTEM</Link>
        <h1 className="text-4xl font-semibold tracking-tight mt-4 mb-8">Policies &amp; Principles</h1>

        <div className="prose prose-invert text-sm opacity-80 space-y-6">
          <p><strong>Self-hosted first.</strong> Every critical piece of infrastructure is run by us on our own hardware and software stack.</p>
          <p><strong>Keys stay yours.</strong> Client-side generation, local encryption, local signing. The node sees signatures and public data only.</p>
          <p><strong>Utility is real.</strong> $MT is not just a meme — it is the access token for games, NFTs, stores, future chain features, launchpad, and vault rewards.</p>
          <p><strong>No rugs, no rugs, no rugs.</strong> Anti-rug architecture, community guardians, transparent on-chain proofs, and locked team allocations.</p>
          <p><strong>Open by default where it matters.</strong> Verifiable reports, on-chain activity, and direct on-page management flows so you never have to “trust” a dashboard.</p>
          <p>These policies are lived in the code and the architecture — not just written here.</p>
        </div>

        <div className="mt-10 text-xs opacity-50">Questions? Reach the Overlords via the Contact page or Support@MemeTorrent.com</div>
      </div>
    </main>
  );
}
