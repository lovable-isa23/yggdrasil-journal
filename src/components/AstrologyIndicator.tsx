import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { getAstrologyInfo } from "@/lib/astrology";

export const AstrologyIndicator = () => {
  const { zodiac, planetaryDay, season, seasonGuidance } = getAstrologyInfo();

  return (
    <Card className="p-4 bg-gradient-to-br from-accent/30 to-secondary/20 border-accent/30">
      <div className="space-y-4">
        {/* Zodiac Sign */}
        <div className="flex items-start gap-4">
          <div className="text-5xl">{zodiac.emoji}</div>
          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-semibold text-lg">{zodiac.name} Season</h4>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge variant="secondary">{zodiac.elementEmoji} {zodiac.element}</Badge>
                <Badge variant="secondary">{zodiac.modality}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{zodiac.guidance}</p>
            <p className="text-xs text-muted-foreground">{zodiac.dateRange}</p>
          </div>
        </div>

        {/* Planetary Day */}
        <div className="border-t border-border/50 pt-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{planetaryDay.emoji}</span>
            <span className="text-sm font-medium">Day of {planetaryDay.planet}</span>
            <Badge variant="outline" className="text-xs ml-auto">{planetaryDay.energy}</Badge>
          </div>
          <p className="text-xs text-muted-foreground pl-7">{planetaryDay.guidance}</p>
        </div>

        {/* Season */}
        <div className="border-t border-border/50 pt-3">
          <div className="text-sm font-medium mb-1">{season}</div>
          <p className="text-xs text-muted-foreground">{seasonGuidance}</p>
        </div>
      </div>
    </Card>
  );
};
