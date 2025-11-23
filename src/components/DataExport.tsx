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
  addBadge,
  addDivider,
  checkPageBreak,
  wrapText,
  colors,
  setColor,
  addPageFooter,
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
      // Fetch all insights for entries
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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
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
        
        // Check if we need a new page
        yPosition = checkPageBreak(pdf, yPosition, 60, margin);

        // Entry Header
        setColor(pdf, colors.primary);
        pdf.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b, 0.1);
        pdf.rect(margin, yPosition - 5, pageWidth - margin * 2, 12, "F");
        
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        setColor(pdf, colors.primary);
        pdf.text(entry.title, margin + 3, yPosition + 3);
        yPosition += 15;

        // Entry Date
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "italic");
        setColor(pdf, colors.textLight);
        pdf.text(format(new Date(entry.entry_date), "MMMM d, yyyy"), margin, yPosition);
        yPosition += 8;

        // Entry Content
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        setColor(pdf, colors.text);
        yPosition = wrapText(pdf, entry.content, pageWidth - margin * 2, margin, yPosition, lineHeight);
        yPosition += 5;

        // Analysis Section (if exists)
        if (insight) {
          yPosition = checkPageBreak(pdf, yPosition, 30, margin);
          
          // Analysis Header
          yPosition = addSection(pdf, "AI Analysis", yPosition, margin);
          yPosition += 3;

          // Summary
          if (insight.summary) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.secondary);
            pdf.text("Summary:", margin, yPosition);
            yPosition += 5;
            
            pdf.setFont("helvetica", "normal");
            setColor(pdf, colors.text);
            yPosition = wrapText(pdf, insight.summary, pageWidth - margin * 2, margin, yPosition, lineHeight);
            yPosition += 5;
          }

          // Depth Score
          if (insight.depth_score) {
            yPosition = checkPageBreak(pdf, yPosition, 10, margin);
            pdf.setFontSize(9);
            setColor(pdf, colors.accent);
            pdf.text(`Depth Score: ${insight.depth_score}/10`, margin, yPosition);
            yPosition += 6;
          }

          // Themes
          if (insight.themes && Array.isArray(insight.themes) && insight.themes.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 15, margin);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.secondary);
            pdf.text("Themes:", margin, yPosition);
            yPosition += 5;
            
            const themesText = insight.themes.join(", ");
            pdf.setFont("helvetica", "normal");
            setColor(pdf, colors.text);
            yPosition = wrapText(pdf, themesText, pageWidth - margin * 2, margin + 5, yPosition, 4);
            yPosition += 5;
          }

          // Emotions
          if (insight.emotions && Array.isArray(insight.emotions) && insight.emotions.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 15, margin);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.secondary);
            pdf.text("Emotions:", margin, yPosition);
            yPosition += 5;
            
            insight.emotions.slice(0, 5).forEach((emotion: any) => {
              yPosition = checkPageBreak(pdf, yPosition, 5, margin);
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              pdf.text(`${emotion.emotion} (${emotion.intensity}/10)`, margin + 5, yPosition);
              yPosition += 4;
            });
            yPosition += 3;
          }

          // Keywords
          if (insight.keywords && Array.isArray(insight.keywords) && insight.keywords.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 10, margin);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.secondary);
            pdf.text("Keywords:", margin, yPosition);
            yPosition += 5;
            
            const keywordsText = insight.keywords.join(", ");
            pdf.setFont("helvetica", "normal");
            setColor(pdf, colors.text);
            yPosition = wrapText(pdf, keywordsText, pageWidth - margin * 2, margin + 5, yPosition, 4);
            yPosition += 5;
          }

          // Deep Analysis
          if (insight.interpretation) {
            yPosition = checkPageBreak(pdf, yPosition, 20, margin);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.primary);
            pdf.text("Deep Analysis:", margin, yPosition);
            yPosition += 6;
            
            if (insight.interpretation.main_insight) {
              pdf.setFontSize(9);
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              yPosition = wrapText(pdf, insight.interpretation.main_insight, pageWidth - margin * 2, margin, yPosition, 5);
              yPosition += 5;
            }
          }

          // Chakra Tags
          if (insight.chakra_tags && Array.isArray(insight.chakra_tags) && insight.chakra_tags.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 15, margin);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.primary);
            pdf.text("🧘 Chakra Resonance:", margin, yPosition);
            yPosition += 5;
            
            insight.chakra_tags.forEach((tag: any) => {
              yPosition = checkPageBreak(pdf, yPosition, 8, margin);
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              yPosition = wrapText(pdf, `${tag.chakra}: ${tag.description}`, pageWidth - margin * 2 - 5, margin + 5, yPosition, 4);
              yPosition += 2;
            });
            yPosition += 3;
          }

          // Tarot Tags
          if (insight.tarot_tags && Array.isArray(insight.tarot_tags) && insight.tarot_tags.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 15, margin);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            setColor(pdf, colors.primary);
            pdf.text("🔮 Tarot Archetypes:", margin, yPosition);
            yPosition += 5;
            
            insight.tarot_tags.forEach((tag: any) => {
              yPosition = checkPageBreak(pdf, yPosition, 8, margin);
              pdf.setFont("helvetica", "normal");
              setColor(pdf, colors.text);
              yPosition = wrapText(pdf, `${tag.card}: ${tag.description}`, pageWidth - margin * 2 - 5, margin + 5, yPosition, 4);
              yPosition += 2;
            });
            yPosition += 3;
          }

          // Frameworks Applied
          if (insight.frameworks_applied && Array.isArray(insight.frameworks_applied) && insight.frameworks_applied.length > 0) {
            yPosition = checkPageBreak(pdf, yPosition, 10, margin);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "italic");
            setColor(pdf, colors.textLight);
            const frameworks = insight.frameworks_applied.map((f: string) => {
              if (f === 'theravada') return '☸️ Buddhist';
              if (f === 'freudian') return '🧠 Psychoanalytic';
              if (f === 'jungian') return '🌓 Jungian';
              return f;
            }).join(", ");
            pdf.text(`Frameworks: ${frameworks}`, margin, yPosition);
            yPosition += 6;
          }
        }

        // Separator between entries
        if (index < entries.length - 1) {
          yPosition = checkPageBreak(pdf, yPosition, 10, margin);
          addDivider(pdf, yPosition, margin);
          yPosition += 10;
        }

        // Add page footer
        addPageFooter(pdf, pageNumber);
        if (yPosition > pageHeight - 40) {
          pageNumber++;
        }
      });

      updateProgress(95, "Finalizing document...");
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
