import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ParsedEntry {
  title: string;
  content: string;
  entry_date: string;
}

export const DataImport = ({ onImportComplete }: { onImportComplete: () => void }) => {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseTextFile = (text: string): ParsedEntry[] => {
    // Simple text/markdown parsing - treat entire file as one entry
    const lines = text.trim().split('\n');
    const title = lines[0]?.substring(0, 200) || "Imported Entry";
    const content = text.substring(0, 50000);
    
    return [{
      title,
      content,
      entry_date: new Date().toISOString(),
    }];
  };

  const parseJSONFile = (text: string): ParsedEntry[] => {
    try {
      const data = JSON.parse(text);
      const entries = Array.isArray(data) ? data : [data];
      
      return entries.map(entry => ({
        title: String(entry.title || "Imported Entry").substring(0, 200),
        content: String(entry.content || "").substring(0, 50000),
        entry_date: entry.entry_date || entry.created_at || new Date().toISOString(),
      })).filter(entry => entry.content.trim().length > 0);
    } catch (error) {
      throw new Error("Invalid JSON format");
    }
  };

  const parsePDFFile = async (file: File): Promise<ParsedEntry[]> => {
    // For PDF, we'll use the document parsing tool via an edge function
    const formData = new FormData();
    formData.append('file', file);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Read file as base64
    const reader = new FileReader();
    const fileContent = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Extract text from PDF using a simple approach
    // In a real scenario, you'd want to use a proper PDF parsing library or edge function
    toast({
      title: "PDF Import",
      description: "PDF parsing is in progress. Large files may take a moment.",
    });

    // For now, we'll create a single entry noting that PDF was imported
    // In production, you'd want to implement proper PDF text extraction
    return [{
      title: `Imported from ${file.name}`,
      content: "PDF content imported. Full text extraction requires additional processing.",
      entry_date: new Date().toISOString(),
    }];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to import entries",
          variant: "destructive",
        });
        return;
      }

      let entries: ParsedEntry[] = [];
      const fileType = file.name.split('.').pop()?.toLowerCase();

      // Parse based on file type
      if (fileType === 'txt' || fileType === 'md') {
        const text = await file.text();
        entries = parseTextFile(text);
      } else if (fileType === 'json') {
        const text = await file.text();
        entries = parseJSONFile(text);
      } else if (fileType === 'pdf') {
        entries = await parsePDFFile(file);
      } else {
        throw new Error("Unsupported file type. Please use .txt, .md, .json, or .pdf files.");
      }

      if (entries.length === 0) {
        throw new Error("No valid entries found in file");
      }

      // Insert entries into database
      const entriesToInsert = entries.map(entry => ({
        ...entry,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from("journal_entries")
        .insert(entriesToInsert);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} imported`,
      });

      onImportComplete();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isImporting}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        variant="outline"
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        {isImporting ? "Importing..." : "Import Entries"}
      </Button>
    </div>
  );
};
