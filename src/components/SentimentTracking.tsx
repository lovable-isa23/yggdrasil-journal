import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Loader2, Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SentimentData {
  date: string;
  averageIntensity: number;
  emotions: Map<string, number>;
  themes: string[];
  entities: string[];
}

export const SentimentTracking = () => {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);

  useEffect(() => {
    fetchSentimentData();
  }, []);

  const fetchSentimentData = async () => {
    try {
      const { data: entries, error: entriesError } = await supabase
        .from("journal_entries")
        .select("id, entry_date")
        .order("entry_date", { ascending: true })
        .limit(30);

      if (entriesError) throw entriesError;

      const { data: insights, error: insightsError } = await supabase
        .from("entry_insights")
        .select("*")
        .in("entry_id", entries?.map(e => e.id) || []);

      if (insightsError) throw insightsError;

      const sentimentMap = new Map<string, SentimentData>();

      entries?.forEach(entry => {
        const insight = insights?.find(i => i.entry_id === entry.id);
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

      setSentimentData(Array.from(sentimentMap.values()));
    } catch (error) {
      console.error("Error fetching sentiment data:", error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          Emotional patterns and correlations over time
        </CardDescription>
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
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 10]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="intensity" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
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
                            <Badge key={theme} variant="outline" className="text-xs">
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
                            <Badge key={entity} variant="outline" className="text-xs">
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
    </Card>
  );
};
