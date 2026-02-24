export interface ZodiacSign {
  name: string;
  emoji: string;
  element: "Fire" | "Water" | "Earth" | "Air";
  elementEmoji: string;
  modality: "Cardinal" | "Fixed" | "Mutable";
  rulingPlanet: string;
  rulingPlanetEmoji: string;
  dateRange: string;
  guidance: string;
}

export interface PlanetaryDay {
  planet: string;
  emoji: string;
  energy: string;
  guidance: string;
}

export interface AstrologyInfo {
  zodiac: ZodiacSign;
  planetaryDay: PlanetaryDay;
  season: string;
  seasonGuidance: string;
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  { name: "Capricorn", emoji: "♑", element: "Earth", elementEmoji: "🌍", modality: "Cardinal", rulingPlanet: "Saturn", rulingPlanetEmoji: "🪐", dateRange: "Dec 22 – Jan 19", guidance: "Structure and discipline fuel your growth. Build lasting foundations with patient effort." },
  { name: "Aquarius", emoji: "♒", element: "Air", elementEmoji: "💨", modality: "Fixed", rulingPlanet: "Uranus", rulingPlanetEmoji: "⚡", dateRange: "Jan 20 – Feb 18", guidance: "Innovation and community call. Break free from old patterns and embrace your unique vision." },
  { name: "Pisces", emoji: "♓", element: "Water", elementEmoji: "💧", modality: "Mutable", rulingPlanet: "Neptune", rulingPlanetEmoji: "🔱", dateRange: "Feb 19 – Mar 20", guidance: "Intuition runs deep now. Trust your inner knowing and let creativity flow freely." },
  { name: "Aries", emoji: "♈", element: "Fire", elementEmoji: "🔥", modality: "Cardinal", rulingPlanet: "Mars", rulingPlanetEmoji: "♂️", dateRange: "Mar 21 – Apr 19", guidance: "Bold action is favored. Initiate new projects and lead with courage." },
  { name: "Taurus", emoji: "♉", element: "Earth", elementEmoji: "🌍", modality: "Fixed", rulingPlanet: "Venus", rulingPlanetEmoji: "♀️", dateRange: "Apr 20 – May 20", guidance: "Ground yourself in beauty and comfort. Slow, steady progress yields lasting results." },
  { name: "Gemini", emoji: "♊", element: "Air", elementEmoji: "💨", modality: "Mutable", rulingPlanet: "Mercury", rulingPlanetEmoji: "☿️", dateRange: "May 21 – Jun 20", guidance: "Communication and learning thrive. Explore diverse perspectives and share your ideas." },
  { name: "Cancer", emoji: "♋", element: "Water", elementEmoji: "💧", modality: "Cardinal", rulingPlanet: "Moon", rulingPlanetEmoji: "🌙", dateRange: "Jun 21 – Jul 22", guidance: "Nurture your emotional world. Home and family connections bring deep healing." },
  { name: "Leo", emoji: "♌", element: "Fire", elementEmoji: "🔥", modality: "Fixed", rulingPlanet: "Sun", rulingPlanetEmoji: "☀️", dateRange: "Jul 23 – Aug 22", guidance: "Express your authentic self boldly. Creative energy and confidence are at their peak." },
  { name: "Virgo", emoji: "♍", element: "Earth", elementEmoji: "🌍", modality: "Mutable", rulingPlanet: "Mercury", rulingPlanetEmoji: "☿️", dateRange: "Aug 23 – Sep 22", guidance: "Refine and organize. Attention to detail and service to others bring fulfillment." },
  { name: "Libra", emoji: "♎", element: "Air", elementEmoji: "💨", modality: "Cardinal", rulingPlanet: "Venus", rulingPlanetEmoji: "♀️", dateRange: "Sep 23 – Oct 22", guidance: "Seek balance and harmony. Relationships and partnerships flourish through diplomacy." },
  { name: "Scorpio", emoji: "♏", element: "Water", elementEmoji: "💧", modality: "Fixed", rulingPlanet: "Pluto", rulingPlanetEmoji: "🌑", dateRange: "Oct 23 – Nov 21", guidance: "Transformation beckons. Dive deep into shadow work and emerge renewed." },
  { name: "Sagittarius", emoji: "♐", element: "Fire", elementEmoji: "🔥", modality: "Mutable", rulingPlanet: "Jupiter", rulingPlanetEmoji: "♃", dateRange: "Nov 22 – Dec 21", guidance: "Adventure and wisdom call. Expand your horizons through travel, study, or philosophy." },
];

const PLANETARY_DAYS: PlanetaryDay[] = [
  { planet: "Sun", emoji: "☀️", energy: "Vitality & Self-Expression", guidance: "Channel solar energy into creative projects and self-development. A powerful day for setting intentions." },
  { planet: "Moon", emoji: "🌙", energy: "Intuition & Emotions", guidance: "Honor your emotional tides. Journaling and introspection are especially potent today." },
  { planet: "Mars", emoji: "♂️", energy: "Action & Courage", guidance: "Take bold action on goals. Physical activity and assertive communication are favored." },
  { planet: "Mercury", emoji: "☿️", energy: "Communication & Intellect", guidance: "A great day for writing, learning, and meaningful conversations. Mental clarity is heightened." },
  { planet: "Jupiter", emoji: "♃", energy: "Expansion & Abundance", guidance: "Think big and embrace opportunities. Generosity and optimism attract growth." },
  { planet: "Venus", emoji: "♀️", energy: "Love & Beauty", guidance: "Nurture relationships and surround yourself with beauty. Creative arts and self-care are blessed." },
  { planet: "Saturn", emoji: "🪐", energy: "Discipline & Structure", guidance: "Focus on long-term commitments. Hard work today builds enduring foundations." },
];

export function getCurrentZodiacSign(): ZodiacSign {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return ZODIAC_SIGNS[0]; // Capricorn
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return ZODIAC_SIGNS[1]; // Aquarius
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return ZODIAC_SIGNS[2]; // Pisces
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return ZODIAC_SIGNS[3]; // Aries
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return ZODIAC_SIGNS[4]; // Taurus
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return ZODIAC_SIGNS[5]; // Gemini
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return ZODIAC_SIGNS[6]; // Cancer
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return ZODIAC_SIGNS[7]; // Leo
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return ZODIAC_SIGNS[8]; // Virgo
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return ZODIAC_SIGNS[9]; // Libra
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return ZODIAC_SIGNS[10]; // Scorpio
  return ZODIAC_SIGNS[11]; // Sagittarius
}

export function getPlanetaryDay(): PlanetaryDay {
  const dayOfWeek = new Date().getDay();
  return PLANETARY_DAYS[dayOfWeek];
}

export function getSeasonInfo(): { season: string; guidance: string } {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return { season: "Spring Equinox Season 🌱", guidance: "A time of new beginnings and planting seeds for future growth." };
  if (month >= 6 && month <= 8) return { season: "Summer Solstice Season ☀️", guidance: "Peak energy for manifestation. Let your light shine brightly." };
  if (month >= 9 && month <= 11) return { season: "Autumn Equinox Season 🍂", guidance: "Harvest the fruits of your efforts and release what no longer serves." };
  return { season: "Winter Solstice Season ❄️", guidance: "Turn inward for deep reflection. Rest and renewal prepare you for rebirth." };
}

export function getAstrologyInfo(): AstrologyInfo {
  const zodiac = getCurrentZodiacSign();
  const planetaryDay = getPlanetaryDay();
  const { season, guidance: seasonGuidance } = getSeasonInfo();
  return { zodiac, planetaryDay, season, seasonGuidance };
}
