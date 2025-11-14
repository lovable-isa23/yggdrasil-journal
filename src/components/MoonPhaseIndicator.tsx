import { Card } from "./ui/card";
import { getCurrentMoonPhase, getMoonPhaseGuidanceForGoalType } from "@/lib/moon-phases";
import { Badge } from "./ui/badge";

interface MoonPhaseIndicatorProps {
  goalType?: string;
  compact?: boolean;
}

export const MoonPhaseIndicator = ({ goalType, compact = false }: MoonPhaseIndicatorProps) => {
  const moonPhase = getCurrentMoonPhase();
  
  const guidance = goalType 
    ? getMoonPhaseGuidanceForGoalType(goalType)
    : moonPhase.guidance;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">{moonPhase.emoji}</span>
        <div className="text-sm">
          <div className="font-medium">{moonPhase.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{moonPhase.energyType} energy</div>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <div className="flex items-start gap-4">
        <div className="text-5xl">{moonPhase.emoji}</div>
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="font-semibold text-lg">{moonPhase.name}</h4>
            <Badge variant="secondary" className="mt-1">
              {moonPhase.energyType} energy
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{guidance}</p>
        </div>
      </div>
    </Card>
  );
};
