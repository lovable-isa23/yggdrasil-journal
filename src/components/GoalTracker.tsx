import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Loader2, Target, Plus, Calendar as CalendarIcon, TrendingUp, CheckCircle2, Sparkles, Edit2, Trash2, ChevronDown, Heart, BookOpen, Lightbulb, Palette, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { GoalDialog } from "./GoalDialog";
import { MilestoneManager } from "./MilestoneManager";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { PracticeManager } from "./PracticeManager";
import { JourneyTimeline } from "./JourneyTimeline";
import { WisdomCaptureDialog } from "./WisdomCaptureDialog";
import { ReflectionDialog } from "./ReflectionDialog";
import { SpiritualGuidePanel } from "./SpiritualGuidePanel";
import { MoonPhaseIndicator } from "./MoonPhaseIndicator";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  linked_patterns: any;
  progress_notes: any;
  created_at: string;
  goal_type: string;
  intention: string | null;
  phase: string;
}

interface Pattern {
  id: string;
  title: string;
  pattern_type: string;
}

interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed_at: string | null;
  reflection: string | null;
  order_index: number;
}

export const GoalTracker = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [openGoals, setOpenGoals] = useState<Set<string>>(new Set());
  const [isWisdomDialogOpen, setIsWisdomDialogOpen] = useState(false);
  const [completingGoal, setCompletingGoal] = useState<Goal | null>(null);
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);
  const [reflectingGoalId, setReflectingGoalId] = useState<string | null>(null);
  const [timelineRefreshTrigger, setTimelineRefreshTrigger] = useState(0);

  const { data: goalsData, refetch } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (goalsData) {
      setGoals(goalsData);
    }
  }, [goalsData]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsResult, patternsResult, milestonesResult] = await Promise.all([
        supabase.from("goals").select("*").order("created_at", { ascending: false }),
        supabase.from("pattern_insights").select("id, title, pattern_type"),
        supabase.from("goal_milestones").select("*").order("order_index", { ascending: true }),
      ]);

      if (goalsResult.error) throw goalsResult.error;
      if (patternsResult.error) throw patternsResult.error;
      if (milestonesResult.error) throw milestonesResult.error;

      setGoals(goalsResult.data || []);
      setPatterns(patternsResult.data || []);
      
      const milestonesByGoal = (milestonesResult.data || []).reduce((acc, milestone) => {
        if (!acc[milestone.goal_id]) acc[milestone.goal_id] = [];
        acc[milestone.goal_id].push(milestone);
        return acc;
      }, {} as Record<string, Milestone[]>);
      setMilestones(milestonesByGoal);
      
      // Trigger timeline refresh
      setTimelineRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async (formData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const goalData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        target_date: formData.targetDate ? format(formData.targetDate, "yyyy-MM-dd") : null,
        status: formData.status,
        goal_type: formData.goalType,
        intention: formData.intention || null,
        moon_phase_set: formData.moonPhase || null,
        linked_patterns: formData.linkedPatterns.map((patternId: string) => {
          const pattern = patterns.find(p => p.id === patternId);
          return pattern ? { id: pattern.id, title: pattern.title, pattern_type: pattern.pattern_type } : null;
        }).filter(Boolean),
      };

      if (editingGoal) {
        const { error } = await supabase.from("goals").update(goalData).eq("id", editingGoal.id);
        if (error) throw error;
        toast.success("Journey updated ✨");
      } else {
        const { error } = await supabase.from("goals").insert(goalData);
        if (error) throw error;
        toast.success("Journey begun! 🌟");
      }

      setIsDialogOpen(false);
      setEditingGoal(null);
      fetchData();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Failed to save journey");
    }
  };

  const handleCompleteGoal = (goal: Goal) => {
    setCompletingGoal(goal);
    setIsWisdomDialogOpen(true);
  };

  const handleWisdomCaptured = async () => {
    if (!completingGoal) return;

    try {
      const { error } = await supabase
        .from("goals")
        .update({ status: "completed", phase: "complete" })
        .eq("id", completingGoal.id);

      if (error) throw error;

      toast.success("Journey completed! 🎉");
      setCompletingGoal(null);
      fetchData();
    } catch (error) {
      console.error("Error completing goal:", error);
      toast.error("Failed to complete journey");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
      toast.success("Journey archived");
      fetchData();
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete journey");
    }
  };

  const toggleGoal = (id: string) => {
    setOpenGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge variant="default" className="gap-1"><TrendingUp className="h-3 w-3" />In Journey</Badge>;
      case "completed": return <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400"><CheckCircle2 className="h-3 w-3" />Integrated</Badge>;
      case "paused": return <Badge variant="outline">Resting</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGoalTypeIcon = (goalType: string) => {
    const types: Record<string, { icon: any; color: string }> = {
      "shadow-work": { icon: Sparkles, color: "text-purple-500" },
      "spiritual-practice": { icon: Target, color: "text-blue-500" },
      "emotional-healing": { icon: Heart, color: "text-pink-500" },
      "manifestation": { icon: Lightbulb, color: "text-yellow-500" },
      "creative-expression": { icon: Palette, color: "text-orange-500" },
      "relationship-work": { icon: Users, color: "text-green-500" },
      "general": { icon: BookOpen, color: "text-gray-500" },
    };
    return types[goalType] || { icon: Target, color: "text-gray-500" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h3 className="text-2xl font-bold">Your Goals</h3>
        </div>
        <Button
          onClick={() => {
            setEditingGoal(null);
            setIsDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </Button>
      </div>

      <GoalDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSave={handleSaveGoal} editingGoal={editingGoal} patterns={patterns} />

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : goals.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No journeys yet</h3>
          <p className="text-muted-foreground mb-4">Begin your spiritual journey by setting your first sacred intention</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal) => {
            const { icon: GoalIcon, color } = getGoalTypeIcon(goal.goal_type);
            const goalMilestones = milestones[goal.id] || [];
            const isOpen = openGoals.has(goal.id);
            
            return (
              <Collapsible key={goal.id} open={isOpen} onOpenChange={() => toggleGoal(goal.id)}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CollapsibleTrigger className="w-full p-6 text-left">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={cn("p-2 rounded-lg", color)} style={{ backgroundColor: '#F9F0E5' }}><GoalIcon className="h-5 w-5" /></div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-semibold">{goal.title}</h3>
                            {getStatusBadge(goal.status)}
                          </div>
                          {goal.intention && <p className="text-sm text-muted-foreground italic">"{goal.intention.substring(0, 120)}{goal.intention.length > 120 ? "..." : ""}"</p>}
                          <div className="flex flex-wrap gap-4 text-sm">
                            {goal.target_date && <div className="flex items-center gap-2 text-muted-foreground"><CalendarIcon className="h-4 w-4" /><span>{format(new Date(goal.target_date), "MMM d, yyyy")}</span></div>}
                            {goalMilestones.length > 0 && <Badge variant="outline">{goalMilestones.filter(m => m.completed_at).length}/{goalMilestones.length} milestones</Badge>}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200 flex-shrink-0", isOpen && "rotate-180")} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-6 pb-6 space-y-6 border-t pt-6">
                      {goal.description && <div className="space-y-2"><p className="text-sm font-medium">Journey Path</p><p className="text-muted-foreground">{goal.description}</p></div>}
                      {goal.linked_patterns && goal.linked_patterns.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Connected Patterns</p>
                          <div className="flex flex-wrap gap-2">{goal.linked_patterns.map((pattern: any) => <Badge key={pattern.id} variant="secondary">{pattern.title}</Badge>)}</div>
                        </div>
                      )}
                      
                      <MilestoneManager goalId={goal.id} milestones={goalMilestones} onUpdate={fetchData} />
                      
                      <PracticeManager goalId={goal.id} goalType={goal.goal_type} intention={goal.intention || undefined} />
                      
                      <JourneyTimeline goalId={goal.id} refreshTrigger={timelineRefreshTrigger} />
                      
                      <div className="flex gap-2 pt-4 border-t">
                        <Button variant="outline" size="sm" onClick={() => { setReflectingGoalId(goal.id); setIsReflectionOpen(true); }}>
                          <Heart className="h-4 w-4 mr-2" />Reflect
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setEditingGoal(goal); setIsDialogOpen(true); }}>
                          <Edit2 className="h-4 w-4 mr-2" />Edit
                        </Button>
                        {goal.status === "active" && (
                          <Button variant="outline" size="sm" onClick={() => handleCompleteGoal(goal)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />Complete
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDeleteGoal(goal.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Archive
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {completingGoal && (
        <WisdomCaptureDialog
          open={isWisdomDialogOpen}
          onOpenChange={setIsWisdomDialogOpen}
          goalId={completingGoal.id}
          goalTitle={completingGoal.title}
          onComplete={handleWisdomCaptured}
        />
      )}

      {reflectingGoalId && (
        <ReflectionDialog
          open={isReflectionOpen}
          onOpenChange={setIsReflectionOpen}
          goalId={reflectingGoalId}
          reflectionType="checkin"
          onComplete={fetchData}
        />
      )}
    </div>
  );
};
