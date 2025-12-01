import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Badge } from "./ui/badge";
import { Loader2, Calendar as CalendarIcon, TrendingUp, Download, FileText } from "lucide-react";
import { format, subMonths, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";

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
  const [showAll, setShowAll] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const { toast } = useToast();
  const [selectedTag, setSelectedTag] = useState<{ tag: string; type: 'theme' | 'emotion' | 'entity' } | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [tagEntries, setTagEntries] = useState<any[]>([]);
  const [decryptedEntries, setDecryptedEntries] = useState<any[]>([]);

  useEffect(() => {
    fetchTimelineData();
  }, [dateRange, showAll]);

  // Fetch decrypted entries once on mount
  useEffect(() => {
    const fetchDecryptedEntries = async () => {
      const { data, error } = await supabase.functions.invoke('decrypt-entries');
      if (!error && data?.entries) {
        setDecryptedEntries(data.entries);
      }
    };
    fetchDecryptedEntries();
  }, []);

  const fetchTimelineData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("journal_entries")
        .select("id, entry_date")
        .order("entry_date", { ascending: true });

      if (!showAll) {
        query = query
          .gte("entry_date", format(dateRange.from, "yyyy-MM-dd"))
          .lte("entry_date", format(dateRange.to, "yyyy-MM-dd"));
      }

      const { data: entries, error: entriesError } = await query;

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
    const emotionMap = new Map<string, { count: number; totalIntensity: number }>();
    data.forEach(item => {
      item.emotions.forEach(({ emotion, intensity }) => {
        const current = emotionMap.get(emotion) || { count: 0, totalIntensity: 0 };
        emotionMap.set(emotion, {
          count: current.count + 1,
          totalIntensity: current.totalIntensity + intensity
        });
      });
    });
    return Array.from(emotionMap.entries())
      .map(([emotion, data]) => [emotion, data.count, data.totalIntensity] as [string, number, number])
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

  const handleTagClick = (tag: string, type: 'theme' | 'emotion' | 'entity') => {
    setSelectedTag({ tag, type });
    setIsSheetOpen(true);
    
    // Find all entries that contain this tag
    const relatedEntryIds = timelineData
      .filter(item => {
        if (type === 'theme') return item.themes.includes(tag);
        if (type === 'emotion') return item.emotions.some(e => e.emotion === tag);
        if (type === 'entity') return item.entities.includes(tag);
        return false;
      })
      .map(item => item.entryId);
    
    // Filter from already-decrypted entries
    const relatedEntries = decryptedEntries
      .filter(entry => relatedEntryIds.includes(entry.id))
      .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
    
    setTagEntries(relatedEntries);
  };

  const exportTimelinePDF = () => {
    if (timelineData.length === 0) {
      toast({
        title: "No data to export",
        description: "Select a date range with entries",
        variant: "destructive",
      });
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Title
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("Timeline Visualization", margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`,
      margin,
      yPosition
    );
    yPosition += 15;

    // Top Emotions
    const topEmotions = getTopEmotions(timelineData);
    if (topEmotions.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Top Emotions", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      topEmotions.forEach(([emotion, count]) => {
        pdf.text(`• ${emotion} (${count} entries)`, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }

    // Top Themes
    const topThemes = getTopThemes(timelineData);
    if (topThemes.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Top Themes", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      topThemes.forEach(([theme, count]) => {
        pdf.text(`• ${theme} (${count} entries)`, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }

    // Timeline entries
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Entry Timeline", margin, yPosition);
    yPosition += 8;

    timelineData.forEach((item) => {
      if (yPosition > pageHeight - margin * 2) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(format(new Date(item.date), "MMMM d, yyyy"), margin, yPosition);
      yPosition += 7;

      if (item.themes.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const themesText = pdf.splitTextToSize(
          `Themes: ${item.themes.join(", ")}`,
          pageWidth - margin * 2
        );
        themesText.forEach((line: string) => {
          if (yPosition > pageHeight - margin * 2) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
      }

      if (item.emotions.length > 0) {
        const emotionsText = item.emotions
          .map((e) => `${e.emotion} (${(e.intensity * 100).toFixed(0)}%)`)
          .join(", ");
        const emotionLines = pdf.splitTextToSize(
          `Emotions: ${emotionsText}`,
          pageWidth - margin * 2
        );
        emotionLines.forEach((line: string) => {
          if (yPosition > pageHeight - margin * 2) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
      }

      yPosition += 8;
    });

    pdf.save(
      `timeline-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.pdf`
    );
    toast({
      title: "Export successful",
      description: "Timeline exported as PDF",
    });
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
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader>
        <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Timeline
            </CardTitle>
            <CardDescription>
              Track how your themes and emotions evolve over time
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Button onClick={exportTimelinePDF} variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button 
              variant={showAll ? "default" : "outline"} 
              onClick={() => setShowAll(!showAll)}
              size="sm"
              className="w-full sm:w-auto"
            >
              {showAll ? "Filter by Date" : "Show All"}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 w-full sm:w-auto" disabled={showAll}>
                  <CalendarIcon className="h-4 w-4" />
                  <span className="truncate">
                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                  </span>
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
      <CardContent>
        <ScrollArea className="h-[400px] md:h-[600px] pr-4">
          {timelineData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No entries found in this date range
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Emotions */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Top Emotions in Period</h4>
              <div className="flex flex-wrap gap-2">
                {topEmotions.map(([emotion, count]) => (
                  <Badge 
                    key={emotion} 
                    variant="secondary" 
                    className="text-sm cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => handleTagClick(emotion, 'emotion')}
                  >
                    {emotion} ({count} {count === 1 ? 'entry' : 'entries'})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Top Themes */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Top Themes in Period</h4>
              <div className="flex flex-wrap gap-2">
                {topThemes.map(([theme, count]) => (
                  <Badge 
                    key={theme} 
                    variant="outline" 
                    className="text-sm cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleTagClick(theme, 'theme')}
                  >
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
                            <Badge 
                              key={i} 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => handleTagClick(theme, 'theme')}
                            >
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {item.emotions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.emotions.slice(0, 3).map((emo, i) => (
                            <Badge 
                              key={i} 
                              variant="secondary" 
                              className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                              onClick={() => handleTagClick(emo.emotion, 'emotion')}
                            >
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
          </div>
          )}
        </ScrollArea>
      </CardContent>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          {selectedTag && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="text-2xl">{selectedTag.tag}</span>
                </SheetTitle>
                <SheetDescription>
                  <Badge variant="secondary" className="mt-2">
                    {selectedTag.type}
                  </Badge>
                  <span className="ml-2 text-muted-foreground">
                    Appears in {tagEntries.length} {tagEntries.length === 1 ? 'entry' : 'entries'}
                  </span>
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-120px)] pr-4">
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Related Journal Entries
                    </h3>
                    {tagEntries.length > 0 ? (
                      <div className="space-y-4">
                        {tagEntries.map((entry) => (
                          <Card key={entry.id} className="p-4 hover:bg-accent/50 transition-colors">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-base">{entry.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarIcon className="h-4 w-4" />
                                {new Date(entry.entry_date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {entry.content}
                              </p>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No entries found
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
};
