import './globals.css';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/footer/Footer';
import { WalletAdapterProvider } from '@/components/wallet/WalletAdapterProvider';

export const metadata = {
  title: 'MT-ECO SYSTEM | $MT • INFINITE WALLET • 1¢ Fees — by Futuret3ch and MemeTorrent',
  description: 'Next-generation decentralized on-chain network. Native $MT token. Self-built INFINITE WALLET. NFTs, Rockets, self-built bridges. No third parties. Infinite possibilities.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Font Awesome for social icons in original brand colors */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
          crossOrigin="anonymous" 
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <WalletAdapterProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </WalletAdapterProvider>
        {/* Custom MT Admin Analytics Tracker - self-hosted, no third parties */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const ADMIN_API = 'https://admin.futuret3ch.com.au'; // Change to your admin API URL on VPS
              const SOURCE = 'web-marketing';
              function track(type, data = {}) {
                try {
                  const payload = {
                    source: SOURCE,
                    type: type,
                    path: window.location.pathname + window.location.search,
                    referrer: document.referrer,
                    ua: navigator.userAgent,
                    session_id: sessionStorage.getItem('mt_session') || (sessionStorage.setItem('mt_session', (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36))), sessionStorage.getItem('mt_session')),
                    data: data
                  };
                  if (navigator.sendBeacon) {
                    navigator.sendBeacon(ADMIN_API + '/api/track', JSON.stringify(payload));
                  } else {
                    fetch(ADMIN_API + '/api/track', { method: 'POST', body: JSON.stringify(payload), keepalive: true, headers: {'Content-Type': 'application/json'} });
                  }
                } catch(e) {}
              }
              // Pageview
              track('pageview');
              // Basic vitals using PerformanceObserver (like Speed Insights)
              try {
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') track('vital', {fcp: entry.startTime});
                    if (entry.entryType === 'largest-contentful-paint') track('vital', {lcp: entry.startTime});
                    if (entry.entryType === 'first-input') track('vital', {fid: entry.processingStart - entry.startTime});
                  }
                }).observe({type: 'paint', buffered: true});
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') track('vital', {lcp: entry.startTime});
                  }
                }).observe({type: 'largest-contentful-paint', buffered: true});
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (entry.entryType === 'first-input') track('vital', {fid: entry.processingStart - entry.startTime});
                  }
                }).observe({type: 'first-input', buffered: true});
                // CLS
                let cls = 0;
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) cls += entry.value;
                  }
                  track('vital', {cls: cls});
                }).observe({type: 'layout-shift', buffered: true});
              } catch(e) {}
              // Send on unload for good measure
              window.addEventListener('beforeunload', () => track('pageleave'));
            })();
          `
        }} />
      </body>
    </html>
  );
}
