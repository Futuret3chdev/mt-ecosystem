import Link from 'next/link';

const sections = [
  {
    href: '/software/developers',
    title: 'Developers',
    desc: 'APIs, MT-Connect, wallets, and how to build on the network without third-party bridges.',
  },
  {
    href: '/software/security',
    title: 'Security',
    desc: 'Our own security software. Released here when ready — not through the community bot.',
  },
];

export default function SoftwarePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">Software</div>
      <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-1.6px] mb-4">
        Software we build ourselves.
      </h1>
      <p className="opacity-70 max-w-2xl mb-10 text-sm sm:text-base">
        Developers, security, and tools for the MT-ECO SYSTEM. Same site as everything else.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-2xl p-6 border border-white/10 hover:bg-white/[0.03] transition"
            style={{ background: 'var(--card)' }}
          >
            <h2 className="font-semibold text-xl mb-2">{s.title}</h2>
            <p className="text-sm opacity-70">{s.desc}</p>
            <div className="mt-4 text-sm text-emerald-400">Open →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
