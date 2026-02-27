import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { JournalEntryList } from "@/components/JournalEntryList";
import { DataImport } from "@/components/DataImport";
import { NPSTooltip } from "@/components/NPSTooltip";
import { AppNavbar } from "@/components/AppNavbar";
import { EntryFilters, FilterOptions, SortOption } from "@/components/EntryFilters";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, PenLine, History } from "lucide-react";

const Entries = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [availableInsightOptions, setAvailableInsightOptions] = useState<{
    frameworks: string[];
    chakras: string[];
    tarot: string[];
    geometry: string[];
  }>({ frameworks: [], chakras: [], tarot: [], geometry: [] });
  const [filters, setFilters] = useState<FilterOptions>({
    showFavoritesOnly: false,
    selectedMoods: [],
    selectedTags: [],
    selectedFrameworks: [],
    selectedChakras: [],
    selectedTarot: [],
    selectedGeometry: [],
  });
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [entryCounts, setEntryCounts] = useState({ total: 0, filtered: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get state from navigation (from Import History "View" button or other navigations)
  const locationState = location.state as { filterImportId?: string; scrollToEntryId?: string } | null;
  const filterImportId = locationState?.filterImportId;
  const scrollToEntryId = locationState?.scrollToEntryId;

  const handleImportComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEntriesLoaded = (total: number, filtered: number, entries?: any[]) => {
    setEntryCounts({ total, filtered });
    if (entries) {
      const frameworkSet = new Set<string>();
      const chakraSet = new Set<string>();
      const tarotSet = new Set<string>();
      const geometrySet = new Set<string>();
      entries.forEach((e: any) => {
        if (Array.isArray(e.frameworks_applied)) {
          e.frameworks_applied.forEach((f: any) => {
            const key = typeof f === 'string' ? f : f?.key || f?.canonical_key;
            if (key) frameworkSet.add(key);
          });
        }
        if (Array.isArray(e.chakra_tags)) {
          e.chakra_tags.forEach((c: any) => {
            const name = typeof c === 'string' ? c : c?.name || c?.chakra;
            if (name) chakraSet.add(name);
          });
        }
        if (Array.isArray(e.tarot_tags)) {
          e.tarot_tags.forEach((t: any) => {
            const name = typeof t === 'string' ? t : t?.name || t?.card;
            if (name) tarotSet.add(name);
          });
        }
        if (Array.isArray(e.sacred_geometry)) {
          e.sacred_geometry.forEach((g: any) => {
            const name = typeof g === 'string' ? g : g?.name || g?.pattern;
            if (name) geometrySet.add(name);
          });
        }
      });
      setAvailableInsightOptions({
        frameworks: Array.from(frameworkSet).sort(),
        chakras: Array.from(chakraSet).sort(),
        tarot: Array.from(tarotSet).sort(),
        geometry: Array.from(geometrySet).sort(),
      });
    }
  };

  const handleReply = (entryId: string, entryTitle: string) => {
    // Navigate to journal page with reply state
    navigate("/journal", { state: { replyToEntry: { id: entryId, title: entryTitle } } });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <NPSTooltip />
        <AppNavbar />

        {/* Main Content */}
        <main className="container mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-12 max-w-4xl overflow-hidden">
          <div className="space-y-8 sm:space-y-12">
            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Your Entries
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                Browse, search, and reflect on your journal entries
              </p>
            </div>

            {/* Entries List */}
            <section>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-bold">All Entries</h3>
                </div>
                <div className="flex items-center gap-2">
                  <DataImport onImportComplete={handleImportComplete} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/import-history")}
                    className="gap-1"
                  >
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">History</span>
                  </Button>
                  <Button
                    onClick={() => navigate("/journal")}
                    className="gap-2"
                    size="sm"
                  >
                    <PenLine className="h-4 w-4" />
                    New Entry
                  </Button>
                </div>
              </div>
              
              <EntryFilters
                onFilterChange={setFilters}
                onSortChange={setSortOption}
                totalEntries={entryCounts.total}
                filteredCount={entryCounts.filtered}
                availableFrameworks={availableInsightOptions.frameworks}
                availableChakras={availableInsightOptions.chakras}
                availableTarot={availableInsightOptions.tarot}
                availableGeometry={availableInsightOptions.geometry}
              />
              
              <JournalEntryList 
                refreshTrigger={refreshTrigger} 
                filters={filters}
                sortOption={sortOption}
                onEntriesLoaded={handleEntriesLoaded}
                onReply={handleReply}
                filterImportId={filterImportId}
                scrollToEntryId={scrollToEntryId}
              />
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Entries;
