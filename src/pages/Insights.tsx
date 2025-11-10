import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { ReflectionPrompt } from "@/components/ReflectionPrompt";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { MoodTracker } from "@/components/MoodTracker";
import { EmotionGraph } from "@/components/EmotionGraph";
import { StatisticsDashboard } from "@/components/StatisticsDashboard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, BookOpen, Settings as SettingsIcon } from "lucide-react";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

const Insights = () => {
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
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <img 
                  src={yggdrasilLogo} 
                  alt="Yggdrasil" 
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
                <h1 className="text-xl sm:text-2xl font-bold text-primary">
                  Yggdrasil
                </h1>
              </div>
              <div className="flex gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/journal")}
                  className="gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-4"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Journal</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/settings")}
                  className="gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-4"
                  size="sm"
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-4"
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
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
          <div className="space-y-12">
            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold text-primary">
                Your Insights & Analytics
              </h2>
              <p className="text-lg text-muted-foreground">
                Track your emotional journey and patterns
              </p>
            </div>

            {/* Statistics Dashboard */}
            <section>
              <StatisticsDashboard />
            </section>

            {/* Reflection Prompt */}
            {recentEntries.length > 0 && (
              <section>
                <ReflectionPrompt recentEntries={recentEntries} />
              </section>
            )}

            {/* Mood Tracker */}
            <section>
              <MoodTracker />
            </section>

            {/* Emotion Graph */}
            <section>
              <EmotionGraph />
            </section>

            {/* Knowledge Graph */}
            <section>
              <KnowledgeGraph />
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Insights;
