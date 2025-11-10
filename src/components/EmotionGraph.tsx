import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface EmotionData {
  name: string;
  intensity: number;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

export const EmotionGraph = () => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [emotions, setEmotions] = useState<string[]>([]);

  useEffect(() => {
    fetchEmotionData();
  }, []);

  const fetchEmotionData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch insights for the user
      const { data: insights, error: insightsError } = await supabase
        .from("entry_insights")
        .select("emotions, entry_id")
        .eq("user_id", user.id);

      if (insightsError) {
        console.error("Error fetching insights:", insightsError);
        setLoading(false);
        return;
      }

      if (!insights || insights.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch corresponding journal entry dates (avoid join issues without FK)
      const entryIds = insights.map((i: any) => i.entry_id).filter(Boolean);
      let dateByEntryId: Record<string, string> = {};
      if (entryIds.length) {
        const { data: entries, error: entriesError } = await supabase
          .from("journal_entries")
          .select("id, entry_date")
          .in("id", entryIds);

        if (entriesError) {
          console.error("Error fetching entries:", entriesError);
          setLoading(false);
          return;
        }

        dateByEntryId = (entries || []).reduce((acc: Record<string, string>, e: any) => {
          if (e.id && e.entry_date) acc[e.id] = e.entry_date;
          return acc;
        }, {});
      }

      // Process data to get emotions over time
      const emotionsByIsoDate: { [iso: string]: { [emotion: string]: number[] } } = {};
      const allEmotions = new Set<string>();

      insights.forEach((insight: any) => {
        const rawDate: string | undefined = dateByEntryId[insight.entry_id];
        if (!rawDate || !Array.isArray(insight.emotions) || insight.emotions.length === 0) return;

        const iso = format(new Date(rawDate + 'T00:00:00'), "yyyy-MM-dd");
        if (!emotionsByIsoDate[iso]) {
          emotionsByIsoDate[iso] = {};
        }

        (insight.emotions as EmotionData[]).forEach((emotion) => {
          if (emotion?.name && typeof emotion.intensity === 'number') {
            const name = emotion.name;
            allEmotions.add(name);
            if (!emotionsByIsoDate[iso][name]) {
              emotionsByIsoDate[iso][name] = [];
            }
            emotionsByIsoDate[iso][name].push(emotion.intensity);
          }
        });
      });

      // Calculate average intensities and format for chart
      const formattedData: ChartDataPoint[] = Object.entries(emotionsByIsoDate)
        .sort(([isoA], [isoB]) => isoA.localeCompare(isoB))
        .map(([iso, emotions]) => {
          const dataPoint: ChartDataPoint = { date: format(new Date(iso + 'T00:00:00'), "MMM d") };
          Object.entries(emotions).forEach(([emotion, intensities]) => {
            dataPoint[emotion] = Math.round(
              intensities.reduce((sum, val) => sum + val, 0) / Math.max(1, intensities.length)
            );
          });
          return dataPoint;
        });

      setEmotions(Array.from(allEmotions));
      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching emotion data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emotion Intensity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emotion Intensity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No emotion data available yet. Create journal entries with AI insights to see your emotional patterns.
          </div>
        </CardContent>
      </Card>
    );
  }

  const POSITIVE = new Set([
    "joy","happiness","gratitude","love","contentment","pride","hope","relief","calm","excitement","optimism","peace","serenity","satisfaction"
  ]);
  const NEGATIVE = new Set([
    "sadness","anger","fear","anxiety","stress","guilt","shame","disgust","frustration","loneliness","grief","worry","resentment","hurt"
  ]);

  const getEmotionColor = (emotion: string) => {
    const e = emotion.toLowerCase();
    if (NEGATIVE.has(e)) return "hsl(var(--destructive))"; // red
    if (POSITIVE.has(e)) return "hsl(var(--success))"; // green
    return "hsl(var(--neutral))"; // grey
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emotion Intensity Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              label={{ value: 'Intensity', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            {emotions.map((emotion, index) => (
              <Line
                key={`emotion-${emotion}-${index}`}
                type="monotone"
                dataKey={emotion}
                stroke={getEmotionColor(emotion)}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
