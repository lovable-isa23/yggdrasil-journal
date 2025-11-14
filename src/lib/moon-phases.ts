// Moon phase calculations and spiritual guidance

export type MoonPhase = 
  | "new-moon"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full-moon"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

export interface MoonPhaseInfo {
  phase: MoonPhase;
  name: string;
  emoji: string;
  illumination: number;
  guidance: string;
  energyType: "manifesting" | "releasing" | "building" | "reflecting";
}

export function getCurrentMoonPhase(): MoonPhaseInfo {
  const date = new Date();
  
  // Moon phase calculation using astronomical formula
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  let c = 0;
  let e = 0;
  let jd = 0;
  let b = 0;

  if (month < 3) {
    const yr = year - 1;
    const mn = month + 12;
    c = Math.floor(yr / 100);
    jd = Math.floor(365.25 * yr) + Math.floor(30.6001 * (mn + 1)) + day + 1720994.5;
  } else {
    c = Math.floor(year / 100);
    jd = Math.floor(365.25 * year) + Math.floor(30.6001 * (month + 1)) + day + 1720994.5;
  }

  if (jd > 2299160) {
    b = 2 - c + Math.floor(c / 4);
    jd = jd + b;
  }

  // Calculate moon phase (0-29.53 day cycle)
  const daysSinceNew = ((jd - 2451549.5) / 29.53) % 1;
  const phase = daysSinceNew * 29.53;
  
  return getMoonPhaseInfo(phase);
}

function getMoonPhaseInfo(dayInCycle: number): MoonPhaseInfo {
  const phases: MoonPhaseInfo[] = [
    {
      phase: "new-moon",
      name: "New Moon",
      emoji: "🌑",
      illumination: 0,
      guidance: "Time for new beginnings and setting intentions. Plant seeds for what you wish to manifest.",
      energyType: "manifesting"
    },
    {
      phase: "waxing-crescent",
      name: "Waxing Crescent",
      emoji: "🌒",
      illumination: 25,
      guidance: "Take action on your intentions. Start building momentum and trust the process.",
      energyType: "building"
    },
    {
      phase: "first-quarter",
      name: "First Quarter",
      emoji: "🌓",
      illumination: 50,
      guidance: "Face challenges with courage. This is a time for commitment and perseverance.",
      energyType: "building"
    },
    {
      phase: "waxing-gibbous",
      name: "Waxing Gibbous",
      emoji: "🌔",
      illumination: 75,
      guidance: "Refine and adjust your approach. Trust is building as your goals come into focus.",
      energyType: "building"
    },
    {
      phase: "full-moon",
      name: "Full Moon",
      emoji: "🌕",
      illumination: 100,
      guidance: "Celebrate manifestations and release what no longer serves. Peak illumination reveals truths.",
      energyType: "releasing"
    },
    {
      phase: "waning-gibbous",
      name: "Waning Gibbous",
      emoji: "🌖",
      illumination: 75,
      guidance: "Gratitude and sharing wisdom. Reflect on lessons learned and pass knowledge forward.",
      energyType: "reflecting"
    },
    {
      phase: "last-quarter",
      name: "Last Quarter",
      emoji: "🌗",
      illumination: 50,
      guidance: "Release and let go. Break down what needs to change. Forgive and create space.",
      energyType: "releasing"
    },
    {
      phase: "waning-crescent",
      name: "Waning Crescent",
      emoji: "🌘",
      illumination: 25,
      guidance: "Rest and restore. Surrender to the void. Prepare for renewal in stillness.",
      energyType: "reflecting"
    }
  ];

  // Map day in cycle to phase index
  if (dayInCycle < 1.85) return phases[0]; // New moon
  if (dayInCycle < 5.53) return phases[1]; // Waxing crescent
  if (dayInCycle < 9.23) return phases[2]; // First quarter
  if (dayInCycle < 12.91) return phases[3]; // Waxing gibbous
  if (dayInCycle < 16.61) return phases[4]; // Full moon
  if (dayInCycle < 20.30) return phases[5]; // Waning gibbous
  if (dayInCycle < 23.99) return phases[6]; // Last quarter
  if (dayInCycle < 27.69) return phases[7]; // Waning crescent
  return phases[0]; // New moon (cycle complete)
}

export function getMoonPhaseGuidanceForGoalType(goalType: string): string {
  const currentPhase = getCurrentMoonPhase();
  
  const guidanceMap: Record<string, Record<MoonPhase, string>> = {
    "shadow-work": {
      "new-moon": "Set intentions to explore your shadows with compassion.",
      "waxing-crescent": "Begin gentle inquiry into patterns you wish to understand.",
      "first-quarter": "Face your shadows directly with courage and self-love.",
      "waxing-gibbous": "Notice how shadow patterns are becoming clearer.",
      "full-moon": "Illuminate your shadows fully - what is revealed?",
      "waning-gibbous": "Integrate shadow lessons with gratitude.",
      "last-quarter": "Release shame and judgment around your shadows.",
      "waning-crescent": "Rest in acceptance of all parts of yourself."
    },
    "healing": {
      "new-moon": "Plant seeds of healing and wholeness.",
      "waxing-crescent": "Take first steps toward healing practices.",
      "first-quarter": "Commit to your healing journey despite challenges.",
      "waxing-gibbous": "Notice subtle shifts in your healing process.",
      "full-moon": "Celebrate healing achieved and release old wounds.",
      "waning-gibbous": "Share your healing wisdom with others.",
      "last-quarter": "Release attachments to being wounded.",
      "waning-crescent": "Rest deeply in your healing journey."
    },
    "manifestation": {
      "new-moon": "Perfect time to set clear manifestation intentions!",
      "waxing-crescent": "Take aligned action toward your desires.",
      "first-quarter": "Stay committed to your vision.",
      "waxing-gibbous": "Trust that manifestation is building momentum.",
      "full-moon": "Receive and celebrate what has manifested!",
      "waning-gibbous": "Express gratitude for manifestations.",
      "last-quarter": "Release resistance to receiving.",
      "waning-crescent": "Surrender outcomes and trust divine timing."
    }
  };

  return guidanceMap[goalType]?.[currentPhase.phase] || currentPhase.guidance;
}
