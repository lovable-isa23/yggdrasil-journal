import { AuthGuard } from "@/components/AuthGuard";
import { GoalTracker } from "@/components/GoalTracker";
import { MoonPhaseIndicator } from "@/components/MoonPhaseIndicator";
import { AstrologyIndicator } from "@/components/AstrologyIndicator";
import { SpiritualGuidePanel } from "@/components/SpiritualGuidePanel";
import { NPSTooltip } from "@/components/NPSTooltip";
import { AppNavbar } from "@/components/AppNavbar";
import { PatternInsights } from "@/components/PatternInsights";
import { Target } from "lucide-react";

const Goals = () => {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 overflow-x-hidden">
        <NPSTooltip />
        <AppNavbar />

        {/* Main Content */}
        <main className="container mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12">
          {/* Hero Section */}
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Goals & Journeys
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Set intentions, track your path, and celebrate growth
            </p>
          </div>

          {/* Moon Phase & Spiritual Guide Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <MoonPhaseIndicator />
            <SpiritualGuidePanel />
          </div>

          {/* Astrology Section */}
          <div className="mb-12">
            <AstrologyIndicator />
          </div>

          {/* Goal Tracker */}
          <GoalTracker />

          {/* Pattern Insights Section */}
          <section className="mt-12">
            <div className="flex items-center gap-2 mb-6">
              <Target className="h-6 w-6 text-primary" />
              <h3 className="text-2xl font-bold">Pattern Insights</h3>
            </div>
            <PatternInsights />
          </section>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Goals;
