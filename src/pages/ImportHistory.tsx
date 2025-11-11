import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, BarChart3, ArrowLeft, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

interface ImportRecord {
  id: string;
  file_name: string;
  file_type: string;
  entries_count: number;
  import_date: string;
  status: string;
}

const ImportHistory = () => {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const fetchImports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("import_history")
        .select("*")
        .eq("user_id", user.id)
        .order("import_date", { ascending: false });

      if (error) throw error;
      setImports(data || []);
    } catch (error) {
      console.error("Error fetching imports:", error);
      toast.error("Failed to load import history");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImport = async (importId: string) => {
    setDeletingId(importId);
    try {
      // First, delete all journal entries associated with this import
      const { error: entriesError } = await supabase
        .from("journal_entries")
        .delete()
        .eq("import_batch_id", importId);

      if (entriesError) throw entriesError;

      // Then delete the import history record
      const { error: historyError } = await supabase
        .from("import_history")
        .delete()
        .eq("id", importId);

      if (historyError) throw historyError;

      toast.success("Import undone and entries deleted");
      fetchImports();
    } catch (error) {
      console.error("Error deleting import:", error);
      toast.error("Failed to undo import");
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewEntries = async (importId: string) => {
    // Navigate to journal with filter (we'll pass it as state)
    navigate("/journal", { state: { filterImportId: importId } });
  };

  useEffect(() => {
    fetchImports();
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
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
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Journal</span>
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
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                Import History
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                View and manage your imported journal entries
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading import history...</p>
              </div>
            ) : imports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No imports yet</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/journal")}
                    className="mt-4"
                  >
                    Go to Journal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {imports.map((importRecord) => (
                  <Card key={importRecord.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                            <span className="break-all">{importRecord.file_name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {importRecord.file_type.toUpperCase()}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            Imported {format(new Date(importRecord.import_date), "PPpp")}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewEntries(importRecord.id)}
                            className="gap-1 sm:gap-2 flex-1 sm:flex-initial"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sm:inline">View</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === importRecord.id}
                                className="gap-1 sm:gap-2 text-destructive hover:text-destructive flex-1 sm:flex-initial"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sm:inline">Undo</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Undo this import?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete all {importRecord.entries_count}{" "}
                                  {importRecord.entries_count === 1 ? "entry" : "entries"} from this
                                  import. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteImport(importRecord.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete All Entries
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {importRecord.entries_count}{" "}
                          {importRecord.entries_count === 1 ? "entry" : "entries"}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{importRecord.status}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default ImportHistory;
