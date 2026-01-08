import { Badge } from "./ui/badge";
import { startOfWeek } from "date-fns";

interface MicroWin {
  id: string;
  created_at: string;
}

interface MicroWinCounterProps {
  wins: MicroWin[];
}

export const MicroWinCounter = ({ wins }: MicroWinCounterProps) => {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  const thisWeekWins = wins.filter(
    (w) => new Date(w.created_at) >= weekStart
  );

  const count = thisWeekWins.length;

  if (count === 0) return null;

  const isStreak = count >= 7;

  return (
    <Badge
      variant="secondary"
      className={`text-xs gap-1 ${
        isStreak
          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      }`}
    >
      {isStreak && "🔥 "}
      {count} win{count !== 1 ? "s" : ""} this week
    </Badge>
  );
};
