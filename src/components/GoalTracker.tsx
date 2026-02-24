import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Loader2, Target, Plus, Calendar as CalendarIcon, TrendingUp, CheckCircle2, Sparkles, Edit2, Trash2, ChevronDown, Heart, BookOpen, Lightbulb, Palette, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { GoalDialog } from "./GoalDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { JourneyTimeline } from "./JourneyTimeline";
import { WisdomCaptureDialog } from "./WisdomCaptureDialog";
import { ReflectionDialog } from "./ReflectionDialog";
import { MicroWinInput } from "./MicroWinInput";
import { MicroWinList } from "./MicroWinList";
import { MicroWinCounter } from "./MicroWinCounter";
import { MicroWinHistory } from "./MicroWinHistory";
import { TreeOfLife } from "./TreeOfLife";

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

interface MicroWin {
  id: string;
  goal_id: string;
  text: string;
  source: string;
  created_at: string;
}

export const GoalTracker = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [microWins, setMicroWins] = useState<Record<string, MicroWin[]>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [openGoals, setOpenGoals] = useState<Set<string>>(new Set());
  const [isWisdomDialogOpen, setIsWisdomDialogOpen] = useState(false);
  const [completingGoal, setCompletingGoal] = useState<Goal | null>(null);
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);
  const [reflectingGoalId, setReflectingGoalId] = useState<string | null>(null);
  const [timelineRefreshTrigger, setTimelineRefreshTrigger] = useState(0);
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null);

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
      const [goalsResult, patternsResult, microWinsResult] = await Promise.all([
        supabase.from("goals").select("*").order("created_at", { ascending: false }),
        supabase.from("pattern_insights").select("id, title, pattern_type"),
        supabase.from("micro_wins").select("*").order("created_at", { ascending: false }),
      ]);

      if (goalsResult.error) throw goalsResult.error;
      if (patternsResult.error) throw patternsResult.error;
      if (microWinsResult.error) throw microWinsResult.error;

      setGoals(goalsResult.data || []);
      setPatterns(patternsResult.data || []);

      const winsByGoal = (microWinsResult.data || []).reduce((acc, win) => {
        if (!acc[win.goal_id]) acc[win.goal_id] = [];
        acc[win.goal_id].push(win);
        return acc;
      }, {} as Record<string, MicroWin[]>);
      setMicroWins(winsByGoal);
      
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
      const { error } = await supabase
        .from("goals")
        .update({ status: "archived", archived_reason: "User archived" })
        .eq("id", id);
      if (error) throw error;
      toast.success("Journey archived");
      fetchData();
    } catch (error) {
      console.error("Error archiving goal:", error);
      toast.error("Failed to archive journey");
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

  const [showArchived, setShowArchived] = useState(false);
  const [openMicroWins, setOpenMicroWins] = useState<Set<string>>(new Set());

  const activeGoals = goals.filter(g => g.status === "active" || g.status === "paused");
  const archivedGoals = goals.filter(g => g.status === "completed" || g.status === "archived");

  const toggleMicroWins = (id: string) => {
    setOpenMicroWins(prev => {
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
      case "archived": return <Badge variant="outline" className="gap-1 text-muted-foreground"><Trash2 className="h-3 w-3" />Archived</Badge>;
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
      ) : activeGoals.length === 0 && archivedGoals.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No journeys yet</h3>
          <p className="text-muted-foreground mb-4">Begin your spiritual journey by setting your first sacred intention</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          <div className="grid gap-4">
            {activeGoals.map((goal) => {
              const { icon: GoalIcon, color } = getGoalTypeIcon(goal.goal_type);
              const goalWins = microWins[goal.id] || [];
              const isOpen = openGoals.has(goal.id);
              const isMicroWinsOpen = openMicroWins.has(goal.id);
              
              const sevenDaysAgo = subDays(new Date(), 7);
              const isQuietGoal = goalWins.length === 0 || 
                !goalWins.some(w => new Date(w.created_at) > sevenDaysAgo);
              
              return (
                <Collapsible key={goal.id} open={isOpen} onOpenChange={() => toggleGoal(goal.id)} className="w-full max-w-full">
                  <Card className="w-full max-w-full overflow-hidden hover:shadow-lg transition-shadow">
                    <CollapsibleTrigger className="w-full p-4 sm:p-6 text-left">
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className={cn("p-2 rounded-lg border border-border/30 flex-shrink-0", color)} style={{ backgroundColor: '#F9F0E5' }}><GoalIcon className="h-5 w-5" /></div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg sm:text-xl font-semibold break-words">{goal.title}</h3>
                              {getStatusBadge(goal.status)}
                              <MicroWinCounter wins={goalWins} />
                            </div>
                            {goal.intention && <p className="text-sm text-muted-foreground italic break-words">"{goal.intention.substring(0, 120)}{goal.intention.length > 120 ? "..." : ""}"</p>}
                            <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
                              {goal.target_date && <div className="flex items-center gap-2 text-muted-foreground"><CalendarIcon className="h-4 w-4" /><span>{format(new Date(goal.target_date), "MMM d, yyyy")}</span></div>}
                            </div>
                          </div>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200 flex-shrink-0", isOpen && "rotate-180")} />
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 sm:px-6 pb-6 space-y-6 border-t pt-6 w-full max-w-full overflow-hidden">
                        <TreeOfLife 
                          goalId={goal.id} 
                          goalTitle={goal.title}
                          isOpen={goal.status === "active"}
                        />

                        {/* Collapsible Micro-Wins Section */}
                        <Collapsible open={isMicroWinsOpen} onOpenChange={() => toggleMicroWins(goal.id)}>
                          <div className="bg-accent/20 rounded-lg p-4">
                            <CollapsibleTrigger className="w-full flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Micro-Wins</span>
                                {goalWins.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{goalWins.length}</Badge>
                                )}
                              </div>
                              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isMicroWinsOpen && "rotate-180")} />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3 space-y-3">
                              <MicroWinInput
                                goalId={goal.id}
                                goalTitle={goal.title}
                                goalDescription={goal.description}
                                recentWins={goalWins.map(w => w.text)}
                                isQuietGoal={isQuietGoal && goal.status === "active"}
                                onWinAdded={fetchData}
                              />
                              <MicroWinList
                                wins={goalWins}
                                totalCount={goalWins.length}
                                onViewAll={() => setHistoryGoalId(goal.id)}
                              />
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        {goal.description && <div className="space-y-2"><p className="text-sm font-medium">Journey Path</p><p className="text-muted-foreground break-words">{goal.description}</p></div>}
                        {goal.linked_patterns && goal.linked_patterns.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Connected Patterns</p>
                            <div className="flex flex-wrap gap-2">{goal.linked_patterns.map((pattern: any) => <Badge key={pattern.id} variant="secondary">{pattern.title}</Badge>)}</div>
                          </div>
                        )}
                        
                        <JourneyTimeline goalId={goal.id} refreshTrigger={timelineRefreshTrigger} />
                        
                        <div className="flex flex-wrap gap-2 pt-4 border-t">
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

          {/* Archived/Completed Goals Section */}
          {archivedGoals.length > 0 && (
            <Collapsible open={showArchived} onOpenChange={setShowArchived}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showArchived && "rotate-180")} />
                <span className="text-sm font-medium">Completed & Archived ({archivedGoals.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-3 mt-2">
                  {archivedGoals.map((goal) => {
                    const { icon: GoalIcon, color } = getGoalTypeIcon(goal.goal_type);
                    const isOpen = openGoals.has(goal.id);
                    
                    return (
                      <Collapsible key={goal.id} open={isOpen} onOpenChange={() => toggleGoal(goal.id)} className="w-full">
                        <Card className="w-full opacity-70 hover:opacity-100 transition-opacity">
                          <CollapsibleTrigger className="w-full p-4 text-left">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <GoalIcon className={cn("h-4 w-4 flex-shrink-0", color)} />
                                <h3 className="font-medium truncate">{goal.title}</h3>
                                {getStatusBadge(goal.status)}
                              </div>
                              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0", isOpen && "rotate-180")} />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-3 border-t pt-3">
                              {goal.intention && <p className="text-sm text-muted-foreground italic">"{goal.intention}"</p>}
                              {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
                              {goal.target_date && <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarIcon className="h-3 w-3" />{format(new Date(goal.target_date), "MMM d, yyyy")}</div>}
                              <JourneyTimeline goalId={goal.id} refreshTrigger={timelineRefreshTrigger} />
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
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
          goalTitle={goals.find(g => g.id === reflectingGoalId)?.title}
          reflectionType="checkin"
          onComplete={fetchData}
        />
      )}

      {historyGoalId && (
        <MicroWinHistory
          open={!!historyGoalId}
          onOpenChange={(open) => !open && setHistoryGoalId(null)}
          wins={microWins[historyGoalId] || []}
          goalTitle={goals.find(g => g.id === historyGoalId)?.title || ""}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};
