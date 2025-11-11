import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { JournalEditor } from "@/components/JournalEditor";
import { JournalEntryList } from "@/components/JournalEntryList";
import { DataExport } from "@/components/DataExport";
import { DataImport } from "@/components/DataImport";
import { NPSTooltip } from "@/components/NPSTooltip";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, BarChart3, History } from "lucide-react";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

const Journal = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleEntryCreated = () => {
    setRefreshTrigger(prev => prev + 1);
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
                  onClick={() => navigate("/import-history")}
                  className="gap-1 sm:gap-2 px-2 sm:px-4"
                  size="sm"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden md:inline">Import History</span>
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
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
          <div className="space-y-8 sm:space-y-12">
            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                Your Sacred Space
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                Record your thoughts, reflections, and insights
              </p>
            </div>

            {/* Editor */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Create New Entry</h2>
              <JournalEditor onEntryCreated={handleEntryCreated} />
            </section>

            {/* Entries List */}
            <section>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Your Entries</h2>
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                  <DataImport onImportComplete={handleEntryCreated} />
                  <DataExport />
                </div>
              </div>
              <JournalEntryList refreshTrigger={refreshTrigger} />
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Journal;
