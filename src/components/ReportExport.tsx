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
  addStyledSection,
  wrapText,
  colors,
  setColor,
  addPageFooter,
  checkPageBreak,
  addDivider,
  getFrameworkIcon,
  getFrameworkName,
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
      const margin = 25;
      let yPos = margin;

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

      // Executive Summary with styled section
      yPos = addStyledSection(doc, "Executive Summary", "📊", yPos, margin);
      
      const deepEntries = insights.filter(i => i.depth_score && i.depth_score >= 5).length;
      const avgDepth = insights.length > 0 
        ? (insights.reduce((sum, i) => sum + (i.depth_score || 0), 0) / insights.length).toFixed(1)
        : 0;

      doc.setFontSize(11);
      setColor(doc, colors.text);
      
      const summaryItems = [
        `Total Entries: ${entries.length}`,
        `Deep Entries (≥5): ${deepEntries}`,
        `Average Depth Score: ${avgDepth}/10`,
        `Patterns Discovered: ${patterns.length}`,
        `Active Goals: ${goals.filter((g: any) => g.status === "active").length}`,
        `Completed Goals: ${goals.filter((g: any) => g.status === "completed").length}`,
      ];

      summaryItems.forEach((item) => {
        doc.text(`• ${item}`, margin + 5, yPos);
        yPos += 7;
      });
      yPos += 8;

      updateProgress(70, "Adding pattern insights...");
      // Top Patterns
      if (patterns.length > 0) {
        yPos = checkPageBreak(doc, yPos, 30, margin);
        yPos = addStyledSection(doc, "Pattern Insights", "🔍", yPos, margin);

        patterns.slice(0, 5).forEach((pattern: any, idx: number) => {
          yPos = checkPageBreak(doc, yPos, 30, margin);

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.primary);
          doc.text(`${idx + 1}. ${pattern.title}`, margin, yPos);
          yPos += 7;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.textLight);
          const confidence = Math.round(pattern.confidence_score * 100);
          const confidenceBar = "█".repeat(Math.round(confidence / 20)) + "░".repeat(5 - Math.round(confidence / 20));
          doc.text(`Confidence: ${confidenceBar} ${confidence}%  |  Type: ${pattern.pattern_type}`, margin + 5, yPos);
          yPos += 6;

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          yPos = wrapText(doc, pattern.description, pageWidth - margin * 2 - 5, margin + 5, yPos, 5);
          yPos += 4;

          if (pattern.actionable_insight) {
            yPos = checkPageBreak(doc, yPos, 15, margin);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            setColor(doc, colors.secondary);
            doc.text("Actionable Insight:", margin + 5, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            setColor(doc, colors.text);
            yPos = wrapText(doc, pattern.actionable_insight, pageWidth - margin * 2 - 15, margin + 10, yPos, 5);
            yPos += 4;
          }

          yPos += 8;
        });
      }

      updateProgress(80, "Adding emotional analysis...");
      // Emotional Analysis
      const emotionCounts = new Map<string, { total: number, count: number }>();
      insights.forEach((insight) => {
        if (insight.emotions && Array.isArray(insight.emotions)) {
          insight.emotions.forEach((e: any) => {
            const existing = emotionCounts.get(e.emotion) || { total: 0, count: 0 };
            emotionCounts.set(e.emotion, { 
              total: existing.total + e.intensity,
              count: existing.count + 1
            });
          });
        }
      });

      if (emotionCounts.size > 0) {
        yPos = checkPageBreak(doc, yPos, 40, margin);
        yPos = addStyledSection(doc, "Emotional Journey", "❤️", yPos, margin);

        const topEmotions = Array.from(emotionCounts.entries())
          .map(([emotion, data]) => ({
            emotion,
            total: data.total,
            avg: data.total / data.count,
            count: data.count
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        doc.setFontSize(10);
        topEmotions.forEach(({ emotion, total, avg, count }) => {
          yPos = checkPageBreak(doc, yPos, 6, margin);
          setColor(doc, colors.text);
          const bar = "█".repeat(Math.min(10, Math.round(total / 10))) + "░".repeat(Math.max(0, 10 - Math.round(total / 10)));
          doc.text(`${emotion}: ${bar}  (${count} occurrences, avg intensity: ${avg.toFixed(1)})`, margin + 5, yPos);
          yPos += 6;
        });
        yPos += 8;
      }

      updateProgress(85, "Adding themes and keywords...");
      // Themes & Keywords
      const themeCounts = new Map<string, number>();
      const keywordCounts = new Map<string, number>();
      
      insights.forEach((insight) => {
        if (insight.themes && Array.isArray(insight.themes)) {
          insight.themes.forEach((theme: string) => {
            themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
          });
        }
        if (insight.keywords && Array.isArray(insight.keywords)) {
          insight.keywords.forEach((kw: string) => {
            keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
          });
        }
      });

      if (themeCounts.size > 0 || keywordCounts.size > 0) {
        yPos = checkPageBreak(doc, yPos, 40, margin);
        yPos = addStyledSection(doc, "Recurring Themes & Concepts", "🌿", yPos, margin);

        if (themeCounts.size > 0) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.secondary);
          doc.text("Most Common Themes:", margin, yPos);
          yPos += 7;
          
          const sortedThemes = Array.from(themeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          
          sortedThemes.forEach(([theme, count]) => {
            yPos = checkPageBreak(doc, yPos, 6, margin);
            doc.text(`• ${theme} (${count}x)`, margin + 5, yPos);
            yPos += 5;
          });
          yPos += 6;
        }

        if (keywordCounts.size > 0) {
          yPos = checkPageBreak(doc, yPos, 20, margin);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.secondary);
          doc.text("Key Concepts:", margin, yPos);
          yPos += 7;
          
          const sortedKeywords = Array.from(keywordCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          const keywordsText = sortedKeywords.map(([kw, count]) => `${kw} (${count})`).join("  •  ");
          yPos = wrapText(doc, keywordsText, pageWidth - margin * 2, margin + 5, yPos, 5);
          yPos += 8;
        }
      }

      updateProgress(90, "Adding goals progress...");
      // Goals Section
      if (goals.length > 0) {
        yPos = checkPageBreak(doc, yPos, 40, margin);
        yPos = addStyledSection(doc, "Goals Progress", "🎯", yPos, margin);

        goals.forEach((goal: any) => {
          yPos = checkPageBreak(doc, yPos, 25, margin);

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.primary);
          doc.text(goal.title, margin, yPos);
          yPos += 7;

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          
          // Status badge color
          if (goal.status === 'completed') {
            setColor(doc, colors.success);
          } else if (goal.status === 'active') {
            setColor(doc, colors.secondary);
          } else {
            setColor(doc, colors.textLight);
          }
          doc.text(`Status: ${goal.status.toUpperCase()}`, margin + 5, yPos);
          
          if (goal.target_date) {
            setColor(doc, colors.textLight);
            doc.text(`  |  Target: ${format(new Date(goal.target_date), "MMM dd, yyyy")}`, margin + 60, yPos);
          }
          yPos += 6;

          if (goal.description) {
            setColor(doc, colors.text);
            yPos = wrapText(doc, goal.description, pageWidth - margin * 2 - 5, margin + 5, yPos, 5);
          }

          if (goal.intention) {
            yPos = checkPageBreak(doc, yPos, 10, margin);
            doc.setFont("helvetica", "italic");
            setColor(doc, colors.textLight);
            yPos = wrapText(doc, `Intention: ${goal.intention}`, pageWidth - margin * 2 - 5, margin + 5, yPos, 5);
          }

          yPos += 10;
        });
      }

      updateProgress(95, "Finalizing report...");
      // Spiritual Insights Summary
      const chakraMentions = new Map<string, number>();
      const tarotMentions = new Map<string, number>();
      const frameworkMentions = new Map<string, number>();

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
        if (insight.frameworks_applied && Array.isArray(insight.frameworks_applied)) {
          insight.frameworks_applied.forEach((fw: string) => {
            const count = frameworkMentions.get(fw) || 0;
            frameworkMentions.set(fw, count + 1);
          });
        }
      });

      if (chakraMentions.size > 0 || tarotMentions.size > 0 || frameworkMentions.size > 0) {
        yPos = checkPageBreak(doc, yPos, 50, margin);
        yPos = addStyledSection(doc, "Spiritual Analysis", "✨", yPos, margin);

        // Frameworks Used
        if (frameworkMentions.size > 0) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.primary);
          doc.text("Wisdom Traditions Applied:", margin, yPos);
          yPos += 7;

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          Array.from(frameworkMentions.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([fw, count]) => {
              yPos = checkPageBreak(doc, yPos, 6, margin);
              doc.text(`${getFrameworkIcon(fw)} ${getFrameworkName(fw)}: ${count} applications`, margin + 5, yPos);
              yPos += 6;
            });
          yPos += 6;
        }

        if (chakraMentions.size > 0) {
          yPos = checkPageBreak(doc, yPos, 20, margin);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.spiritual);
          doc.text("Chakra Resonance:", margin, yPos);
          yPos += 7;

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          Array.from(chakraMentions.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([chakra, count]) => {
              yPos = checkPageBreak(doc, yPos, 6, margin);
              doc.text(`${chakra}: ${count} mentions`, margin + 5, yPos);
              yPos += 6;
            });
          yPos += 6;
        }

        if (tarotMentions.size > 0) {
          yPos = checkPageBreak(doc, yPos, 20, margin);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          setColor(doc, colors.spiritual);
          doc.text("Tarot Archetypes:", margin, yPos);
          yPos += 7;

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          setColor(doc, colors.text);
          Array.from(tarotMentions.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .forEach(([card, count]) => {
              yPos = checkPageBreak(doc, yPos, 6, margin);
              doc.text(`${card}: ${count} mentions`, margin + 5, yPos);
              yPos += 6;
            });
        }
      }

      // Add page numbers to all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        addPageFooter(doc, i - 1);
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
                className="pointer-events-auto"
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
                className="pointer-events-auto"
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
