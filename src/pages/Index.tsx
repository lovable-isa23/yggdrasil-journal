import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { UserJourney } from "@/components/UserJourney";
import { WaitlistCTA } from "@/components/WaitlistCTA";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <UserJourney />
      <Features />
      <WaitlistCTA />
    </main>
  );
};

export default Index;
