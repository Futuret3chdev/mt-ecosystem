import HeroSection from '@/components/hero/HeroSection';
import TokenStats from '@/components/stats/TokenStats';
import EcosystemSection from '@/components/ecosystem/EcosystemSection';
import WalletPromo from '@/components/wallet/WalletPromo';
import Features from '@/components/features/Features';
import Security from '@/components/security/Security';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TokenStats />
      <EcosystemSection />
      <Features />
      <WalletPromo />
      <Security />
    </>
  );
}
