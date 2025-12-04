import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLoading } from "@/contexts/LoadingContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Lightbulb, Heart, Tag, AlertTriangle, Phone, BookOpen, HelpCircle, CheckCircle, TrendingUp, AlertCircle, RefreshCw, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ReactMarkdown from 'react-markdown';

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

// Sacred geometry icons mapping
const SACRED_GEOMETRY_ICONS: Record<string, string> = {
  'Flower of Life': '❀',
  "Metatron's Cube": '⬡',
  'Sri Yantra': '🔺',
  'Tree of Life': '🌳',
  'Merkaba': '✡',
  'Torus': '🔄',
  'Seed of Life': '⚪',
  'Vesica Piscis': '◎',
  'Golden Ratio': '🌀',
  'Phi Spiral': '🌀',
  'Platonic Solids': '⬢',
};

const getGeometryIcon = (pattern: string): string => {
  // Try exact match first
  if (SACRED_GEOMETRY_ICONS[pattern]) {
    return SACRED_GEOMETRY_ICONS[pattern];
  }
  // Try partial match
  const lowerPattern = pattern.toLowerCase();
  for (const [key, icon] of Object.entries(SACRED_GEOMETRY_ICONS)) {
    if (lowerPattern.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerPattern)) {
      return icon;
    }
  }
  return '🌀'; // Default
};

const handleChipClick = (name: string, type: 'theme' | 'keyword' | 'entity') => {
  window.open(`/insights?node=${encodeURIComponent(name)}&type=${type}`, '_blank');
};

export const EntryInsights = ({ entryId, title, content }: EntryInsightsProps) => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [userPreferences, setUserPreferences] = useState<{
    enable_sacred_geometry?: boolean;
  } | null>(null);
  const { startLoading, updateProgress, stopLoading } = useLoading();

  useEffect(() => {
    checkExistingInsights();
    fetchUserPreferences();
  }, [entryId]);

  const fetchUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_preferences')
        .select('enable_sacred_geometry')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

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

      // Smooth progress updates with artificial delays
      updateProgress(10, "Preparing analysis...");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      updateProgress(30, "Detecting emotions and themes...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { data, error } = await supabase.functions.invoke("analyze-entry", {
        body: { entryId, title, content },
      });

      if (error) throw error;

      updateProgress(70, "Generating insights...");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      updateProgress(85, "Processing patterns...");
      await new Promise(resolve => setTimeout(resolve, 200));

      if (data?.insights) {
        setInsights(data.insights);
        setHasAnalyzed(true);
        updateProgress(90, "Saving insights...");
        await new Promise(resolve => setTimeout(resolve, 200));
        
        toast.success(isReanalysis ? "Entry re-analyzed with updated settings!" : "Entry analyzed! Check out your insights below.");
        
        // Refetch from database to ensure we display persisted data
        updateProgress(95, "Refreshing data...");
        await new Promise(resolve => setTimeout(resolve, 200));
        await checkExistingInsights();
        updateProgress(100, "Complete!");
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze entry");
    } finally {
      // Delay stopLoading to let user see 100% completion
      setTimeout(() => {
        stopLoading();
        setLoading(false);
      }, 800);
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
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Re-analyze button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => analyzeEntry(true)}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analyzing..." : "Re-analyze Entry"}
        </Button>
      </div>
      
      {/* Sacred Geometry Notice - only show if setting is enabled but no data */}
      {userPreferences?.enable_sacred_geometry && 
       insights.sacred_geometry && 
       insights.sacred_geometry.length === 0 && (
        <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Sacred geometry analysis is enabled in your settings but not yet available for this entry. 
            Click <strong>Re-analyze Entry</strong> above to generate sacred geometry insights.
          </AlertDescription>
        </Alert>
      )}
      
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
      
      <Accordion type="multiple" className="space-y-2 w-full max-w-full">
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
              <Card className="bg-muted/50 w-full max-w-full overflow-hidden">
                <div className="p-4 break-words">
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
              <div className="flex items-center gap-2 font-semibold text-sm">
                <BookOpen className="h-4 w-4" />
                Interpretation & Insights
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card className="w-full max-w-full overflow-hidden">
                <div className="p-4 space-y-4 break-words">
                  {/* Badges section - only visible when accordion is open */}
                  {(() => {
                    // Only show framework badges if the framework is actually mentioned in the main insight text
                    const mainInsight = insights.interpretation?.main_insight?.toLowerCase() || '';
                    const frameworksApplied = insights.frameworks_applied || [];
                    
                    const isFrameworkMentioned = (framework: string, keywords: string[]) => {
                      return frameworksApplied.includes(framework) && 
                        keywords.some(keyword => mainInsight.includes(keyword.toLowerCase()));
                    };
                    
                    const showBuddhist = isFrameworkMentioned('theravada', ['buddhis', 'theravada', 'dukkha', 'tanha', 'anicca', 'anatta', 'noble truth', 'eightfold', 'clinging', 'impermanence']);
                    const showFreudian = isFrameworkMentioned('freudian', ['freud', 'psychoanaly', 'defense mechanism', 'unconscious', 'ego', 'superego', 'id ', 'repression', 'projection', 'sublimation']);
                    const showJungian = isFrameworkMentioned('jungian', ['jung', 'archetype', 'shadow', 'anima', 'animus', 'individuation', 'collective unconscious', 'persona']);
                    const showHermetic = isFrameworkMentioned('hermetic', ['hermetic', 'as above', 'mentalism', 'correspondence', 'vibration', 'polarity', 'rhythm', 'cause and effect', 'gender principle']);
                    const showVedanta = isFrameworkMentioned('advaita', ['advaita', 'vedanta', 'maya', 'atman', 'brahman', 'neti neti', 'witness', 'pure awareness', 'non-dual', 'avidya', 'moksha', 'self-inquiry']);
                    const showTaoist = isFrameworkMentioned('taoist', ['taois', 'wu wei', 'yin', 'yang', 'tao', 'effortless', 'flow', 'naturalness', 'ziran']);
                    const showAttachment = isFrameworkMentioned('attachment', ['attachment', 'secure base', 'anxious attachment', 'avoidant', 'internal working model', 'attachment style', 'attachment pattern', 'protest behavior', 'hyperactivat', 'deactivat']);
                    const showIFS = isFrameworkMentioned('ifs', ['ifs', 'internal family', 'parts', 'exile', 'manager', 'firefighter', 'self-leadership', 'protector', 'part of me', 'inner part']);
                    const showCBT = isFrameworkMentioned('cbt', ['cbt', 'cognitive behavioral', 'cognitive distortion', 'automatic thought', 'core belief', 'all-or-nothing', 'catastrophiz', 'mind reading', 'fortune telling', 'should statement', 'labeling', 'filtering', 'overgeneraliz', 'cognitive triangle']);
                    const showDBT = isFrameworkMentioned('dbt', ['dbt', 'dialectic', 'wise mind', 'emotion mind', 'reasonable mind', 'radical acceptance', 'distress tolerance', 'interpersonal effectiveness', 'dear man', 'emotional dysregulation', 'validation', 'both/and']);
                    const showStoic = isFrameworkMentioned('stoic', ['stoic', 'stoicism', 'dichotomy of control', 'virtue', 'amor fati', 'memento mori', 'premeditatio', 'what is up to us', 'indifferent', 'marcus aurelius', 'seneca', 'epictetus']);
                    const showGnostic = isFrameworkMentioned('gnostic', ['gnostic', 'gnosis', 'divine spark', 'archon', 'demiurge', 'pleroma', 'sophia', 'pneuma', 'hylic', 'psychic', 'pneumatic', 'aeon']);
                    
                    const hasAnyBadge = insights.depth_score && insights.depth_score >= 6 || showBuddhist || showFreudian || showJungian || showHermetic || showVedanta || showTaoist || showAttachment || showIFS || showCBT || showDBT || showStoic || showGnostic;
                    
                    if (!hasAnyBadge) return null;
                    
                    return (
                      <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
                        {insights.depth_score && insights.depth_score >= 6 && (
                          <Badge variant="secondary" className="text-xs">Deep Analysis</Badge>
                        )}
                        {showBuddhist && <Badge variant="outline" className="text-xs">☸️ Buddhist</Badge>}
                        {showFreudian && <Badge variant="outline" className="text-xs">🔺 Freudian</Badge>}
                        {showJungian && <Badge variant="outline" className="text-xs">🌓 Jungian</Badge>}
                        {showHermetic && <Badge variant="outline" className="text-xs">🔮 Hermetic</Badge>}
                        {showVedanta && <Badge variant="outline" className="text-xs">🕉️ Vedanta</Badge>}
                        {showTaoist && <Badge variant="outline" className="text-xs">☯️ Taoist</Badge>}
                        {showStoic && <Badge variant="outline" className="text-xs">🏛️ Stoic</Badge>}
                        {showGnostic && <Badge variant="outline" className="text-xs">✨ Gnostic</Badge>}
                        {showAttachment && <Badge variant="outline" className="text-xs">💕 Attachment</Badge>}
                        {showIFS && <Badge variant="outline" className="text-xs">🎭 IFS</Badge>}
                        {showCBT && <Badge variant="outline" className="text-xs">💭 CBT</Badge>}
                        {showDBT && <Badge variant="outline" className="text-xs">⚖️ DBT</Badge>}
                      </div>
                    );
                  })()}
                  {/* Main Insight with Markdown support */}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>
                      {insights.interpretation.main_insight}
                    </ReactMarkdown>
                  </div>

                  {/* Nested accordion for subsections */}
                  <Accordion type="multiple" className="space-y-2 w-full max-w-full overflow-hidden">
                    {/* Patterns Identified */}
                    {insights.interpretation.patterns_identified && 
                     insights.interpretation.patterns_identified.length > 0 && (
                      <AccordionItem value="patterns" className="border rounded-lg px-4 w-full max-w-full overflow-hidden">
                        <AccordionTrigger className="text-sm font-semibold py-3">
                          🔍 Patterns to Notice
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3">
                          <ul className="space-y-2 text-sm">
                            {insights.interpretation.patterns_identified.map((pattern, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-1 flex-shrink-0">•</span>
                                <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1"><ReactMarkdown>{pattern}</ReactMarkdown></div>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Reflective Questions */}
                    {insights.interpretation.questions && 
                     insights.interpretation.questions.length > 0 && (
                      <AccordionItem value="questions" className="border rounded-lg px-4 w-full max-w-full overflow-hidden">
                        <AccordionTrigger className="text-sm font-semibold py-3">
                          ❓ Questions for Reflection
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3">
                          <ul className="space-y-2 text-sm">
                            {insights.interpretation.questions.map((q, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary font-medium flex-shrink-0">Q{idx + 1}:</span>
                                <div className="italic prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1"><ReactMarkdown>{q}</ReactMarkdown></div>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Action Items */}
                    {insights.interpretation.action_items && 
                     insights.interpretation.action_items.length > 0 && (
                      <AccordionItem value="actions" className="border rounded-lg px-4 w-full max-w-full overflow-hidden">
                        <AccordionTrigger className="text-sm font-semibold py-3">
                          ✓ Action Steps
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3">
                          <ul className="space-y-2 text-sm">
                            {insights.interpretation.action_items.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary flex-shrink-0">→</span>
                                <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1"><ReactMarkdown>{action}</ReactMarkdown></div>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Growth Connection */}
                    {insights.interpretation.growth_connection && (
                      <AccordionItem value="growth" className="border rounded-lg px-4 w-full max-w-full overflow-hidden">
                        <AccordionTrigger className="text-sm font-semibold py-3">
                          📈 Your Growth Journey
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3">
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>
                              {insights.interpretation.growth_connection}
                            </ReactMarkdown>
                          </div>
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
              <Card className="w-full max-w-full overflow-hidden">
                <div className="p-4 break-words">
                  <div className="flex flex-wrap gap-2">
                    {insights.themes.map((theme, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleChipClick(theme, 'theme')}
                        className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-medium hover:bg-secondary/30 transition-colors cursor-pointer"
                        title="Click to view in Knowledge Graph"
                      >
                        {theme}
                      </button>
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
              <Card className="w-full max-w-full overflow-hidden">
                <div className="p-4 space-y-2 break-words">
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
              <Card className="w-full max-w-full overflow-hidden">
                <div className="p-4 break-words">
                  <div className="flex flex-wrap gap-2">
                    {insights.keywords.map((keyword, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleChipClick(keyword, 'keyword')}
                        className="px-2 py-1 rounded bg-muted text-foreground text-xs hover:bg-muted/80 transition-colors cursor-pointer"
                        title="Click to view in Knowledge Graph"
                      >
                        {keyword}
                      </button>
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
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800 w-full max-w-full overflow-hidden">
                <div className="p-4 space-y-2 break-words">
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
              <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border-indigo-200 dark:border-indigo-800 w-full max-w-full overflow-hidden">
                <div className="p-4 space-y-2 break-words">
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
                <span className="text-lg">🌀</span>
                Sacred Geometry ({insights.sacred_geometry.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800 w-full max-w-full overflow-hidden">
                <div className="p-4 space-y-2 break-words">
                  {insights.sacred_geometry.map((geo, idx) => (
                    <div key={idx} className="flex gap-3 p-2 rounded bg-background/50">
                      <span className="font-medium text-xs text-amber-700 dark:text-amber-400">
                        {getGeometryIcon(geo.pattern)} {geo.pattern}:
                      </span>
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