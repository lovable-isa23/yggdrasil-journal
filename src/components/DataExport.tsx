import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileJson, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { useLoading } from "@/contexts/LoadingContext";
import {
  addCoverPage,
  addSection,
  addStyledSection,
  addDivider,
  checkPageBreak,
  wrapText,
  colors,
  setColor,
  addPageFooter,
  getFrameworkIcon,
  getFrameworkName,
} from "@/lib/pdf-helpers";

export const DataExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { startLoading, updateProgress, stopLoading } = useLoading();

  const fetchAllEntries = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: decryptedData, error } = await supabase.functions.invoke('decrypt-entries', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        toast.error("Error fetching entries", { description: error.message });
        return null;
      }

      return decryptedData?.entries || [];
    } catch (error) {
      toast.error("Error fetching entries", { description: "Failed to decrypt entries" });
      return null;
    }
  };

  const exportAsJSON = async () => {
    setIsExporting(true);
    startLoading("export-json", "Fetching entries...");
    
    try {
      updateProgress(30, "Decrypting content...");
      const entries = await fetchAllEntries();
      if (!entries) return;

      updateProgress(80, "Preparing download...");
      const dataStr = JSON.stringify(entries, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `yggdrasil-journal-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      updateProgress(100, "Export complete!");
      toast.success("Export successful", { description: `${entries.length} entries exported as JSON` });
    } catch (error) {
      toast.error("Export failed", { description: "An error occurred during export" });
    } finally {
      stopLoading();
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    setIsExporting(true);
    startLoading("export-pdf", "Fetching entries...");
    
    try {
      updateProgress(10, "Decrypting entries...");
      const entries = await fetchAllEntries();
      if (!entries || entries.length === 0) {
        toast.error("No entries to export", { description: "Create some journal entries first" });
        stopLoading();
        setIsExporting(false);
        return;
      }

      updateProgress(30, "Loading analysis data...");
      const entryIds = entries.map((e: any) => e.id);
      const { data: insightsData } = await supabase
        .from("entry_insights")
        .select("*")
        .in("entry_id", entryIds);

      const insightsMap = new Map();
      insightsData?.forEach((insight) => {
        insightsMap.set(insight.entry_id, insight);
      });

      updateProgress(50, "Generating PDF...");
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 25;
      const lineHeight = 5;
      let pageNumber = 1;

      // Cover Page
      addCoverPage(
        pdf,
        "Yggdrasil Journal Archive",
        `${entries.length} Entries with Full Analysis`,
        `Exported on ${format(new Date(), "MMMM d, yyyy")}`
      );

      pdf.addPage();
      let yPosition = margin;

      // Process each entry
      entries.forEach((entry: any, index: number) => {
        updateProgress(50 + (index / entries.length) * 40, `Processing entry ${index + 1}/${entries.length}...`);

        const insight = insightsMap.get(entry.id);
        
        yPosition = checkPageBreak(pdf, yPosition, 60, margin);

        // Entry Header with background
        pdf.setFillColor(colors.highlight.r, colors.highlight.g, colors.highlight.b);
        pdf.rect(margin - 5, yPosition - 6, pageWidth - margin * 2 + 10, 14, "F");
        
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        setColor(pdf, colors.primary);
        pdf.text(entry.title, margin, yPosition + 3);
        yPosition += 18;

        // Entry Date
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "italic");
        setColor(pdf, colors.textLight);
        pdf.text(format(new Date(entry.entry_date), "MMMM d, yyyy"), margin, yPosition);
        yPosition += 10;

        // Entry Content
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        setColor(pdf, colors.text);
        yPosition = wrapText(pdf, entry.content, pageWidth - margin * 2, margin, yPosition, lineHeight);
        yPosition += 8;

        // Analysis Section
        if (insight) {
          yPosition = checkPageBreak(pdf, yPosition, 30, margin);
          yPosition = addStyledSection(pdf, "AI Analysis", "🔍", yPosition, margin);

          // Summary
          if (insight.summary) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.secondary);
            pdf.text("Summary:", margin, yPosition);
            yPosition += 6;
            
            pdf.setFont("helvetica", "normal");
            setColor(pdf, colors.text);
            yPosition = wrapText(pdf, insight.summary, pageWidth - margin * 2, margin + 5, yPosition, lineHeight);
            yPosition += 8;
          }

          // Depth Score
          if (insight.depth_score) {
            yPosition = checkPageBreak(pdf, yPosition, 10, margin);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.accent);
            pdf.text(`Depth Score: ${insight.depth_score}/10`, margin, yPosition);
            yPosition += 8;
          }

          // Deep Interpretation - ENHANCED
          if (insight.interpretation) {
            yPosition = checkPageBreak(pdf, yPosition, 40, margin);
            yPosition = addStyledSection(pdf, "Deep Interpretation", "🔮", yPosition, margin);

            const interp = insight.interpretation;
            
            // Main Insight
            if (interp.main_insight) {
              pdf.setFontSize(10);
              pdf.setFont("helvetica", "bold");
              setColor(pdf, colors.secondary);
              pdf.text("Core Insight:", margin, yPosition);
              yPosition += 6;
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              yPosition = wrapText(pdf, interp.main_insight, pageWidth - margin * 2 - 5, margin + 5, yPosition, 5);
              yPosition += 8;
            }

            // Patterns to Notice
            if (interp.patterns_to_notice && Array.isArray(interp.patterns_to_notice) && interp.patterns_to_notice.length > 0) {
              yPosition = checkPageBreak(pdf, yPosition, 20, margin);
              pdf.setFont("helvetica", "bold");
              setColor(pdf, colors.secondary);
              pdf.text("Patterns to Notice:", margin, yPosition);
              yPosition += 6;
              interp.patterns_to_notice.forEach((pattern: string) => {
                yPosition = checkPageBreak(pdf, yPosition, 6, margin);
                pdf.setFont("helvetica", "normal");
                setColor(pdf, colors.text);
                yPosition = wrapText(pdf, `• ${pattern}`, pageWidth - margin * 2 - 10, margin + 5, yPosition, 5);
              });
              yPosition += 6;
            }

            // Questions for Reflection
            if (interp.questions_for_reflection && Array.isArray(interp.questions_for_reflection) && interp.questions_for_reflection.length > 0) {
              yPosition = checkPageBreak(pdf, yPosition, 20, margin);
              pdf.setFont("helvetica", "bold");
              setColor(pdf, colors.spiritual);
              pdf.text("Questions for Reflection:", margin, yPosition);
              yPosition += 6;
              interp.questions_for_reflection.forEach((q: string) => {
                yPosition = checkPageBreak(pdf, yPosition, 6, margin);
                pdf.setFont("helvetica", "italic");
                setColor(pdf, colors.text);
                yPosition = wrapText(pdf, `- ${q}`, pageWidth - margin * 2 - 10, margin + 5, yPosition, 5);
              });
              yPosition += 6;
            }

            // Action Steps
            if (interp.action_steps && Array.isArray(interp.action_steps) && interp.action_steps.length > 0) {
              yPosition = checkPageBreak(pdf, yPosition, 20, margin);
              pdf.setFont("helvetica", "bold");
              setColor(pdf, colors.accent);
              pdf.text("Action Steps:", margin, yPosition);
              yPosition += 6;
              interp.action_steps.forEach((step: string) => {
                yPosition = checkPageBreak(pdf, yPosition, 6, margin);
                pdf.setFont("helvetica", "normal");
                setColor(pdf, colors.text);
                yPosition = wrapText(pdf, `- ${step}`, pageWidth - margin * 2 - 10, margin + 5, yPosition, 5);
              });
              yPosition += 6;
            }

            // Growth Journey
            if (interp.growth_journey) {
              yPosition = checkPageBreak(pdf, yPosition, 15, margin);
              pdf.setFont("helvetica", "bold");
              setColor(pdf, colors.primary);
              pdf.text("Your Growth Journey:", margin, yPosition);
              yPosition += 6;
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              yPosition = wrapText(pdf, interp.growth_journey, pageWidth - margin * 2 - 5, margin + 5, yPosition, 5);
              yPosition += 8;
            }
          }

          // Themes
          if (insight.themes && Array.isArray(insight.themes) && insight.themes.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 15, margin);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.secondary);
            pdf.text("Themes:", margin, yPosition);
            yPosition += 6;
            
            const themesText = insight.themes.join("  •  ");
            pdf.setFont("helvetica", "normal");
            setColor(pdf, colors.text);
            yPosition = wrapText(pdf, themesText, pageWidth - margin * 2, margin + 5, yPosition, 5);
            yPosition += 6;
          }

          // Emotions
          if (insight.emotions && Array.isArray(insight.emotions) && insight.emotions.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 15, margin);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.secondary);
            pdf.text("Emotions:", margin, yPosition);
            yPosition += 6;
            
            insight.emotions.slice(0, 5).forEach((emotion: any) => {
              yPosition = checkPageBreak(pdf, yPosition, 5, margin);
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              const bar = "█".repeat(Math.round(emotion.intensity / 2)) + "░".repeat(5 - Math.round(emotion.intensity / 2));
              pdf.text(`${emotion.emotion}: ${bar} (${emotion.intensity}/10)`, margin + 5, yPosition);
              yPosition += 5;
            });
            yPosition += 4;
          }

          // Keywords
          if (insight.keywords && Array.isArray(insight.keywords) && insight.keywords.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 12, margin);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.secondary);
            pdf.text("Keywords:", margin, yPosition);
            yPosition += 6;
            
            const keywordsText = insight.keywords.join("  •  ");
            pdf.setFont("helvetica", "normal");
            setColor(pdf, colors.text);
            yPosition = wrapText(pdf, keywordsText, pageWidth - margin * 2, margin + 5, yPosition, 5);
            yPosition += 6;
          }

          // Sacred Geometry Analysis
          if (insight.sacred_geometry && Array.isArray(insight.sacred_geometry) && insight.sacred_geometry.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 20, margin);
            yPosition = addStyledSection(pdf, "Sacred Geometry", "📐", yPosition, margin);
            
            insight.sacred_geometry.forEach((geo: any) => {
              yPosition = checkPageBreak(pdf, yPosition, 12, margin);
              pdf.setFont("helvetica", "bold");
              setColor(pdf, colors.spiritual);
              pdf.text(`${geo.shape}:`, margin + 5, yPosition);
              yPosition += 5;
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              yPosition = wrapText(pdf, geo.description, pageWidth - margin * 2 - 10, margin + 10, yPosition, 4);
              yPosition += 4;
            });
          }

          // Chakra Tags
          if (insight.chakra_tags && Array.isArray(insight.chakra_tags) && insight.chakra_tags.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 15, margin);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.spiritual);
            pdf.text("Chakra Resonance:", margin, yPosition);
            yPosition += 6;
            
            insight.chakra_tags.forEach((tag: any) => {
              yPosition = checkPageBreak(pdf, yPosition, 8, margin);
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              yPosition = wrapText(pdf, `${tag.chakra}: ${tag.description}`, pageWidth - margin * 2 - 10, margin + 5, yPosition, 4);
              yPosition += 2;
            });
            yPosition += 4;
          }

          // Tarot Tags
          if (insight.tarot_tags && Array.isArray(insight.tarot_tags) && insight.tarot_tags.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 15, margin);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.spiritual);
            pdf.text("Tarot Archetypes:", margin, yPosition);
            yPosition += 6;
            
            insight.tarot_tags.forEach((tag: any) => {
              yPosition = checkPageBreak(pdf, yPosition, 8, margin);
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              yPosition = wrapText(pdf, `${tag.card}: ${tag.description}`, pageWidth - margin * 2 - 10, margin + 5, yPosition, 4);
              yPosition += 2;
            });
            yPosition += 4;
          }

          // Frameworks Applied
          if (insight.frameworks_applied && Array.isArray(insight.frameworks_applied) && insight.frameworks_applied.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 10, margin);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "italic");
            setColor(pdf, colors.textLight);
            const frameworks = insight.frameworks_applied.map((f: string) => 
              `${getFrameworkIcon(f)} ${getFrameworkName(f)}`
            ).join("  •  ");
            pdf.text(`Frameworks: ${frameworks}`, margin, yPosition);
            yPosition += 8;
          }
        }

        // Separator between entries
        if (index < entries.length - 1) {
          yPosition = checkPageBreak(pdf, yPosition, 15, margin);
          addDivider(pdf, yPosition, margin);
          yPosition += 15;
        }

        addPageFooter(pdf, pageNumber);
        if (yPosition > pdf.internal.pageSize.getHeight() - 40) {
          pageNumber++;
        }
      });

      updateProgress(95, "Finalizing document...");
      
      // Add page numbers to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageFooter(pdf, i - 1);
      }

      pdf.save(`yggdrasil-journal-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      updateProgress(100, "Export complete!");

      toast.success("Export successful", { description: `${entries.length} entries exported with full analysis` });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Export failed", { description: "An error occurred during PDF generation" });
    } finally {
      stopLoading();
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={exportAsJSON}
        disabled={isExporting}
        variant="outline"
        className="gap-2"
      >
        <FileJson className="h-4 w-4" />
        Export as JSON
      </Button>
      <Button
        onClick={exportAsPDF}
        disabled={isExporting}
        variant="outline"
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Export as PDF
      </Button>
    </div>
  );
};
