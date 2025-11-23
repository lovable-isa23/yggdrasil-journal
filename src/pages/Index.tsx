import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { UserJourney } from "@/components/UserJourney";
import { AppShowcase } from "@/components/AppShowcase";
import { Testimonials } from "@/components/Testimonials";
import { WaitlistCTA } from "@/components/WaitlistCTA";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <UserJourney />
      <Features />
      <AppShowcase />
      {/* <Testimonials /> */}
      <WaitlistCTA />
    </main>
  );
};

export default Index;
