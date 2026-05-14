import { LandingNavbar } from '@/components/landing/navbar';
import { LandingHero } from '@/components/landing/hero';
import { LandingStats } from '@/components/landing/stats';
import { LandingHowItWorks } from '@/components/landing/how-it-works';
import { LandingFeatures } from '@/components/landing/features';
import { LandingRoles } from '@/components/landing/roles';
import { LandingTestimonials } from '@/components/landing/testimonials';
import { LandingPricing } from '@/components/landing/pricing';
import { LandingFAQ } from '@/components/landing/faq';
import { LandingCTA } from '@/components/landing/cta';
import { LandingFooter } from '@/components/landing/footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <LandingNavbar />
      <LandingHero />
      <LandingStats />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingRoles />
      <LandingTestimonials />
      <LandingPricing />
      <LandingFAQ />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}
