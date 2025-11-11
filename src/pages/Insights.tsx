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
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
                <img 
                  src={yggdrasilLogo} 
                  alt="Yggdrasil" 
                  className="h-10 w-10 object-contain"
                />
                <h1 className="text-2xl font-bold text-primary">
                  Yggdrasil
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/journal")}
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Journal
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-12 max-w-4xl">
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
                  <CardTitle>Export Your Data</CardTitle>
                  <CardDescription>
                    Download your journal entries and insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Export All Entries</h3>
                    <DataExport />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Export Insights Report</h3>
                    <ReportExport />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Export All Reports</h3>
                    <ReportExport showAllData />
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
