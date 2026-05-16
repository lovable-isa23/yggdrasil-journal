import { PublicNavbar } from "@/components/PublicNavbar";
import { LandingFooter } from "@/components/LandingFooter";
import { Seo } from "@/components/Seo";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo title="Terms of Service — Yggdrasil" description="The terms that govern your use of Yggdrasil." path="/terms" />
      <PublicNavbar />
      <main className="flex-1 container mx-auto max-w-3xl px-6 pt-24 pb-16">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-muted-foreground">
          This page is coming soon. Please check back later.
        </p>
      </main>
      <LandingFooter />
    </div>
  );
};

export default Terms;
