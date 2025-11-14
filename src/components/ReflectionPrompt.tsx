import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";

interface ReflectionPromptProps {
  recentEntries: any[];
}

export const ReflectionPrompt = ({ recentEntries }: ReflectionPromptProps) => {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load the most recent saved prompt on mount
  useEffect(() => {
    loadSavedPrompt();
  }, []);

  const loadSavedPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from("reflection_prompts")
        .select("prompt")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.prompt) {
        setPrompt(data.prompt);
      }
    } catch (error) {
      console.error("Error loading saved prompt:", error);
    }
  };

  const generatePrompt = async () => {
    if (recentEntries.length === 0) {
      toast.error("Create some journal entries first");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-reflection", {
        body: { recentEntries: recentEntries.slice(0, 5) },
      });

      if (error) {
        console.error("Reflection error:", error);
        throw error;
      }

      if (data?.prompt) {
        setPrompt(data.prompt);
        toast.success("Reflection prompt generated!");
      }
    } catch (error: any) {
      console.error("Error generating prompt:", error);
      
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error("Rate limit reached. Please try again in a moment.");
      } else if (error.message?.includes('402') || error.message?.includes('credits')) {
        toast.error("AI usage limit reached. Please add credits to continue.");
      } else {
        toast.error(error.message || "Failed to generate reflection prompt");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!prompt) {
    return (
      <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 mb-2">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">AI Reflection Prompt</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Receive a thoughtful, spiritual prompt based on your recent entries to guide deeper self-reflection
            </p>
          </div>
          <Button 
            onClick={generatePrompt}
            disabled={loading}
            className="bg-gradient-to-r from-accent to-primary"
          >
            {loading ? "Generating..." : "Generate Reflection"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent flex-shrink-0" />
          <h3 className="font-semibold">Reflection Prompt</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generatePrompt}
          disabled={loading}
          className="flex-shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <p className="text-sm leading-relaxed italic text-foreground/90">
        "{prompt}"
      </p>
    </Card>
  );
};
