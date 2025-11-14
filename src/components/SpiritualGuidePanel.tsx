import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Sparkles, Heart, Lightbulb, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

type GuidanceType = "weekly_wisdom" | "practice_suggestion" | "pattern_insight";

export const SpiritualGuidePanel = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGuidance, setCurrentGuidance] = useState<string | null>(null);

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
      toast.success("Guidance from Yggi received ✨");
    } catch (error) {
      console.error("Error generating guidance:", error);
      toast.error("Couldn't reach Yggi right now. Try again soon.");
    } finally {
      setIsGenerating(false);
    }
  };

  const displayGuidance = currentGuidance || recentGuidance?.content;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Guidance from Yggi</h3>
      </div>

      {displayGuidance ? (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
            {displayGuidance}
          </div>
          <div className="text-xs text-muted-foreground">
            {recentGuidance?.created_at && 
              `Received ${new Date(recentGuidance.created_at).toLocaleDateString()}`
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
          disabled={isGenerating}
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
          disabled={isGenerating}
          className="flex-1"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Practice
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateGuidance("pattern_insight")}
          disabled={isGenerating}
          className="flex-1"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          Insight
        </Button>
      </div>
    </Card>
  );
};
