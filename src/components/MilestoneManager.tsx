import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "./ui/dialog";
import { 
  CalendarIcon, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2,
  Edit2 
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed_at: string | null;
  reflection: string | null;
  order_index: number;
}

interface MilestoneManagerProps {
  goalId: string;
  milestones: Milestone[];
  onUpdate: () => void;
}

export const MilestoneManager = ({ goalId, milestones, onUpdate }: MilestoneManagerProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetDate: undefined as Date | undefined,
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", targetDate: undefined });
    setEditingMilestone(null);
  };

  const openEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setFormData({
      title: milestone.title,
      description: milestone.description || "",
      targetDate: milestone.target_date ? new Date(milestone.target_date) : undefined,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const milestoneData = {
        goal_id: goalId,
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        target_date: formData.targetDate ? format(formData.targetDate, "yyyy-MM-dd") : null,
        order_index: editingMilestone ? editingMilestone.order_index : milestones.length,
      };

      if (editingMilestone) {
        const { error } = await supabase
          .from("goal_milestones")
          .update(milestoneData)
          .eq("id", editingMilestone.id);
        if (error) throw error;
        toast.success("Milestone updated");
      } else {
        const { error } = await supabase.from("goal_milestones").insert(milestoneData);
        if (error) throw error;
        toast.success("Milestone created");
      }

      setDialogOpen(false);
      resetForm();
      onUpdate();
    } catch (error) {
      console.error("Error saving milestone:", error);
      toast.error("Failed to save milestone");
    }
  };

  const handleToggleComplete = async (milestone: Milestone) => {
    try {
      const newCompletedAt = milestone.completed_at ? null : new Date().toISOString();
      
      const { error } = await supabase
        .from("goal_milestones")
        .update({ completed_at: newCompletedAt })
        .eq("id", milestone.id);

      if (error) throw error;
      toast.success(newCompletedAt ? "Milestone completed! 🎉" : "Milestone reopened");
      onUpdate();
    } catch (error) {
      console.error("Error toggling milestone:", error);
      toast.error("Failed to update milestone");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("goal_milestones").delete().eq("id", id);
      if (error) throw error;
      toast.success("Milestone deleted");
      onUpdate();
    } catch (error) {
      console.error("Error deleting milestone:", error);
      toast.error("Failed to delete milestone");
    }
  };

  const sortedMilestones = [...milestones].sort((a, b) => a.order_index - b.order_index);
  const completedCount = milestones.filter(m => m.completed_at).length;
  const progressPercent = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Milestones</h3>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {milestones.length} completed
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMilestone ? "Edit" : "Add"} Milestone</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="milestone-title">Title *</Label>
                <Input
                  id="milestone-title"
                  placeholder="e.g., Complete 7-day meditation streak"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-desc">Description</Label>
                <Textarea
                  id="milestone-desc"
                  placeholder="Add details about this milestone..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.targetDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.targetDate ? format(formData.targetDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.targetDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, targetDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.title}>
                Save Milestone
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress Bar */}
      {milestones.length > 0 && (
        <div className="space-y-2">
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {progressPercent.toFixed(0)}% Complete
          </p>
        </div>
      )}

      {/* Milestone List */}
      <div className="space-y-2">
        {sortedMilestones.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No milestones yet. Break your journey into smaller steps!
            </p>
          </Card>
        ) : (
          sortedMilestones.map((milestone) => (
            <Card
              key={milestone.id}
              className={cn(
                "p-4 transition-all",
                milestone.completed_at && "bg-accent/30"
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleComplete(milestone)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {milestone.completed_at ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "font-medium",
                    milestone.completed_at && "line-through text-muted-foreground"
                  )}>
                    {milestone.title}
                  </h4>
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {milestone.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {milestone.target_date && (
                      <Badge variant="outline" className="text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {format(new Date(milestone.target_date), "MMM d, yyyy")}
                      </Badge>
                    )}
                    {milestone.completed_at && (
                      <Badge variant="secondary" className="text-xs">
                        Completed {format(new Date(milestone.completed_at), "MMM d")}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(milestone)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(milestone.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
