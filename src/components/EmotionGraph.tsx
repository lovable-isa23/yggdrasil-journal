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
      const { data: insights, error } = await supabase
        .from("entry_insights")
        .select(`
          emotions,
          entry_id,
          journal_entries!inner(entry_date)
        `)
        .order("journal_entries(entry_date)", { ascending: true });

      if (error) throw error;

      if (!insights || insights.length === 0) {
        setLoading(false);
        return;
      }

      // Process data to get emotions over time
      const emotionsByDate: { [key: string]: { [emotion: string]: number[] } } = {};
      const allEmotions = new Set<string>();

      insights.forEach((insight: any) => {
        const date = insight.journal_entries?.entry_date;
        if (!date || !insight.emotions) return;

        const formattedDate = format(new Date(date + 'T00:00:00'), "MMM d");
        
        if (!emotionsByDate[formattedDate]) {
          emotionsByDate[formattedDate] = {};
        }

        (insight.emotions as EmotionData[]).forEach((emotion) => {
          allEmotions.add(emotion.name);
          if (!emotionsByDate[formattedDate][emotion.name]) {
            emotionsByDate[formattedDate][emotion.name] = [];
          }
          emotionsByDate[formattedDate][emotion.name].push(emotion.intensity);
        });
      });

      // Calculate average intensities and format for chart
      const formattedData: ChartDataPoint[] = Object.entries(emotionsByDate).map(([date, emotions]) => {
        const dataPoint: ChartDataPoint = { date };
        Object.entries(emotions).forEach(([emotion, intensities]) => {
          dataPoint[emotion] = Math.round(
            intensities.reduce((sum, val) => sum + val, 0) / intensities.length
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

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7c7c",
    "#a78bfa",
    "#fb923c",
  ];

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
                key={emotion}
                type="monotone"
                dataKey={emotion}
                stroke={colors[index % colors.length]}
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
