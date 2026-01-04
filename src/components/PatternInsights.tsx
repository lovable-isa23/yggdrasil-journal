import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Loader2, TrendingUp, Lightbulb, Calendar, RefreshCw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "./ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { format } from "date-fns";
import { useDataSufficiency } from "@/hooks/use-data-sufficiency";
import { InsufficientDataPrompt } from "@/components/InsufficientDataPrompt";
import { useLoading } from "@/contexts/LoadingContext";
import { QuantumDiscovery } from "./QuantumDiscovery";

interface Pattern {
  id: string;
  pattern_type: string;
  title: string;
  description: string;
  confidence_score: number;
  related_items: any;
  temporal_info: any;
  actionable_insight: string;
  created_at: string;
}

export const PatternInsights = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [openPatterns, setOpenPatterns] = useState<Set<string>>(new Set());
  const [relatedEntries, setRelatedEntries] = useState<Array<{
    id: string;
    title: string;
    entry_date: string;
    content: string;
    relevantQuote?: string;
  }>>([]);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const { hasMinimumData, totalEntries, deepEntries, analyzedEntries, needsAnalysis } = useDataSufficiency();
  const { startLoading, updateProgress, stopLoading } = useLoading();

  const togglePattern = (patternId: string) => {
    setOpenPatterns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patternId)) {
        newSet.delete(patternId);
      } else {
        newSet.add(patternId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchPatterns();
    fetchAvailableThemes();
  }, []);

  const fetchPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from("pattern_insights")
        .select("*")
        .order("confidence_score", { ascending: false });

      if (error) throw error;
      setPatterns(data || []);
    } catch (error) {
      console.error("Error fetching patterns:", error);
    } finally {
      setLoading(false);
    }
  };

  // Split items on "and", "&", or "/" for proper separation
  // but preserve content inside parentheses
  const splitItem = (item: string): string[] => {
    // First, temporarily replace content inside parentheses
    const parenthesesContent: string[] = [];
    const withPlaceholders = item.replace(/\([^)]+\)/g, (match) => {
      parenthesesContent.push(match);
      return `__PAREN_${parenthesesContent.length - 1}__`;
    });
    
    // Now split on "and", "&", or "/" 
    const parts = withPlaceholders
      .split(/\s*(?:and|&|\/)\s*/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Restore parentheses content
    return parts.map(part => 
      part.replace(/__PAREN_(\d+)__/g, (_, idx) => parenthesesContent[parseInt(idx)])
    );
  };

  const fetchAvailableThemes = async () => {
    try {
      const { data, error } = await supabase
        .from("knowledge_relationships")
        .select("source_item, target_item, weighted_strength")
        .order("weighted_strength", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Extract unique themes/items, splitting combined items
      const themes = new Set<string>();
      data?.forEach((rel) => {
        splitItem(rel.source_item).forEach(t => themes.add(t.toLowerCase()));
        splitItem(rel.target_item).forEach(t => themes.add(t.toLowerCase()));
      });
      
      // Capitalize first letter of each theme
      const formatted = Array.from(themes)
        .map(t => t.charAt(0).toUpperCase() + t.slice(1))
        .sort();
      
      setAvailableThemes(formatted.slice(0, 30));
    } catch (error) {
      console.error("Error fetching themes:", error);
    }
  };

  const analyzePatterns = async () => {
    setAnalyzing(true);
    startLoading("analyze-patterns", "Analyzing entries...");
    
    try {
      updateProgress(40, "Finding patterns...");
      const { data, error } = await supabase.functions.invoke("analyze-patterns");

      if (error) throw error;

      updateProgress(80, "Generating insights...");
      if (data.success) {
        updateProgress(100, "Analysis complete!");
        toast.success(`Discovered ${data.patterns} patterns and ${data.relationships} relationships!`);
        await fetchPatterns();
      } else {
        toast.error(data.message || "Analysis failed");
      }
    } catch (error) {
      console.error("Error analyzing patterns:", error);
      toast.error("Failed to analyze patterns");
    } finally {
      stopLoading();
      setAnalyzing(false);
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case "habit": return "🔄";
      case "emotional": return "💭";
      case "behavioral": return "👤";
      case "temporal": return "⏰";
      case "cognitive": return "🧠";
      default: return "📊";
    }
  };

  const getPatternColor = (type: string) => {
    const colors: Record<string, string> = {
      habit: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      emotional: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
      behavioral: "bg-green-500/10 text-green-700 dark:text-green-300",
      temporal: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
      cognitive: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
    };
    return colors[type] || "bg-gray-500/10 text-gray-700 dark:text-gray-300";
  };

  const handleItemClick = async (item: string) => {
    setSelectedItem(item);
    
    try {
      // Fetch decrypted entries to get readable content
      const { data: decryptedData, error: decryptError } = await supabase.functions.invoke("decrypt-entries");
      
      if (decryptError) {
        console.error("Decrypt error:", decryptError);
        throw decryptError;
      }
      
      const allEntries = decryptedData?.entries || [];
      
      // Fetch entry_insights that contain this item in themes, keywords, or entities
      const { data: insights, error: insightsError } = await supabase
        .from("entry_insights")
        .select("entry_id, themes, keywords, entities");

      if (insightsError) throw insightsError;

      // Filter insights that contain the selected item (case-insensitive)
      const itemLower = item.toLowerCase();
      const relevantInsights = insights?.filter((insight) => {
        const themes = ((insight.themes as string[]) || []).map(t => t.toLowerCase());
        const keywords = ((insight.keywords as string[]) || []).map(k => k.toLowerCase());
        const entities = ((insight.entities as string[]) || []).map(e => e.toLowerCase());
        
        return (
          themes.some(t => t.includes(itemLower) || itemLower.includes(t)) ||
          keywords.some(k => k.includes(itemLower) || itemLower.includes(k)) ||
          entities.some(e => e.includes(itemLower) || itemLower.includes(e))
        );
      }) || [];

      const entryIds = relevantInsights.map((i) => i.entry_id);

      if (entryIds.length === 0) {
        setRelatedEntries([]);
        return;
      }

      // Filter decrypted entries by matching IDs
      const matchedEntries = allEntries
        .filter((e: any) => entryIds.includes(e.id))
        .map((entry: any) => {
          const sentences = (entry.content || "").split(/[.!?]+/);
          const relevantSentence = sentences.find((s: string) =>
            s.toLowerCase().includes(item.toLowerCase())
          );

          return {
            id: entry.id,
            title: entry.title,
            entry_date: entry.entry_date,
            content: entry.content,
            relevantQuote: relevantSentence?.trim() || (entry.content || "").slice(0, 150) + "...",
          };
        })
        .sort((a: any, b: any) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

      setRelatedEntries(matchedEntries);
    } catch (error) {
      console.error("Error fetching related entries:", error);
      toast.error("Failed to load related entries");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pattern Insights
            </CardTitle>
            <CardDescription>
              Discovered patterns, habits, and behavioral insights from your journal
            </CardDescription>
          </div>
          <Button
            onClick={analyzePatterns}
            disabled={analyzing}
            className="gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Analyze Patterns
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasMinimumData ? (
          <InsufficientDataPrompt
            currentEntries={totalEntries}
            deepEntries={deepEntries}
            analyzedEntries={analyzedEntries}
            needsAnalysis={needsAnalysis}
          />
        ) : patterns.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No patterns discovered yet. Click "Analyze Patterns" to find insights.
            </p>
          </div>
        ) : (
          <div className="space-y-4 w-full max-w-full">
            {patterns.map((pattern) => (
              <Collapsible
                key={pattern.id}
                open={openPatterns.has(pattern.id)}
                onOpenChange={() => togglePattern(pattern.id)}
                className="w-full max-w-full"
              >
                <Card className="w-full max-w-full overflow-hidden p-4 hover:shadow-md transition-shadow">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 text-left">
                        <span className="text-2xl flex-shrink-0">{getPatternIcon(pattern.pattern_type)}</span>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-base break-words">{pattern.title}</h4>
                          <Badge variant="secondary" className={`mt-1 ${getPatternColor(pattern.pattern_type)}`}>
                            {pattern.pattern_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Confidence
                          </div>
                          <Progress 
                            value={pattern.confidence_score * 100} 
                            className="w-20 h-2"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            {Math.round(pattern.confidence_score * 100)}%
                          </div>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                            openPatterns.has(pattern.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-3 space-y-3">
                    <div className="sm:hidden">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Confidence</div>
                      <Progress value={pattern.confidence_score * 100} className="w-full h-2" />
                      <div className="text-xs text-muted-foreground mt-1">{Math.round(pattern.confidence_score * 100)}%</div>
                    </div>
                    <p className="text-sm text-muted-foreground break-words">
                      {pattern.description}
                    </p>

                    {pattern.temporal_info && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {pattern.temporal_info.frequency && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="capitalize">{pattern.temporal_info.frequency}</span>
                          </div>
                        )}
                        {pattern.temporal_info.trend && (
                          <Badge variant="outline" className="text-xs">
                            Trend: {pattern.temporal_info.trend}
                          </Badge>
                        )}
                      </div>
                    )}

                    {pattern.related_items && Array.isArray(pattern.related_items) && pattern.related_items.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {pattern.related_items.map((item: string, idx: number) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => handleItemClick(item)}
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {pattern.actionable_insight && (
                      <div className="bg-accent/50 rounded-lg p-3 mt-2">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          <p className="text-sm font-medium break-words">
                            {pattern.actionable_insight}
                          </p>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>

      {hasMinimumData && (
        <div className="px-6 pb-6">
          <QuantumDiscovery availableThemes={availableThemes} />
        </div>
      )}

      <Sheet open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedItem}</SheetTitle>
            <SheetDescription>
              Journal entries mentioning this item
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {relatedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries found mentioning this item</p>
            ) : (
              relatedEntries.map((entry) => (
                <Card key={entry.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm">{entry.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(entry.entry_date), "MMM dd, yyyy")}
                      </Badge>
                    </div>
                    {entry.relevantQuote && (
                      <div className="bg-muted/50 rounded-lg p-3 mt-2 border-l-2 border-primary">
                        <p className="text-xs italic text-muted-foreground">
                          "{entry.relevantQuote}"
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
};
