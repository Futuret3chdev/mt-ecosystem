'use client';

export default function DonationsPage() {
  return (
    <main className="min-h-screen bg-black text-[#eef6ff] py-12 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-3">SUPPORT THE ECOSYSTEM</div>
        <h1 className="text-4xl font-semibold tracking-[-1.5px] mb-4">Donations</h1>
        <p className="text-[#97a7c6] max-w-md mx-auto">
          Help keep the MT Ecosystem fully self-built and self-hosted. All contributions go directly to infrastructure and development.
        </p>

        <div className="mt-10 text-left max-w-md mx-auto bg-white/[0.015] border border-white/10 rounded-2xl p-8 text-sm">
          <div className="font-medium mb-2">Primary Support Wallet</div>
          <div className="font-mono text-emerald-400 break-all text-xs">ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump</div>
          <div className="mt-4 text-xs text-white/50">SOL or SPL tokens accepted. Thank you for believing in a third-party-free future.</div>
        </div>

        <div className="mt-8 text-xs text-white/50">
          For larger partnerships or recurring support, reach out via <a href="/contact" className="text-emerald-400 hover:underline">Contact</a>.
        </div>
      </div>
    </main>
  );
}
