import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

export const ReportExport = () => {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error("Please select a date range");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch data for the date range
      const [patternsRes, goalsRes, entriesRes, insightsRes] = await Promise.all([
        supabase
          .from("pattern_insights")
          .select("*")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString())
          .order("confidence_score", { ascending: false }),
        supabase
          .from("goals")
          .select("*")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString()),
        supabase
          .from("journal_entries")
          .select("*")
          .gte("entry_date", format(dateRange.from, "yyyy-MM-dd"))
          .lte("entry_date", format(dateRange.to, "yyyy-MM-dd"))
          .order("entry_date", { ascending: false }),
        supabase
          .from("entry_insights")
          .select("*")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString()),
      ]);

      const patterns = patternsRes.data || [];
      const goals = goalsRes.data || [];
      const entries = entriesRes.data || [];
      const insights = insightsRes.data || [];

      // Generate PDF
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(20);
      doc.text("Yggdrasil Insights Report", 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.text(
        `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`,
        20,
        yPos
      );
      yPos += 15;

      // Summary Stats
      doc.setFontSize(14);
      doc.text("Summary", 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.text(`Total Entries: ${entries.length}`, 25, yPos);
      yPos += 6;
      doc.text(`Patterns Discovered: ${patterns.length}`, 25, yPos);
      yPos += 6;
      doc.text(`Active Goals: ${goals.filter((g) => g.status === "active").length}`, 25, yPos);
      yPos += 6;
      doc.text(`Completed Goals: ${goals.filter((g) => g.status === "completed").length}`, 25, yPos);
      yPos += 12;

      // Top Patterns
      if (patterns.length > 0) {
        doc.setFontSize(14);
        doc.text("Top Patterns", 20, yPos);
        yPos += 8;

        patterns.slice(0, 5).forEach((pattern) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.text(`${pattern.title} (${Math.round(pattern.confidence_score * 100)}%)`, 25, yPos);
          yPos += 6;

          doc.setFontSize(9);
          const descLines = doc.splitTextToSize(pattern.description, 160);
          doc.text(descLines, 30, yPos);
          yPos += descLines.length * 5 + 4;

          if (pattern.actionable_insight) {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 255);
            const insightLines = doc.splitTextToSize(`💡 ${pattern.actionable_insight}`, 155);
            doc.text(insightLines, 30, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += insightLines.length * 5 + 6;
          }
        });
      }

      // Goals Section
      if (goals.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text("Goals", 20, yPos);
        yPos += 8;

        goals.forEach((goal) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.text(`${goal.title} [${goal.status.toUpperCase()}]`, 25, yPos);
          yPos += 6;

          if (goal.description) {
            doc.setFontSize(9);
            const descLines = doc.splitTextToSize(goal.description, 160);
            doc.text(descLines, 30, yPos);
            yPos += descLines.length * 5 + 2;
          }

          if (goal.target_date) {
            doc.setFontSize(9);
            doc.text(`Target: ${format(new Date(goal.target_date), "MMM dd, yyyy")}`, 30, yPos);
            yPos += 6;
          }

          yPos += 4;
        });
      }

      // Themes & Keywords
      const allThemes = new Set<string>();
      const allKeywords = new Set<string>();
      
      insights.forEach((insight) => {
        if (insight.themes && Array.isArray(insight.themes)) {
          insight.themes.forEach((theme: string) => allThemes.add(theme));
        }
        if (insight.keywords && Array.isArray(insight.keywords)) {
          insight.keywords.forEach((kw: string) => allKeywords.add(kw));
        }
      });

      if (allThemes.size > 0 || allKeywords.size > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text("Common Themes & Keywords", 20, yPos);
        yPos += 8;

        if (allThemes.size > 0) {
          doc.setFontSize(10);
          doc.text("Themes:", 25, yPos);
          yPos += 6;
          doc.setFontSize(9);
          const themesText = Array.from(allThemes).slice(0, 15).join(", ");
          const themeLines = doc.splitTextToSize(themesText, 160);
          doc.text(themeLines, 30, yPos);
          yPos += themeLines.length * 5 + 6;
        }

        if (allKeywords.size > 0) {
          doc.setFontSize(10);
          doc.text("Keywords:", 25, yPos);
          yPos += 6;
          doc.setFontSize(9);
          const keywordsText = Array.from(allKeywords).slice(0, 15).join(", ");
          const keywordLines = doc.splitTextToSize(keywordsText, 160);
          doc.text(keywordLines, 30, yPos);
          yPos += keywordLines.length * 5;
        }
      }

      // Save PDF
      const fileName = `yggdrasil-report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export Report
        </CardTitle>
        <CardDescription>
          Generate a PDF report summarizing your patterns, goals, and insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button onClick={generatePDF} disabled={isGenerating} className="w-full sm:w-auto gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate PDF Report
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
