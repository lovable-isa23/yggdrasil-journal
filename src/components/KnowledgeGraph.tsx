import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Loader2, Calendar, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

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
  const [relationships, setRelationships] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    fetchGraphData();
  }, []);

  useEffect(() => {
    if (allInsights.length > 0) {
      buildGraph(allInsights);
    }
  }, [activeTab, allInsights]);

  useEffect(() => {
    if (graphData.nodes.length > 0) {
      renderGraph();
    }
  }, [graphData]);

  const fetchGraphData = async () => {
    try {
      const [insightsResult, entriesResult, relationshipsResult] = await Promise.all([
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
          .order("strength", { ascending: false })
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
        value: Math.max(count * 20, 30),
        type: typeMap[activeTab],
        color: getColor(),
        entryIds,
        entries: allEntries.filter(e => entryIds.includes(e.id))
      });
    });

    const nodeIds = new Set(nodes.map((n) => n.id));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    
    connections.forEach((connData, key) => {
      const [sourceId, targetId] = key.split("||");
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      
      if (sourceNode && targetNode) {
        links.push({
          source: sourceNode,
          target: targetNode,
          value: connData.strength || connData.entryIds.size,
        });
      }
    });

    setGraphData({ nodes, links });
  };

  const renderGraph = () => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;

    svg.attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]);

    // Add zoom behavior
    const g = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

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
      .attr("dy", "0.3em")
      .attr("font-size", "14px")
      .attr("font-weight", "normal")
      .attr("fill", "black")
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

  if (graphData.nodes.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Knowledge Graph</CardTitle>
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
          <CardTitle>Knowledge Graph</CardTitle>
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
              <div className="relative w-full flex justify-center bg-background/50 rounded-lg border p-4">
                <svg ref={svgRef} className="max-w-full" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
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

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Related Journal Entries
                </h3>
                <ScrollArea className="h-[calc(100vh-250px)]">
                  {selectedNode.entries && selectedNode.entries.length > 0 ? (
                    <div className="space-y-4">
                      {selectedNode.entries.map((entry) => (
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
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
