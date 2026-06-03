import HeroSection from '@/components/hero/HeroSection';
import TokenStats from '@/components/stats/TokenStats';
import PortfolioManager from '@/components/portfolio/PortfolioManager';
import EcosystemSection from '@/components/ecosystem/EcosystemSection';
import WalletPromo from '@/components/wallet/WalletPromo';
import Features from '@/components/features/Features';
import Security from '@/components/security/Security';
import TapEcosystem from '@/components/tap/TapEcosystem';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TokenStats />
      <PortfolioManager />
      <EcosystemSection />
      <Features />
      <WalletPromo />
      <TapEcosystem />
      <Security />
    </>
  );
}
