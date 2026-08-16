import Link from 'next/link';

export default function SoftwareDevelopersPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Link href="/software" className="text-sm opacity-60 hover:opacity-100">← Software</Link>
      <div className="uppercase text-xs tracking-[3px] text-emerald-400 mt-4 mb-2">Software · Developers</div>
      <h1 className="text-4xl font-semibold tracking-tight mb-4">Build on MemeTorrent.</h1>
      <p className="opacity-70 mb-8">
        Developer docs and live API sandbox stay on the main API page. This section is the
        software home for SDKs and tools we ship.
      </p>
      <ul className="space-y-3 text-sm opacity-80 mb-8">
        <li>• Live API and MT-Connect — <Link href="/developers" className="text-emerald-400 hover:underline">/developers</Link></li>
        <li>• Service status — <Link href="/status" className="text-emerald-400 hover:underline">/status</Link></li>
        <li>• SDKs and signed downloads — coming here</li>
      </ul>
      <p className="text-xs opacity-50">Early access: Support@MemeTorrent.com</p>
    </div>
  );
}
