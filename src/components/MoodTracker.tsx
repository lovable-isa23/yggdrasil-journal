import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

type EmotionData = {
  emotion: string;
  intensity: number;
};

type MoodPoint = {
  date: string;
  mood: number;
  displayDate: string;
};

const POSITIVE_EMOTIONS = [
  "happy", "joy", "joyful", "excited", "grateful", "content", "peaceful", "hopeful",
  "confident", "proud", "enthusiastic", "optimistic", "loved", "satisfied", "relieved"
];

const NEGATIVE_EMOTIONS = [
  "sad", "angry", "anxious", "depressed", "frustrated", "worried", "stressed",
  "fearful", "lonely", "guilty", "ashamed", "disappointed", "hopeless", "overwhelmed"
];

export const MoodTracker = () => {
  const [moodData, setMoodData] = useState<MoodPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMoodData();
  }, []);

  const calculateMoodScore = (emotions: EmotionData[]): number => {
    if (!emotions || emotions.length === 0) return 0;

    let score = 0;
    let totalIntensity = 0;

    emotions.forEach(({ emotion, intensity }) => {
      const emotionLower = emotion.toLowerCase();
      
      if (POSITIVE_EMOTIONS.some(pos => emotionLower.includes(pos))) {
        score += intensity;
        totalIntensity += intensity;
      } else if (NEGATIVE_EMOTIONS.some(neg => emotionLower.includes(neg))) {
        score -= intensity;
        totalIntensity += intensity;
      }
    });

    // Normalize to -10 to +10 scale
    if (totalIntensity === 0) return 0;
    return (score / totalIntensity) * 10;
  };

  const fetchMoodData = async () => {
    try {
      const { data, error } = await supabase
        .from("entry_insights")
        .select("emotions, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const moodPoints: MoodPoint[] = data
        .filter(insight => insight.emotions && Array.isArray(insight.emotions))
        .map(insight => {
          const emotions = insight.emotions as EmotionData[];
          const moodScore = calculateMoodScore(emotions);
          const date = new Date(insight.created_at);

          return {
            date: insight.created_at,
            mood: moodScore,
            displayDate: format(date, "MMM d")
          };
        });

      setMoodData(moodPoints);
    } catch (error) {
      console.error("Error fetching mood data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (moodData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Mood Over Time</h3>
        <p className="text-muted-foreground">
          No mood data available yet. Write more journal entries to see your mood trends.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">Mood Over Time</h3>
          <p className="text-sm text-muted-foreground">
            Tracking emotional intensity from positive (+10) to negative (-10)
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={moodData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="displayDate" 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              domain={[-10, 10]}
              ticks={[-10, -5, 0, 5, 10]}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [value.toFixed(1), "Mood Score"]}
            />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>← More Negative</span>
          <span>More Positive →</span>
        </div>
      </div>
    </Card>
  );
};
