import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sparkles, Loader2, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface Discovery {
  node: string;
  score: number;
  type: "quantum_discovered" | "reinforced" | "classical_fallback";
}

interface QuantumDiscoveryProps {
  availableThemes?: string[];
}

export const QuantumDiscovery = ({ availableThemes = [] }: QuantumDiscoveryProps) => {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(false);
  const [startTheme, setStartTheme] = useState<string>("");
  const [method, setMethod] = useState<"quantum" | "classical_fallback" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [graphInfo, setGraphInfo] = useState<{ nodes: number; edges: number } | null>(null);

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
      setMethod(data.method);
      setGraphInfo({
        nodes: data.total_nodes,
        edges: data.total_edges
      });

      if (data.method === "quantum") {
        toast.success("Quantum walk complete!");
      } else {
        toast.info("Used classical simulation (quantum service unavailable)");
      }
    } catch (err) {
      console.error("Quantum discovery error:", err);
      setError("Failed to run quantum discovery. Please try again.");
      toast.error("Discovery failed");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-green-600 dark:text-green-400";
    if (score >= 0.4) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  const getTypeLabel = (type: Discovery["type"]) => {
    switch (type) {
      case "quantum_discovered":
        return { label: "Quantum Discovered", className: "bg-purple-500/20 text-purple-700 dark:text-purple-300" };
      case "reinforced":
        return { label: "Reinforced Connection", className: "bg-blue-500/20 text-blue-700 dark:text-blue-300" };
      case "classical_fallback":
        return { label: "Classical Walk", className: "bg-gray-500/20 text-gray-700 dark:text-gray-300" };
    }
  };

  return (
    <Card className="border-dashed border-purple-500/30 bg-purple-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Quantum Discovery
          <Badge variant="outline" className="text-xs font-normal">
            Experimental
          </Badge>
        </CardTitle>
        <CardDescription>
          Explore unexpected connections in your journal using quantum-inspired analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {availableThemes.length > 0 && (
            <Select value={startTheme} onValueChange={setStartTheme}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Starting theme (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any theme</SelectItem>
                {availableThemes.slice(0, 10).map((theme) => (
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
                Discovering...
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
                Analyzed {graphInfo.nodes} concepts with {graphInfo.edges} connections
                {method === "classical_fallback" && " (classical simulation)"}
              </div>
            )}
            
            <div className="space-y-2">
              {discoveries.map((discovery, idx) => {
                const typeInfo = getTypeLabel(discovery.type);
                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">🔮</span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{discovery.node}</div>
                        <Badge variant="secondary" className={`text-xs mt-1 ${typeInfo.className}`}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <div className={`text-sm font-medium whitespace-nowrap ${getScoreColor(discovery.score)}`}>
                      {Math.round(discovery.score * 100)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && discoveries.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            Click the button above to discover unexpected connections in your knowledge graph using quantum random walk analysis.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
