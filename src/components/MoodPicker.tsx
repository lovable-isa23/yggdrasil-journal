import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MoodOption {
  value: string;
  label: string;
  icon: string;
  gradient: string;
  borderColor: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  {
    value: 'dream',
    label: 'Dream',
    icon: '🌙',
    gradient: 'from-purple-100 to-purple-50',
    borderColor: 'border-purple-400',
  },
  {
    value: 'reflection',
    label: 'Reflection',
    icon: '💭',
    gradient: 'from-blue-100 to-blue-50',
    borderColor: 'border-blue-400',
  },
  {
    value: 'gratitude',
    label: 'Gratitude',
    icon: '✨',
    gradient: 'from-amber-100 to-yellow-50',
    borderColor: 'border-amber-400',
  },
  {
    value: 'intention',
    label: 'Intention',
    icon: '🎯',
    gradient: 'from-emerald-100 to-green-50',
    borderColor: 'border-emerald-400',
  },
  {
    value: 'general',
    label: 'General',
    icon: '📖',
    gradient: 'from-[#F9F0E5] to-[#FFF7ED]',
    borderColor: 'border-[#D4A574]',
  },
];

interface MoodPickerProps {
  currentMood: string;
  onMoodChange: (mood: string) => void;
}

export function MoodPicker({ currentMood, onMoodChange }: MoodPickerProps) {
  const selectedMood = MOOD_OPTIONS.find(m => m.value === currentMood) || MOOD_OPTIONS[5];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs hover:bg-accent"
        >
          <span>{selectedMood.icon}</span>
          <span className="hidden sm:inline">{selectedMood.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="grid grid-cols-2 gap-2">
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.value}
              onClick={() => onMoodChange(mood.value)}
              className={`
                relative p-3 rounded-lg border-2 transition-all duration-200
                bg-gradient-to-br ${mood.gradient}
                hover:scale-105 hover:shadow-md
                ${currentMood === mood.value ? mood.borderColor : 'border-transparent'}
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{mood.icon}</span>
                <span className="text-sm font-medium text-foreground">{mood.label}</span>
              </div>
              {currentMood === mood.value && (
                <div className="absolute top-2 right-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { MOOD_OPTIONS };
