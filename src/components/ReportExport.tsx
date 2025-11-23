import { useState } from "react";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { useLoading } from "@/contexts/LoadingContext";
import {
  addCoverPage,
  addSection,
  wrapText,
  colors,
  setColor,
  addPageFooter,
  checkPageBreak,
  addDivider,
} from "@/lib/pdf-helpers";

export const ReportExport = () => {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { startLoading, updateProgress, stopLoading } = useLoading();

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
    startLoading("generate-report", "Fetching data...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      updateProgress(15, "Decrypting entries...");
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

      updateProgress(30, "Loading insights...");
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

      updateProgress(50, "Generating comprehensive report...");
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;
      let pageNumber = 1;

      // Cover Page
      addCoverPage(
        doc,
        "Yggdrasil Insights Report",
        `Complete Analysis & Patterns`,
        `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
      );

      updateProgress(60, "Building executive summary...");
      doc.addPage();
      yPos = margin;

      // Executive Summary
      yPos = addSection(doc, "Executive Summary", yPos, margin);
      
      const deepEntries = insights.filter(i => i.depth_score && i.depth_score >= 5).length;
      const avgDepth = insights.length > 0 
        ? (insights.reduce((sum, i) => sum + (i.depth_score || 0), 0) / insights.length).toFixed(1)
        : 0;

      doc.setFontSize(10);
      setColor(doc, colors.text);
      doc.text(`Total Entries: ${entries.length}`, margin, yPos);
      yPos += 6;
      doc.text(`Deep Entries (≥5): ${deepEntries}`, margin, yPos);
      yPos += 6;
      doc.text(`Average Depth Score: ${avgDepth}/10`, margin, yPos);
      yPos += 6;
      doc.text(`Patterns Discovered: ${patterns.length}`, margin, yPos);
      yPos += 6;
      doc.text(`Active Goals: ${goals.filter((g: any) => g.status === "active").length}`, margin, yPos);
      yPos += 6;
      doc.text(`Completed Goals: ${goals.filter((g: any) => g.status === "completed").length}`, margin, yPos);
      yPos += 12;

      updateProgress(70, "Adding pattern insights...");
      // Top Patterns
      if (patterns.length > 0) {
        yPos = addSection(doc, "Pattern Insights", yPos, margin);

        patterns.slice(0, 5).forEach((pattern: any, idx: number) => {
          yPos = checkPageBreak(doc, yPos, 25, margin);

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.primary);
          doc.text(`${idx + 1}. ${pattern.title}`, margin, yPos);
          yPos += 6;

          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          setColor(doc, colors.textLight);
          doc.text(`Confidence: ${Math.round(pattern.confidence_score * 100)}% | Type: ${pattern.pattern_type}`, margin + 5, yPos);
          yPos += 5;

          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          yPos = wrapText(doc, pattern.description, pageWidth - margin * 2 - 5, margin + 5, yPos, 5);
          yPos += 3;

          if (pattern.actionable_insight) {
            doc.setFontSize(9);
            setColor(doc, colors.secondary);
            doc.text("💡 Insight:", margin + 5, yPos);
            yPos += 4;
            setColor(doc, colors.text);
            yPos = wrapText(doc, pattern.actionable_insight, pageWidth - margin * 2 - 10, margin + 10, yPos, 4);
            yPos += 2;
          }

          yPos += 6;
        });
      }

      updateProgress(80, "Adding emotional analysis...");
      // Emotional Analysis
      const emotionCounts = new Map<string, number>();
      insights.forEach((insight) => {
        if (insight.emotions && Array.isArray(insight.emotions)) {
          insight.emotions.forEach((e: any) => {
            const count = emotionCounts.get(e.emotion) || 0;
            emotionCounts.set(e.emotion, count + e.intensity);
          });
        }
      });

      if (emotionCounts.size > 0) {
        yPos = checkPageBreak(doc, yPos, 30, margin);
        yPos = addSection(doc, "Emotional Journey", yPos, margin);

        const topEmotions = Array.from(emotionCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        doc.setFontSize(9);
        setColor(doc, colors.text);
        topEmotions.forEach(([emotion, total]) => {
          yPos = checkPageBreak(doc, yPos, 5, margin);
          doc.text(`${emotion}: ${Math.round(total)} total intensity`, margin + 5, yPos);
          yPos += 5;
        });
        yPos += 6;
      }

      updateProgress(85, "Adding themes and keywords...");
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
        yPos = checkPageBreak(doc, yPos, 30, margin);
        yPos = addSection(doc, "Recurring Themes & Concepts", yPos, margin);

        if (allThemes.size > 0) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.secondary);
          doc.text("Most Common Themes:", margin, yPos);
          yPos += 6;
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          const themesText = Array.from(allThemes).slice(0, 20).join(", ");
          yPos = wrapText(doc, themesText, pageWidth - margin * 2, margin + 5, yPos, 5);
          yPos += 6;
        }

        if (allKeywords.size > 0) {
          yPos = checkPageBreak(doc, yPos, 15, margin);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.secondary);
          doc.text("Key Concepts:", margin, yPos);
          yPos += 6;
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          const keywordsText = Array.from(allKeywords).slice(0, 30).join(", ");
          yPos = wrapText(doc, keywordsText, pageWidth - margin * 2, margin + 5, yPos, 5);
          yPos += 6;
        }
      }

      updateProgress(90, "Adding goals progress...");
      // Goals Section
      if (goals.length > 0) {
        yPos = checkPageBreak(doc, yPos, 30, margin);
        yPos = addSection(doc, "Goals Progress", yPos, margin);

        goals.forEach((goal: any) => {
          yPos = checkPageBreak(doc, yPos, 20, margin);

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.primary);
          doc.text(`${goal.title}`, margin, yPos);
          yPos += 6;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.textLight);
          doc.text(`Status: ${goal.status.toUpperCase()}`, margin + 5, yPos);
          
          if (goal.target_date) {
            doc.text(`Target: ${format(new Date(goal.target_date), "MMM dd, yyyy")}`, margin + 50, yPos);
          }
          yPos += 5;

          if (goal.description) {
            setColor(doc, colors.text);
            yPos = wrapText(doc, goal.description, pageWidth - margin * 2 - 5, margin + 5, yPos, 4);
          }

          yPos += 6;
        });
      }

      updateProgress(95, "Finalizing report...");
      // Spiritual Insights Summary
      const chakraMentions = new Map<string, number>();
      const tarotMentions = new Map<string, number>();

      insights.forEach((insight) => {
        if (insight.chakra_tags && Array.isArray(insight.chakra_tags)) {
          insight.chakra_tags.forEach((tag: any) => {
            const count = chakraMentions.get(tag.chakra) || 0;
            chakraMentions.set(tag.chakra, count + 1);
          });
        }
        if (insight.tarot_tags && Array.isArray(insight.tarot_tags)) {
          insight.tarot_tags.forEach((tag: any) => {
            const count = tarotMentions.get(tag.card) || 0;
            tarotMentions.set(tag.card, count + 1);
          });
        }
      });

      if (chakraMentions.size > 0 || tarotMentions.size > 0) {
        yPos = checkPageBreak(doc, yPos, 30, margin);
        yPos = addSection(doc, "Spiritual Analysis", yPos, margin);

        if (chakraMentions.size > 0) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.primary);
          doc.text("🧘 Chakra Resonance:", margin, yPos);
          yPos += 6;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          Array.from(chakraMentions.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([chakra, count]) => {
              yPos = checkPageBreak(doc, yPos, 5, margin);
              doc.text(`${chakra}: ${count} mentions`, margin + 5, yPos);
              yPos += 5;
            });
          yPos += 6;
        }

        if (tarotMentions.size > 0) {
          yPos = checkPageBreak(doc, yPos, 15, margin);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.primary);
          doc.text("🔮 Tarot Archetypes:", margin, yPos);
          yPos += 6;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          Array.from(tarotMentions.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([card, count]) => {
              yPos = checkPageBreak(doc, yPos, 5, margin);
              doc.text(`${card}: ${count} mentions`, margin + 5, yPos);
              yPos += 5;
            });
        }
      }

      // Add page numbers to all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i > 1) { // Skip cover page
          addPageFooter(doc, i - 1);
        }
      }

      updateProgress(100, "Report complete!");
      const fileName = `yggdrasil-report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      stopLoading();
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
