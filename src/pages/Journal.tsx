import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { JournalEditor } from "@/components/JournalEditor";
import { JournalEntryList } from "@/components/JournalEntryList";
import { ReflectionPrompt } from "@/components/ReflectionPrompt";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

const Journal = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentEntries();
  }, [refreshTrigger]);

  const fetchRecentEntries = async () => {
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (data) {
      setRecentEntries(data);
    }
  };

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
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={yggdrasilLogo} 
                  alt="Yggdrasil" 
                  className="h-10 w-10 object-contain"
                />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-earth-brown to-primary bg-clip-text text-transparent">
                  Yggdrasil
                </h1>
              </div>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-12 max-w-4xl">
          <div className="space-y-12">
            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-r from-earth-brown via-primary to-secondary bg-clip-text text-transparent">
                  Your Sacred Space
                </span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Record your thoughts, reflections, and insights
              </p>
            </div>

            {/* Editor */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Create New Entry</h2>
              <JournalEditor onEntryCreated={handleEntryCreated} />
            </section>

            {/* Reflection Prompt */}
            {recentEntries.length > 0 && (
              <section>
                <ReflectionPrompt recentEntries={recentEntries} />
              </section>
            )}

            {/* Entries List */}
            <section>
              <JournalEntryList refreshTrigger={refreshTrigger} />
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Journal;
