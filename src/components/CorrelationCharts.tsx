import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2 } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface CorrelationData {
  theme: string;
  avgMood: number;
  frequency: number;
  weekday: string;
  hour: number;
}

export const CorrelationCharts = () => {
  const [loading, setLoading] = useState(true);
  const [themesMoodData, setThemesMoodData] = useState<CorrelationData[]>([]);
  const [temporalMoodData, setTemporalMoodData] = useState<Array<{ day: string; avgMood: number; count: number }>>([]);

  useEffect(() => {
    fetchCorrelationData();
  }, []);

  const fetchCorrelationData = async () => {
    try {
      const { data: entries, error: entriesError } = await supabase
        .from("journal_entries")
        .select("id, entry_date, created_at");

      if (entriesError) throw entriesError;

      const { data: insights, error: insightsError } = await supabase
        .from("entry_insights")
        .select("entry_id, themes, emotions");

      if (insightsError) throw insightsError;

      if (entries && insights) {
        calculateThemesMoodCorrelation(entries, insights);
        calculateTemporalMoodCorrelation(entries, insights);
      }
    } catch (error) {
      console.error("Error fetching correlation data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateThemesMoodCorrelation = (entries: any[], insights: any[]) => {
    const themeMap = new Map<string, { moodSum: number; count: number }>();

    insights.forEach((insight) => {
      const themes = (insight.themes as string[]) || [];
      const emotions = (insight.emotions as Array<{ emotion: string; intensity: number }>) || [];
      
      const avgMood = emotions.length > 0
        ? emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length
        : 0.5;

      themes.forEach((theme) => {
        if (!themeMap.has(theme)) {
          themeMap.set(theme, { moodSum: 0, count: 0 });
        }
        const stats = themeMap.get(theme)!;
        stats.moodSum += avgMood;
        stats.count += 1;
      });
    });

    const data: CorrelationData[] = Array.from(themeMap.entries())
      .map(([theme, stats]) => ({
        theme,
        avgMood: stats.moodSum / stats.count,
        frequency: stats.count,
        weekday: "",
        hour: 0,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15);

    setThemesMoodData(data);
  };

  const calculateTemporalMoodCorrelation = (entries: any[], insights: any[]) => {
    const dayMap = new Map<string, { moodSum: number; count: number }>();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    insights.forEach((insight) => {
      const entry = entries.find((e) => e.id === insight.entry_id);
      if (!entry) return;

      const emotions = (insight.emotions as Array<{ emotion: string; intensity: number }>) || [];
      const avgMood = emotions.length > 0
        ? emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length
        : 0.5;

      const dayOfWeek = dayNames[new Date(entry.entry_date).getDay()];

      if (!dayMap.has(dayOfWeek)) {
        dayMap.set(dayOfWeek, { moodSum: 0, count: 0 });
      }

      const stats = dayMap.get(dayOfWeek)!;
      stats.moodSum += avgMood;
      stats.count += 1;
    });

    const data = dayNames.map((day) => {
      const stats = dayMap.get(day);
      return {
        day,
        avgMood: stats ? stats.moodSum / stats.count : 0,
        count: stats ? stats.count : 0,
      };
    });

    setTemporalMoodData(data);
  };

  const getColorForMood = (mood: number) => {
    if (mood >= 0.7) return "hsl(var(--chart-1))";
    if (mood >= 0.4) return "hsl(var(--chart-3))";
    return "hsl(var(--chart-5))";
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
    <div className="space-y-6">
      {/* Themes vs Mood Correlation */}
      {themesMoodData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Themes & Mood Correlation</CardTitle>
            <CardDescription>
              How different themes correlate with emotional intensity (size = frequency)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="category"
                  dataKey="theme"
                  name="Theme"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis
                  type="number"
                  dataKey="avgMood"
                  name="Average Mood"
                  domain={[0, 1]}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  label={{ value: 'Emotional Intensity', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.theme}</p>
                          <p className="text-sm">Mood: {(data.avgMood * 100).toFixed(0)}%</p>
                          <p className="text-sm">Frequency: {data.frequency}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={themesMoodData} fill="hsl(var(--primary))">
                  {themesMoodData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getColorForMood(entry.avgMood)}
                      r={Math.max(4, Math.min(entry.frequency * 2, 20))}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Temporal Mood Patterns */}
      {temporalMoodData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Mood Patterns</CardTitle>
            <CardDescription>
              Average emotional intensity by day of the week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="category"
                  dataKey="day"
                  name="Day"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis
                  type="number"
                  dataKey="avgMood"
                  name="Average Mood"
                  domain={[0, 1]}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  label={{ value: 'Emotional Intensity', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.day}</p>
                          <p className="text-sm">Mood: {(data.avgMood * 100).toFixed(0)}%</p>
                          <p className="text-sm">Entries: {data.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={temporalMoodData} fill="hsl(var(--primary))">
                  {temporalMoodData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getColorForMood(entry.avgMood)}
                      r={Math.max(6, Math.min(entry.count * 3, 25))}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
