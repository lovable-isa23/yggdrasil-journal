import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { GoalTracker } from "@/components/GoalTracker";
import { MoonPhaseIndicator } from "@/components/MoonPhaseIndicator";
import { SpiritualGuidePanel } from "@/components/SpiritualGuidePanel";
import { ReflectionPrompt } from "@/components/ReflectionPrompt";
import { NPSTooltip } from "@/components/NPSTooltip";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, BookOpen, BarChart3, Settings as SettingsIcon, Target } from "lucide-react";
import { PatternInsights } from "@/components/PatternInsights";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

const Goals = () => {
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentEntries();
  }, []);

  const fetchRecentEntries = async () => {
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (data) {
      setRecentEntries(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <NPSTooltip />
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" onClick={() => navigate("/")}>
                <img 
                  src={yggdrasilLogo} 
                  alt="Yggdrasil" 
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0"
                />
                <h1 className="text-lg sm:text-2xl font-bold text-primary truncate">
                  Yggdrasil
                </h1>
              </div>
              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/settings")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span className="hidden md:inline">Settings</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/journal")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Journal</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/insights")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Insights</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-12">
          {/* Hero Section */}
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Goals & Journeys
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Set intentions, track your path, and celebrate growth
            </p>
          </div>

          {/* Moon Phase, Reflection & Spiritual Guide Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            <div className="space-y-6">
              <MoonPhaseIndicator />
              <ReflectionPrompt recentEntries={recentEntries} />
            </div>
            <SpiritualGuidePanel />
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
