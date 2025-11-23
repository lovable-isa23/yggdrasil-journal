import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLoading } from "@/contexts/LoadingContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Lightbulb, Heart, Tag, AlertTriangle, Phone, BookOpen, HelpCircle, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
  frameworks_applied?: string[];
  depth_analysis?: {
    psychological_themes?: string[];
    spiritual_themes?: string[];
    unconscious_material?: string;
  };
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
  sacred_geometry?: Array<{ pattern: string; description: string }>;
  depth_score?: number;
  frameworks_applied?: string[];
}

export const EntryInsights = ({ entryId, title, content }: EntryInsightsProps) => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const { startLoading, updateProgress, stopLoading } = useLoading();

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
          sacred_geometry: (data as any).sacred_geometry as Array<{ pattern: string; description: string }> || [],
          depth_score: data.depth_score as number | undefined,
          frameworks_applied: (data.frameworks_applied as string[]) || [],
        });
        setHasAnalyzed(true);
      }
    } catch (error: any) {
      console.error("Error checking insights:", error);
    }
  };

  const analyzeEntry = async (isReanalysis = false) => {
    setLoading(true);
    startLoading("analyze-entry", "Analyzing entry...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in");
        stopLoading();
        return;
      }

      updateProgress(30, "Detecting emotions and themes...");
      const { data, error } = await supabase.functions.invoke("analyze-entry", {
        body: { entryId, title, content },
      });

      if (error) throw error;

      updateProgress(80, "Generating insights...");
      if (data?.insights) {
        setInsights(data.insights);
        setHasAnalyzed(true);
        updateProgress(100, "Analysis complete!");
        toast.success(isReanalysis ? "Entry re-analyzed with updated settings!" : "Entry analyzed! Check out your insights below.");
        
        // Refetch from database to ensure we display persisted data
        setTimeout(() => {
          checkExistingInsights();
        }, 500);
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze entry");
    } finally {
      stopLoading();
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
      
      <Accordion type="multiple" className="space-y-2">
        {/* Summary Section */}
        {insights.summary && (
          <AccordionItem value="summary">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Lightbulb className="h-4 w-4" />
                Summary
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card className="bg-muted/50">
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">{insights.summary}</p>
                </div>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Interpretation Section */}
        {insights.interpretation && (
          <AccordionItem value="interpretation">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <BookOpen className="h-4 w-4" />
                  Interpretation & Insights
                  {insights.depth_score && insights.depth_score >= 6 && (
                    <Badge variant="secondary" className="text-xs ml-2">Deep Analysis</Badge>
                  )}
                </div>
                {insights.frameworks_applied && insights.frameworks_applied.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {insights.frameworks_applied.includes('theravada') && (
                      <Badge variant="outline" className="text-xs">☸️ Buddhist</Badge>
                    )}
                    {insights.frameworks_applied.includes('freudian') && (
                      <Badge variant="outline" className="text-xs">🧠 Psychoanalytic</Badge>
                    )}
                    {insights.frameworks_applied.includes('jungian') && (
                      <Badge variant="outline" className="text-xs">🌓 Jungian</Badge>
                    )}
                    {insights.frameworks_applied.includes('hermetic') && (
                      <Badge variant="outline" className="text-xs">🔮 Hermetic</Badge>
                    )}
                    {insights.frameworks_applied.includes('advaita') && (
                      <Badge variant="outline" className="text-xs">🕉️ Advaita</Badge>
                    )}
                    {insights.frameworks_applied.includes('taoist') && (
                      <Badge variant="outline" className="text-xs">☯️ Taoist</Badge>
                    )}
                  </div>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card className="max-w-full">
                <div className="p-4 space-y-4">
                  {/* Main Insight */}
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {insights.interpretation.main_insight}
                    </p>
                  </div>

                  {/* Nested accordion for subsections */}
                  <Accordion type="multiple" className="space-y-2 max-w-full">
                    {/* Patterns Identified */}
                    {insights.interpretation.patterns_identified && 
                     insights.interpretation.patterns_identified.length > 0 && (
                      <AccordionItem value="patterns" className="border rounded-lg px-4 max-w-full">
                        <AccordionTrigger className="text-sm font-semibold py-3">
                          🔍 Patterns to Notice
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3">
                          <ul className="space-y-1 text-sm">
                            {insights.interpretation.patterns_identified.map((pattern, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{pattern}</span>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Reflective Questions */}
                    {insights.interpretation.questions && 
                     insights.interpretation.questions.length > 0 && (
                      <AccordionItem value="questions" className="border rounded-lg px-4 max-w-full">
                        <AccordionTrigger className="text-sm font-semibold py-3">
                          ❓ Questions for Reflection
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3">
                          <ul className="space-y-2 text-sm">
                            {insights.interpretation.questions.map((q, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary font-medium">Q{idx + 1}:</span>
                                <span className="italic">{q}</span>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Action Items */}
                    {insights.interpretation.action_items && 
                     insights.interpretation.action_items.length > 0 && (
                      <AccordionItem value="actions" className="border rounded-lg px-4 max-w-full">
                        <AccordionTrigger className="text-sm font-semibold py-3">
                          ✓ Action Steps
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3">
                          <ul className="space-y-1 text-sm">
                            {insights.interpretation.action_items.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary">→</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Growth Connection */}
                    {insights.interpretation.growth_connection && (
                      <AccordionItem value="growth" className="border rounded-lg px-4 max-w-full">
                        <AccordionTrigger className="text-sm font-semibold py-3">
                          📈 Your Growth Journey
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3">
                          <p className="text-sm leading-relaxed">
                            {insights.interpretation.growth_connection}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Themes */}
        {insights.themes.length > 0 && (
          <AccordionItem value="themes">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Tag className="h-4 w-4" />
                Themes ({insights.themes.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <div className="p-4">
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
                </div>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Emotions */}
        {insights.emotions.length > 0 && (
          <AccordionItem value="emotions">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Heart className="h-4 w-4" />
                Emotions ({insights.emotions.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <div className="p-4 space-y-2">
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
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Keywords */}
        {insights.keywords.length > 0 && (
          <AccordionItem value="keywords">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <span className="text-lg">🔑</span>
                Keywords ({insights.keywords.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <div className="p-4">
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
                </div>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Chakra Tags */}
        {insights.chakra_tags && insights.chakra_tags.length > 0 && (
          <AccordionItem value="chakras">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <span className="text-lg">🧘</span>
                Chakra Resonance ({insights.chakra_tags.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
                <div className="p-4 space-y-2">
                  {insights.chakra_tags.map((tag, idx) => (
                    <div key={idx} className="flex gap-3 p-2 rounded bg-background/50">
                      <span className="font-medium text-xs text-primary">{tag.chakra}:</span>
                      <span className="text-xs text-muted-foreground">{tag.description}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Tarot Tags */}
        {insights.tarot_tags && insights.tarot_tags.length > 0 && (
          <AccordionItem value="tarot">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <span className="text-lg">🔮</span>
                Tarot Archetypes ({insights.tarot_tags.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border-indigo-200 dark:border-indigo-800">
                <div className="p-4 space-y-2">
                  {insights.tarot_tags.map((tag, idx) => (
                    <div key={idx} className="flex gap-3 p-2 rounded bg-background/50">
                      <span className="font-medium text-xs text-accent">{tag.card}:</span>
                      <span className="text-xs text-muted-foreground">{tag.description}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Sacred Geometry */}
        {insights.sacred_geometry && insights.sacred_geometry.length > 0 && (
          <AccordionItem value="sacred-geometry">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <span className="text-lg">🔺</span>
                Sacred Geometry ({insights.sacred_geometry.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
                <div className="p-4 space-y-2">
                  {insights.sacred_geometry.map((geo, idx) => (
                    <div key={idx} className="flex gap-3 p-2 rounded bg-background/50">
                      <span className="font-medium text-xs text-amber-700 dark:text-amber-400">{geo.pattern}:</span>
                      <span className="text-xs text-muted-foreground">{geo.description}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};