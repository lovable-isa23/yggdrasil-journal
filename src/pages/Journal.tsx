import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { JournalEditor } from "@/components/JournalEditor";
import { NPSTooltip } from "@/components/NPSTooltip";
import { AppNavbar } from "@/components/AppNavbar";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, FileText } from "lucide-react";

const Journal = () => {
  const [replyToEntry, setReplyToEntry] = useState<{ id: string; title: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get reply state from navigation (from Entries page)
  useEffect(() => {
    const locationState = location.state as { replyToEntry?: { id: string; title: string } } | null;
    if (locationState?.replyToEntry) {
      setReplyToEntry(locationState.replyToEntry);
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleEntryCreated = () => {
    // Navigate to entries page to see the new entry
    navigate("/entries");
  };

  const handleReplyHandled = () => {
    setReplyToEntry(null);
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
                Write
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                Record your thoughts, reflections, and insights
              </p>
            </div>

            {/* Editor */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-bold">New Entry</h3>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/entries")}
                  className="gap-2"
                  size="sm"
                >
                  <FileText className="h-4 w-4" />
                  View All Entries
                </Button>
              </div>
              <JournalEditor 
                onEntryCreated={handleEntryCreated} 
                replyToEntry={replyToEntry}
                onReplyHandled={handleReplyHandled}
              />
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Journal;
