import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Loader2, TrendingUp, Lightbulb, Calendar, RefreshCw, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "./ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { format } from "date-fns";
import { useDataSufficiency } from "@/hooks/use-data-sufficiency";
import { InsufficientDataPrompt } from "@/components/InsufficientDataPrompt";

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
  const { hasMinimumData, totalEntries, deepEntries, analyzedEntries, needsAnalysis } = useDataSufficiency();

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

  const analyzePatterns = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-patterns");

      if (error) throw error;

      if (data.success) {
        toast.success(`Discovered ${data.patterns} patterns and ${data.relationships} relationships!`);
        await fetchPatterns();
      } else {
        toast.error(data.message || "Analysis failed");
      }
    } catch (error) {
      console.error("Error analyzing patterns:", error);
      toast.error("Failed to analyze patterns");
    } finally {
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
      // Fetch entry_insights that contain this item in themes, keywords, or entities
      const { data: insights, error: insightsError } = await supabase
        .from("entry_insights")
        .select("entry_id, themes, keywords, entities");

      if (insightsError) throw insightsError;

      // Filter insights that contain the selected item
      const relevantInsights = insights?.filter((insight) => {
        const themes = (insight.themes as string[]) || [];
        const keywords = (insight.keywords as string[]) || [];
        const entities = (insight.entities as string[]) || [];
        
        return (
          themes.includes(item) ||
          keywords.includes(item) ||
          entities.includes(item)
        );
      }) || [];

      const entryIds = relevantInsights.map((i) => i.entry_id);

      if (entryIds.length === 0) {
        setRelatedEntries([]);
        return;
      }

      // Fetch the actual journal entries
      const { data: entries, error: entriesError } = await supabase
        .from("journal_entries")
        .select("id, title, entry_date, content")
        .in("id", entryIds)
        .order("entry_date", { ascending: false });

      if (entriesError) throw entriesError;

      // Extract relevant quotes from content that mention the item
      const entriesWithQuotes = entries?.map((entry) => {
        const sentences = entry.content.split(/[.!?]+/);
        const relevantSentence = sentences.find((s) =>
          s.toLowerCase().includes(item.toLowerCase())
        );

        return {
          ...entry,
          relevantQuote: relevantSentence?.trim() || entry.content.slice(0, 150) + "...",
        };
      }) || [];

      setRelatedEntries(entriesWithQuotes);
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
          <div className="space-y-4">
            {patterns.map((pattern) => (
              <Collapsible
                key={pattern.id}
                open={openPatterns.has(pattern.id)}
                onOpenChange={() => togglePattern(pattern.id)}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <span className="text-2xl">{getPatternIcon(pattern.pattern_type)}</span>
                        <div>
                          <h4 className="font-semibold text-base">{pattern.title}</h4>
                          <Badge variant="secondary" className={`mt-1 ${getPatternColor(pattern.pattern_type)}`}>
                            {pattern.pattern_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
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
                    <p className="text-sm text-muted-foreground">
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
                          <p className="text-sm font-medium">
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
