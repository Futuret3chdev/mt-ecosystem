'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link href="/" className="text-sm opacity-60 hover:opacity-100">← MT ECO SYSTEM</Link>
        <h1 className="text-4xl font-semibold tracking-tight mt-4 mb-8">Terms &amp; Conditions</h1>

        <div className="prose prose-invert text-sm opacity-80 space-y-6">
          <p>By using this site and the MT ECO SYSTEM you acknowledge that you are interacting with self-custodial, self-hosted software.</p>
          <p>You are solely responsible for your keys, your $MT, your Rockets, and your NFTs. We never hold custody of user funds or seeds.</p>
          <p>The software is provided as-is. There are risks in crypto. Do your own research. Only use what you can afford to lose.</p>
          <p>All core components (node, verifier, wallet logic, bridges) are built and operated by the team without reliance on third-party chains or custodians for the primary experience.</p>
          <p>Demo flows on this marketing site are simulations only. Real execution happens inside INFINITE WALLET with your local keys.</p>
          <p>Tokenomics, utilities, and future MT-CHAIN details are subject to evolution as the self-built ecosystem grows.</p>
        </div>

        <div className="mt-12 text-xs opacity-50">No third-party bridges. No third-party wallets. No third-party custody.</div>
      </div>
    </main>
  );
}
