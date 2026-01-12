import { useState, useEffect } from "react";
import { Filter, Star, Calendar as CalendarIcon, Tag as TagIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { MOOD_OPTIONS } from "./MoodPicker";
import { format } from "date-fns";
import { cn, parseLocalDate } from "@/lib/utils";

export interface FilterOptions {
  showFavoritesOnly: boolean;
  selectedMoods: string[];
  selectedTags: string[];
  hasMedia?: boolean;
  searchQuery?: string;
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
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
    searchQuery: "",
    dateRange: { start: null, end: null },
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

  const clearDateRange = () => {
    updateFilters({ dateRange: { start: null, end: null } });
  };

  const activeFilterCount = 
    (filters.showFavoritesOnly ? 1 : 0) +
    filters.selectedMoods.length +
    filters.selectedTags.length +
    (filters.dateRange?.start || filters.dateRange?.end ? 1 : 0);

  const hasSearchQuery = filters.searchQuery && filters.searchQuery.trim().length > 0;

  return (
    <div className="space-y-3 pb-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search entries and insights..."
          value={filters.searchQuery || ""}
          onChange={(e) => updateFilters({ searchQuery: e.target.value })}
          className="pl-9 pr-9"
        />
        {hasSearchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => updateFilters({ searchQuery: "" })}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Popover */}
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
                  <CalendarIcon className="h-4 w-4" />
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

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {filters.dateRange?.start || filters.dateRange?.end ? (
                <span className="text-xs">
                  {filters.dateRange.start ? format(filters.dateRange.start, "MMM d") : "Start"}
                  {" - "}
                  {filters.dateRange.end ? format(filters.dateRange.end, "MMM d") : "End"}
                </span>
              ) : (
                "Date Range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Date Range</span>
                {(filters.dateRange?.start || filters.dateRange?.end) && (
                  <Button variant="ghost" size="sm" onClick={clearDateRange} className="h-6 px-2 text-xs">
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal", !filters.dateRange?.start && "text-muted-foreground")}>
                        {filters.dateRange?.start ? format(filters.dateRange.start, "MMM d, yyyy") : "Select"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange?.start || undefined}
                        onSelect={(date) => updateFilters({ dateRange: { ...filters.dateRange, start: date || null } })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal", !filters.dateRange?.end && "text-muted-foreground")}>
                        {filters.dateRange?.end ? format(filters.dateRange.end, "MMM d, yyyy") : "Select"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange?.end || undefined}
                        onSelect={(date) => updateFilters({ dateRange: { ...filters.dateRange, end: date || null } })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort Dropdown */}
        <Select value={sortOption} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[160px] h-9">
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

        {/* Entry Count */}
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredCount === totalEntries 
            ? `${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'}`
            : `${filteredCount} of ${totalEntries} entries`
          }
        </div>
      </div>
    </div>
  );
}
