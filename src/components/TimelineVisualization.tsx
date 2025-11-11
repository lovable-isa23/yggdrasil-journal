import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Badge } from "./ui/badge";
import { Loader2, Calendar as CalendarIcon, TrendingUp } from "lucide-react";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface TimelineData {
  date: string;
  themes: string[];
  entities: string[];
  emotions: Array<{ emotion: string; intensity: number }>;
  entryId: string;
}

export const TimelineVisualization = () => {
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });

  useEffect(() => {
    fetchTimelineData();
  }, [dateRange]);

  const fetchTimelineData = async () => {
    setLoading(true);
    try {
      const { data: entries, error: entriesError } = await supabase
        .from("journal_entries")
        .select("id, entry_date")
        .gte("entry_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("entry_date", format(dateRange.to, "yyyy-MM-dd"))
        .order("entry_date", { ascending: true });

      if (entriesError) throw entriesError;

      const { data: insights, error: insightsError } = await supabase
        .from("entry_insights")
        .select("*")
        .in("entry_id", entries?.map(e => e.id) || []);

      if (insightsError) throw insightsError;

      const timeline: TimelineData[] = [];
      entries?.forEach(entry => {
        const insight = insights?.find(i => i.entry_id === entry.id);
        if (insight) {
          timeline.push({
            date: entry.entry_date,
            themes: (insight.themes || []) as string[],
            entities: (insight.entities || []) as string[],
            emotions: (insight.emotions || []) as Array<{ emotion: string; intensity: number }>,
            entryId: entry.id,
          });
        }
      });

      setTimelineData(timeline);
    } catch (error) {
      console.error("Error fetching timeline data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTopEmotions = (data: TimelineData[]) => {
    const emotionMap = new Map<string, number>();
    data.forEach(item => {
      item.emotions.forEach(({ emotion, intensity }) => {
        emotionMap.set(emotion, (emotionMap.get(emotion) || 0) + intensity);
      });
    });
    return Array.from(emotionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const getTopThemes = (data: TimelineData[]) => {
    const themeMap = new Map<string, number>();
    data.forEach(item => {
      item.themes.forEach(theme => {
        themeMap.set(theme, (themeMap.get(theme) || 0) + 1);
      });
    });
    return Array.from(themeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
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

  const topEmotions = getTopEmotions(timelineData);
  const topThemes = getTopThemes(timelineData);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Timeline Visualization
            </CardTitle>
            <CardDescription>
              Track how your themes and emotions evolve over time
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">From</p>
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">To</p>
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {timelineData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No entries found in this date range
          </div>
        ) : (
          <>
            {/* Top Emotions */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Top Emotions in Period</h4>
              <div className="flex flex-wrap gap-2">
                {topEmotions.map(([emotion, intensity]) => (
                  <Badge key={emotion} variant="secondary" className="text-sm">
                    {emotion} ({Math.round(intensity)})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Top Themes */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Top Themes in Period</h4>
              <div className="flex flex-wrap gap-2">
                {topThemes.map(([theme, count]) => (
                  <Badge key={theme} variant="outline" className="text-sm">
                    {theme} ({count})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Entry Timeline</h4>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {timelineData.map((item, idx) => (
                  <div key={idx} className="border-l-2 border-primary/30 pl-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full bg-primary -ml-[25px]" />
                      <span className="text-sm font-medium">
                        {format(new Date(item.date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {item.themes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.themes.slice(0, 3).map((theme, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {item.emotions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.emotions.slice(0, 3).map((emo, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {emo.emotion}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
