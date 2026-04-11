import { Hero } from "@/components/Hero";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { lazy, Suspense } from "react";

const LiveDemoSection = lazy(() => import("@/components/homepage/LiveDemoSection").then(m => ({ default: m.LiveDemoSection })));
const GraphSnapshotSection = lazy(() => import("@/components/homepage/GraphSnapshotSection").then(m => ({ default: m.GraphSnapshotSection })));
const AboutPreviewSection = lazy(() => import("@/components/homepage/AboutPreviewSection").then(m => ({ default: m.AboutPreviewSection })));
const PricingCTA = lazy(() => import("@/components/homepage/PricingCTA").then(m => ({ default: m.PricingCTA })));

const Index = () => {
  return (
    <main className="min-h-screen">
      <PublicNavbar />
      <Hero />
      <Suspense fallback={<div className="h-24" />}>
        <LiveDemoSection />
        <div className="border-t border-border" />
        <GraphSnapshotSection />
        <div className="border-t border-border" />
        <AboutPreviewSection />
        <div className="border-t border-border" />
        <PricingCTA />
      </Suspense>
      <PublicFooter />
    </main>
  );
};

export default Index;
