import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Loader2, Calendar, FileText, Maximize2, Download, Image as ImageIcon, FileDown, Network, Lightbulb, Target, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useDataSufficiency } from "@/hooks/use-data-sufficiency";
import { InsufficientDataPrompt } from "@/components/InsufficientDataPrompt";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  value: number;
  type: "entity" | "theme" | "keyword";
  color: string;
  entryIds: string[];
  entries?: any[];
  x?: number;
  y?: number;
}

interface GraphLink {
  source: GraphNode | string;
  target: GraphNode | string;
  value: number;
  isAIStrength: boolean;
}

export const KnowledgeGraph = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "entities" | "themes" | "keywords">("all");
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });

  const [allInsights, setAllInsights] = useState<any[]>([]);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [decryptedEntries, setDecryptedEntries] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const zoomRef = useRef<any>(null);
  const { hasMinimumData, totalEntries, deepEntries, analyzedEntries, needsAnalysis } = useDataSufficiency();
  const [minStrength, setMinStrength] = useState(1);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [connectionInsights, setConnectionInsights] = useState<string[]>([]);
  const [refreshingAnalysis, setRefreshingAnalysis] = useState(false);

  useEffect(() => {
    fetchGraphData();
  }, []);

  useEffect(() => {
    if (allInsights.length > 0) {
      buildGraph(allInsights);
    }
  }, [activeTab, allInsights, minStrength]);

  useEffect(() => {
    if (graphData.nodes.length > 0) {
      renderGraph();
      generateInsights(graphData.nodes, graphData.links);
    } else {
      setConnectionInsights([]);
    }
  }, [graphData]);

  const fetchGraphData = async () => {
    try {
      const [insightsResult, entriesResult, relationshipsResult, decryptedResult] = await Promise.all([
        supabase
          .from("entry_insights")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("journal_entries")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("knowledge_relationships")
          .select("*")
          .order("strength", { ascending: false }),
        supabase.functions.invoke("decrypt-entries")
      ]);

      if (insightsResult.error) throw insightsResult.error;
      if (entriesResult.error) throw entriesResult.error;
      if (relationshipsResult.error) throw relationshipsResult.error;

      if (insightsResult.data && insightsResult.data.length > 0) {
        setAllInsights(insightsResult.data);
      }
      
      if (entriesResult.data && entriesResult.data.length > 0) {
        setAllEntries(entriesResult.data);
      }

      if (!decryptedResult.error && decryptedResult.data?.entries) {
        setDecryptedEntries(decryptedResult.data.entries);
      }

      if (relationshipsResult.data && relationshipsResult.data.length > 0) {
        setRelationships(relationshipsResult.data);
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildGraph = (insights: any[]) => {
    const itemFreq = new Map<string, number>();
    const itemEntries = new Map<string, Set<string>>();
    const itemTypes = new Map<string, "entity" | "theme" | "keyword">();
    const connections = new Map<string, { entryIds: Set<string>; strength: number; isAIStrength: boolean }>();
    const itemDisplayNames = new Map<string, string>();

    // Build a map of AI relationships first (these are the priority)
    const aiRelationshipMap = new Map<string, { strength: number; entryIds: string[] }>();
    relationships.forEach((rel) => {
      const key = [rel.source_item.toLowerCase(), rel.target_item.toLowerCase()].sort().join("||");
      aiRelationshipMap.set(key, {
        strength: rel.strength,
        entryIds: rel.entry_ids || []
      });
    });

    // Category colors for unified "all" view
    const categoryColors = {
      entity: "#8B5CF6",   // Purple
      theme: "#10B981",    // Emerald
      keyword: "#F59E0B",  // Amber
    };

    // Helper to split items containing "and" or "&"
    const splitItem = (item: string): string[] => {
      return item.split(/\s+(?:and|&)\s+/i).map(s => s.trim()).filter(s => s.length > 0);
    };

    // Extract items based on current tab
    insights.forEach((insight) => {
      const displayNames = new Map<string, string>();
      
      const processItems = (items: string[], type: "entity" | "theme" | "keyword") => {
        const processedItems: string[] = [];
        items.forEach((item) => {
          // Split items containing "and" or "&"
          const subItems = splitItem(item);
          subItems.forEach((subItem) => {
            const normalizedItem = subItem.toLowerCase();
            if (!displayNames.has(normalizedItem)) {
              displayNames.set(normalizedItem, subItem);
            }
            itemFreq.set(normalizedItem, (itemFreq.get(normalizedItem) || 0) + 1);
            if (!itemTypes.has(normalizedItem)) {
              itemTypes.set(normalizedItem, type);
            }
            if (!itemEntries.has(normalizedItem)) {
              itemEntries.set(normalizedItem, new Set());
            }
            itemEntries.get(normalizedItem)?.add(insight.entry_id);
            processedItems.push(subItem);
          });
        });
        return processedItems;
      };

      let allItems: string[] = [];
      
      if (activeTab === "all") {
        // Collect from all categories
        const entities = processItems((insight.entities as string[]) || [], "entity");
        const themes = processItems((insight.themes as string[]) || [], "theme");
        const keywords = processItems((insight.keywords as string[]) || [], "keyword");
        allItems = [...entities, ...themes, ...keywords];
      } else if (activeTab === "entities") {
        allItems = processItems((insight.entities as string[]) || [], "entity");
      } else if (activeTab === "themes") {
        allItems = processItems((insight.themes as string[]) || [], "theme");
      } else {
        allItems = processItems((insight.keywords as string[]) || [], "keyword");
      }

      // Build connections - prioritize AI relationships, fallback to co-occurrence
      allItems.forEach((item1, i) => {
        allItems.slice(i + 1).forEach((item2) => {
          const key = [item1.toLowerCase(), item2.toLowerCase()].sort().join("||");
          const aiRel = aiRelationshipMap.get(key);
          
          if (!connections.has(key)) {
            if (aiRel) {
              connections.set(key, {
                entryIds: new Set([...aiRel.entryIds, insight.entry_id]),
                strength: aiRel.strength,
                isAIStrength: true
              });
            } else {
              connections.set(key, { entryIds: new Set([insight.entry_id]), strength: 1, isAIStrength: false });
            }
          } else {
            const conn = connections.get(key)!;
            conn.entryIds.add(insight.entry_id);
            if (!conn.isAIStrength) {
              conn.strength = conn.entryIds.size;
            }
          }
        });
      });
      
      displayNames.forEach((display, normalized) => {
        if (!itemDisplayNames.has(normalized)) {
          itemDisplayNames.set(normalized, display);
        }
      });
    });

    // Add any AI relationships that weren't found via co-occurrence
    aiRelationshipMap.forEach((rel, key) => {
      if (!connections.has(key)) {
        connections.set(key, {
          entryIds: new Set(rel.entryIds),
          strength: rel.strength,
          isAIStrength: true
        });
      }
    });

    // Build initial nodes list
    let nodes: GraphNode[] = [];
    const getColor = (type: "entity" | "theme" | "keyword") => {
      if (activeTab === "all") {
        return categoryColors[type];
      }
      const colors = {
        entity: "hsl(var(--primary))",
        theme: "hsl(var(--accent))",
        keyword: "hsl(var(--secondary))",
      };
      return colors[type];
    };

    // Calculate AI connection count for each item (for relevance scoring)
    const aiConnectionCounts = new Map<string, number>();
    connections.forEach((connData, key) => {
      if (connData.isAIStrength) {
        const [sourceId, targetId] = key.split("||");
        aiConnectionCounts.set(sourceId, (aiConnectionCounts.get(sourceId) || 0) + 1);
        aiConnectionCounts.set(targetId, (aiConnectionCounts.get(targetId) || 0) + 1);
      }
    });

    itemFreq.forEach((count, normalizedName) => {
      const entryIds = Array.from(itemEntries.get(normalizedName) || []);
      const displayName = itemDisplayNames.get(normalizedName) || normalizedName;
      const type = itemTypes.get(normalizedName) || "keyword";
      const aiConnections = aiConnectionCounts.get(normalizedName) || 0;
      
      // Relevance score: (frequency × 2) + (aiConnectionCount × 5)
      const relevanceScore = (count * 2) + (aiConnections * 5);
      
      // Smaller nodes in "all" tab for better visibility
      const sizeMultiplier = activeTab === "all" ? 5 : 8;
      const minSize = activeTab === "all" ? 10 : 15;
      
      nodes.push({
        id: normalizedName,
        name: displayName,
        value: Math.max(count * sizeMultiplier, minSize),
        type,
        color: getColor(type),
        entryIds,
        relevanceScore
      } as GraphNode & { relevanceScore: number });
    });

    // For "all" tab, filter to top 10 most relevant nodes
    if (activeTab === "all") {
      nodes = (nodes as (GraphNode & { relevanceScore: number })[])
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10);
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links: GraphLink[] = [];
    
    connections.forEach((connData, key) => {
      const [sourceId, targetId] = key.split("||");
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      const strength = connData.strength || connData.entryIds.size;
      
      if (sourceNode && targetNode && strength >= minStrength) {
        links.push({
          source: sourceNode,
          target: targetNode,
          value: strength,
          isAIStrength: connData.isAIStrength,
        });
      }
    });

    // Filter out nodes with no connections
    const connectedNodeIds = new Set<string>();
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    });
    
    const filteredNodes = nodes.filter(node => connectedNodeIds.has(node.id));

    setGraphData({ nodes: filteredNodes, links });
  };

  const generateInsights = (nodes: GraphNode[], links: GraphLink[]) => {
    const insights: string[] = [];
    
    if (nodes.length === 0 || links.length === 0) {
      setConnectionInsights([]);
      return;
    }

    // Find strongest connections
    const sortedLinks = [...links].sort((a, b) => (b.value || 0) - (a.value || 0));
    
    // Top 2 strongest connections (skip duplicates where source === target)
    let connectionCount = 0;
    for (const link of sortedLinks) {
      if (connectionCount >= 2) break;
      const sourceName = typeof link.source === 'object' ? link.source.name : link.source;
      const targetName = typeof link.target === 'object' ? link.target.name : link.target;
      // Skip if same item (case insensitive)
      if (sourceName.toLowerCase() === targetName.toLowerCase()) continue;
      insights.push(`"${sourceName}" and "${targetName}" appear together frequently`);
      connectionCount++;
    }
    
    // Most connected node
    const nodeConnectionCounts = new Map<string, number>();
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      nodeConnectionCounts.set(sourceId, (nodeConnectionCounts.get(sourceId) || 0) + 1);
      nodeConnectionCounts.set(targetId, (nodeConnectionCounts.get(targetId) || 0) + 1);
    });
    
    const mostConnected = nodes.reduce((max, node) => {
      const count = nodeConnectionCounts.get(node.id) || 0;
      return count > (nodeConnectionCounts.get(max?.id || '') || 0) ? node : max;
    }, nodes[0]);
    
    if (mostConnected) {
      const count = nodeConnectionCounts.get(mostConnected.id) || 0;
      const typeLabel = activeTab === 'all' ? 'item' : activeTab === 'entities' ? 'entity' : activeTab === 'themes' ? 'theme' : 'keyword';
      insights.push(`"${mostConnected.name}" is your most connected ${typeLabel} with ${count} connections`);
    }

    // Total node count insight
    if (nodes.length > 3) {
      insights.push(`${nodes.length} ${activeTab} are interconnected in your journal`);
    }
    
    setConnectionInsights(insights.slice(0, 4));
  };

  const handleShowAll = () => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const bounds = svg.select("g").node() as SVGGElement;
    if (!bounds) return;
    
    const bbox = bounds.getBBox();
    const width = 800;
    const height = 600;
    const padding = 50;
    
    const scale = Math.min(
      (width - padding * 2) / bbox.width,
      (height - padding * 2) / bbox.height,
      1
    );
    
    const translateX = (width - bbox.width * scale) / 2 - bbox.x * scale;
    const translateY = (height - bbox.height * scale) / 2 - bbox.y * scale;
    
    svg.transition().duration(750).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(scale)
    );
  };

  const handleCenterOnLargest = () => {
    if (!svgRef.current || !zoomRef.current || graphData.nodes.length === 0) return;
    
    // Find largest node by value
    const largestNode = graphData.nodes.reduce((max, node) => 
      node.value > max.value ? node : max, graphData.nodes[0]);
    
    // Get actual position from D3 simulation (nodes are mutated by D3)
    const svg = d3.select(svgRef.current);
    const nodeSelection = svg.selectAll<SVGGElement, GraphNode>("g")
      .filter((d: GraphNode) => d.id === largestNode.id);
    
    if (nodeSelection.empty()) return;
    
    const nodeData = nodeSelection.datum() as GraphNode;
    if (nodeData.x === undefined || nodeData.y === undefined) return;
    
    const width = 800;
    const height = 600;
    
    svg.transition().duration(750).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(width / 2 - nodeData.x, height / 2 - nodeData.y).scale(1.5)
    );
  };

  const handleRefreshAnalysis = async () => {
    setRefreshingAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-patterns");
      
      if (error) throw error;
      
      toast({
        title: "Analysis complete",
        description: "Pattern analysis has been refreshed with AI-determined strengths",
      });
      
      // Refetch the data to get updated relationships
      await fetchGraphData();
    } catch (error) {
      console.error("Error refreshing analysis:", error);
      toast({
        title: "Analysis failed",
        description: "Failed to refresh pattern analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshingAnalysis(false);
    }
  };

  const exportAsPNG = async () => {
    if (!graphContainerRef.current) return;
    
    try {
      const dataUrl = await toPng(graphContainerRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `knowledge-graph-${activeTab}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: "Export successful",
        description: "Graph exported as PNG",
      });
    } catch (error) {
      console.error("Error exporting PNG:", error);
      toast({
        title: "Export failed",
        description: "Failed to export graph as PNG",
        variant: "destructive",
      });
    }
  };

  const exportAsPDF = async () => {
    if (!graphContainerRef.current) return;
    
    try {
      const dataUrl = await toPng(graphContainerRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [800, 600],
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, 800, 600);
      pdf.save(`knowledge-graph-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Export successful",
        description: "Graph exported as PDF",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export failed",
        description: "Failed to export graph as PDF",
        variant: "destructive",
      });
    }
  };

  const renderGraph = () => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Responsive dimensions
    const container = svgRef.current.parentElement;
    const width = Math.min(container?.clientWidth || 800, 800);
    const height = Math.min(width * 0.75, 600); // Maintain aspect ratio

    svg
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Add zoom behavior
    const g = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        // Scale text with zoom for better legibility, with reasonable bounds
        const fontSize = Math.max(10, Math.min(20, 12 * event.transform.k));
        g.selectAll("text").attr("font-size", `${fontSize}px`);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    const simulation = d3
      .forceSimulation(graphData.nodes)
      .force(
        "link",
        d3
          .forceLink(graphData.links)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => d.value + 5));

    const link = g
      .append("g")
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", (d: any) => Math.sqrt(d.value));

    const node = g
      .append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(
        d3.drag<any, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node
      .append("circle")
      .attr("r", (d) => d.value)
      .attr("fill", (d) => d.color)
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 2);

    node
      .append("text")
      .text((d) => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -(d.value + 8))
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("fill", "hsl(var(--foreground))")
      .attr("pointer-events", "none");

    // Add hover and click effects
    node
      .style("cursor", "pointer")
      .on("mouseenter", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", d.value * 1.2)
          .attr("stroke-width", 3);
      })
      .on("mouseleave", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", d.value)
          .attr("stroke-width", 2);
      })
      .on("click", function(event, d) {
        event.stopPropagation();
        setSelectedNode(d);
        setIsSheetOpen(true);
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hasMinimumData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Knowledge Graph
          </CardTitle>
          <CardDescription>Visualize connections in your journal</CardDescription>
        </CardHeader>
        <CardContent>
          <InsufficientDataPrompt
            currentEntries={totalEntries}
            deepEntries={deepEntries}
            analyzedEntries={analyzedEntries}
            needsAnalysis={needsAnalysis}
          />
        </CardContent>
      </Card>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Knowledge Graph
          </CardTitle>
          <CardDescription>Visualize connections in your journal</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Start analyzing entries to see your knowledge graph
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Knowledge Graph
          </CardTitle>
          <CardDescription>
            Explore connections between {activeTab === 'all' ? 'your top items' : activeTab} in your journal. Click on nodes to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
              <TabsTrigger value="themes">Themes</TabsTrigger>
              <TabsTrigger value="keywords">Keywords</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab}>
              <div className="relative w-full bg-background/50 rounded-lg border p-2 sm:p-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                  <div className="w-full sm:flex-1 sm:min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">
                        Connection Strength: {minStrength}
                      </label>
                      {graphData.nodes.length === 0 && minStrength > 1 && (
                        <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                          No connections at this level
                        </Badge>
                      )}
                    </div>
                    <Slider
                      value={[minStrength]}
                      onValueChange={(value) => {
                        const newValue = value[0];
                        if (newValue >= 1 && newValue <= 3) {
                          setMinStrength(newValue);
                        }
                      }}
                      min={1}
                      max={3}
                      step={1}
                      className="w-full"
                      aria-label="Filter connections by minimum strength"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Increase this if there are too many nodes to navigate
                    </p>
                    {graphData.nodes.length === 0 && minStrength > 1 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Try lowering the filter to see more connections
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCenterOnLargest}
                      className="gap-2"
                    >
                      <Target className="h-4 w-4" />
                      Center Largest
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowAll}
                      className="gap-2"
                    >
                      <Maximize2 className="h-4 w-4" />
                      Show All
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportAsPNG} className="gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Export as PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportAsPDF} className="gap-2">
                          <FileDown className="h-4 w-4" />
                          Export as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Category description based on active tab */}
                <div className="p-3 mb-4 bg-muted/30 border border-border rounded-lg">
                  {activeTab === "all" && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Top 10 most connected items across all categories:</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                          <span className="text-muted-foreground">Entities (people, places, things)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                          <span className="text-muted-foreground">Themes (abstract topics)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                          <span className="text-muted-foreground">Keywords (significant terms)</span>
                        </span>
                      </div>
                    </div>
                  )}
                  {activeTab === "entities" && (
                    <p className="text-sm text-muted-foreground">
                      Specific people, places, events, and concrete things mentioned in your entries
                    </p>
                  )}
                  {activeTab === "themes" && (
                    <p className="text-sm text-muted-foreground">
                      Overarching abstract topics and patterns that connect your experiences
                    </p>
                  )}
                  {activeTab === "keywords" && (
                    <p className="text-sm text-muted-foreground">
                      Significant individual words and terms that appear frequently in your writing
                    </p>
                  )}
                </div>

                {graphData.nodes.length === 0 && !loading ? (
                  <div className="flex justify-center items-center h-[600px] bg-muted/20 rounded-lg border mt-4">
                    <div className="text-center p-8">
                      <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">No connections at this strength</p>
                      <p className="text-sm text-muted-foreground">
                        Try lowering the connection strength filter to see more nodes
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center overflow-x-auto" ref={graphContainerRef}>
                    <svg ref={svgRef} className="w-full max-w-full h-auto" style={{ minHeight: "400px" }} />
                  </div>
                )}
              </div>

              {/* Connection Insights */}
              {connectionInsights.length > 0 && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Connection Insights
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {connectionInsights.map((insight, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 bg-card rounded-full border border-border text-sm text-muted-foreground"
                      >
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="text-2xl">{selectedNode.name}</span>
                </SheetTitle>
                <SheetDescription>
                  <Badge variant="secondary" className="mt-2">
                    {selectedNode.type}
                  </Badge>
                  <span className="ml-2 text-muted-foreground">
                    Appears in {selectedNode.entryIds.length} {selectedNode.entryIds.length === 1 ? 'entry' : 'entries'}
                  </span>
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-120px)] pr-4">
                <div className="mt-6 space-y-6">
                  <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Connected {activeTab === 'all' ? 'items' : activeTab}
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const connectedNodes = graphData.links
                        .filter((link: any) => 
                          (typeof link.source === 'object' ? link.source.id : link.source) === selectedNode.id ||
                          (typeof link.target === 'object' ? link.target.id : link.target) === selectedNode.id
                        )
                        .map((link: any) => {
                          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                          const connectedId = sourceId === selectedNode.id ? targetId : sourceId;
                          const connectedNode = graphData.nodes.find(n => n.id === connectedId);
                          return { node: connectedNode, strength: link.value, isAIStrength: link.isAIStrength };
                        })
                        .filter(item => item.node)
                        .sort((a, b) => {
                          // Sort by strength descending, then alphabetically by name
                          if (b.strength !== a.strength) return b.strength - a.strength;
                          return a.node!.name.localeCompare(b.node!.name);
                        });

                      return connectedNodes.length > 0 ? (
                        connectedNodes.map(({ node, strength, isAIStrength }: any) => (
                          <div key={node.id} className="flex items-center justify-between p-2 rounded-md bg-accent/30">
                            <span className="font-medium">{node.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Strength: {strength}</Badge>
                              {!isAIStrength && (
                                <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/50">
                                  fallback
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">No connections found</p>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Related Journal Entries
                  </h3>
                  {(() => {
                    const relatedEntries = decryptedEntries.length > 0 
                      ? decryptedEntries.filter(e => selectedNode.entryIds.includes(e.id))
                      : allEntries.filter(e => selectedNode.entryIds.includes(e.id));
                    return relatedEntries.length > 0 ? (
                      <div className="space-y-4">
                        {relatedEntries.map((entry) => (
                        <Card key={entry.id} className="p-4 hover:bg-accent/50 transition-colors">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-base">{entry.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {new Date(entry.entry_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {entry.content}
                            </p>
                          </div>
                        </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No entries found
                      </p>
                    );
                  })()}
                </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
