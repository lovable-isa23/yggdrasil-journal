import { Hero } from "@/components/Hero";
import { lazy, Suspense } from "react";

// Lazy load below-the-fold components
const LiveDemoSection = lazy(() => import("@/components/homepage/LiveDemoSection").then(m => ({ default: m.LiveDemoSection })));
const HowItWorksSection = lazy(() => import("@/components/homepage/HowItWorksSection").then(m => ({ default: m.HowItWorksSection })));
const UseCaseCards = lazy(() => import("@/components/homepage/UseCaseCards").then(m => ({ default: m.UseCaseCards })));
const GraphSnapshotSection = lazy(() => import("@/components/homepage/GraphSnapshotSection").then(m => ({ default: m.GraphSnapshotSection })));
const BetaWaitlistCTA = lazy(() => import("@/components/homepage/BetaWaitlistCTA").then(m => ({ default: m.BetaWaitlistCTA })));

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <Suspense fallback={<div className="h-24" />}>
        <LiveDemoSection />
        <HowItWorksSection />
        <UseCaseCards />
        <GraphSnapshotSection />
        <BetaWaitlistCTA />
      </Suspense>
    </main>
  );
};

export default Index;
