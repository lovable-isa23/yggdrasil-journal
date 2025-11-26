import { Hero } from "@/components/Hero";
import { lazy, Suspense } from "react";

// Lazy load below-the-fold components
const Features = lazy(() => import("@/components/Features").then(m => ({ default: m.Features })));
const UserJourney = lazy(() => import("@/components/UserJourney").then(m => ({ default: m.UserJourney })));
const AppShowcase = lazy(() => import("@/components/AppShowcase").then(m => ({ default: m.AppShowcase })));
const WaitlistCTA = lazy(() => import("@/components/WaitlistCTA").then(m => ({ default: m.WaitlistCTA })));

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <Suspense fallback={<div className="h-24" />}>
        <UserJourney />
        <Features />
        <AppShowcase />
        <WaitlistCTA />
      </Suspense>
    </main>
  );
};

export default Index;
