import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Flame, TrendingUp, Clock, FileText, Calendar, X } from "lucide-react";
import { useDataSufficiency } from "@/hooks/use-data-sufficiency";
import { InsufficientDataPrompt } from "@/components/InsufficientDataPrompt";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { format, isWithinInterval, subDays } from "date-fns";

interface DayStats {
  date: string;
  wordCount: number;
  entryCount: number;
}

interface HourStats {
  hour: number;
  count: number;
}

export const StatisticsDashboard = () => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [wordCountData, setWordCountData] = useState<DayStats[]>([]);
  const [allWordCountData, setAllWordCountData] = useState<DayStats[]>([]);
  const [hourlyData, setHourlyData] = useState<HourStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const { hasMinimumData, totalEntries, deepEntries, analyzedEntries, needsAnalysis, isLoading: dataSufficiencyLoading } = useDataSufficiency();

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      // Call decrypt-entries function to get decrypted data
      const { data: decryptedData, error: decryptError } = await supabase.functions.invoke("decrypt-entries");
      
      if (decryptError) {
        console.error("Error decrypting entries:", decryptError);
        // Fallback to regular fetch if decrypt fails
        const { data: entries, error } = await supabase
          .from("journal_entries")
          .select("*")
          .order("entry_date", { ascending: true });

        if (error) throw error;
        
        if (entries && entries.length > 0) {
          calculateStreaks(entries);
          calculateWordCounts(entries);
          calculateActiveHours(entries);
        }
      } else {
        const entries = decryptedData?.entries || [];
        
        if (entries.length > 0) {
          calculateStreaks(entries);
          calculateWordCounts(entries);
          calculateActiveHours(entries);
        }
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreaks = (entries: any[]) => {
    const uniqueDates = Array.from(new Set(entries.map(e => e.entry_date))).sort();
    
    let current = 0;
    let longest = 0;
    let tempStreak = 1;

    for (let i = 0; i < uniqueDates.length; i++) {
      if (i > 0) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longest = Math.max(longest, tempStreak);
          tempStreak = 1;
        }
      }
    }

    longest = Math.max(longest, tempStreak);

    // Check if current streak is ongoing
    const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffToToday = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffToToday === 0) {
      current = tempStreak;
    } else if (diffToToday === 1) {
      current = tempStreak;
    } else {
      current = 0;
    }

    setCurrentStreak(current);
    setLongestStreak(longest);
  };

  const calculateWordCounts = (entries: any[]) => {
    const dayMap = new Map<string, DayStats>();

    entries.forEach(entry => {
      const date = entry.entry_date;
      const wordCount = entry.content ? entry.content.split(/\s+/).filter((w: string) => w.length > 0).length : 0;

      if (!dayMap.has(date)) {
        dayMap.set(date, { date, wordCount: 0, entryCount: 0 });
      }

      const stats = dayMap.get(date)!;
      stats.wordCount += wordCount;
      stats.entryCount += 1;
    });

    const allData = Array.from(dayMap.values()).map(stat => ({
      ...stat,
      date: stat.date // Keep as raw date for filtering
    }));

    setAllWordCountData(allData);
    filterWordCountData(allData, startDate, endDate);
  };

  const filterWordCountData = (data: DayStats[], start?: Date, end?: Date) => {
    let filtered = data;

    if (start && end) {
      filtered = data.filter(stat => {
        const statDate = new Date(stat.date);
        return isWithinInterval(statDate, { start, end });
      });
    }

    const formatted = filtered.map(stat => ({
      ...stat,
      date: new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    setWordCountData(formatted);
  };

  const calculateActiveHours = (entries: any[]) => {
    const hourMap = new Map<number, number>();

    entries.forEach(entry => {
      const hour = new Date(entry.created_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    const data = Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    setHourlyData(data);
  };

  if (dataSufficiencyLoading || loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="h-24 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="h-24 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="h-24 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasMinimumData) {
    return (
      <InsufficientDataPrompt
        currentEntries={totalEntries}
        deepEntries={deepEntries}
        analyzedEntries={analyzedEntries}
        needsAnalysis={needsAnalysis}
        showInlineImport={true}
        onImportComplete={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-primary">{currentStreak} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Longest Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-primary">{longestStreak} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-primary">
              {wordCountData.reduce((sum, d) => sum + d.entryCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      {(wordCountData.length > 0 || hourlyData.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Word Count Trend */}
          {wordCountData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Word Count Trend
                </CardTitle>
                <CardDescription>
                  {!startDate || !endDate 
                    ? "All time writing activity" 
                    : startDate.getTime() === subDays(new Date(), 30).setHours(0,0,0,0) && endDate.getTime() === new Date().setHours(0,0,0,0)
                    ? "Last 30 days of writing activity"
                    : "Custom date range"}
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          if (date && endDate) {
                            filterWordCountData(allWordCountData, date, endDate);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          if (startDate && date) {
                            filterWordCountData(allWordCountData, startDate, date);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const thirtyDaysAgo = subDays(new Date(), 30);
                      const today = new Date();
                      setStartDate(thirtyDaysAgo);
                      setEndDate(today);
                      filterWordCountData(allWordCountData, thirtyDaysAgo, today);
                    }}
                  >
                    Last 30 days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStartDate(undefined);
                      setEndDate(undefined);
                      filterWordCountData(allWordCountData, undefined, undefined);
                    }}
                  >
                    Show all
                  </Button>
                  {(startDate || endDate) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setStartDate(subDays(new Date(), 30));
                        setEndDate(new Date());
                        filterWordCountData(allWordCountData, subDays(new Date(), 30), new Date());
                      }}
                      className="gap-1"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={wordCountData}>
                    <CartesianAxis strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'black', fontWeight: 'normal' }}
                    />
                    <YAxis 
                      tick={{ fill: 'black', fontWeight: 'normal' }}
                      label={{ value: 'Words', angle: -90, position: 'insideLeft', fill: 'black', fontWeight: 'normal' }}
                    />
                    <Tooltip />
                    <Bar dataKey="wordCount" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Most Active Hours */}
          {hourlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Most Active Hours
                </CardTitle>
                <CardDescription>When you write most often</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyData}>
                    <CartesianAxis strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fill: 'black', fontWeight: 'normal' }}
                      label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, fill: 'black', fontWeight: 'normal' }}
                    />
                    <YAxis 
                      tick={{ fill: 'black', fontWeight: 'normal' }}
                      label={{ value: 'Entries', angle: -90, position: 'insideLeft', fill: 'black', fontWeight: 'normal' }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
