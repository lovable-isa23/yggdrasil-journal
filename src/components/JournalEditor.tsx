import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Target, X, MessageSquareReply, Link2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { cn, preserveNewlines } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { journalEntrySchema, type JournalEntryFormData } from "@/lib/validations";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ImageUploader } from "@/components/ImageUploader";
import { EntryLinkSelector } from "@/components/EntryLinkSelector";

const DRAFT_KEY = 'yggdrasil-journal-draft';
const DRAFT_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days

interface DraftData {
  title: string;
  content: string;
  entryDate: string;
  selectedGoals: string[];
  selectedEntries: string[];
  mood: string;
  savedAt: number;
}

interface JournalEditorProps {
  onEntryCreated: () => void;
  replyToEntry?: { id: string; title: string } | null;
  onReplyHandled?: () => void;
}

interface Goal {
  id: string;
  title: string;
  goal_type: string;
  status: string;
}

interface RecentEntry {
  id: string;
  title: string;
  entry_date: string;
}

export const JournalEditor = ({ onEntryCreated, replyToEntry, onReplyHandled }: JournalEditorProps) => {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const draftRestoredRef = useRef(false);
  const [entryDate, setEntryDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [mood, setMood] = useState("general");
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  // Destructure ref from register to merge with our custom ref
  const { ref: titleFormRef, ...titleRest } = register("title");

  const title = watch("title");
  const content = watch("content");

  // Restore draft from localStorage on mount
  useEffect(() => {
    fetchGoals();
    fetchRecentEntries();

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft: DraftData = JSON.parse(raw);
        if (Date.now() - draft.savedAt < DRAFT_TTL) {
          if (draft.title || draft.content) {
            reset({ title: draft.title || "", content: draft.content || "" });
            if (draft.entryDate) {
              const restored = new Date(draft.entryDate);
              if (!isNaN(restored.getTime())) setEntryDate(restored);
            }
            if (draft.selectedGoals?.length) setSelectedGoals(draft.selectedGoals);
            if (draft.selectedEntries?.length) setSelectedEntries(draft.selectedEntries);
            if (draft.mood) setMood(draft.mood);
            draftRestoredRef.current = true;
            toast.info("Draft restored");
          }
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  // Auto-save draft with debounce
  useEffect(() => {
    // Skip the initial render after restore to avoid immediate re-save
    if (draftRestoredRef.current) {
      draftRestoredRef.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      if (!title && !content) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      const draft: DraftData = {
        title: title || "",
        content: content || "",
        entryDate: entryDate.toISOString(),
        selectedGoals,
        selectedEntries,
        mood,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch { /* storage full */ }
    }, 500);

    return () => clearTimeout(timeout);
  }, [title, content, entryDate, selectedGoals, selectedEntries, mood]);

  useEffect(() => {
    if (replyToEntry) {
      // Pre-select the entry we're replying to
      setSelectedEntries(prev => 
        prev.includes(replyToEntry.id) ? prev : [...prev, replyToEntry.id]
      );
      // Scroll editor into view and focus title
      setTimeout(() => {
        titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInputRef.current?.focus();
      }, 100);
      // Notify parent that we've handled the reply
      onReplyHandled?.();
    }
  }, [replyToEntry, onReplyHandled]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, goal_type, status")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const fetchRecentEntries = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('decrypt-entries');
      if (error) throw error;
      // Get all entries for linking
      const entries = (data?.entries || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        entry_date: e.entry_date,
      }));
      setRecentEntries(entries);
    } catch (error) {
      console.error("Error fetching recent entries:", error);
    }
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const toggleEntry = (entryId: string) => {
    setSelectedEntries(prev =>
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const handleTranscription = (text: string, url?: string) => {
    // Set the transcribed text as content
    reset({
      title: title || text.substring(0, 50) + "...",
      content: text,
    });
    if (url) {
      setAudioUrl(url);
    }
    toast.success("Transcription complete! Review and edit before saving.");
  };

  const handleImageAnalysis = (description: string, url: string) => {
    // Set the AI-analyzed description as content
    reset({
      title: title || "Image Entry: " + new Date().toLocaleDateString(),
      content: description,
    });
    setImageUrl(url);
    toast.success("Image analyzed! Review and edit before saving.");
  };

  const onSubmit = async (data: JournalEntryFormData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to create entries");
        return;
      }

      // Format date in local timezone to avoid shifting
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, '0');
      const day = String(entryDate.getDate()).padStart(2, '0');
      const localDate = `${year}-${month}-${day}`;

      const { data: entryData, error: encryptError } = await supabase.functions.invoke('encrypt-entry', {
        body: {
          title: data.title,
          content: data.content,
          entry_date: localDate,
          linked_goals: selectedGoals,
          linked_entries: selectedEntries,
          audio_url: audioUrl,
          image_url: imageUrl,
          transcription_source: audioUrl ? 'voice' : imageUrl ? 'image' : 'typed',
          mood_type: mood,
        },
      });

      if (encryptError) throw encryptError;

      toast.success("Journal entry created (AES-256 encrypted)!");
      localStorage.removeItem(DRAFT_KEY);
      reset();
      setSelectedGoals([]);
      setSelectedEntries([]);
      setAudioUrl(undefined);
      setImageUrl(undefined);
      setMood("general");
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      setEntryDate(today);
      // Refresh recent entries list
      fetchRecentEntries();
      onEntryCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create entry");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-medium">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          ref={(e) => {
            titleFormRef(e);
            titleInputRef.current = e;
          }}
          type="text"
          placeholder="Give your entry a title..."
          {...titleRest}
          className="h-12 text-lg"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {(goals.length > 0 || recentEntries.length > 0) && (
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto border border-border/50 hover:border-border flex-wrap gap-y-2"
            >
              <span className="flex items-center gap-2 text-sm font-medium min-w-0">
                <Link2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Link to journeys or entries (optional)</span>
              </span>
              <span className="flex items-center gap-2 flex-shrink-0">
                {(selectedGoals.length + selectedEntries.length) > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedGoals.length + selectedEntries.length} linked
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {goals.length > 0 && (
              <div className="space-y-3 pl-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4" />
                  Active Journeys
                </Label>
                <div className="flex flex-wrap gap-2">
                  {goals.map((goal) => {
                    const isSelected = selectedGoals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => toggleGoal(goal.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all max-w-full",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-sm truncate">{goal.title}</span>
                        {isSelected && <X className="h-3 w-3 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {recentEntries.length > 0 && (
              <div className="space-y-3 pl-2">
                <Label className="flex items-center gap-2 text-sm">
                  <MessageSquareReply className="h-4 w-4" />
                  Link to Entries
                </Label>
                <EntryLinkSelector
                  entries={recentEntries}
                  selectedEntryIds={selectedEntries}
                  onToggle={toggleEntry}
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="space-y-2">
        <Label>Entry Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full h-12 justify-start text-left font-normal",
                !entryDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {entryDate ? format(entryDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="start">
            <Calendar
              mode="single"
              selected={entryDate}
              onSelect={(date) => {
                if (date) {
                  // Set to noon local time to avoid timezone boundary issues
                  const adjustedDate = new Date(date);
                  adjustedDate.setHours(12, 0, 0, 0);
                  setEntryDate(adjustedDate);
                }
              }}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Mood / Category Selector */}
      <div className="space-y-2">
        <Label>Mood / Category</Label>
        <Select value={mood} onValueChange={setMood}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Select a mood" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dream">🌙 Dream</SelectItem>
            <SelectItem value="reflection">🪞 Reflection</SelectItem>
            <SelectItem value="gratitude">🙏 Gratitude</SelectItem>
            <SelectItem value="intention">🎯 Intention</SelectItem>
            <SelectItem value="shadow_work">🌑 Shadow Work</SelectItem>
            <SelectItem value="general">📝 General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alternative Input Methods - Hidden for now */}
      {/* <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border">
        <Label>Alternative Input Methods</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <AudioRecorder onTranscriptionComplete={handleTranscription} />
          <ImageUploader onAnalysisComplete={handleImageAnalysis} />
        </div>
        <p className="text-xs text-muted-foreground">
          Record your thoughts or upload an image/sketch. AI will transcribe or analyze it for you to review and edit.
        </p>
      </div> */}

      <div className="space-y-2">
        <Label>Content</Label>
        <Tabs defaultValue="write" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="mt-4 space-y-2">
            <Textarea
              placeholder="Pour your thoughts here... (Markdown supported)"
              {...register("content")}
              className="min-h-[300px] resize-none font-['Poppins'] text-base"
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <div className="min-h-[300px] p-4 border border-border rounded-lg bg-muted/30 prose prose-sm max-w-none dark:prose-invert">
              {content ? (
                <ReactMarkdown
                  disallowedElements={['script', 'iframe', 'object', 'embed']}
                  unwrapDisallowed={true}
                >
                  {preserveNewlines(content)}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">Nothing to preview yet...</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base bg-gradient-to-r from-primary to-earth-brown hover:scale-[1.02] transition-all duration-300"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Entry"}
      </Button>
    </form>
  );
};
