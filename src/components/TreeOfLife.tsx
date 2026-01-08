import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { TreeBranchItem } from "./TreeBranchItem";
import {
  TreeDeciduous,
  Sprout,
  GitBranch,
  Apple,
  Plus,
  Sparkles,
  RefreshCw,
  Calendar,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface GoalTree {
  id: string;
  goal_id: string;
  root_text: string | null;
  trunk_title: string | null;
  trunk_target_date: string | null;
  fruit_text: string | null;
  fruit_achieved: boolean;
}

interface Branch {
  id: string;
  goal_id: string;
  week_start_date: string;
  title: string;
  due_date: string | null;
  status: "not_started" | "in_progress" | "done";
  created_at: string;
}

interface TreeOfLifeProps {
  goalId: string;
  goalTitle: string;
  isOpen?: boolean;
}

export const TreeOfLife = ({ goalId, goalTitle, isOpen = false }: TreeOfLifeProps) => {
  const [tree, setTree] = useState<GoalTree | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(isOpen);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isTrunkDateOpen, setIsTrunkDateOpen] = useState(false);

  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [rootText, setRootText] = useState("");
  const [trunkTitle, setTrunkTitle] = useState("");
  const [fruitText, setFruitText] = useState("");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  useEffect(() => {
    fetchTreeData();
  }, [goalId]);

  const fetchTreeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch tree
      const { data: treeData, error: treeError } = await supabase
        .from("goal_trees")
        .select("*")
        .eq("goal_id", goalId)
        .maybeSingle();

      if (treeError) throw treeError;

      if (treeData) {
        setTree(treeData);
        setRootText(treeData.root_text || "");
        setTrunkTitle(treeData.trunk_title || "");
        setFruitText(treeData.fruit_text || "");
      }

      // Fetch current week's branches
      const { data: branchData, error: branchError } = await supabase
        .from("goal_branches")
        .select("*")
        .eq("goal_id", goalId)
        .eq("week_start_date", weekStartStr)
        .order("created_at", { ascending: true });

      if (branchError) throw branchError;
      if (branchError) throw branchError;
      // Cast status to expected union type
      const typedBranches = (branchData || []).map(b => ({
        ...b,
        status: b.status as "not_started" | "in_progress" | "done"
      }));
      setBranches(typedBranches);
    } catch (error) {
      console.error("Error fetching tree data:", error);
    } finally {
      setLoading(false);
    }
  };

  const ensureTree = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    if (tree) return tree.id;

    const { data, error } = await supabase
      .from("goal_trees")
      .insert({ goal_id: goalId, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setTree(data);
    return data.id;
  };

  const saveField = async (field: string, value: string | boolean | null) => {
    try {
      await ensureTree();

      const { error } = await supabase
        .from("goal_trees")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("goal_id", goalId);

      if (error) throw error;
      fetchTreeData();
    } catch (error) {
      console.error("Error saving field:", error);
      toast.error("Failed to save");
    }
    setEditingField(null);
  };

  const addBranch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (branches.length >= 5) {
        toast.error("Maximum 5 actions per week");
        return;
      }

      const { error } = await supabase.from("goal_branches").insert({
        goal_id: goalId,
        user_id: user.id,
        week_start_date: weekStartStr,
        title: "New action",
        status: "not_started",
      });

      if (error) throw error;
      fetchTreeData();
    } catch (error) {
      console.error("Error adding branch:", error);
      toast.error("Failed to add action");
    }
  };

  const updateBranch = async (id: string, updates: Partial<Branch>) => {
    try {
      const { error } = await supabase
        .from("goal_branches")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      fetchTreeData();
    } catch (error) {
      console.error("Error updating branch:", error);
      toast.error("Failed to update");
    }
  };

  const deleteBranch = async (id: string) => {
    try {
      const { error } = await supabase.from("goal_branches").delete().eq("id", id);
      if (error) throw error;
      fetchTreeData();
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error("Failed to delete");
    }
  };

  const generateBranches = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-branches", {
        body: {
          goalTitle,
          rootText: tree?.root_text || "",
          trunkTitle: tree?.trunk_title || "",
          recentBranches: branches.map((b) => b.title),
        },
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert generated branches
      const newBranches = data.branches.slice(0, 5 - branches.length).map((b: any) => ({
        goal_id: goalId,
        user_id: user.id,
        week_start_date: weekStartStr,
        title: b.title,
        status: "not_started",
      }));

      if (newBranches.length > 0) {
        const { error: insertError } = await supabase.from("goal_branches").insert(newBranches);
        if (insertError) throw insertError;
      }

      fetchTreeData();
      toast.success("Actions generated!");
    } catch (error) {
      console.error("Error generating branches:", error);
      toast.error("Failed to generate actions");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetWeek = async () => {
    setIsResetting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate completion rate
      const doneCount = branches.filter((b) => b.status === "done").length;
      const completionRate = branches.length > 0 ? Math.round((doneCount / branches.length) * 100) : 0;

      // Archive current branches
      if (branches.length > 0) {
        const { error: historyError } = await supabase.from("goal_branch_history").insert([{
          goal_id: goalId,
          user_id: user.id,
          week_start_date: weekStartStr,
          branches: JSON.parse(JSON.stringify(branches)),
          completion_rate: completionRate,
        }]);
        if (historyError) throw historyError;

        // Delete current branches
        const { error: deleteError } = await supabase
          .from("goal_branches")
          .delete()
          .eq("goal_id", goalId)
          .eq("week_start_date", weekStartStr);
        if (deleteError) throw deleteError;
      }

      // Create 2 fresh empty slots
      const newBranches = [
        { goal_id: goalId, user_id: user.id, week_start_date: weekStartStr, title: "Action 1", status: "not_started" },
        { goal_id: goalId, user_id: user.id, week_start_date: weekStartStr, title: "Action 2", status: "not_started" },
      ];
      const { error: insertError } = await supabase.from("goal_branches").insert(newBranches);
      if (insertError) throw insertError;

      fetchTreeData();
      toast.success(`Week archived! ${completionRate}% completion. Fresh start ready.`);
    } catch (error) {
      console.error("Error resetting week:", error);
      toast.error("Failed to reset week");
    } finally {
      setIsResetting(false);
    }
  };

  const doneCount = branches.filter((b) => b.status === "done").length;
  const branchProgress = branches.length > 0 ? Math.round((doneCount / branches.length) * 100) : 0;
  const daysToMilestone = tree?.trunk_target_date
    ? differenceInDays(new Date(tree.trunk_target_date), new Date())
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-lg border bg-gradient-to-br from-emerald-50/50 to-amber-50/50 dark:from-emerald-950/20 dark:to-amber-950/20">
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <TreeDeciduous className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">Yggdrasil Tree</span>
            {branches.length > 0 && (
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                🌿 {doneCount}/{branches.length} done
              </Badge>
            )}
            {daysToMilestone !== null && daysToMilestone > 0 && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                📅 {daysToMilestone}d to milestone
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform flex-shrink-0", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* Root - Why this matters */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <Sprout className="h-3 w-3 flex-shrink-0" />
                <span>Root · Why this matters</span>
                <span className="ml-auto whitespace-nowrap">{rootText.length}/140</span>
              </div>
              {editingField === "root" ? (
                <Input
                  value={rootText}
                  onChange={(e) => setRootText(e.target.value.slice(0, 140))}
                  onBlur={() => saveField("root_text", rootText || null)}
                  onKeyDown={(e) => e.key === "Enter" && saveField("root_text", rootText || null)}
                  placeholder="Why does this goal matter to you?"
                  autoFocus
                  className="text-sm"
                />
              ) : (
                <div
                  onClick={() => setEditingField("root")}
                  className={cn(
                    "text-sm p-2 rounded-md border border-dashed cursor-pointer hover:bg-accent/50 transition-colors min-h-[36px]",
                    !rootText && "text-muted-foreground italic"
                  )}
                >
                  {rootText || "Click to add why this matters..."}
                </div>
              )}
            </div>

            {/* Trunk - Next milestone */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <GitBranch className="h-3 w-3 rotate-90 flex-shrink-0" />
                <span>Trunk · Next milestone (30 days)</span>
                <span className="ml-auto whitespace-nowrap">{trunkTitle.length}/80</span>
              </div>
              <div className="flex gap-2">
                {editingField === "trunk" ? (
                  <Input
                    value={trunkTitle}
                    onChange={(e) => setTrunkTitle(e.target.value.slice(0, 80))}
                    onBlur={() => saveField("trunk_title", trunkTitle || null)}
                    onKeyDown={(e) => e.key === "Enter" && saveField("trunk_title", trunkTitle || null)}
                    placeholder="What's your next milestone?"
                    autoFocus
                    className="text-sm flex-1"
                  />
                ) : (
                  <div
                    onClick={() => setEditingField("trunk")}
                    className={cn(
                      "text-sm p-2 rounded-md border border-dashed cursor-pointer hover:bg-accent/50 transition-colors min-h-[36px] flex-1",
                      !trunkTitle && "text-muted-foreground italic"
                    )}
                  >
                    {trunkTitle || "Click to set your milestone..."}
                  </div>
                )}
                <Popover open={isTrunkDateOpen} onOpenChange={setIsTrunkDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {tree?.trunk_target_date
                        ? format(new Date(tree.trunk_target_date), "MMM d")
                        : "Target"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={tree?.trunk_target_date ? new Date(tree.trunk_target_date) : undefined}
                      onSelect={(date) => {
                        saveField("trunk_target_date", date ? format(date, "yyyy-MM-dd") : null);
                        setIsTrunkDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Branches - This week's actions */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GitBranch className="h-3 w-3 flex-shrink-0" />
                  <span>Branches · This week's actions</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addBranch}
                    disabled={branches.length >= 5}
                    className="h-6 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetWeek}
                    disabled={isResetting}
                    className="h-6 text-xs"
                  >
                    {isResetting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    New Week
                  </Button>
                </div>
              </div>

              {branches.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <p>No actions yet this week</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateBranches}
                    disabled={isGenerating}
                    className="mt-2 gap-1"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Generate actions
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {branches.map((branch) => (
                    <TreeBranchItem
                      key={branch.id}
                      branch={branch}
                      onUpdate={updateBranch}
                      onDelete={deleteBranch}
                    />
                  ))}
                  {branches.length > 0 && branches.length < 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={generateBranches}
                      disabled={isGenerating}
                      className="w-full h-7 text-xs gap-1"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Generate more actions
                    </Button>
                  )}
                </div>
              )}

              {branches.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${branchProgress}%` }}
                    />
                  </div>
                  <span>{branchProgress}% done</span>
                </div>
              )}
            </div>

            {/* Fruit - Proof of progress */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Apple className="h-3 w-3" />
                <span>Fruit · Proof of progress</span>
                <span className="ml-auto">{fruitText.length}/120</span>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={tree?.fruit_achieved || false}
                  onCheckedChange={(checked) => saveField("fruit_achieved", checked === true)}
                  className="mt-2"
                />
                {editingField === "fruit" ? (
                  <Input
                    value={fruitText}
                    onChange={(e) => setFruitText(e.target.value.slice(0, 120))}
                    onBlur={() => saveField("fruit_text", fruitText || null)}
                    onKeyDown={(e) => e.key === "Enter" && saveField("fruit_text", fruitText || null)}
                    placeholder="How will you know you've made progress?"
                    autoFocus
                    className="text-sm flex-1"
                  />
                ) : (
                  <div
                    onClick={() => setEditingField("fruit")}
                    className={cn(
                      "text-sm p-2 rounded-md border border-dashed cursor-pointer hover:bg-accent/50 transition-colors min-h-[36px] flex-1",
                      !fruitText && "text-muted-foreground italic",
                      tree?.fruit_achieved && "line-through text-muted-foreground"
                    )}
                  >
                    {fruitText || "Click to define measurable outcome..."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
