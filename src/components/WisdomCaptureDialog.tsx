import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

interface WisdomCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalTitle: string;
  onComplete: () => void;
}

export const WisdomCaptureDialog = ({ open, onOpenChange, goalId, goalTitle, onComplete }: WisdomCaptureDialogProps) => {
  const [wisdom, setWisdom] = useState({
    lesson: "",
    context: "",
    tags: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!wisdom.lesson.trim()) {
      toast.error("Please share at least one lesson from this journey");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tags = wisdom.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase.from("wisdom_cards").insert({
        user_id: user.id,
        source_goal_id: goalId,
        lesson: wisdom.lesson,
        context: wisdom.context || null,
        tags: tags,
      });

      if (error) throw error;

      toast.success("Wisdom captured 🌟");
      setWisdom({ lesson: "", context: "", tags: "" });
      onOpenChange(false);
      onComplete();
    } catch (error) {
      console.error("Error saving wisdom:", error);
      toast.error("Failed to save wisdom");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Capture Your Wisdom
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Before completing "{goalTitle}", take a moment to capture the wisdom you've gained on this journey.
            These lessons will be available to guide you in future journeys.
          </p>

          <div className="space-y-2">
            <Label htmlFor="lesson">What did you learn? *</Label>
            <Textarea
              id="lesson"
              value={wisdom.lesson}
              onChange={(e) => setWisdom({ ...wisdom, lesson: e.target.value })}
              placeholder="The most important insight or lesson from this journey..."
              className="min-h-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context (optional)</Label>
            <Textarea
              id="context"
              value={wisdom.context}
              onChange={(e) => setWisdom({ ...wisdom, context: e.target.value })}
              placeholder="What was happening in your life? What made this lesson significant?..."
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              value={wisdom.tags}
              onChange={(e) => setWisdom({ ...wisdom, tags: e.target.value })}
              placeholder="e.g., shadow work, self-love, boundaries (comma separated)"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Skip for Now
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Wisdom
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
