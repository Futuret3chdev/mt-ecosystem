import './globals.css';
import ClientShell from '@/components/layout/ClientShell';

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
        <script
          src="https://admin.futuret3ch.com.au/static/mt-tracker.js"
          data-source="memetorrent-web"
          defer
        />
        {/* Font Awesome for social icons in original brand colors */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
          crossOrigin="anonymous" 
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
