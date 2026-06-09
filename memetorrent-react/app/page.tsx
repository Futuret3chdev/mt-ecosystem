import HeroSection from '@/components/hero/HeroSection';
import TokenStats from '@/components/stats/TokenStats';
import PortfolioManager from '@/components/portfolio/PortfolioManager';
import EcosystemSection from '@/components/ecosystem/EcosystemSection';
import WalletPromo from '@/components/wallet/WalletPromo';
import Features from '@/components/features/Features';
import Safety from '@/components/security/Security';
import TapEcosystem from '@/components/tap/TapEcosystem';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TokenStats />
      {/* Prominent standalone call-to-action as requested */}
      <div className="py-6 sm:py-8 border-y border-white/10 bg-black/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-2xl sm:text-3xl md:text-5xl font-semibold tracking-[-1.8px]">Do more than watch.<br />Act directly.</div>
          <p className="mt-2 sm:mt-3 opacity-70 max-w-md mx-auto text-sm sm:text-base">Real self-custodial flows that move assets, unlock utility, and prove ownership on-chain.</p>
        </div>
      </div>
      <PortfolioManager />
      <EcosystemSection />
      <Features />
      <WalletPromo />
      <TapEcosystem />
      <Safety />
    </>
  );
}
