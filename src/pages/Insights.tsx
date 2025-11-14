import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { ReflectionPrompt } from "@/components/ReflectionPrompt";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { MoodTracker } from "@/components/MoodTracker";
import { StatisticsDashboard } from "@/components/StatisticsDashboard";
import { PatternInsights } from "@/components/PatternInsights";
import { TimelineVisualization } from "@/components/TimelineVisualization";
import { SentimentTracking } from "@/components/SentimentTracking";
import { ReportExport } from "@/components/ReportExport";
import { DataExport } from "@/components/DataExport";
import { NPSTooltip } from "@/components/NPSTooltip";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, BookOpen, Settings as SettingsIcon, BarChart3, Brain, TrendingUp, Target, FileText, Sparkles } from "lucide-react";
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
                  onClick={() => navigate("/sacred-journeys")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Sacred Journeys</span>
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
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Hero Section */}
          <div className="text-center space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-2">
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm font-medium">Analytics Dashboard</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Your Journey Insights
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Track your emotional journey, discover patterns, and gain deeper self-understanding
            </p>
          </div>

          <div className="space-y-12">
            {/* Overview Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold">Overview</h3>
              </div>
              <div className="grid gap-6">
                <StatisticsDashboard />
                {recentEntries.length > 0 && <ReflectionPrompt recentEntries={recentEntries} />}
              </div>
            </section>

            {/* Emotional Analysis Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Brain className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold">Emotional Analysis</h3>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <MoodTracker />
                <SentimentTracking />
              </div>
            </section>

            {/* Visualizations Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold">Visualizations</h3>
              </div>
              <div className="grid gap-6">
                <TimelineVisualization />
                <KnowledgeGraph />
              </div>
            </section>

            {/* Patterns Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Target className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold">Pattern Insights</h3>
              </div>
              <PatternInsights />
            </section>

            {/* Export Options Section */}
            <section>
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Export Your Data
                  </CardTitle>
                  <CardDescription>
                    Download your journal entries and comprehensive insights reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Export All Entries</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Download all your journal entries in JSON format
                      </p>
                      <DataExport />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Export Reports</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Generate comprehensive PDF reports with insights
                      </p>
                      <div className="flex flex-col gap-2">
                        <ReportExport />
                        <ReportExport showAllData />
                      </div>
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
