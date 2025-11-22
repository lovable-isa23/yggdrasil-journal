import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Lightbulb, Heart, Tag, AlertTriangle, Phone, BookOpen, HelpCircle, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EntryInsightsProps {
  entryId: string;
  title: string;
  content: string;
}

interface Interpretation {
  main_insight: string;
  questions?: string[];
  action_items?: string[];
  patterns_identified?: string[];
  growth_connection?: string;
}

interface Insights {
  entities: string[];
  themes: string[];
  emotions: Array<{ emotion: string; intensity: number }>;
  keywords: string[];
  summary: string;
  safety_concerns?: {
    flag: boolean;
    concerns: string[];
  };
  interpretation?: Interpretation;
  chakra_tags?: Array<{ chakra: string; description: string }>;
  tarot_tags?: Array<{ card: string; description: string }>;
}

export const EntryInsights = ({ entryId, title, content }: EntryInsightsProps) => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    checkExistingInsights();
  }, [entryId]);

  const checkExistingInsights = async () => {
    try {
      const { data, error } = await supabase
        .from("entry_insights")
        .select("*")
        .eq("entry_id", entryId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setInsights({
          entities: (data.entities as string[]) || [],
          themes: (data.themes as string[]) || [],
          emotions: (data.emotions as Array<{ emotion: string; intensity: number }>) || [],
          keywords: (data.keywords as string[]) || [],
          summary: data.summary || "",
          safety_concerns: (data.safety_concerns as { flag: boolean; concerns: string[] }) || { flag: false, concerns: [] },
          interpretation: data.interpretation ? (data.interpretation as unknown as Interpretation) : undefined,
          chakra_tags: (data.chakra_tags as Array<{ chakra: string; description: string }>) || [],
          tarot_tags: (data.tarot_tags as Array<{ card: string; description: string }>) || [],
        });
        setHasAnalyzed(true);
      }
    } catch (error: any) {
      console.error("Error checking insights:", error);
    }
  };

  const analyzeEntry = async (isReanalysis = false) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const { data, error } = await supabase.functions.invoke("analyze-entry", {
        body: { entryId, title, content },
      });

      if (error) throw error;

      if (data?.insights) {
        setInsights(data.insights);
        setHasAnalyzed(true);
        toast.success(isReanalysis ? "Entry re-analyzed with updated settings!" : "Entry analyzed! Check out your insights below.");
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze entry");
    } finally {
      setLoading(false);
    }
  };

  if (!hasAnalyzed) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <Sparkles className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div className="flex-grow">
            <h3 className="font-semibold text-lg mb-2">AI Insights Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Let our AI analyze this entry to extract themes, emotions, and key insights
            </p>
            <Button 
              onClick={() => analyzeEntry(false)}
              disabled={loading}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {loading ? "Analyzing..." : "Analyze Entry"}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-4">
      {/* Re-analyze button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => analyzeEntry(true)}
          disabled={loading}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Re-analyzing..." : "Re-analyze Entry"}
        </Button>
      </div>
      {insights.safety_concerns?.flag && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Crisis Support Available</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p className="font-medium">
              Your entry contains concerning thoughts. Please know that help is available and you don't have to face this alone.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <div>
                  <strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988 (24/7)
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                <Heart className="h-4 w-4 flex-shrink-0" />
                <div>
                  <strong>Crisis Text Line:</strong> Text HOME to 741741
                </div>
              </div>
            </div>
            <p className="text-xs mt-3">
              Consider: Using distress tolerance skills • Reaching out to a trusted friend or family member • 
              Contacting your therapist or counselor • Going to your nearest emergency room
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      {insights.summary && (
        <Card className="p-6 bg-card border-border">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">{insights.summary}</p>
            </div>
          </div>
        </Card>
      )}

      {insights.interpretation && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <div className="flex-grow">
                <h4 className="font-semibold text-lg mb-3">Interpretation & Insights</h4>
                
                {/* Main Insight */}
                <div className="prose prose-sm max-w-none mb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {insights.interpretation.main_insight}
                  </p>
                </div>

                {/* Patterns Identified */}
                {insights.interpretation.patterns_identified && 
                 insights.interpretation.patterns_identified.length > 0 && (
                  <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      Patterns to Notice
                    </h5>
                    <ul className="space-y-1 text-sm">
                      {insights.interpretation.patterns_identified.map((pattern, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Reflective Questions */}
                {insights.interpretation.questions && 
                 insights.interpretation.questions.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-600" />
                      Questions for Reflection
                    </h5>
                    <ul className="space-y-2 text-sm">
                      {insights.interpretation.questions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 font-medium">Q{idx + 1}:</span>
                          <span className="italic">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {insights.interpretation.action_items && 
                 insights.interpretation.action_items.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Action Steps
                    </h5>
                    <ul className="space-y-1 text-sm">
                      {insights.interpretation.action_items.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600">→</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Growth Connection */}
                {insights.interpretation.growth_connection && (
                  <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      Your Growth Journey
                    </h5>
                    <p className="text-sm leading-relaxed">
                      {insights.interpretation.growth_connection}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.themes.length > 0 && (
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-secondary" />
              <h4 className="font-semibold text-sm">Themes</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.themes.map((theme, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-medium"
                >
                  {theme}
                </span>
              ))}
            </div>
          </Card>
        )}

        {insights.emotions.length > 0 && (
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-destructive" />
              <h4 className="font-semibold text-sm">Emotions</h4>
            </div>
            <div className="space-y-2">
              {insights.emotions.slice(0, 5).map((emotion, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs flex-grow capitalize">{emotion.emotion}</span>
                  <div className="flex-grow bg-muted rounded-full h-2 max-w-[100px]">
                    <div
                      className="bg-gradient-to-r from-primary to-destructive h-full rounded-full"
                      style={{ width: `${emotion.intensity * 10}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {emotion.intensity}/10
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {insights.keywords.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <h4 className="font-semibold text-sm mb-3">Keywords</h4>
          <div className="flex flex-wrap gap-2">
            {insights.keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded bg-muted text-foreground text-xs"
              >
                {keyword}
              </span>
            ))}
          </div>
        </Card>
      )}

      {insights.chakra_tags && insights.chakra_tags.length > 0 && (
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="text-lg">🧘</span>
            Chakra Resonance
          </h4>
          <div className="space-y-2">
            {insights.chakra_tags.map((tag, idx) => (
              <div key={idx} className="flex gap-3 p-2 rounded bg-background/50">
                <span className="font-medium text-xs text-primary">{tag.chakra}:</span>
                <span className="text-xs text-muted-foreground">{tag.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {insights.tarot_tags && insights.tarot_tags.length > 0 && (
        <Card className="p-4 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="text-lg">🔮</span>
            Tarot Archetypes
          </h4>
          <div className="space-y-2">
            {insights.tarot_tags.map((tag, idx) => (
              <div key={idx} className="flex gap-3 p-2 rounded bg-background/50">
                <span className="font-medium text-xs text-accent">{tag.card}:</span>
                <span className="text-xs text-muted-foreground">{tag.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
