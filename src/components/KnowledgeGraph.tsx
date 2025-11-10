import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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
  const [tooltipData, setTooltipData] = useState<{ node: GraphNode; x: number; y: number } | null>(null);

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
      const [insightsResult, entriesResult] = await Promise.all([
        supabase
          .from("entry_insights")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("journal_entries")
          .select("*")
          .order("created_at", { ascending: false })
      ]);

      if (insightsResult.error) throw insightsResult.error;
      if (entriesResult.error) throw entriesResult.error;

      if (insightsResult.data && insightsResult.data.length > 0) {
        setAllInsights(insightsResult.data);
      }
      
      if (entriesResult.data && entriesResult.data.length > 0) {
        setAllEntries(entriesResult.data);
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
    const connections = new Map<string, Set<string>>();

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
            connections.set(key, new Set());
          }
          connections.get(key)?.add(insight.entry_id);
        });
      });
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
    
    connections.forEach((entryIds, key) => {
      const [sourceId, targetId] = key.split("||");
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      
      if (sourceNode && targetNode) {
        links.push({
          source: sourceNode,
          target: targetNode,
          value: entryIds.size,
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

    // Add hover effects
    node
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Knowledge Graph</CardTitle>
        <CardDescription>
          Explore connections between {activeTab} in your journal. Hover over nodes for details.
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
            <TooltipProvider>
              <div className="relative w-full flex justify-center bg-background/50 rounded-lg border p-4">
                <svg 
                  ref={svgRef} 
                  className="max-w-full"
                  onMouseMove={(e) => {
                    const svg = svgRef.current;
                    if (!svg) return;
                    
                    const rect = svg.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    // Find node under cursor
                    const hoveredNode = graphData.nodes.find(node => {
                      if (!node.x || !node.y) return false;
                      const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
                      return distance <= node.value;
                    });
                    
                    if (hoveredNode) {
                      setTooltipData({ node: hoveredNode, x: e.clientX, y: e.clientY });
                    } else {
                      setTooltipData(null);
                    }
                  }}
                  onMouseLeave={() => setTooltipData(null)}
                />
                {tooltipData && (
                  <div 
                    className="absolute bg-card border border-border rounded-lg shadow-lg p-3 z-50 max-w-xs pointer-events-none"
                    style={{
                      left: tooltipData.x + 10,
                      top: tooltipData.y + 10,
                    }}
                  >
                    <div className="font-semibold text-sm mb-1">{tooltipData.node.name}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Type: {tooltipData.node.type} • Appears {tooltipData.node.entryIds.length}x
                    </div>
                    {tooltipData.node.entries && tooltipData.node.entries.length > 0 && (
                      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        <div className="font-medium mb-1">Found in entries:</div>
                        {tooltipData.node.entries.slice(0, 3).map((entry, idx) => (
                          <div key={idx} className="border-l-2 border-primary pl-2 py-1">
                            <div className="font-medium">{entry.title}</div>
                            <div className="text-muted-foreground text-xs">
                              {new Date(entry.entry_date).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                        {tooltipData.node.entries.length > 3 && (
                          <div className="text-muted-foreground italic">
                            +{tooltipData.node.entries.length - 3} more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TooltipProvider>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
