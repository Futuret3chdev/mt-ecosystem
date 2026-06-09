export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-10 text-xs text-white/50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-y-3 justify-between">
        <div>© {new Date().getFullYear()} MT-ECO SYSTEM — Developed by Futuret3ch and MemeTorrent. All core components self-hosted and self-built.</div>
        <div className="flex gap-x-6">
          <a href="https://mt.futuret3ch.com.au/" target="_blank" className="hover:text-white">INFINITE WALLET (preview)</a>
          <a href="https://jup.ag/swap/SOL-ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump" target="_blank" className="hover:text-white">$MT on Jupiter</a>
          <span>Developer API &amp; licenses — coming soon</span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-4 text-[10px] text-white/40">No third-party bridges. No third-party wallets. No third-party custody. The best chain is the one you fully own.</div>
    </footer>
  );
}
