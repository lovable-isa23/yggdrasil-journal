import { useLoading } from "@/contexts/LoadingContext";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const GlobalLoadingBar = () => {
  const { loading } = useLoading();

  if (!loading.isLoading) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-primary/20 shadow-lg animate-in slide-in-from-bottom-5">
      <div className="px-6 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{loading.message}</span>
          <span className="text-xs text-muted-foreground">{Math.round(loading.progress)}%</span>
        </div>
        <Progress 
          value={loading.progress} 
          className={cn(
            "h-2 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-secondary",
            "transition-all duration-300 ease-in-out"
          )}
        />
      </div>
    </div>
  );
};
