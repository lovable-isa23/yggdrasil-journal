import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { MoodTracker } from "@/components/MoodTracker";
import { StatisticsDashboard } from "@/components/StatisticsDashboard";
import { SentimentTracking } from "@/components/SentimentTracking";
import { NPSTooltip } from "@/components/NPSTooltip";
import { AppNavbar } from "@/components/AppNavbar";
import { FrameworkAnalytics } from "@/components/FrameworkAnalytics";
import { PatternInsights } from "@/components/PatternInsights";
import { ChakraAnalytics } from "@/components/ChakraAnalytics";
import { TarotAnalytics } from "@/components/TarotAnalytics";
import { LazySection } from "@/components/LazySection";
import { InsightsDataProvider } from "@/contexts/InsightsDataContext";

import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Brain, TrendingUp, Sparkles, Layers } from "lucide-react";

interface VisibilityPrefs {
  show_emotional_analysis: boolean;
  show_framework_analysis: boolean;
  enable_chakra_tags: boolean;
  enable_tarot_tags: boolean;
}

const Insights = () => {
  const [visibilityPrefs, setVisibilityPrefs] = useState<VisibilityPrefs>({
    show_emotional_analysis: true,
    show_framework_analysis: true,
    enable_chakra_tags: false,
    enable_tarot_tags: false,
  });

  useEffect(() => {
    const loadVisibilityPrefs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_preferences")
        .select("show_emotional_analysis, show_framework_analysis, enable_chakra_tags, enable_tarot_tags")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setVisibilityPrefs({
          show_emotional_analysis: (data as any).show_emotional_analysis ?? true,
          show_framework_analysis: (data as any).show_framework_analysis ?? true,
          enable_chakra_tags: (data as any).enable_chakra_tags ?? false,
          enable_tarot_tags: (data as any).enable_tarot_tags ?? false,
        });
      }
    };
    loadVisibilityPrefs();
  }, []);

  const handleImportComplete = () => {
    toast("Import Complete", {
      description: "Your entries have been imported. Refreshing insights...",
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <AuthGuard>
      <InsightsDataProvider>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
          <NPSTooltip />
          <AppNavbar />

          <main className="container mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-12">
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
              {/* Overview Section - loads immediately (above fold) */}
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-bold">Overview</h3>
                </div>
                <div className="grid gap-6">
                  <StatisticsDashboard />
                </div>
              </section>

              {/* Emotional Analysis Section - lazy loaded */}
              {visibilityPrefs.show_emotional_analysis && (
                <LazySection height="400px">
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <Brain className="h-6 w-6 text-primary" />
                      <h3 className="text-2xl font-bold">Emotional Analysis</h3>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <MoodTracker />
                      <SentimentTracking />
                    </div>
                    {(visibilityPrefs.enable_chakra_tags || visibilityPrefs.enable_tarot_tags) && (
                      <div className="grid gap-6 lg:grid-cols-2 mt-6">
                        {visibilityPrefs.enable_chakra_tags && <ChakraAnalytics />}
                        {visibilityPrefs.enable_tarot_tags && <TarotAnalytics />}
                      </div>
                    )}
                  </section>
                </LazySection>
              )}

              {/* Framework Analysis Section - lazy loaded */}
              {visibilityPrefs.show_framework_analysis && (
                <LazySection height="300px">
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <Layers className="h-6 w-6 text-primary" />
                      <h3 className="text-2xl font-bold">Framework Analysis</h3>
                    </div>
                    <div className="grid gap-6">
                      <FrameworkAnalytics />
                    </div>
                  </section>
                </LazySection>
              )}

              {/* Pattern Discovery Section - lazy loaded */}
              <LazySection height="300px">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-bold">Pattern Discovery</h3>
                  </div>
                  <div className="grid gap-6">
                    <PatternInsights />
                  </div>
                </section>
              </LazySection>

              {/* Visualizations Section - lazy loaded */}
              <LazySection height="400px">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-bold">Visualizations</h3>
                  </div>
                  <div className="grid gap-6">
                    <KnowledgeGraph />
                  </div>
                </section>
              </LazySection>

              {/* Manage Your Data Section - lazy loaded */}
              <LazySection height="200px">
                <section>
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Manage Your Data
                      </CardTitle>
                      <CardDescription>
                        Import old journals or export your insights
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-semibold">Import Old Journals</h4>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Upload multiple files at once (.txt, .md, .json, .pdf)
                          </p>
                          <DataImport onImportComplete={handleImportComplete} />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-semibold">Export Your Data</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Download entries and comprehensive insights reports
                          </p>
                          <div className="space-y-2">
                            <DataExport />
                            <ReportExport />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              </LazySection>
            </div>
          </main>
        </div>
      </InsightsDataProvider>
    </AuthGuard>
  );
};

export default Insights;
