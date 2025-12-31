import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataSufficiency } from "@/hooks/use-data-sufficiency";
import { InsufficientDataPrompt } from "@/components/InsufficientDataPrompt";

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
  // Base forms
  "happy", "happiness", "joy", "joyful", "joyous",
  "excited", "excitement", "exciting",
  "grateful", "gratitude", "thankful",
  "content", "contentment", "contented",
  "peaceful", "peace", "serene", "serenity",
  "hopeful", "hope", "hoping",
  "confident", "confidence",
  "proud", "pride",
  "enthusiastic", "enthusiasm",
  "optimistic", "optimism",
  "loved", "love", "loving",
  "satisfied", "satisfaction",
  "relieved", "relief",
  // Additional positive emotions
  "calm", "calmness",
  "curious", "curiosity",
  "motivated", "motivation",
  "inspired", "inspiration",
  "comfortable", "comfort",
  "determined", "determination",
  "appreciative", "appreciation",
  "amused", "amusement",
  "connected", "connection",
  "empowered", "empowerment",
  "fulfilled", "fulfillment",
  "relaxed", "relaxation",
  "safe", "safety",
  "secure", "security"
];

const NEGATIVE_EMOTIONS = [
  // Base forms
  "sad", "sadness",
  "angry", "anger",
  "anxious", "anxiety",
  "depressed", "depression",
  "frustrated", "frustration",
  "worried", "worry",
  "stressed", "stress",
  "fearful", "fear", "scared",
  "lonely", "loneliness",
  "guilty", "guilt",
  "ashamed", "shame",
  "disappointed", "disappointment",
  "hopeless", "hopelessness",
  "overwhelmed",
  // Additional negative emotions
  "hurt", "hurting",
  "lost",
  "tired", "tiredness", "exhausted", "exhaustion",
  "confused", "confusion",
  "nervous", "nervousness",
  "resentful", "resentment",
  "helpless", "helplessness",
  "insecure", "insecurity",
  "uncomfortable",
  "defensive", "defensiveness",
  "envious", "envy",
  "jealous", "jealousy",
  "resigned", "resignation",
  "despair", "despairing"
];

export const MoodTracker = () => {
  const [moodData, setMoodData] = useState<MoodPoint[]>([]);
  const [allMoodData, setAllMoodData] = useState<MoodPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const { hasMinimumData, totalEntries, deepEntries, analyzedEntries, needsAnalysis } = useDataSufficiency();

  useEffect(() => {
    fetchMoodData();
  }, []);

  useEffect(() => {
    filterMoodData();
  }, [startDate, endDate, allMoodData]);

  const calculateMoodScore = (emotions: EmotionData[]): number => {
    if (!emotions || emotions.length === 0) return 0;

    let score = 0;
    let totalIntensity = 0;

    emotions.forEach(({ emotion, intensity }) => {
      const emotionLower = emotion.toLowerCase();
      
      // Bidirectional check: emotion contains word OR word contains emotion
      const isPositive = POSITIVE_EMOTIONS.some(pos => 
        emotionLower.includes(pos) || pos.includes(emotionLower)
      );
      const isNegative = NEGATIVE_EMOTIONS.some(neg => 
        emotionLower.includes(neg) || neg.includes(emotionLower)
      );
      
      if (isPositive && !isNegative) {
        score += intensity;
        totalIntensity += intensity;
      } else if (isNegative && !isPositive) {
        score -= intensity;
        totalIntensity += intensity;
      }
      // Neutral emotions don't affect the score
    });

    // Normalize to -10 to +10 scale
    if (totalIntensity === 0) return 0;
    return (score / totalIntensity) * 10;
  };

  const fetchMoodData = async () => {
    try {
      const { data: insightsData, error: insightsError } = await supabase
        .from("entry_insights")
        .select("entry_id, emotions, created_at");

      if (insightsError) throw insightsError;

      const { data: entriesData, error: entriesError } = await supabase
        .from("journal_entries")
        .select("id, entry_date");

      if (entriesError) throw entriesError;

      const entryDateMap = new Map(
        entriesData.map(entry => [entry.id, entry.entry_date])
      );

      const moodPoints: MoodPoint[] = insightsData
        .filter(insight => insight.emotions && Array.isArray(insight.emotions) && insight.entry_id)
        .map(insight => {
          const emotions = insight.emotions as EmotionData[];
          const moodScore = calculateMoodScore(emotions);
          const entryDate = entryDateMap.get(insight.entry_id);
          const date = entryDate ? new Date(entryDate) : new Date(insight.created_at);

          return {
            date: date.toISOString(),
            mood: moodScore,
            displayDate: format(date, "MMM d")
          };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setAllMoodData(moodPoints);
    } catch (error) {
      console.error("Error fetching mood data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterMoodData = () => {
    if (!startDate || !endDate) {
      setMoodData(allMoodData);
      return;
    }

    const filtered = allMoodData.filter(point => {
      const pointDate = new Date(point.date);
      return isWithinInterval(pointDate, { start: startDate, end: endDate });
    });

    setMoodData(filtered);
  };

  const handleClearFilters = () => {
    setStartDate(subDays(new Date(), 30));
    setEndDate(new Date());
  };

  const handleShowAll = () => {
    setStartDate(undefined);
    setEndDate(undefined);
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
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-xl font-normal">Mood Over Time</h3>
                <p className="text-sm text-muted-foreground">
                  Tracking emotional intensity from negative (-10) to positive (+10)
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchMoodData}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "shrink-0 text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-4 w-4" />
                {startDate ? format(startDate, "MMM d") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground shrink-0">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "shrink-0 text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-4 w-4" />
                {endDate ? format(endDate, "MMM d") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="shrink-0">
            Clear
          </Button>

          <Button variant="ghost" size="sm" onClick={handleShowAll} className="shrink-0">
            Show all
          </Button>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={moodData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="displayDate" 
              className="text-xs"
              stroke="hsl(var(--foreground))"
              tick={{ fill: 'hsl(var(--foreground))', fontWeight: 'normal', fontSize: 10 }}
              interval={moodData.length <= 7 ? 0 : moodData.length <= 14 ? 1 : Math.floor(moodData.length / 5)}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              domain={[-10, 10]}
              ticks={[-10, -5, 0, 5, 10]}
              className="text-xs"
              stroke="hsl(var(--foreground))"
              tick={{ fill: 'hsl(var(--foreground))', fontWeight: 'normal', fontSize: 10 }}
              width={35}
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
              dot={{ fill: "hsl(var(--primary))", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
