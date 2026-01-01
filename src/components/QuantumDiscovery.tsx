import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sparkles, Loader2, Zap, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { format } from "date-fns";

interface Discovery {
  node: string;
  score: number;
  type: "quantum_discovered" | "reinforced" | "classical_fallback";
  insight?: string;
  entry_ids?: string[];
}

interface RelatedEntry {
  id: string;
  title: string;
  entry_date: string;
  content: string;
  relevantQuote?: string;
}

interface QuantumDiscoveryProps {
  availableThemes?: string[];
}

export const QuantumDiscovery = ({ availableThemes = [] }: QuantumDiscoveryProps) => {
  const navigate = useNavigate();
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(false);
  const [startTheme, setStartTheme] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [graphInfo, setGraphInfo] = useState<{ nodes: number; edges: number } | null>(null);
  
  // Sidebar state
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);
  const [relatedEntries, setRelatedEntries] = useState<RelatedEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const handleNavigateToEntry = (entryId: string) => {
    setSelectedDiscovery(null);
    navigate("/journal", { state: { scrollToEntryId: entryId } });
  };

  const runQuantumDiscovery = async () => {
    setLoading(true);
    setError(null);
    setDiscoveries([]);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("quantum-discovery", {
        body: { start_theme: startTheme && startTheme !== "__any__" ? startTheme : undefined }
      });

      if (invokeError) throw invokeError;

      if (!data.success) {
        setError(data.message || "Discovery failed");
        return;
      }

      setDiscoveries(data.discoveries || []);
      setGraphInfo({
        nodes: data.total_nodes,
        edges: data.total_edges
      });

      toast.success("Found some hidden connections!");
    } catch (err) {
      console.error("Quantum discovery error:", err);
      setError("Failed to find connections. Please try again.");
      toast.error("Discovery failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoveryClick = async (discovery: Discovery) => {
    setSelectedDiscovery(discovery);
    setLoadingEntries(true);
    setRelatedEntries([]);
    
    try {
      const { data: decryptedData, error } = await supabase.functions.invoke("decrypt-entries");
      if (error) throw error;
      
      const allEntries = decryptedData?.entries || [];
      const entryIds = discovery.entry_ids || [];
      
      const matchedEntries = allEntries
        .filter((e: any) => entryIds.includes(e.id))
        .map((entry: any) => {
          const sentences = (entry.content || "").split(/[.!?]+/);
          const relevantSentence = sentences.find((s: string) =>
            s.toLowerCase().includes(discovery.node.toLowerCase())
          );
          
          return {
            id: entry.id,
            title: entry.title,
            entry_date: entry.entry_date,
            content: entry.content,
            relevantQuote: relevantSentence?.trim() || (entry.content || "").slice(0, 150) + "..."
          };
        })
        .sort((a: RelatedEntry, b: RelatedEntry) => 
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
        );
      
      setRelatedEntries(matchedEntries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("Failed to load related entries");
    } finally {
      setLoadingEntries(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "quantum_discovered":
        return { label: "Hidden Gem", icon: "✨", className: "bg-purple-500/20 text-purple-700 dark:text-purple-300" };
      case "reinforced":
        return { label: "Strong Link", icon: "🔗", className: "bg-blue-500/20 text-blue-700 dark:text-blue-300" };
      case "classical_fallback":
        return { label: "Suggested", icon: "💡", className: "bg-amber-500/20 text-amber-700 dark:text-amber-300" };
      default:
        return { label: "Discovery", icon: "🔍", className: "bg-gray-500/20 text-gray-700 dark:text-gray-300" };
    }
  };

  const getRelevanceDots = (score: number) => {
    let filledDots = 1;
    if (score >= 0.4) filledDots = 5;
    else if (score >= 0.3) filledDots = 4;
    else if (score >= 0.2) filledDots = 3;
    else if (score >= 0.1) filledDots = 2;
    
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Relevance:</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((dot) => (
            <div
              key={dot}
              className={`w-1.5 h-1.5 rounded-full ${
                dot <= filledDots
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="border-dashed border-purple-500/30 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Hidden Connections
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs font-normal cursor-help">
                    Beta
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>This feature uses advanced analysis to discover unexpected links between your journal themes.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription>
            Discover surprising connections between your journal themes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {availableThemes.length > 0 && (
              <Select value={startTheme} onValueChange={setStartTheme}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Starting theme (optional)" />
                </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                  <SelectItem value="__any__">Any theme</SelectItem>
                  {availableThemes.slice(0, 25).map((theme) => (
                    <SelectItem key={theme} value={theme}>
                      {theme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button 
              onClick={runQuantumDiscovery} 
              disabled={loading}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exploring...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Find Hidden Connections
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {discoveries.length > 0 && (
            <div className="space-y-3">
              {graphInfo && (
                <div className="text-xs text-muted-foreground">
                  Explored {graphInfo.nodes} themes across {graphInfo.edges} connections
                </div>
              )}
              
              <div className="space-y-2">
                {discoveries.map((discovery, idx) => {
                  const typeInfo = getTypeLabel(discovery.type);
                  const entryCount = discovery.entry_ids?.length || 0;
                  return (
                    <div 
                      key={idx}
                      className="flex flex-col gap-2 p-3 rounded-lg bg-background/50 border border-border/50 cursor-pointer hover:bg-background/80 hover:border-primary/30 transition-colors"
                      onClick={() => handleDiscoveryClick(discovery)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg">{typeInfo.icon}</span>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{discovery.node}</div>
                            <Badge variant="secondary" className={`text-xs mt-1 ${typeInfo.className}`}>
                              {typeInfo.label}
                            </Badge>
                          </div>
                        </div>
                        {getRelevanceDots(discovery.score)}
                      </div>
                      {discovery.insight && (
                        <p className="text-xs text-muted-foreground pl-9 line-clamp-2">
                          {discovery.insight}
                        </p>
                      )}
                      {entryCount > 0 && (
                        <div className="text-xs text-muted-foreground pl-9">
                          {entryCount} related {entryCount === 1 ? 'entry' : 'entries'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && discoveries.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">
              Click the button above to explore hidden patterns in your journal entries. 
              You might discover connections you never noticed before!
            </p>
          )}
        </CardContent>
      </Card>

      <Sheet open={selectedDiscovery !== null} onOpenChange={(open) => !open && setSelectedDiscovery(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedDiscovery && getTypeLabel(selectedDiscovery.type).icon}
              {selectedDiscovery?.node}
            </SheetTitle>
            <SheetDescription>
              {selectedDiscovery?.insight || "Journal entries forming this connection"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {loadingEntries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : relatedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries found for this connection</p>
            ) : (
              relatedEntries.map((entry) => (
                <Card 
                  key={entry.id} 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => handleNavigateToEntry(entry.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{entry.title}</h4>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {format(new Date(entry.entry_date), "MMM dd, yyyy")}
                      </Badge>
                    </div>
                    {entry.relevantQuote && (
                      <div className="bg-muted/50 rounded-lg p-3 mt-2 border-l-2 border-purple-500">
                        <p className="text-xs italic text-muted-foreground">
                          "{entry.relevantQuote}"
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};