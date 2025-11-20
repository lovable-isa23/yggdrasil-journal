import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoodPicker } from "./MoodPicker";
import { TagSelector } from "./TagSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EntryQuickActionsProps {
  entryId: string;
  isFavorite: boolean;
  moodType: string;
  tags: string[];
  onFavoriteChange: (isFavorite: boolean) => void;
  onMoodChange: (mood: string) => void;
  onTagsChange: (tags: string[]) => void;
}

export function EntryQuickActions({
  entryId,
  isFavorite,
  moodType,
  tags,
  onFavoriteChange,
  onMoodChange,
  onTagsChange,
}: EntryQuickActionsProps) {
  const { toast } = useToast();

  const handleFavoriteToggle = async () => {
    const newFavoriteStatus = !isFavorite;
    
    const { error } = await supabase
      .from('journal_entries')
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', entryId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
      return;
    }

    onFavoriteChange(newFavoriteStatus);
  };

  const handleMoodChange = async (newMood: string) => {
    const { error } = await supabase
      .from('journal_entries')
      .update({ mood_type: newMood })
      .eq('id', entryId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update mood",
        variant: "destructive",
      });
      return;
    }

    onMoodChange(newMood);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleFavoriteToggle}
        className={`h-8 gap-1.5 px-2 text-xs hover:bg-accent ${
          isFavorite ? 'text-yellow-500 hover:text-yellow-600' : ''
        }`}
      >
        <Star className={`h-3 w-3 ${isFavorite ? 'fill-current' : ''}`} />
        <span className="hidden sm:inline">Favorite</span>
      </Button>
      
      <MoodPicker currentMood={moodType} onMoodChange={handleMoodChange} />
      
      <TagSelector
        entryId={entryId}
        currentTags={tags}
        onTagsChange={onTagsChange}
      />
    </div>
  );
}
