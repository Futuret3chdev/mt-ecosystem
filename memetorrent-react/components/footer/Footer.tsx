export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-10 text-xs text-white/50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-y-3 justify-between">
        <div>© {new Date().getFullYear()} MT-ECO SYSTEM — Developed by Futuret3ch and MemeTorrent. All core components self-hosted and self-built.</div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <a href="https://wallet.futuret3ch.com.au/" target="_blank" className="hover:text-white">INFINITE WALLET</a>
          <a href="/contact" className="hover:text-white">Contact</a>
          <a href="/privacy" className="hover:text-white">Privacy</a>
          <a href="/terms" className="hover:text-white">Terms</a>
          <a href="/policies" className="hover:text-white">Policies</a>
          <a href="https://www.futuret3ch.com.au" target="_blank" className="hover:text-white">futuret3ch</a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-4 text-[10px] text-white/40">No third-party bridges. No third-party wallets. No third-party custody. The best chain is the one you fully own.</div>
    </footer>
  );
}
