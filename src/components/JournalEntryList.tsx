import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar as CalendarIcon, Edit2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { EntryInsights } from "@/components/EntryInsights";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  entry_date: string;
}

interface JournalEntryListProps {
  refreshTrigger: number;
}

export const JournalEntryList = ({ refreshTrigger }: JournalEntryListProps) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("entry_date", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error("Error fetching entries:", error);
      toast.error("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Entry deleted");
      fetchEntries();
    } catch (error: any) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete entry");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDateUpdate = async (entryId: string, newDate: Date) => {
    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({ entry_date: format(newDate, "yyyy-MM-dd") })
        .eq("id", entryId);

      if (error) throw error;

      toast.success("Entry date updated");
      setEditingDateId(null);
      fetchEntries();
    } catch (error: any) {
      console.error("Error updating date:", error);
      toast.error("Failed to update date");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your entries...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-2xl border border-border">
        <div className="text-5xl mb-4">📝</div>
        <h3 className="text-xl font-semibold mb-2">No entries yet</h3>
        <p className="text-muted-foreground">
          Start your journey by creating your first journal entry above
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">Your Journal Entries</h2>
      {entries.map((entry) => {
        const isExpanded = expandedEntries.has(entry.id);
        return (
          <div
            key={entry.id}
            className="bg-card p-6 rounded-2xl border border-border shadow-soft hover:shadow-medium transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-xl font-semibold flex-grow">{entry.title}</h3>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your journal entry.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(entry.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <CalendarIcon className="h-4 w-4" />
              {editingDateId === entry.id ? (
                <Popover open={editingDateId === entry.id} onOpenChange={(open) => !open && setEditingDateId(null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("text-sm font-normal")}
                    >
                      {format(new Date(entry.entry_date), "MMMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(entry.entry_date)}
                      onSelect={(date) => date && handleDateUpdate(entry.id, date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <time className="flex items-center gap-2">
                  {format(new Date(entry.entry_date), "MMMM d, yyyy")}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingDateId(entry.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </time>
              )}
            </div>

            <div 
              className={`prose prose-sm max-w-none dark:prose-invert ${!isExpanded ? 'line-clamp-3' : ''}`}
            >
              <ReactMarkdown>{entry.content}</ReactMarkdown>
            </div>

            {entry.content.length > 200 && (
              <Button
                variant="link"
                onClick={() => toggleExpand(entry.id)}
                className="mt-2 p-0 h-auto text-primary"
              >
                {isExpanded ? "Show less" : "Read more"}
              </Button>
            )}

            {/* AI Insights */}
            <div className="mt-6 border-t border-border pt-6">
              <EntryInsights 
                entryId={entry.id}
                title={entry.title}
                content={entry.content}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
