import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { JournalEntryList } from "@/components/JournalEntryList";
import { DataImport } from "@/components/DataImport";
import { NPSTooltip } from "@/components/NPSTooltip";
import { EntryFilters, FilterOptions, SortOption } from "@/components/EntryFilters";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, BarChart3, History, Settings as SettingsIcon, Target, FileText, PenLine } from "lucide-react";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

const Entries = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filters, setFilters] = useState<FilterOptions>({
    showFavoritesOnly: false,
    selectedMoods: [],
    selectedTags: [],
  });
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [entryCounts, setEntryCounts] = useState({ total: 0, filtered: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get state from navigation (from Import History "View" button or other navigations)
  const locationState = location.state as { filterImportId?: string; scrollToEntryId?: string } | null;
  const filterImportId = locationState?.filterImportId;
  const scrollToEntryId = locationState?.scrollToEntryId;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleImportComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEntriesLoaded = (total: number, filtered: number) => {
    setEntryCounts({ total, filtered });
  };

  const handleReply = (entryId: string, entryTitle: string) => {
    // Navigate to journal page with reply state
    navigate("/journal", { state: { replyToEntry: { id: entryId, title: entryTitle } } });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <NPSTooltip />
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" onClick={() => navigate("/")}>
                <img 
                  src={yggdrasilLogo} 
                  alt="Yggdrasil" 
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0"
                />
                <h1 className="text-lg sm:text-2xl font-bold text-primary truncate">
                  Yggdrasil
                </h1>
              </div>
              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/journal")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <PenLine className="h-4 w-4" />
                  <span className="hidden md:inline">Write</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/settings")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span className="hidden md:inline">Settings</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/import-history")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden md:inline">Import History</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/goals")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Goals</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/insights")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Insights</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

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
                  <Button
                    onClick={() => navigate("/journal")}
                    className="gap-2"
                    size="sm"
                  >
                    <PenLine className="h-4 w-4" />
                    New Entry
                  </Button>
                  <DataImport onImportComplete={handleImportComplete} />
                </div>
              </div>
              
              <EntryFilters
                onFilterChange={setFilters}
                onSortChange={setSortOption}
                totalEntries={entryCounts.total}
                filteredCount={entryCounts.filtered}
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
