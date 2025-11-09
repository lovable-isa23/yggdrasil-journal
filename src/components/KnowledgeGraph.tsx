import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Loader2 } from "lucide-react";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  value: number;
  type: "entity" | "theme" | "keyword";
  color: string;
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
      const { data: insights, error } = await supabase
        .from("entry_insights")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (insights && insights.length > 0) {
        setAllInsights(insights);
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildGraph = (insights: any[]) => {
    const itemFreq = new Map<string, number>();
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

      // Count frequency
      items.forEach((item) => {
        itemFreq.set(item, (itemFreq.get(item) || 0) + 1);
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
      nodes.push({
        id: name,
        name,
        value: count * 5,
        type: typeMap[activeTab],
        color: getColor(),
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
      .attr("font-size", "11px")
      .attr("fill", "hsl(var(--background))")
      .attr("pointer-events", "none");

    node.append("title").text((d) => `${d.name}\nCount: ${d.value / 5}`);

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
          Explore connections between {activeTab} in your journal
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
            <div className="w-full flex justify-center bg-background/50 rounded-lg border p-4">
              <svg ref={svgRef} className="max-w-full" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
