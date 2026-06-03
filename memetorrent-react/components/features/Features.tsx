'use client';

export default function Features() {
  const items = [
    {
      title: '1 Cent Fees',
      desc: 'Fixed ultra-low fees marketed as ~1¢ SOL equivalent per transaction. No gas auctions. Predictable.',
    },
    {
      title: 'True Self-Built Wallet',
      desc: 'INFINITE WALLET is our self-built wallet. Full key control in-browser, encrypted vaults, QR, send, receive, NFT mint. No third parties. Infinite possibilities.',
    },
    {
      title: 'Native NFTs & Creators',
      desc: 'Mint real on-chain NFTs directly from the wallet. No external contracts or marketplaces required. Assets live forever on the MT network.',
    },
    {
      title: 'Rockets — Cross-Game Currency',
      desc: 'Earn Rockets in official MT Games. Store them in your wallet. Spend or transfer them in any future game or service on the network. Real utility, not points.',
    },
    {
      title: 'Self-Built Bridge',
      desc: 'Bridge $MT from Solana (and future chains) using on-chain burn + cryptographic proof verification. We verify ourselves. No Wormhole, no third-party bridges.',
    },
    {
      title: 'Security First',
      desc: 'Everything client-side where it matters. Ed25519 signatures match our core node. Password encrypted mnemonic only. Lock clears keys from RAM.',
    },
  ];

  return (
    <section id="features" className="py-20 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-xs tracking-[3px] text-emerald-400 mb-3">WHY MT IS DIFFERENT</div>
        <div className="text-4xl font-semibold tracking-[-1.5px] max-w-2xl">No rented chains. No rented wallets. No rented trust.</div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {items.map((item, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-white/[0.015] p-7">
              <div className="font-semibold text-xl tracking-tight mb-3">{item.title}</div>
              <p className="text-sm opacity-70 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
