export default function EcosystemSection() {
  const items = [
    {
      title: '$MT Token & Chain',
      desc: 'Native token of the MT-ECO SYSTEM. Ultra-low fixed fees. Real on-chain state machine powering everything.',
    },
    {
      title: 'INFINITE WALLET',
      desc: 'Self-custodial INFINITE WALLET. Seed encrypted locally. Mint NFTs, hold Rockets, bridge assets. 100% ours.',
    },
    {
      title: 'NFTs + Rockets',
      desc: 'Users mint NFTs directly. Earn Rockets in platform games. Both live in your wallet and are usable across the entire network.',
    },
    {
      title: 'Self-Built Everything',
      desc: 'Node, wallet, bridge verifier, NFT layer, future games & dev APIs. No third-party chains, bridges or custodians.',
    },
  ];

  return (
    <section id="ecosystem" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-semibold mb-12">
          Ecosystem
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-xl p-6"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <h3 className="font-semibold mb-2">
                {item.title}
              </h3>
              <p className="text-sm opacity-70">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
