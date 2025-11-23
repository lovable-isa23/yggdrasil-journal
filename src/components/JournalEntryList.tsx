import { useEffect, useState } from "react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Calendar as CalendarIcon, ChevronDown, ChevronUp, Mic, Image as ImageIcon, Loader2, FileText, Edit, Clock } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { EntryInsights } from "./EntryInsights";
import { EntryQuickActions } from "./EntryQuickActions";
import { Badge } from "@/components/ui/badge";
import { MOOD_OPTIONS } from "./MoodPicker";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  entry_date: string;
  is_favorite?: boolean;
  tags?: string[];
  mood_type?: string;
  mood_color?: string;
  audio_url?: string;
  image_url?: string;
  transcription_source?: string;
  depth_score?: number | null;
}

interface JournalEntryListProps {
  refreshTrigger: number;
  filters?: {
    showFavoritesOnly: boolean;
    selectedMoods: string[];
    selectedTags: string[];
    hasMedia?: boolean;
  };
  sortOption?: 'date-desc' | 'date-asc' | 'word-count-desc' | 'word-count-asc' | 'favorites-first';
  onEntriesLoaded?: (total: number, filtered: number) => void;
}

const getPreview = (content: string): string => {
  const stripped = content.replace(/[#*`_~\[\]]/g, '').trim();
  if (stripped.length <= 150) return stripped;
  const truncated = stripped.substring(0, 150);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
};

const getWordCount = (text: string): number => {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
};

const getReadingTime = (wordCount: number): string => {
  const minutes = Math.ceil(wordCount / 200);
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
};

const getMoodStyles = (moodType?: string) => {
  const moods = {
    dream: { bg: 'from-purple-100 to-purple-50 dark:from-purple-950/30 dark:to-purple-900/20', border: 'border-l-purple-400', textAccent: 'text-purple-700 dark:text-purple-300' },
    reflection: { bg: 'from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/20', border: 'border-l-blue-400', textAccent: 'text-blue-700 dark:text-blue-300' },
    gratitude: { bg: 'from-amber-100 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-900/20', border: 'border-l-amber-400', textAccent: 'text-amber-700 dark:text-amber-300' },
    challenge: { bg: 'from-orange-100 to-amber-50 dark:from-orange-950/30 dark:to-amber-900/20', border: 'border-l-orange-400', textAccent: 'text-orange-700 dark:text-orange-300' },
    celebration: { bg: 'from-pink-100 to-pink-50 dark:from-pink-950/30 dark:to-pink-900/20', border: 'border-l-rose-400', textAccent: 'text-rose-700 dark:text-rose-300' },
    general: { bg: 'from-[#F9F0E5] to-[#FFF7ED] dark:from-[#2A2420] dark:to-[#1F1A17]', border: 'border-l-[#D4A574]', textAccent: 'text-[#8B6F47] dark:text-[#D4A574]' }
  };
  return moods[moodType as keyof typeof moods] || moods.general;
};

const getDepthBadge = (depthScore?: number | null) => {
  if (!depthScore) return null;
  
  if (depthScore >= 9) {
    return { label: `Depth: ${depthScore}`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  } else if (depthScore >= 7) {
    return { label: `Depth: ${depthScore}`, className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
  } else if (depthScore >= 5) {
    return { label: `Depth: ${depthScore}`, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
  } else {
    return { label: `Depth: ${depthScore}`, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
  }
};

export function JournalEntryList({ refreshTrigger, filters, sortOption, onEntriesLoaded }: JournalEntryListProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEntries, setOpenEntries] = useState<Set<string>>(new Set());
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke('decrypt-entries');
      if (error) throw error;
      setEntries(data?.entries || []);
    } catch (error: any) {
      console.error("Error fetching entries:", error);
      toast({ title: "Error", description: "Failed to load journal entries", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, [refreshTrigger]);

  // Apply filters and sorting
  const filteredAndSortedEntries = React.useMemo(() => {
    let result = [...entries];

    // Apply filters
    if (filters) {
      if (filters.showFavoritesOnly) {
        result = result.filter(entry => entry.is_favorite);
      }

      if (filters.selectedMoods.length > 0) {
        result = result.filter(entry => 
          entry.mood_type && filters.selectedMoods.includes(entry.mood_type)
        );
      }

      if (filters.selectedTags.length > 0) {
        result = result.filter(entry => 
          entry.tags && Array.isArray(entry.tags) && 
          entry.tags.some(tag => filters.selectedTags.includes(tag))
        );
      }

      if (filters.hasMedia) {
        result = result.filter(entry => 
          entry.audio_url || entry.image_url || entry.transcription_source
        );
      }
    }

    // Apply sorting
    if (sortOption) {
      switch (sortOption) {
        case 'date-desc':
          result.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
          break;
        case 'date-asc':
          result.sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
          break;
        case 'word-count-desc':
          result.sort((a, b) => getWordCount(b.content) - getWordCount(a.content));
          break;
        case 'word-count-asc':
          result.sort((a, b) => getWordCount(a.content) - getWordCount(b.content));
          break;
        case 'favorites-first':
          result.sort((a, b) => {
            if (a.is_favorite && !b.is_favorite) return -1;
            if (!a.is_favorite && b.is_favorite) return 1;
            return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
          });
          break;
      }
    }

    return result;
  }, [entries, filters, sortOption]);

  // Notify parent of entry counts
  useEffect(() => {
    if (onEntriesLoaded) {
      onEntriesLoaded(entries.length, filteredAndSortedEntries.length);
    }
  }, [entries.length, filteredAndSortedEntries.length, onEntriesLoaded]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Entry deleted" });
      fetchEntries();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete entry", variant: "destructive" });
    } finally {
      setEntryToDelete(null);
    }
  };

  const toggleOpen = (id: string) => {
    setOpenEntries(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const handleDateUpdate = async (entryId: string, newDate: Date) => {
    try {
      const localDate = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
      const { error } = await supabase.from("journal_entries").update({ entry_date: localDate }).eq("id", entryId);
      if (error) throw error;
      toast({ title: "Success", description: "Entry date updated" });
      fetchEntries();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update entry date", variant: "destructive" });
    }
  };

  const handleEntryUpdate = (entryId: string, updates: Partial<JournalEntry>) => {
    setEntries(prev => prev.map(entry => entry.id === entryId ? { ...entry, ...updates } : entry));
  };

  const openEditDialog = (entry: JournalEntry) => {
    setEntryToEdit(entry);
    setEditTitle(entry.title);
    setEditContent(entry.content);
  };

  const closeEditDialog = () => {
    setEntryToEdit(null);
    setEditTitle("");
    setEditContent("");
  };

  const handleEdit = async () => {
    if (!entryToEdit) return;
    
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return;
      }

      const { error } = await supabase.functions.invoke("update-entry", {
        body: { entryId: entryToEdit.id, title: editTitle, content: editContent },
      });

      if (error) throw error;

      toast({ title: "Success", description: "Entry updated successfully" });
      closeEditDialog();
      fetchEntries();
    } catch (error: any) {
      console.error("Error updating entry:", error);
      toast({ title: "Error", description: "Failed to update entry", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No journal entries yet</p>
          <p className="text-sm text-muted-foreground mt-2">Start writing your first entry above</p>
        </CardContent>
      </Card>
    );
  }

  if (filteredAndSortedEntries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No entries match your filters</p>
          <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredAndSortedEntries.map((entry) => {
         const isOpen = openEntries.has(entry.id);
         const moodStyles = getMoodStyles(entry.mood_type);
         const wordCount = getWordCount(entry.content);
         const preview = getPreview(entry.content);
         const moodOption = MOOD_OPTIONS.find(m => m.value === (entry.mood_type || 'general'));

         return (
           <Card key={entry.id} className={`overflow-hidden border-l-4 ${moodStyles.border} bg-gradient-to-br ${moodStyles.bg} transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}>
             <CardHeader className="pb-3">
               <div className="flex items-start justify-between gap-4">
                 <div className="flex-1 space-y-2">
                   <button onClick={() => toggleOpen(entry.id)} className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity">
                     <CardTitle className="text-lg">{entry.title}</CardTitle>
                     {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                   </button>
                    {(entry.audio_url || entry.image_url) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {entry.transcription_source && entry.audio_url && <Badge variant="secondary" className="gap-1 h-6"><span>📄</span><span>Voice transcribed</span></Badge>}
                        {entry.audio_url && <Badge variant="secondary" className="gap-1 h-6"><Mic className="h-3 w-3" /><span>Audio</span></Badge>}
                        {entry.image_url && <Badge variant="secondary" className="gap-1 h-6"><ImageIcon className="h-3 w-3" /><span>Image</span></Badge>}
                      </div>
                    )}
                   {!isOpen && <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      {moodOption && <Badge variant="outline" className={`gap-1 ${moodStyles.textAccent}`}><span>{moodOption.icon}</span><span>{moodOption.label}</span></Badge>}
                      {(() => {
                        const depthBadge = getDepthBadge(entry.depth_score);
                        return depthBadge && <Badge variant="outline" className={depthBadge.className}>{depthBadge.label}</Badge>;
                      })()}
                      {entry.tags?.map(tag => <Badge key={tag} variant="secondary">#{tag}</Badge>)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{wordCount.toLocaleString()} words</span><span>•</span>
                      <span>{getReadingTime(wordCount)}</span><span>•</span>
                      <span>{format(new Date(entry.entry_date), "MMM d, yyyy")}</span>
                    </div>
                    <TooltipProvider>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Created {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Created: {format(new Date(entry.created_at), "PPpp")}</p>
                          </TooltipContent>
                        </Tooltip>
                        {entry.created_at !== entry.updated_at && (
                          <>
                            <span>•</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1">
                                  Modified {format(new Date(entry.updated_at), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Last modified: {format(new Date(entry.updated_at), "PPpp")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </TooltipProvider>
                   <EntryQuickActions entryId={entry.id} isFavorite={entry.is_favorite || false} moodType={entry.mood_type || 'general'} tags={entry.tags || []}
                     onFavoriteChange={(isFavorite) => handleEntryUpdate(entry.id, { is_favorite: isFavorite })}
                     onMoodChange={(mood_type) => handleEntryUpdate(entry.id, { mood_type })}
                     onTagsChange={(tags) => handleEntryUpdate(entry.id, { tags })} />
                 </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(entry)}><Edit className="h-4 w-4" /></Button>
                    <Popover>
                      <PopoverTrigger asChild><Button variant="outline" size="icon"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={new Date(entry.entry_date)} onSelect={(date) => date && handleDateUpdate(entry.id, date)} initialFocus /></PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" onClick={() => setEntryToDelete(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
               </div>
             </CardHeader>
             {isOpen && (<><CardContent className="pt-4 border-t"><div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{entry.content}</ReactMarkdown></div></CardContent>
             <CardFooter><EntryInsights entryId={entry.id} title={entry.title} content={entry.content} /></CardFooter></>)}
           </Card>
         );
       })}
      
      <AlertDialog open={entryToDelete !== null} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your journal entry and all associated data including insights, audio, and images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => entryToDelete && handleDelete(entryToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={entryToEdit !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
            <DialogDescription>
              Make changes to your journal entry. Both title and content will be re-encrypted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Entry title"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Tabs defaultValue="write" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write" className="mt-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Write your entry here... (Markdown supported)"
                    className="min-h-[400px] font-mono text-sm"
                    disabled={isSaving}
                  />
                </TabsContent>
                <TabsContent value="preview" className="mt-2">
                  <div className="min-h-[400px] rounded-md border bg-muted/50 p-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{editContent || "*No content to preview*"}</ReactMarkdown>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving || !editTitle.trim() || !editContent.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
