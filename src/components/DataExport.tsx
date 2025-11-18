import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileJson, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { format } from "date-fns";

export const DataExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const fetchAllEntries = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: decryptedData, error } = await supabase.functions.invoke('decrypt-entries', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        toast({
          title: "Error fetching entries",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      return decryptedData?.entries || [];
    } catch (error) {
      toast({
        title: "Error fetching entries",
        description: "Failed to decrypt entries",
        variant: "destructive",
      });
      return null;
    }
  };

  const exportAsJSON = async () => {
    setIsExporting(true);
    try {
      const entries = await fetchAllEntries();
      if (!entries) return;

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

      toast({
        title: "Export successful",
        description: `${entries.length} entries exported as JSON`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "An error occurred during export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    setIsExporting(true);
    try {
      const entries = await fetchAllEntries();
      if (!entries || entries.length === 0) {
        toast({
          title: "No entries to export",
          description: "Create some journal entries first",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      let yPosition = margin;

      // Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Yggdrasil Journal Entries", margin, yPosition);
      yPosition += lineHeight * 2;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Exported on ${format(new Date(), "MMMM d, yyyy")}`, margin, yPosition);
      yPosition += lineHeight * 2;

      // Entries
      entries.forEach((entry, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - margin * 2) {
          pdf.addPage();
          yPosition = margin;
        }

        // Entry title
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        const titleLines = pdf.splitTextToSize(entry.title, pageWidth - margin * 2);
        titleLines.forEach((line: string) => {
          if (yPosition > pageHeight - margin * 2) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });

        // Entry date
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "italic");
        pdf.text(format(new Date(entry.entry_date), "MMMM d, yyyy"), margin, yPosition);
        yPosition += lineHeight * 1.5;

        // Entry content
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        const contentLines = pdf.splitTextToSize(entry.content, pageWidth - margin * 2);
        contentLines.forEach((line: string) => {
          if (yPosition > pageHeight - margin * 2) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });

        // Spacing between entries
        yPosition += lineHeight * 2;

        // Separator line
        if (index < entries.length - 1) {
          if (yPosition > pageHeight - margin * 2) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += lineHeight * 2;
        }
      });

      pdf.save(`yggdrasil-journal-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast({
        title: "Export successful",
        description: `${entries.length} entries exported as PDF`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "An error occurred during PDF generation",
        variant: "destructive",
      });
    } finally {
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
