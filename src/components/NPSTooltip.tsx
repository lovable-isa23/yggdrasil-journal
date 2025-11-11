import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const NPSTooltip = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState<"nps" | "feedback" | "completed">("nps");
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has already seen the NPS tooltip
    const hasSeenNPS = localStorage.getItem("hasSeenNPS");
    
    // Show after 5 seconds if not seen before
    if (!hasSeenNPS) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("hasSeenNPS", "true");
  };

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score);
    setStep("feedback");
  };

  const handleSubmit = async () => {
    if (selectedScore === null) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("nps_responses").insert({
        user_id: user.id,
        score: selectedScore,
        feedback: feedback || null,
      });

      if (error) throw error;

      setStep("completed");
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("Error submitting NPS:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-scale-in">
      <Card className="w-80 sm:w-96 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                {step === "nps" && "How likely are you to recommend us?"}
                {step === "feedback" && "Tell us more"}
                {step === "completed" && "Thank you!"}
              </CardTitle>
              <CardDescription className="text-sm">
                {step === "nps" && "Rate us from 0 (not likely) to 10 (very likely)"}
                {step === "feedback" && "Your feedback helps us improve"}
                {step === "completed" && "We appreciate your time"}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {step === "nps" && (
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <Button
                  key={i}
                  variant={selectedScore === i ? "default" : "outline"}
                  size="sm"
                  className="h-10 w-full p-0 text-xs"
                  onClick={() => handleScoreSelect(i)}
                >
                  {i}
                </Button>
              ))}
            </div>
          )}

          {step === "feedback" && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                You selected: <span className="font-semibold">{selectedScore}/10</span>
              </div>
              <Textarea
                placeholder="What could we do better? (optional)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("nps")}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          )}

          {step === "completed" && (
            <div className="text-center py-4 text-muted-foreground">
              Your feedback has been recorded 🎉
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
