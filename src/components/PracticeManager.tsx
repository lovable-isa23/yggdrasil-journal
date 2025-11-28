import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  Plus, 
  Sparkles,
  Heart,
  Book,
  Flower2,
  Flame,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Play,
  Bell,
  Loader2,
  Calendar,
  Wind,
  Brain,
  BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

interface Practice {
  id: string;
  title: string;
  description: string | null;
  practice_type: string;
  frequency: string;
  is_active: boolean;
  order_index: number;
}

interface PracticeLog {
  id: string;
  completed_at: string;
  notes: string | null;
  mood_before: number | null;
  mood_after: number | null;
}

interface PracticeManagerProps {
  goalId: string;
  goalType: string;
  intention?: string;
}

const practiceTypeIcons: Record<string, any> = {
  meditation: Sparkles,
  journaling: BookOpen,
  ritual: Flame,
  movement: Heart,
  breathwork: Wind,
  study: Brain,
};

const practiceTypeColors: Record<string, string> = {
  meditation: "text-purple-500",
  journaling: "text-blue-500",
  ritual: "text-orange-500",
  movement: "text-pink-500",
  breathwork: "text-cyan-500",
  study: "text-green-500",
};

const suggestedPractices: Record<string, Array<{ title: string; description: string; type: string; frequency: string }>> = {
  "shadow-work": [
    { title: "Shadow Journaling", description: "Write freely about aspects of yourself you usually hide or deny", type: "journaling", frequency: "daily" },
    { title: "Mirror Meditation", description: "Gaze at yourself in the mirror and observe arising emotions without judgment", type: "meditation", frequency: "weekly" },
    { title: "Inner Child Dialogue", description: "Have a written conversation with your younger self", type: "journaling", frequency: "weekly" },
  ],
  "spiritual-practice": [
    { title: "Morning Meditation", description: "20 minutes of silent sitting meditation", type: "meditation", frequency: "daily" },
    { title: "Sacred Reading", description: "Read and contemplate spiritual texts", type: "study", frequency: "daily" },
    { title: "Evening Gratitude", description: "List 3 things you're grateful for", type: "journaling", frequency: "daily" },
  ],
  "emotional-healing": [
    { title: "Emotion Check-In", description: "Scan your body and name the emotions you feel", type: "meditation", frequency: "daily" },
    { title: "Release Ritual", description: "Write down what you're ready to release and safely burn or bury it", type: "ritual", frequency: "weekly" },
    { title: "Breath of Compassion", description: "Breathing exercise focusing on self-compassion", type: "breathwork", frequency: "daily" },
  ],
};

export const PracticeManager = ({ goalId, goalType, intention }: PracticeManagerProps) => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [logs, setLogs] = useState<Record<string, PracticeLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPractice, setNewPractice] = useState({
    title: "",
    description: "",
    practice_type: "meditation",
    frequency: "daily",
  });
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Delete confirmation state
  const [practiceToDelete, setPracticeToDelete] = useState<Practice | null>(null);
  
  // Practice log dialog state
  const [practiceToLog, setPracticeToLog] = useState<Practice | null>(null);
  const [logNotes, setLogNotes] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    fetchPractices();
  }, [goalId]);

  const fetchPractices = async () => {
    try {
      const { data: practicesData, error: practicesError } = await supabase
        .from("goal_practices")
        .select("*")
        .eq("goal_id", goalId)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (practicesError) throw practicesError;

      setPractices(practicesData || []);

      // Fetch logs for each practice
      if (practicesData && practicesData.length > 0) {
        const practiceIds = practicesData.map(p => p.id);
        const { data: logsData, error: logsError } = await supabase
          .from("practice_logs")
          .select("*")
          .in("practice_id", practiceIds)
          .order("completed_at", { ascending: false });

        if (logsError) throw logsError;

        const logsByPractice = (logsData || []).reduce((acc, log) => {
          if (!acc[log.practice_id]) acc[log.practice_id] = [];
          acc[log.practice_id].push(log);
          return acc;
        }, {} as Record<string, PracticeLog[]>);

        setLogs(logsByPractice);
      }
    } catch (error) {
      console.error("Error fetching practices:", error);
      toast.error("Failed to load practices");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPractice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("goal_practices").insert({
        goal_id: goalId,
        user_id: user.id,
        ...newPractice,
        order_index: practices.length,
      });

      if (error) throw error;

      toast.success("Practice added! 🌟");
      setIsDialogOpen(false);
      setNewPractice({ title: "", description: "", practice_type: "meditation", frequency: "daily" });
      fetchPractices();
    } catch (error) {
      console.error("Error adding practice:", error);
      toast.error("Failed to add practice");
    }
  };

  const handleDeletePractice = async () => {
    if (!practiceToDelete) return;
    
    try {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from("goal_practices")
        .update({ is_active: false })
        .eq("id", practiceToDelete.id);

      if (error) throw error;

      toast.success("Practice removed");
      setPracticeToDelete(null);
      fetchPractices();
    } catch (error) {
      console.error("Error deleting practice:", error);
      toast.error("Failed to remove practice");
    }
  };

  const handleLogPractice = async () => {
    if (!practiceToLog) return;
    
    setIsLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create practice log
      const { error: logError } = await supabase.from("practice_logs").insert({
        practice_id: practiceToLog.id,
        user_id: user.id,
        notes: logNotes || null,
      });

      if (logError) throw logError;

      // If notes were provided, also create a journal entry
      if (logNotes.trim()) {
        const { error: entryError } = await supabase.functions.invoke("encrypt-entry", {
          body: {
            title: `Practice: ${practiceToLog.title}`,
            content: logNotes,
            source_type: "sacred_practice",
            source_practice_id: practiceToLog.id,
          },
        });

        if (entryError) {
          console.error("Error creating journal entry:", entryError);
          // Don't fail the whole operation, just log
        }
      }

      toast.success("Practice completed! ✨");
      setPracticeToLog(null);
      setLogNotes("");
      fetchPractices();
    } catch (error) {
      console.error("Error logging practice:", error);
      toast.error("Failed to log practice");
    } finally {
      setIsLogging(false);
    }
  };

  const handleSuggestPractices = async () => {
    setLoadingAI(true);
    try {
      // Call the edge function to get AI-generated practice suggestions
      const { data, error } = await supabase.functions.invoke("suggest-practices", {
        body: { intention: intention || "general spiritual growth", goalType },
      });

      if (error) throw error;

      const suggested = data?.practices || [];
      
      if (suggested.length === 0) {
        toast.error("No practice suggestions generated. Please try again.");
        return;
      }
      
      toast.success(`Yggi suggests ${suggested.length} practices for your journey ✨`);
      
      // Add them to the list
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (let i = 0; i < suggested.length; i++) {
        const practice = suggested[i];
        await supabase.from("goal_practices").insert({
          goal_id: goalId,
          user_id: user.id,
          title: practice.title,
          description: practice.description,
          practice_type: practice.type,
          frequency: practice.frequency,
          order_index: practices.length + i,
        });
      }

      fetchPractices();
    } catch (error) {
      console.error("Error suggesting practices:", error);
      toast.error("Failed to suggest practices");
    } finally {
      setLoadingAI(false);
    }
  };

  const getStreak = (practiceId: string) => {
    const practiceLogs = logs[practiceId] || [];
    if (practiceLogs.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < practiceLogs.length; i++) {
      const logDate = new Date(practiceLogs[i].completed_at);
      logDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Sacred Practices</h4>
          <p className="text-sm text-muted-foreground">Daily actions to support your journey</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSuggestPractices} disabled={loadingAI}>
            {loadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="ml-2">Suggest</span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Practice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Practice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newPractice.title}
                    onChange={(e) => setNewPractice({ ...newPractice, title: e.target.value })}
                    placeholder="e.g., Morning Meditation"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (supports markdown)</label>
                  <Textarea
                    value={newPractice.description}
                    onChange={(e) => setNewPractice({ ...newPractice, description: e.target.value })}
                    placeholder="What does this practice involve?"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newPractice.practice_type} onValueChange={(value) => setNewPractice({ ...newPractice, practice_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meditation">Meditation</SelectItem>
                      <SelectItem value="journaling">Journaling</SelectItem>
                      <SelectItem value="ritual">Ritual</SelectItem>
                      <SelectItem value="movement">Movement</SelectItem>
                      <SelectItem value="breathwork">Breathwork</SelectItem>
                      <SelectItem value="study">Study</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Frequency</label>
                  <Select value={newPractice.frequency} onValueChange={(value) => setNewPractice({ ...newPractice, frequency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddPractice} className="w-full">Add Practice</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {practices.length === 0 ? (
        <Card className="w-full max-w-full overflow-hidden p-8 text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No practices yet. Add practices to support your journey.</p>
          <Button size="sm" variant="outline" onClick={handleSuggestPractices} disabled={loadingAI}>
            {loadingAI ? "Loading..." : "Get Suggestions"}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 w-full max-w-full">
          {practices.map((practice) => {
            const Icon = practiceTypeIcons[practice.practice_type] || Sparkles;
            const iconColor = practiceTypeColors[practice.practice_type] || "text-primary";
            const streak = getStreak(practice.id);
            const todayLog = logs[practice.id]?.find(log => {
              const logDate = new Date(log.completed_at);
              const today = new Date();
              return logDate.toDateString() === today.toDateString();
            });

            return (
              <Card key={practice.id} className="w-full max-w-full overflow-hidden p-4">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg border border-border/30 flex-shrink-0 ${iconColor}`} style={{ backgroundColor: '#F9F0E5' }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-medium break-words">{practice.title}</h5>
                        <Badge variant="outline" className="text-xs">{practice.frequency}</Badge>
                      </div>
                      {practice.description && (
                        <div className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden">
                          <ReactMarkdown>{practice.description}</ReactMarkdown>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {streak > 0 && (
                          <div className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-orange-500" />
                            <span>{streak} day streak</span>
                          </div>
                        )}
                        {todayLog && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Completed today</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setPracticeToDelete(practice)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={todayLog ? "outline" : "default"}
                      onClick={() => {
                        if (!todayLog) {
                          setPracticeToLog(practice);
                        }
                      }}
                      disabled={!!todayLog}
                    >
                      {todayLog ? <CheckCircle2 className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!practiceToDelete} onOpenChange={(open) => !open && setPracticeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Practice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{practiceToDelete?.title}"? Your streak history will be preserved but hidden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePractice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Practice Log Dialog */}
      <Dialog open={!!practiceToLog} onOpenChange={(open) => {
        if (!open) {
          setPracticeToLog(null);
          setLogNotes("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Practice</DialogTitle>
            <DialogDescription>
              Log your completion of "{practiceToLog?.title}". Add optional reflection notes to create a journal entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="log-notes">Reflection Notes (optional)</Label>
              <Textarea
                id="log-notes"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="How did this practice feel today? What did you notice?"
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">
                If you add notes, they'll be saved as a journal entry too.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setPracticeToLog(null);
              setLogNotes("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleLogPractice} disabled={isLogging}>
              {isLogging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete Practice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
