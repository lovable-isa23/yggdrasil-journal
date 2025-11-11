import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Loader2, Target, Plus, Calendar as CalendarIcon, TrendingUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  linked_patterns: any;
  progress_notes: any;
  created_at: string;
}

interface Pattern {
  id: string;
  title: string;
  pattern_type: string;
}

export const GoalTracker = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_date: undefined as Date | undefined,
    status: "active",
    linked_patterns: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsResult, patternsResult] = await Promise.all([
        supabase.from("goals").select("*").order("created_at", { ascending: false }),
        supabase.from("pattern_insights").select("id, title, pattern_type"),
      ]);

      if (goalsResult.error) throw goalsResult.error;
      if (patternsResult.error) throw patternsResult.error;

      setGoals(goalsResult.data || []);
      setPatterns(patternsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const goalData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        target_date: formData.target_date ? format(formData.target_date, "yyyy-MM-dd") : null,
        status: formData.status,
        linked_patterns: formData.linked_patterns,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from("goals")
          .update(goalData)
          .eq("id", editingGoal.id);
        if (error) throw error;
        toast.success("Goal updated");
      } else {
        const { error } = await supabase.from("goals").insert(goalData);
        if (error) throw error;
        toast.success("Goal created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Failed to save goal");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
      toast.success("Goal deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      target_date: undefined,
      status: "active",
      linked_patterns: [],
    });
    setEditingGoal(null);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || "",
      target_date: goal.target_date ? new Date(goal.target_date) : undefined,
      status: goal.status,
      linked_patterns: goal.linked_patterns || [],
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; icon: any }> = {
      active: { variant: "default", icon: TrendingUp },
      completed: { variant: "secondary", icon: CheckCircle2 },
      paused: { variant: "outline", icon: null },
    };
    const config = variants[status] || variants.active;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goal Tracker
            </CardTitle>
            <CardDescription>
              Track personal goals linked to your patterns
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
                <DialogDescription>
                  Set a goal and link it to patterns you've discovered
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Goal title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Describe your goal..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Target Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.target_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.target_date ? format(formData.target_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={formData.target_date} onSelect={(date) => setFormData({ ...formData, target_date: date })} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Linked Patterns</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {patterns.map((pattern) => (
                      <Badge
                        key={pattern.id}
                        variant={formData.linked_patterns.includes(pattern.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const newLinked = formData.linked_patterns.includes(pattern.id)
                            ? formData.linked_patterns.filter(id => id !== pattern.id)
                            : [...formData.linked_patterns, pattern.id];
                          setFormData({ ...formData, linked_patterns: newLinked });
                        }}
                      >
                        {pattern.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveGoal} disabled={!formData.title}>
                  {editingGoal ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No goals yet. Create your first goal to track your progress.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base mb-1">{goal.title}</h4>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(goal.status)}
                    </div>
                  </div>
                  {goal.target_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      Target: {format(new Date(goal.target_date), "MMM d, yyyy")}
                    </div>
                  )}
                  {goal.linked_patterns && Array.isArray(goal.linked_patterns) && goal.linked_patterns.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Linked Patterns:</p>
                      <div className="flex flex-wrap gap-1">
                        {goal.linked_patterns.map((patternId: string) => {
                          const pattern = patterns.find(p => p.id === patternId);
                          return pattern ? (
                            <Badge key={patternId} variant="secondary" className="text-xs">
                              {pattern.title}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(goal)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteGoal(goal.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
