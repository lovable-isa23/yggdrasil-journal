import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Loader2, Calendar, FileText, Maximize2, Download, Image as ImageIcon, FileDown, Network } from "lucide-react";
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
}

export const KnowledgeGraph = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"entities" | "themes" | "keywords">("entities");
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
    const connections = new Map<string, { entryIds: Set<string>; strength: number }>();

    // Extract only the items for the current tab type
    insights.forEach((insight) => {
      let items: string[] = [];
      
      if (activeTab === "entities") {
        items = (insight.entities as string[]) || [];
      } else if (activeTab === "themes") {
        items = (insight.themes as string[]) || [];
      } else {
        items = (insight.keywords as string[]) || [];
      }

      // Count frequency and track entry IDs
      items.forEach((item) => {
        itemFreq.set(item, (itemFreq.get(item) || 0) + 1);
        if (!itemEntries.has(item)) {
          itemEntries.set(item, new Set());
        }
        itemEntries.get(item)?.add(insight.entry_id);
      });

      // Build connections only between items of the same type in the same entry
      items.forEach((item1, i) => {
        items.slice(i + 1).forEach((item2) => {
          const key = [item1, item2].sort().join("||");
          if (!connections.has(key)) {
            connections.set(key, { entryIds: new Set(), strength: 1 });
          }
          connections.get(key)!.entryIds.add(insight.entry_id);
        });
      });
    });

    // Enhance connections with AI-discovered relationship strengths
    relationships.forEach((rel) => {
      const key = [rel.source_item, rel.target_item].sort().join("||");
      if (connections.has(key)) {
        const conn = connections.get(key)!;
        conn.strength = rel.strength; // Use AI-determined strength
      } else {
        // Add cross-entry relationships discovered by AI
        connections.set(key, {
          entryIds: new Set(rel.entry_ids || []),
          strength: rel.strength
        });
      }
    });

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const getColor = () => {
      const colors = {
        entities: "hsl(var(--primary))",
        themes: "hsl(var(--accent))",
        keywords: "hsl(var(--secondary))",
      };
      return colors[activeTab];
    };

    const typeMap = {
      entities: "entity" as const,
      themes: "theme" as const,
      keywords: "keyword" as const,
    };

    itemFreq.forEach((count, name) => {
      const entryIds = Array.from(itemEntries.get(name) || []);
      nodes.push({
        id: name,
        name,
        value: Math.max(count * 8, 15),
        type: typeMap[activeTab],
        color: getColor(),
        entryIds
      });
    });

    const nodeIds = new Set(nodes.map((n) => n.id));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    
    connections.forEach((connData, key) => {
      const [sourceId, targetId] = key.split("||");
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      const strength = connData.strength || connData.entryIds.size;
      
      // Filter by minimum strength
      if (sourceNode && targetNode && strength >= minStrength) {
        links.push({
          source: sourceNode,
          target: targetNode,
          value: strength,
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
      .attr("stroke-opacity", 0.6)
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
            Explore connections between {activeTab} in your journal. Click on nodes to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
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
                        if (newValue >= 1 && newValue <= 10) {
                          setMinStrength(newValue);
                        }
                      }}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                      aria-label="Filter connections by minimum strength"
                    />
                    {graphData.nodes.length === 0 && minStrength > 1 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Try lowering the filter to see more connections
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
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
                    Connected {activeTab}
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
                          return { node: connectedNode, strength: link.value };
                        })
                        .filter(item => item.node);

                      return connectedNodes.length > 0 ? (
                        connectedNodes.map(({ node, strength }: any) => (
                          <div key={node.id} className="flex items-center justify-between p-2 rounded-md bg-accent/30">
                            <span className="font-medium">{node.name}</span>
                            <Badge variant="outline">Strength: {strength}</Badge>
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
