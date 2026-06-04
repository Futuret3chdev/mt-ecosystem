import './globals.css';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/footer/Footer';

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
    <html lang="en" className="dark">
      <body className="bg-black text-white">
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
