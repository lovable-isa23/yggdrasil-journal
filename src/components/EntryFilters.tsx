import { useState, useEffect } from "react";
import { Filter, Star, Calendar, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { MOOD_OPTIONS } from "./MoodPicker";

export interface FilterOptions {
  showFavoritesOnly: boolean;
  selectedMoods: string[];
  selectedTags: string[];
  hasMedia?: boolean;
}

export type SortOption = 'date-desc' | 'date-asc' | 'word-count-desc' | 'word-count-asc' | 'favorites-first';

interface EntryFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  onSortChange: (sort: SortOption) => void;
  totalEntries: number;
  filteredCount: number;
}

export function EntryFilters({ onFilterChange, onSortChange, totalEntries, filteredCount }: EntryFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    showFavoritesOnly: false,
    selectedMoods: [],
    selectedTags: [],
  });
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetchAllTags();
  }, []);

  const fetchAllTags = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('journal_entries')
      .select('tags')
      .eq('user_id', user.id);

    const tagSet = new Set<string>();
    data?.forEach((entry: any) => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });

    setAllTags(Array.from(tagSet).sort());
  };

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleSortChange = (value: SortOption) => {
    setSortOption(value);
    onSortChange(value);
  };

  const toggleMood = (mood: string) => {
    const selectedMoods = filters.selectedMoods.includes(mood)
      ? filters.selectedMoods.filter(m => m !== mood)
      : [...filters.selectedMoods, mood];
    updateFilters({ selectedMoods });
  };

  const toggleTag = (tag: string) => {
    const selectedTags = filters.selectedTags.includes(tag)
      ? filters.selectedTags.filter(t => t !== tag)
      : [...filters.selectedTags, tag];
    updateFilters({ selectedTags });
  };

  const activeFilterCount = 
    (filters.showFavoritesOnly ? 1 : 0) +
    filters.selectedMoods.length +
    filters.selectedTags.length;

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 px-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="favorites"
                  checked={filters.showFavoritesOnly}
                  onCheckedChange={(checked) => 
                    updateFilters({ showFavoritesOnly: checked as boolean })
                  }
                />
                <label
                  htmlFor="favorites"
                  className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <Star className="h-4 w-4 text-yellow-500" />
                  Favorites only
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Moods
              </p>
              <div className="grid grid-cols-2 gap-2">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => toggleMood(mood.value)}
                    className={`
                      flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all
                      ${filters.selectedMoods.includes(mood.value)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent'
                      }
                    `}
                  >
                    <span>{mood.icon}</span>
                    <span>{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <TagIcon className="h-4 w-4" />
                  Tags
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filters.selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Select value={sortOption} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date-desc">Newest first</SelectItem>
          <SelectItem value="date-asc">Oldest first</SelectItem>
          <SelectItem value="word-count-desc">Most words</SelectItem>
          <SelectItem value="word-count-asc">Least words</SelectItem>
          <SelectItem value="favorites-first">Favorites first</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto text-sm text-muted-foreground">
        {filteredCount === totalEntries 
          ? `${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'}`
          : `${filteredCount} of ${totalEntries} entries`
        }
      </div>
    </div>
  );
}
