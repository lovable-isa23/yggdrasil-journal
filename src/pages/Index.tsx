import { PublicNavbar } from "@/components/PublicNavbar";
import { Hero } from "@/components/Hero";
import { LandingFooter } from "@/components/LandingFooter";
import { Seo } from "@/components/Seo";
import { lazy, Suspense } from "react";

const SocialProofSection = lazy(() => import("@/components/homepage/SocialProofSection").then(m => ({ default: m.SocialProofSection })));
const LiveDemoSection = lazy(() => import("@/components/homepage/LiveDemoSection").then(m => ({ default: m.LiveDemoSection })));
const HowItWorksSection = lazy(() => import("@/components/homepage/HowItWorksSection").then(m => ({ default: m.HowItWorksSection })));
const UseCaseCards = lazy(() => import("@/components/homepage/UseCaseCards").then(m => ({ default: m.UseCaseCards })));
const GraphSnapshotSection = lazy(() => import("@/components/homepage/GraphSnapshotSection").then(m => ({ default: m.GraphSnapshotSection })));
const BetaWaitlistCTA = lazy(() => import("@/components/homepage/BetaWaitlistCTA").then(m => ({ default: m.BetaWaitlistCTA })));

const Index = () => {
  return (
    <main className="min-h-screen">
      <PublicNavbar />
      <Hero />
      <Suspense fallback={<div className="h-24" />}>
        <HowItWorksSection />
        <LiveDemoSection />
        <UseCaseCards />
        <GraphSnapshotSection />
        <SocialProofSection />
        <BetaWaitlistCTA />
      </Suspense>
      <LandingFooter />
    </main>
  );
};

export default Index;
