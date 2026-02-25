import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Loader2, Heart, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon, X, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, isWithinInterval, subDays } from "date-fns";
import { InsufficientDataPrompt } from "@/components/InsufficientDataPrompt";
import { toast } from "sonner";
import { useInsightsData } from "@/contexts/InsightsDataContext";

interface SentimentData {
  date: string;
  averageIntensity: number;
  emotions: Map<string, number>;
  themes: string[];
  entities: string[];
}

interface RelatedEntry {
  id: string;
  title: string;
  entry_date: string;
  content: string;
  relevantQuote?: string;
}

export const SentimentTracking = () => {
  const navigate = useNavigate();
  const { insights: sharedInsights, entries: sharedEntries, loading: sharedLoading, hasMinimumData, totalEntries, deepEntries, analyzedEntries, needsAnalysis } = useInsightsData();
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [allSentimentData, setAllSentimentData] = useState<SentimentData[]>([]);
  const [entryIdsByDate, setEntryIdsByDate] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  // State for clickable themes/entities sidebar
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [relatedEntries, setRelatedEntries] = useState<RelatedEntry[]>([]);

  // Process shared data instead of fetching independently
  useEffect(() => {
    if (sharedLoading) return;
    
    const sentimentMap = new Map<string, SentimentData>();
    const dateToEntryIds = new Map<string, string[]>();

    sharedEntries.forEach(entry => {
      if (!dateToEntryIds.has(entry.entry_date)) {
        dateToEntryIds.set(entry.entry_date, []);
      }
      dateToEntryIds.get(entry.entry_date)!.push(entry.id);

      const insight = sharedInsights.find(i => i.entry_id === entry.id);
      if (insight && insight.emotions) {
        const emotions = new Map<string, number>();
        let totalIntensity = 0;

        (insight.emotions as Array<{ emotion: string; intensity: number }>).forEach(({ emotion, intensity }) => {
          emotions.set(emotion, intensity);
          totalIntensity += intensity;
        });

        sentimentMap.set(entry.entry_date, {
          date: entry.entry_date,
          averageIntensity: totalIntensity / (insight.emotions as any[]).length,
          emotions,
          themes: (insight.themes || []) as string[],
          entities: (insight.entities || []) as string[],
        });
      }
    });

    setEntryIdsByDate(dateToEntryIds);
    const allData = Array.from(sentimentMap.values());
    setAllSentimentData(allData);
    filterSentimentData(allData, startDate, endDate);
    setLoading(false);
  }, [sharedInsights, sharedEntries, sharedLoading]);

  const filterSentimentData = (data: SentimentData[], start?: Date, end?: Date) => {
    let filtered = data;

    if (start && end) {
      filtered = data.filter(stat => {
        const statDate = new Date(stat.date);
        return isWithinInterval(statDate, { start, end });
      });
    }

    setSentimentData(filtered);
  };

  const getEmotionCorrelations = () => {
    const correlations = new Map<string, { themes: Map<string, number>; entities: Map<string, number> }>();

    sentimentData.forEach(data => {
      data.emotions.forEach((intensity, emotion) => {
        if (!correlations.has(emotion)) {
          correlations.set(emotion, { themes: new Map(), entities: new Map() });
        }
        const corr = correlations.get(emotion)!;
        
        data.themes.forEach(theme => {
          corr.themes.set(theme, (corr.themes.get(theme) || 0) + 1);
        });
        
        data.entities.forEach(entity => {
          corr.entities.set(entity, (corr.entities.get(entity) || 0) + 1);
        });
      });
    });

    return correlations;
  };

  const getTrendIcon = (data: SentimentData[]) => {
    if (data.length < 2) return <Minus className="h-4 w-4" />;
    const recent = data.slice(-5).reduce((sum, d) => sum + d.averageIntensity, 0) / 5;
    const older = data.slice(0, 5).reduce((sum, d) => sum + d.averageIntensity, 0) / 5;
    
    if (recent > older + 0.5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (recent < older - 0.5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // Handle click on theme/entity to show related entries
  const handleItemClick = async (item: string, itemType: 'theme' | 'entity') => {
    setSelectedItem(item);
    
    try {
      // Get the set of valid entry IDs from the current filtered date range
      const validEntryIds = new Set<string>();
      sentimentData.forEach(sd => {
        const ids = entryIdsByDate.get(sd.date);
        if (ids) ids.forEach(id => validEntryIds.add(id));
      });

      // Fetch decrypted entries to get readable content
      const { data: decryptedData, error: decryptError } = await supabase.functions.invoke("decrypt-entries");
      
      if (decryptError) {
        console.error("Decrypt error:", decryptError);
        throw decryptError;
      }
      
      const allEntries = decryptedData?.entries || [];
      
      // Fetch insights to find which entries mention this item
      const { data: insights, error: insightsError } = await supabase
        .from("entry_insights")
        .select("entry_id, themes, entities");
        
      if (insightsError) throw insightsError;
      
      const itemLower = item.toLowerCase();
      const matchingEntryIds = insights
        ?.filter(i => {
          // Only consider entries within the current date range
          if (!validEntryIds.has(i.entry_id)) return false;
          const list = itemType === 'theme' 
            ? ((i.themes as string[]) || []).map(t => t.toLowerCase())
            : ((i.entities as string[]) || []).map(e => e.toLowerCase());
          return list.some(l => l.includes(itemLower) || itemLower.includes(l));
        })
        .map(i => i.entry_id) || [];
      
      const matchedEntries = allEntries
        .filter((e: any) => matchingEntryIds.includes(e.id))
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

  if (!hasMinimumData) {
    return (
      <InsufficientDataPrompt
        currentEntries={totalEntries}
        deepEntries={deepEntries}
        analyzedEntries={analyzedEntries}
        needsAnalysis={needsAnalysis}
      />
    );
  }

  if (sentimentData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            No sentiment data available yet. Write more journal entries with emotions to see trends.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = sentimentData.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    intensity: Number(d.averageIntensity.toFixed(1)),
  }));

  const correlations = getEmotionCorrelations();
  // Count how many entries each emotion appears in (not intensity sum)
  const topEmotions = Array.from(
    sentimentData.reduce((acc, d) => {
      d.emotions.forEach((intensity, emotion) => {
        acc.set(emotion, (acc.get(emotion) || 0) + 1); // Count entries, not sum intensity
      });
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Sentiment Tracking
          {getTrendIcon(sentimentData)}
        </CardTitle>
        <CardDescription>
          {startDate && endDate
            ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
            : "Emotional patterns and correlations over time"}
        </CardDescription>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-8 px-2 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Start</span>
                {startDate ? format(startDate, "M/d") : <span className="sm:hidden">Start</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-8 px-2 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">End</span>
                {endDate ? format(endDate, "M/d") : <span className="sm:hidden">End</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => {
              setStartDate(subDays(new Date(), 30));
              setEndDate(new Date());
            }}
          >
            <span className="hidden sm:inline">Last 30 days</span>
            <span className="sm:hidden">30d</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
              setSentimentData(allSentimentData);
            }}
          >
            <span className="hidden sm:inline">Show all</span>
            <span className="sm:hidden">All</span>
          </Button>

          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
                setSentimentData(allSentimentData);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sentimentData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sentiment data available yet
          </div>
        ) : (
          <>
            {/* Sentiment Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs" 
                    tick={{ fontSize: 10 }}
                    interval={chartData.length <= 7 ? 0 : chartData.length <= 14 ? 1 : Math.floor(chartData.length / 5)}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis domain={[0, 10]} className="text-xs" tick={{ fontSize: 10 }} width={30} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="intensity" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Emotional Intensity"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top Emotions */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Most Frequent Emotions in Period</h4>
              <div className="flex flex-wrap gap-2">
                {topEmotions.map(([emotion, count]) => (
                  <Badge
                    key={emotion}
                    variant={selectedEmotion === emotion ? "default" : "secondary"}
                    className="cursor-pointer text-sm"
                    onClick={() => setSelectedEmotion(selectedEmotion === emotion ? null : emotion)}
                  >
                    {emotion} ({count})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Correlations */}
            {selectedEmotion && correlations.has(selectedEmotion) && (
              <div className="border rounded-lg p-4 bg-accent/10">
                <h4 className="text-sm font-semibold mb-3">
                  When feeling "{selectedEmotion}", you often mention:
                </h4>
                <div className="space-y-3">
                  {correlations.get(selectedEmotion)!.themes.size > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Themes:</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(correlations.get(selectedEmotion)!.themes.entries())
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([theme, count]) => (
                            <Badge 
                              key={theme} 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => handleItemClick(theme, 'theme')}
                            >
                              {theme} ({count})
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                  {correlations.get(selectedEmotion)!.entities.size > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Entities:</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(correlations.get(selectedEmotion)!.entities.entries())
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([entity, count]) => (
                            <Badge 
                              key={entity} 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => handleItemClick(entity, 'entity')}
                            >
                              {entity} ({count})
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Sidebar for related entries */}
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
                <Card 
                  key={entry.id} 
                  className="p-4 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => {
                    setSelectedItem(null);
                    navigate("/entries", { state: { scrollToEntryId: entry.id } });
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm flex items-center gap-1">
                        {entry.title}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </h4>
                      <Badge variant="outline" className="text-xs shrink-0">
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
