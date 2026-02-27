import { useState, useEffect } from "react";
import { Filter, Star, Calendar as CalendarIcon, Tag as TagIcon, Search, X, Sparkles } from "lucide-react";
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
  selectedFrameworks: string[];
  selectedChakras: string[];
  selectedTarot: string[];
  selectedGeometry: string[];
}

export type SortOption = 'date-desc' | 'date-asc' | 'word-count-desc' | 'word-count-asc' | 'favorites-first';

const FRAMEWORK_LABELS: Record<string, { label: string; icon: string }> = {
  theravada: { label: 'Theravada', icon: '☸️' },
  hermetic: { label: 'Hermeticism', icon: '🔮' },
  advaita: { label: 'Advaita Vedanta', icon: '🕉️' },
  taoist: { label: 'Taoism', icon: '☯️' },
  freudian: { label: 'Freudian', icon: '🔺' },
  jungian: { label: 'Jungian', icon: '🌓' },
  attachment: { label: 'Attachment', icon: '💕' },
  ifs: { label: 'IFS', icon: '🎭' },
  cbt: { label: 'CBT', icon: '💭' },
  dbt: { label: 'DBT', icon: '⚖️' },
  stoic: { label: 'Stoicism', icon: '🏛️' },
  gnostic: { label: 'Gnosticism', icon: '✨' },
};

interface EntryFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  onSortChange: (sort: SortOption) => void;
  totalEntries: number;
  filteredCount: number;
  availableFrameworks?: string[];
  availableChakras?: string[];
  availableTarot?: string[];
  availableGeometry?: string[];
}

export function EntryFilters({ onFilterChange, onSortChange, totalEntries, filteredCount, availableFrameworks = [], availableChakras = [], availableTarot = [], availableGeometry = [] }: EntryFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    showFavoritesOnly: false,
    selectedMoods: [],
    selectedTags: [],
    searchQuery: "",
    dateRange: { start: null, end: null },
    selectedFrameworks: [],
    selectedChakras: [],
    selectedTarot: [],
    selectedGeometry: [],
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

  const toggleFramework = (key: string) => {
    const selected = filters.selectedFrameworks.includes(key)
      ? filters.selectedFrameworks.filter(f => f !== key)
      : [...filters.selectedFrameworks, key];
    updateFilters({ selectedFrameworks: selected });
  };

  const toggleChakra = (chakra: string) => {
    const selected = filters.selectedChakras.includes(chakra)
      ? filters.selectedChakras.filter(c => c !== chakra)
      : [...filters.selectedChakras, chakra];
    updateFilters({ selectedChakras: selected });
  };

  const toggleTarot = (card: string) => {
    const selected = filters.selectedTarot.includes(card)
      ? filters.selectedTarot.filter(t => t !== card)
      : [...filters.selectedTarot, card];
    updateFilters({ selectedTarot: selected });
  };

  const toggleGeometry = (pattern: string) => {
    const selected = filters.selectedGeometry.includes(pattern)
      ? filters.selectedGeometry.filter(g => g !== pattern)
      : [...filters.selectedGeometry, pattern];
    updateFilters({ selectedGeometry: selected });
  };

  const clearDateRange = () => {
    updateFilters({ dateRange: { start: null, end: null } });
  };

  const clearAllFilters = () => {
    const cleared: FilterOptions = {
      showFavoritesOnly: false,
      selectedMoods: [],
      selectedTags: [],
      searchQuery: "",
      dateRange: { start: null, end: null },
      selectedFrameworks: [],
      selectedChakras: [],
      selectedTarot: [],
      selectedGeometry: [],
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const activeFilterCount = 
    (filters.showFavoritesOnly ? 1 : 0) +
    filters.selectedMoods.length +
    filters.selectedTags.length +
    filters.selectedFrameworks.length +
    filters.selectedChakras.length +
    filters.selectedTarot.length +
    filters.selectedGeometry.length +
    (filters.dateRange?.start || filters.dateRange?.end ? 1 : 0);

  const hasSearchQuery = filters.searchQuery && filters.searchQuery.trim().length > 0;
  const hasInsightFilters = availableFrameworks.length > 0 || availableChakras.length > 0 || availableTarot.length > 0 || availableGeometry.length > 0;

  return (
    <div className="space-y-3 pb-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search titles, content, insights, chakras, tarot..."
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
          <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto" align="start">
            <div className="space-y-4">
              {/* Favorites */}
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

              {/* Moods */}
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

              {/* Tags */}
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

              {/* Insights Section */}
              {hasInsightFilters && (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4" />
                      Analysis Lens
                    </p>
                  </div>

                  {/* Frameworks */}
                  {availableFrameworks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frameworks</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableFrameworks.map((key) => {
                          const fw = FRAMEWORK_LABELS[key];
                          if (!fw) return null;
                          return (
                            <Badge
                              key={key}
                              variant={filters.selectedFrameworks.includes(key) ? "default" : "outline"}
                              className="cursor-pointer text-xs"
                              onClick={() => toggleFramework(key)}
                            >
                              {fw.icon} {fw.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chakras */}
                  {availableChakras.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chakras</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableChakras.map((chakra) => (
                          <Badge
                            key={chakra}
                            variant={filters.selectedChakras.includes(chakra) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => toggleChakra(chakra)}
                          >
                            {chakra}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tarot */}
                  {availableTarot.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarot</p>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {availableTarot.map((card) => (
                          <Badge
                            key={card}
                            variant={filters.selectedTarot.includes(card) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => toggleTarot(card)}
                          >
                            {card}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sacred Geometry */}
                  {availableGeometry.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sacred Geometry</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableGeometry.map((pattern) => (
                          <Badge
                            key={pattern}
                            variant={filters.selectedGeometry.includes(pattern) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => toggleGeometry(pattern)}
                          >
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Clear All */}
              {activeFilterCount > 0 && (
                <div className="border-t pt-3">
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="w-full text-xs">
                    Clear all filters
                  </Button>
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
