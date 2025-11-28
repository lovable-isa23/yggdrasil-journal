import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ReflectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalTitle?: string;
  milestoneTitle?: string;
  reflectionType: "checkin" | "milestone" | "completion";
  onComplete: () => void;
}

export const ReflectionDialog = ({ 
  open, 
  onOpenChange, 
  goalId, 
  goalTitle,
  milestoneTitle,
  reflectionType, 
  onComplete 
}: ReflectionDialogProps) => {
  const [reflection, setReflection] = useState({
    what_worked: "",
    what_challenged: "",
    insights: "",
    next_steps: "",
  });
  const [saving, setSaving] = useState(false);

  const titles: Record<string, string> = {
    checkin: "Journey Check-In",
    milestone: "Milestone Reflection",
    completion: "Journey Completion Reflection",
  };

  const buildJournalContent = () => {
    const sections: string[] = [];
    
    if (reflection.what_worked) {
      sections.push(`## What Worked\n${reflection.what_worked}`);
    }
    if (reflection.what_challenged) {
      sections.push(`## What Challenged\n${reflection.what_challenged}`);
    }
    if (reflection.insights) {
      sections.push(`## Insights\n${reflection.insights}`);
    }
    if (reflection.next_steps && reflectionType !== "completion") {
      sections.push(`## Next Steps\n${reflection.next_steps}`);
    }
    
    return sections.join("\n\n");
  };

  const getJournalTitle = () => {
    switch (reflectionType) {
      case "checkin":
        return `Journey Check-In: ${goalTitle || "My Goal"}`;
      case "milestone":
        return `Milestone: ${milestoneTitle || "Achievement"}`;
      case "completion":
        return `Journey Completion: ${goalTitle || "My Goal"}`;
      default:
        return "Reflection";
    }
  };

  const handleSave = async () => {
    if (!reflection.what_worked && !reflection.what_challenged && !reflection.insights && !reflection.next_steps) {
      toast.error("Please fill in at least one field");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save to goal_reflections
      const { error } = await supabase.from("goal_reflections").insert({
        goal_id: goalId,
        user_id: user.id,
        reflection_type: reflectionType,
        ...reflection,
      });

      if (error) throw error;

      // Also create a journal entry
      const journalContent = buildJournalContent();
      if (journalContent.trim()) {
        const sourceType = reflectionType === "milestone" ? "milestone_reflection" : "goal_reflection";
        
        const { error: entryError } = await supabase.functions.invoke("encrypt-entry", {
          body: {
            title: getJournalTitle(),
            content: journalContent,
            source_type: sourceType,
            // Note: We don't have milestone_id here in this context, 
            // but it could be passed if needed
          },
        });

        if (entryError) {
          console.error("Error creating journal entry:", entryError);
          // Don't fail the whole operation
        }
      }

      toast.success("Reflection saved 🌟");
      setReflection({ what_worked: "", what_challenged: "", insights: "", next_steps: "" });
      onOpenChange(false);
      onComplete();
    } catch (error) {
      console.error("Error saving reflection:", error);
      toast.error("Failed to save reflection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[reflectionType]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="what_worked">What worked well? What brought you closer to your intention?</Label>
            <Textarea
              id="what_worked"
              value={reflection.what_worked}
              onChange={(e) => setReflection({ ...reflection, what_worked: e.target.value })}
              placeholder="Reflect on what practices, mindsets, or moments supported your growth..."
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="what_challenged">What challenged you? What resistance arose?</Label>
            <Textarea
              id="what_challenged"
              value={reflection.what_challenged}
              onChange={(e) => setReflection({ ...reflection, what_challenged: e.target.value })}
              placeholder="Acknowledge the difficulties without judgment..."
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insights">What insights or wisdom emerged?</Label>
            <Textarea
              id="insights"
              value={reflection.insights}
              onChange={(e) => setReflection({ ...reflection, insights: e.target.value })}
              placeholder="What did you learn about yourself? What patterns did you notice?..."
              className="min-h-24"
            />
          </div>

          {reflectionType !== "completion" && (
            <div className="space-y-2">
              <Label htmlFor="next_steps">What's next? How will you continue this journey?</Label>
              <Textarea
                id="next_steps"
                value={reflection.next_steps}
                onChange={(e) => setReflection({ ...reflection, next_steps: e.target.value })}
                placeholder="What practices or focuses will you carry forward?..."
                className="min-h-24"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Your reflection will also be saved as a journal entry.
          </p>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Reflection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
