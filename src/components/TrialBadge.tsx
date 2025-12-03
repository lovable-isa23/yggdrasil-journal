import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const TrialBadge = () => {
  const { isTrial, hoursRemaining, startCheckout, isLoading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Only show for trial users
  if (!isTrial || isLoading) return null;

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      await startCheckout();
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getTimeDisplay = () => {
    if (!hoursRemaining) return "Trial active";
    if (hoursRemaining > 24) {
      const days = Math.floor(hoursRemaining / 24);
      const hours = hoursRemaining % 24;
      return `${days}d ${hours}h left`;
    }
    return `${hoursRemaining}h left`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1.5 shadow-lg">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {getTimeDisplay()}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs bg-amber-200/50 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800"
              onClick={handleUpgrade}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  Upgrade
                </>
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Free trial • Upgrade for $5.99 lifetime access</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
