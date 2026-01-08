import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sparkles, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MicroWin {
  id: string;
  text: string;
  source: string;
  created_at: string;
}

interface MicroWinListProps {
  wins: MicroWin[];
  totalCount: number;
  onViewAll: () => void;
}

export const MicroWinList = ({ wins, totalCount, onViewAll }: MicroWinListProps) => {
  if (wins.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {wins.slice(0, 3).map((win) => (
          <div
            key={win.id}
            className="flex items-start gap-2 text-sm py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <span className="text-muted-foreground mt-0.5">•</span>
            <div className="flex-1 min-w-0">
              <span className="break-words">{win.text}</span>
              {win.source === "ai_suggested" && (
                <Badge variant="secondary" className="ml-2 text-xs py-0 px-1.5 gap-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {formatDistanceToNow(new Date(win.created_at), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>

      {totalCount > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="gap-1 text-muted-foreground hover:text-primary w-full justify-center"
        >
          View all {totalCount} wins
          <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
