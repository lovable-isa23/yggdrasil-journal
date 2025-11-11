import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ParsedEntry {
  title: string;
  content: string;
  entry_date: string;
}

export const DataImport = ({ onImportComplete }: { onImportComplete: () => void }) => {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseTextFile = (text: string): ParsedEntry[] => {
    // Simple text/markdown parsing - treat entire file as one entry
    const lines = text.trim().split('\n');
    const title = lines[0]?.substring(0, 200) || "Imported Entry";
    const content = text.substring(0, 50000);
    
    return [{
      title,
      content,
      entry_date: formatLocalDate(new Date()),
    }];
  };

  const parseJSONFile = (text: string): ParsedEntry[] => {
    try {
      const data = JSON.parse(text);
      const entries = Array.isArray(data) ? data : [data];
      
      return entries.map(entry => {
        let entryDate = formatLocalDate(new Date());
        if (entry.entry_date || entry.created_at) {
          const date = new Date(entry.entry_date || entry.created_at);
          entryDate = formatLocalDate(date);
        }
        
        return {
          title: String(entry.title || "Imported Entry").substring(0, 200),
          content: String(entry.content || "").substring(0, 50000),
          entry_date: entryDate,
        };
      }).filter(entry => entry.content.trim().length > 0);
    } catch (error) {
      throw new Error("Invalid JSON format");
    }
  };

  const parsePDFFile = async (file: File): Promise<ParsedEntry[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    toast({
      title: "PDF Import",
      description: "Extracting text from PDF using OCR. This may take a moment...",
    });

    // Read file as base64
    const reader = new FileReader();
    const fileContent = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    // Call edge function to parse PDF with OCR
    const { data, error } = await supabase.functions.invoke('parse-pdf', {
      body: {
        fileContent,
        fileName: file.name,
      },
    });

    if (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }

    if (!data.success || !data.entries || data.entries.length === 0) {
      throw new Error("No content could be extracted from the PDF");
    }

    console.log(`Successfully extracted ${data.entries.length} entries from PDF`);
    
    return data.entries;
  };

  const processFile = async (file: File, user: any): Promise<ParsedEntry[]> => {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (fileType === 'txt' || fileType === 'md') {
      const text = await file.text();
      return parseTextFile(text);
    } else if (fileType === 'json') {
      const text = await file.text();
      return parseJSONFile(text);
    } else if (fileType === 'pdf') {
      return await parsePDFFile(file);
    } else {
      throw new Error(`Unsupported file type for ${file.name}. Please use .txt, .md, .json, or .pdf files.`);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    const totalFiles = files.length;
    let processedFiles = 0;
    const failedFiles: string[] = [];

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

      // Process each file
      for (const file of Array.from(files)) {
        try {
          const entries = await processFile(file, user);

          if (entries.length === 0) {
            failedFiles.push(`${file.name}: No valid entries found`);
            processedFiles++;
            continue;
          }

          // Create import history record
          const { data: importRecord, error: historyError } = await supabase
            .from("import_history")
            .insert({
              user_id: user.id,
              file_name: file.name,
              file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
              entries_count: entries.length,
              status: 'completed',
            })
            .select()
            .single();

          if (historyError) throw historyError;

          // Insert entries with import_batch_id
          const entriesToInsert = entries.map(entry => ({
            ...entry,
            user_id: user.id,
            import_batch_id: importRecord.id,
          }));

          const { error: insertError } = await supabase
            .from("journal_entries")
            .insert(entriesToInsert);

          if (insertError) throw insertError;

          processedFiles++;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          failedFiles.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          processedFiles++;
        }
      }

      // Show result toast
      if (failedFiles.length === 0) {
        toast({
          title: "Import successful",
          description: `${totalFiles} ${totalFiles === 1 ? 'file' : 'files'} imported successfully`,
        });
      } else if (failedFiles.length < totalFiles) {
        toast({
          title: "Partial import",
          description: `${totalFiles - failedFiles.length} files succeeded, ${failedFiles.length} failed`,
          variant: "default",
        });
      } else {
        toast({
          title: "Import failed",
          description: "All files failed to import. Check console for details.",
          variant: "destructive",
        });
      }

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
        multiple
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
