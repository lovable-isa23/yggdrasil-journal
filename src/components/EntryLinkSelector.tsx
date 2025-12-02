import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Check } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface EntryItem {
  id: string;
  title: string;
  entry_date: string;
}

interface EntryLinkSelectorProps {
  entries: EntryItem[];
  selectedEntryIds: string[];
  onToggle: (entryId: string) => void;
  excludeEntryId?: string;
  disabled?: boolean;
}

export function EntryLinkSelector({
  entries,
  selectedEntryIds,
  onToggle,
  excludeEntryId,
  disabled = false,
}: EntryLinkSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter out excluded entry and apply search
  const filteredEntries = useMemo(() => {
    let result = entries.filter((e) => e.id !== excludeEntryId);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(query));
    }
    
    return result;
  }, [entries, excludeEntryId, searchQuery]);

  // Get selected entries for badge display
  const selectedEntries = useMemo(
    () => entries.filter((e) => selectedEntryIds.includes(e.id)),
    [entries, selectedEntryIds]
  );

  if (entries.length === 0 || (entries.length === 1 && entries[0].id === excludeEntryId)) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Selected entries badges */}
      {selectedEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedEntries.map((entry) => (
            <Badge
              key={entry.id}
              variant="secondary"
              className="gap-1 pl-2 pr-1 py-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
            >
              <span className="truncate max-w-[120px]">{entry.title}</span>
              <button
                type="button"
                onClick={() => onToggle(entry.id)}
                disabled={disabled}
                className="ml-1 hover:bg-blue-500/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="pl-9 pr-8 h-9 text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Entry list */}
      <ScrollArea className="h-[180px] rounded-md border border-border">
        <div className="p-1">
          {filteredEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {searchQuery ? "No entries match your search" : "No entries available"}
            </p>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = selectedEntryIds.includes(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onToggle(entry.id)}
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left transition-colors",
                    isSelected
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseLocalDate(entry.entry_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Count indicator */}
      <p className="text-xs text-muted-foreground">
        {selectedEntryIds.length > 0
          ? `${selectedEntryIds.length} ${selectedEntryIds.length === 1 ? "entry" : "entries"} linked`
          : `${filteredEntries.length} entries available`}
      </p>
    </div>
  );
}
