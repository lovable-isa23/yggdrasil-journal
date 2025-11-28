import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Badge } from "./ui/badge";
import { CalendarIcon, Sparkles, Target, BookOpen, Heart, Lightbulb, Palette, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getCurrentMoonPhase } from "@/lib/moon-phases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Pattern {
  id: string;
  title: string;
  pattern_type: string;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  linked_patterns: any;
  goal_type: string;
  intention: string | null;
  phase: string;
}

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => Promise<void>;
  editingGoal: Goal | null;
  patterns: Pattern[];
}

const GOAL_TYPES = [
  { value: "shadow-work", label: "Shadow Work", icon: Sparkles, color: "text-purple-500" },
  { value: "spiritual-practice", label: "Spiritual Practice", icon: Target, color: "text-blue-500" },
  { value: "emotional-healing", label: "Emotional Healing", icon: Heart, color: "text-pink-500" },
  { value: "manifestation", label: "Manifestation", icon: Lightbulb, color: "text-yellow-500" },
  { value: "creative-expression", label: "Creative Expression", icon: Palette, color: "text-orange-500" },
  { value: "relationship-work", label: "Relationship Work", icon: Users, color: "text-green-500" },
  { value: "general", label: "General", icon: BookOpen, color: "text-gray-500" },
];

export const GoalDialog = ({ open, onOpenChange, onSave, editingGoal, patterns }: GoalDialogProps) => {
  const [step, setStep] = useState(1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  const [formData, setFormData] = useState({
    intention: "",
    goalType: "general",
    title: "",
    description: "",
    targetDate: undefined as Date | undefined,
    linkedPatterns: [] as string[],
    status: "active",
  });

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        intention: editingGoal.intention || "",
        goalType: editingGoal.goal_type || "general",
        title: editingGoal.title,
        description: editingGoal.description || "",
        targetDate: editingGoal.target_date ? new Date(editingGoal.target_date) : undefined,
        linkedPatterns: editingGoal.linked_patterns?.map((p: any) => p.id) || [],
        status: editingGoal.status,
      });
      setAiSuggested(false);
      setStep(1);
    } else {
      setFormData({
        intention: "",
        goalType: "general",
        title: "",
        description: "",
        targetDate: undefined,
        linkedPatterns: [],
        status: "active",
      });
      setAiSuggested(false);
      setStep(1);
    }
  }, [editingGoal, open]);

  const extractGoalDetails = async () => {
    if (!formData.intention || formData.intention.trim().length < 10) {
      return false;
    }

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-goal-details', {
        body: { 
          intention: formData.intention,
          goalType: formData.goalType
        }
      });

      if (error) throw error;

      if (data?.title && data?.description) {
        setFormData(prev => ({
          ...prev,
          title: data.title,
          description: data.description
        }));
        setAiSuggested(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error extracting goal details:", error);
      toast.error("Couldn't generate suggestions, but you can fill in the details manually");
      return false;
    } finally {
      setIsExtracting(false);
    }
  };

  const handleNext = async () => {
    if (step === 1 && !editingGoal) {
      // Moving from Step 1 to Step 2 - extract goal details if we have intention
      if (formData.intention && formData.intention.trim().length >= 10) {
        await extractGoalDetails();
      }
    }
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    const currentMoonPhase = getCurrentMoonPhase();
    await onSave({
      ...formData,
      moonPhase: currentMoonPhase.phase,
    });
    setStep(1);
  };

  const togglePattern = (patternId: string) => {
    setFormData(prev => ({
      ...prev,
      linkedPatterns: prev.linkedPatterns.includes(patternId)
        ? prev.linkedPatterns.filter(id => id !== patternId)
        : [...prev.linkedPatterns, patternId]
    }));
  };

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({ ...prev, title: value }));
    if (aiSuggested) setAiSuggested(false);
  };

  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
    if (aiSuggested) setAiSuggested(false);
  };

  const selectedGoalType = GOAL_TYPES.find(t => t.value === formData.goalType);
  const GoalIcon = selectedGoalType?.icon || BookOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <GoalIcon className={cn("h-6 w-6", selectedGoalType?.color)} />
            {editingGoal ? "Edit Sacred Journey" : "Begin Sacred Journey"}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? "Set Your Intention" : step === 2 ? "Define Your Path" : "Connect & Commit"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Intention & Type */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in-50">
              <div className="space-y-2">
                <Label htmlFor="intention" className="text-lg">What calls to you? ✨</Label>
                <Textarea
                  id="intention"
                  placeholder="Describe the deeper purpose behind this journey... What transformation are you seeking? What truth do you want to explore?"
                  value={formData.intention}
                  onChange={(e) => setFormData(prev => ({ ...prev, intention: e.target.value }))}
                  className="min-h-32 text-base"
                />
                <p className="text-sm text-muted-foreground">This is your sacred why - the soul's calling behind this goal.</p>
              </div>

              <div className="space-y-3">
                <Label className="text-lg">Journey Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {GOAL_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.goalType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, goalType: type.value }))}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                          isSelected 
                            ? "border-primary bg-primary/5 shadow-md" 
                            : "border-border hover:border-primary/50 hover:bg-accent"
                        )}
                      >
                        <Icon className={cn("h-5 w-5 flex-shrink-0", isSelected ? "text-primary" : type.color)} />
                        <span className={cn("font-medium", isSelected && "text-primary")}>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Define Your Path */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in-50">
              {aiSuggested && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 rounded-lg p-3 border border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Yggi crafted these suggestions from your intention. Feel free to refine them.</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="title">Journey Title *</Label>
                  {aiSuggested && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI-suggested
                    </Badge>
                  )}
                </div>
                <Input
                  id="title"
                  placeholder="Give your journey a name..."
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="description">Path Description</Label>
                  {aiSuggested && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI-suggested
                    </Badge>
                  )}
                </div>
                <Textarea
                  id="description"
                  placeholder="How will this journey unfold? What steps will you take?"
                  value={formData.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="min-h-32 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label>Target Completion</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12",
                        !formData.targetDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.targetDate ? format(formData.targetDate, "PPP") : "Choose a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.targetDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, targetDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground">Optional: When do you envision completing this journey?</p>
              </div>
            </div>
          )}

          {/* Step 3: Connect & Commit */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in-50">
              {patterns.length > 0 && (
                <div className="space-y-3">
                  <Label>Connect to Pattern Insights (Optional)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Link this journey to patterns discovered in your journal entries
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {patterns.map((pattern) => {
                      const isLinked = formData.linkedPatterns.includes(pattern.id);
                      return (
                        <button
                          key={pattern.id}
                          type="button"
                          onClick={() => togglePattern(pattern.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                            isLinked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          )}
                        >
                          <div>
                            <p className="font-medium">{pattern.title}</p>
                            <p className="text-sm text-muted-foreground capitalize">{pattern.pattern_type}</p>
                          </div>
                          {isLinked && (
                            <Badge variant="secondary" className="ml-2">Linked</Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {editingGoal && (
                <div className="space-y-2">
                  <Label>Journey Phase</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active - In Journey</SelectItem>
                      <SelectItem value="completed">Completed - Integrated</SelectItem>
                      <SelectItem value="paused">Paused - Resting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="rounded-lg bg-accent/50 p-4 border border-border">
                <p className="text-sm font-medium mb-2">✨ Journey Summary</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Type:</span> {selectedGoalType?.label}</p>
                  {formData.intention && <p><span className="font-medium text-foreground">Intention:</span> {formData.intention.substring(0, 80)}{formData.intention.length > 80 ? "..." : ""}</p>}
                  {formData.title && <p><span className="font-medium text-foreground">Title:</span> {formData.title}</p>}
                  {formData.targetDate && <p><span className="font-medium text-foreground">Target:</span> {format(formData.targetDate, "PPP")}</p>}
                  <p><span className="font-medium text-foreground">Linked Patterns:</span> {formData.linkedPatterns.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? () => onOpenChange(false) : handleBack}
            disabled={isExtracting}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          
          <div className="flex gap-2">
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={(step === 1 && !formData.intention && !formData.goalType) || isExtracting}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yggi is crafting your path...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!formData.title}
                className="min-w-32"
              >
                {editingGoal ? "Update Journey" : "Begin Journey"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
