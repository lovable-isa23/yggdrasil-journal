import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { ReflectionPrompt } from "@/components/ReflectionPrompt";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { MoodTracker } from "@/components/MoodTracker";
import { StatisticsDashboard } from "@/components/StatisticsDashboard";
import { PatternInsights } from "@/components/PatternInsights";
import { TimelineVisualization } from "@/components/TimelineVisualization";
import { SentimentTracking } from "@/components/SentimentTracking";
import { GoalTracker } from "@/components/GoalTracker";
import { ReportExport } from "@/components/ReportExport";
import { DataExport } from "@/components/DataExport";
import { NPSTooltip } from "@/components/NPSTooltip";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, BookOpen } from "lucide-react";
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
                  onClick={() => navigate("/journal")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Journal</span>
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
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
          <div className="space-y-8 sm:space-y-12">
            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                Your Insights & Analytics
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
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

            {/* Timeline */}
            <section>
              <TimelineVisualization />
            </section>

            {/* Sentiment Tracking */}
            <section>
              <SentimentTracking />
            </section>

            {/* Knowledge Graph */}
            <section>
              <KnowledgeGraph />
            </section>

            {/* Pattern Insights */}
            <section>
              <PatternInsights />
            </section>

            {/* Goal Tracker */}
            <section>
              <GoalTracker />
            </section>

            {/* Export Options */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Export Your Data</CardTitle>
                  <CardDescription className="text-sm">
                    Download your journal entries and insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Export All Entries</h3>
                    <DataExport />
                  </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Export Reports</h3>
                  <div className="flex flex-col gap-2">
                    <ReportExport />
                    <ReportExport showAllData />
                  </div>
                </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Insights;
