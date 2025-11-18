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

  const setAllTimeRange = () => {
    setDateRange({
      from: new Date(0),
      to: new Date(),
    });
  };

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
      // Fetch and decrypt entries
      const { data: { session } } = await supabase.auth.getSession();
      const { data: decryptedData } = await supabase.functions.invoke('decrypt-entries', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      const allEntries = decryptedData?.entries || [];
      const entries = allEntries.filter((entry: any) => {
        const entryDate = new Date(entry.entry_date);
        return entryDate >= dateRange.from && entryDate <= dateRange.to;
      });

      const [patternsRes, goalsRes, insightsRes] = await Promise.all([
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
          .from("entry_insights")
          .select("*")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString()),
      ]);

      const patterns = patternsRes.data || [];
      const goals = goalsRes.data || [];
      const insights = insightsRes.data || [];

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Yggdrasil Insights Report", margin, yPos);
      yPos += 12;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`,
        margin,
        yPos
      );
      yPos += 15;

      // Summary Stats
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Entries: ${entries.length}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Patterns Discovered: ${patterns.length}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Active Goals: ${goals.filter((g: any) => g.status === "active").length}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Completed Goals: ${goals.filter((g: any) => g.status === "completed").length}`, margin + 5, yPos);
      yPos += 12;

      // Top Patterns
      if (patterns.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Top Patterns", margin, yPos);
        yPos += 8;

        patterns.slice(0, 5).forEach((pattern: any) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = margin;
          }

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${pattern.title} (${Math.round(pattern.confidence_score * 100)}%)`, margin + 5, yPos);
          yPos += 6;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const descLines = doc.splitTextToSize(pattern.description, pageWidth - margin * 2 - 10);
          doc.text(descLines, margin + 10, yPos);
          yPos += descLines.length * 5 + 4;

          if (pattern.actionable_insight) {
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 200);
            const insightLines = doc.splitTextToSize(`Insight: ${pattern.actionable_insight}`, pageWidth - margin * 2 - 10);
            doc.text(insightLines, margin + 10, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += insightLines.length * 5 + 6;
          }
        });
      }

      // Goals Section
      if (goals.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Goals", margin, yPos);
        yPos += 8;

        goals.forEach((goal: any) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = margin;
          }

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${goal.title} [${goal.status.toUpperCase()}]`, margin + 5, yPos);
          yPos += 6;

          if (goal.description) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            const descLines = doc.splitTextToSize(goal.description, pageWidth - margin * 2 - 10);
            doc.text(descLines, margin + 10, yPos);
            yPos += descLines.length * 5 + 2;
          }

          if (goal.target_date) {
            doc.setFontSize(9);
            doc.text(`Target: ${format(new Date(goal.target_date), "MMM dd, yyyy")}`, margin + 10, yPos);
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
          yPos = margin;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Common Themes & Keywords", margin, yPos);
        yPos += 8;

        if (allThemes.size > 0) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Themes:", margin + 5, yPos);
          yPos += 6;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const themesText = Array.from(allThemes).slice(0, 15).join(", ");
          const themeLines = doc.splitTextToSize(themesText, pageWidth - margin * 2 - 10);
          doc.text(themeLines, margin + 10, yPos);
          yPos += themeLines.length * 5 + 6;
        }

        if (allKeywords.size > 0) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Keywords:", margin + 5, yPos);
          yPos += 6;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const keywordsText = Array.from(allKeywords).slice(0, 15).join(", ");
          const keywordLines = doc.splitTextToSize(keywordsText, pageWidth - margin * 2 - 10);
          doc.text(keywordLines, margin + 10, yPos);
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
    <>
      <div className="flex flex-wrap gap-4 mb-4">
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

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium opacity-0">All</label>
          <Button
            onClick={setAllTimeRange}
            variant="outline"
            className="gap-2"
          >
            All
          </Button>
        </div>
      </div>

      <Button onClick={generatePDF} disabled={isGenerating} variant="outline" className="gap-2">
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
    </>
  );
};
