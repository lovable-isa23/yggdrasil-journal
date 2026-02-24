import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Sparkles, Heart, Lightbulb, Loader2, Target, Plus, BookOpen, Palette, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

type GuidanceType = "weekly_wisdom" | "practice_suggestion" | "pattern_insight";

interface GoalSuggestion {
  title: string;
  description: string;
  goal_type: string;
  linked_pattern_ids: string[];
}

export const SpiritualGuidePanel = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGuidance, setCurrentGuidance] = useState<string | null>(null);
  const [currentGuidanceDate, setCurrentGuidanceDate] = useState<string | null>(null);
  const [isSuggestingGoals, setIsSuggestingGoals] = useState(false);
  const [goalSuggestions, setGoalSuggestions] = useState<GoalSuggestion[]>([]);
  const [showGoalsDialog, setShowGoalsDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: recentGuidance } = useQuery({
    queryKey: ["spiritual-guidance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spiritual_guidance")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const generateGuidance = async (type: GuidanceType) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("spiritual-guide", {
        body: { guidanceType: type },
      });

      if (error) throw error;

      setCurrentGuidance(data.guidance);
      setCurrentGuidanceDate(new Date().toISOString());
      toast.success("Guidance from Yggi received ✨");
    } catch (error) {
      console.error("Error generating guidance:", error);
      toast.error("Couldn't reach Yggi right now. Try again soon.");
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestGoals = async () => {
    setIsSuggestingGoals(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-goals");

      if (error) throw error;

      if (data?.goals && data.goals.length > 0) {
        setGoalSuggestions(data.goals);
        setShowGoalsDialog(true);
        toast.success(`Yggi suggests ${data.goals.length} goals based on your patterns ✨`);
      } else if (data?.error) {
        toast.error(data.message || "No patterns found to suggest goals");
      }
    } catch (error) {
      console.error("Error suggesting goals:", error);
      toast.error("Couldn't generate goal suggestions. Try again soon.");
    } finally {
      setIsSuggestingGoals(false);
    }
  };

  const saveGoal = async (goal: GoalSuggestion) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch full pattern objects from the database
      let enrichedPatterns = [];
      if (goal.linked_pattern_ids && goal.linked_pattern_ids.length > 0) {
        const { data: patterns, error: patternsError } = await supabase
          .from("pattern_insights")
          .select("id, title, pattern_type")
          .in("id", goal.linked_pattern_ids);

        if (patternsError) {
          console.error("Error fetching patterns:", patternsError);
        } else if (patterns) {
          enrichedPatterns = patterns.map(p => ({
            id: p.id,
            title: p.title,
            pattern_type: p.pattern_type,
          }));
        }
      }

      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title: goal.title,
        description: goal.description,
        goal_type: goal.goal_type,
        linked_patterns: enrichedPatterns,
        status: "active",
        phase: "initiation",
        intention: `Goal suggested by Yggi based on your journal patterns`,
      });

      if (error) throw error;

      toast.success(`"${goal.title}" added to your goals! 🎯`);
      
      // Invalidate goals query to trigger refresh
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      
      // Remove the saved goal from suggestions
      setGoalSuggestions(prev => prev.filter(g => g.title !== goal.title));
      
      // Close dialog if no more suggestions
      if (goalSuggestions.length === 1) {
        setShowGoalsDialog(false);
      }
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Failed to save goal. Please try again.");
    }
  };

  const displayGuidance = currentGuidance || recentGuidance?.content;

  return (
    <>
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Guidance from Yggi</h3>
      </div>

      {displayGuidance ? (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <ReactMarkdown>{displayGuidance}</ReactMarkdown>
          </div>
          <div className="text-xs text-muted-foreground">
            {(currentGuidanceDate || recentGuidance?.created_at) && 
              `Received ${new Date(currentGuidanceDate || recentGuidance.created_at).toLocaleDateString()}`
            }
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">
          Connect with Yggi, your spiritual guide, for personalized wisdom and practices tailored to your journey.
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateGuidance("weekly_wisdom")}
          disabled={isGenerating || isSuggestingGoals}
          className="flex-1"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Heart className="h-4 w-4 mr-2" />
          )}
          Weekly Wisdom
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateGuidance("practice_suggestion")}
          disabled={isGenerating || isSuggestingGoals}
          className="flex-1"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Practice
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateGuidance("pattern_insight")}
          disabled={isGenerating || isSuggestingGoals}
          className="flex-1"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          Insight
        </Button>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button
          size="sm"
          variant="default"
          onClick={suggestGoals}
          disabled={isGenerating || isSuggestingGoals}
          className="w-full"
        >
          {isSuggestingGoals ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Target className="h-4 w-4 mr-2" />
          )}
          Suggest Goals from Patterns
        </Button>
      </div>
    </Card>

    <Dialog open={showGoalsDialog} onOpenChange={setShowGoalsDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Goal Suggestions from Yggi
          </DialogTitle>
          <DialogDescription>
            Based on your journal patterns, here are some goals to consider for your journey.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
             {goalSuggestions.map((goal, index) => {
              const goalIcons: Record<string, { icon: any; color: string }> = {
                "shadow-work": { icon: Sparkles, color: "text-purple-500" },
                "spiritual-practice": { icon: Target, color: "text-blue-500" },
                "emotional-healing": { icon: Heart, color: "text-pink-500" },
                "manifestation": { icon: Lightbulb, color: "text-yellow-500" },
                "creative-expression": { icon: Palette, color: "text-orange-500" },
                "relationship-work": { icon: Users, color: "text-green-500" },
                "general": { icon: BookOpen, color: "text-muted-foreground" },
              };
              const { icon: GoalIcon, color } = goalIcons[goal.goal_type] || { icon: Target, color: "text-primary" };
              return (
              <Card key={index} className="p-4 border-primary/20">
                <div className="flex items-start gap-3">
                  <GoalIcon className={`h-5 w-5 mt-1 flex-shrink-0 ${color}`} />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-lg">{goal.title}</h4>
                      <Badge variant="secondary" className="capitalize">
                        {goal.goal_type.replace("-", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                    {goal.linked_pattern_ids.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Linked to {goal.linked_pattern_ids.length} pattern{goal.linked_pattern_ids.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    <Button
                      size="sm"
                      onClick={() => saveGoal(goal)}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add to My Goals
                    </Button>
                  </div>
                </div>
              </Card>
              );
            })}
            {goalSuggestions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                All suggestions have been saved! ✨
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
};
