import Link from 'next/link';

export default function SoftwareSecurityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Link href="/software" className="text-sm opacity-60 hover:opacity-100">← Software</Link>
      <div className="uppercase text-xs tracking-[3px] text-emerald-400 mt-4 mb-2">Software · Security</div>
      <h1 className="text-4xl font-semibold tracking-tight mb-4">Security software.</h1>
      <p className="opacity-70 mb-8">
        This is where Futuret3ch / MemeTorrent security products will be published.
        Not through the group bot. Not as a one-off download page off to the side.
      </p>
      <ul className="space-y-3 text-sm opacity-80 mb-8">
        <li>• Our own client and server security tools</li>
        <li>• Network protection we operate and sign</li>
        <li>• Downloads and docs when a release is ready</li>
      </ul>
      <p className="text-sm opacity-70">Nothing to install yet. When a build is ready, it lands here.</p>
    </div>
  );
}
