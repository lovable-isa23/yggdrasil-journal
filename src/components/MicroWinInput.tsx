import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Plus, Loader2, Lightbulb, Moon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MicroWinInputProps {
  goalId: string;
  goalTitle: string;
  goalDescription?: string | null;
  recentWins: string[];
  isQuietGoal: boolean;
  onWinAdded: () => void;
}

export const MicroWinInput = ({
  goalId,
  goalTitle,
  goalDescription,
  recentWins,
  isQuietGoal,
  onWinAdded,
}: MicroWinInputProps) => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestingAI, setSuggestingAI] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("micro_wins").insert({
        user_id: user.id,
        goal_id: goalId,
        text: text.trim(),
        source: "manual",
      });

      if (error) throw error;

      setText("");
      setSuggestions([]);
      toast.success("Micro-win logged! 🎉");
      onWinAdded();
    } catch (error) {
      console.error("Error logging micro-win:", error);
      toast.error("Failed to log micro-win");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestMicroWin = async () => {
    setSuggestingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-micro-win", {
        body: {
          goalId,
          goalTitle,
          goalDescription,
          recentWins: recentWins.slice(0, 10),
        },
      });

      if (error) throw error;

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions.map((s: any) => s.text));
      } else {
        toast.info("No suggestions available right now");
      }
    } catch (error) {
      console.error("Error getting suggestions:", error);
      toast.error("Failed to get suggestions");
    } finally {
      setSuggestingAI(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("micro_wins").insert({
        user_id: user.id,
        goal_id: goalId,
        text: suggestion,
        source: "ai_suggested",
      });

      if (error) throw error;

      setSuggestions([]);
      toast.success("Micro-win logged! 🎉");
      onWinAdded();
    } catch (error) {
      console.error("Error logging micro-win:", error);
      toast.error("Failed to log micro-win");
    } finally {
      setLoading(false);
    }
  };

  const remainingChars = 140 - text.length;

  return (
    <div className="space-y-3">
      {isQuietGoal && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Moon className="h-4 w-4" />
          <span>Quiet goal · No wins in 7 days</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSuggestMicroWin}
            disabled={suggestingAI}
            className="ml-auto gap-1 text-primary hover:text-primary"
          >
            {suggestingAI ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Lightbulb className="h-3 w-3" />
            )}
            Suggest a micro-win
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 140))}
            placeholder="Log a micro-win..."
            disabled={loading}
            className="pr-14"
          />
          <span
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-xs",
              remainingChars < 20 ? "text-orange-500" : "text-muted-foreground"
            )}
          >
            {remainingChars}
          </span>
        </div>
        <Button type="submit" disabled={!text.trim() || loading} size="icon">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </form>

      {!isQuietGoal && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSuggestMicroWin}
          disabled={suggestingAI}
          className="gap-1 text-muted-foreground hover:text-primary"
        >
          {suggestingAI ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Lightbulb className="h-3 w-3" />
          )}
          Suggest a micro-win
        </Button>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2 bg-accent/30 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground">Pick a suggestion:</p>
          {suggestions.map((suggestion, idx) => (
            <Button
              key={idx}
              variant="ghost"
              size="sm"
              onClick={() => handleSelectSuggestion(suggestion)}
              disabled={loading}
              className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      {recentWins.length === 0 && !isQuietGoal && (
        <p className="text-xs text-muted-foreground">
          ✨ Start small · Examples: "Read 1 page" · "5 min stretch"
        </p>
      )}
    </div>
  );
};
