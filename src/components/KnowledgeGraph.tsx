import { useEffect, useState, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Loader2 } from "lucide-react";

interface GraphNode {
  id: string;
  name: string;
  val: number;
  type: "entity" | "theme" | "keyword";
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const KnowledgeGraph = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"entities" | "themes" | "keywords">("entities");
  const graphRef = useRef<any>();

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const { data: insights, error } = await supabase
        .from("entry_insights")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (insights && insights.length > 0) {
        buildGraph(insights);
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildGraph = (insights: any[]) => {
    const entityFreq = new Map<string, number>();
    const themeFreq = new Map<string, number>();
    const keywordFreq = new Map<string, number>();
    const connections = new Map<string, Set<string>>();

    // Count frequencies and build connections
    insights.forEach((insight) => {
      const entities = (insight.entities as string[]) || [];
      const themes = (insight.themes as string[]) || [];
      const keywords = (insight.keywords as string[]) || [];

      // Count entities
      entities.forEach((entity) => {
        entityFreq.set(entity, (entityFreq.get(entity) || 0) + 1);
      });

      // Count themes
      themes.forEach((theme) => {
        themeFreq.set(theme, (themeFreq.get(theme) || 0) + 1);
      });

      // Count keywords
      keywords.forEach((keyword) => {
        keywordFreq.set(keyword, (keywordFreq.get(keyword) || 0) + 1);
      });

      // Build connections between items that appear in the same entry
      const allItems = [...entities, ...themes, ...keywords];
      allItems.forEach((item1, i) => {
        allItems.slice(i + 1).forEach((item2) => {
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

    // Create nodes based on active tab
    if (activeTab === "entities") {
      entityFreq.forEach((count, entity) => {
        nodes.push({
          id: entity,
          name: entity,
          val: count * 5,
          type: "entity",
          color: "hsl(var(--primary))",
        });
      });
    } else if (activeTab === "themes") {
      themeFreq.forEach((count, theme) => {
        nodes.push({
          id: theme,
          name: theme,
          val: count * 5,
          type: "theme",
          color: "hsl(var(--accent))",
        });
      });
    } else {
      keywordFreq.forEach((count, keyword) => {
        nodes.push({
          id: keyword,
          name: keyword,
          val: count * 3,
          type: "keyword",
          color: "hsl(var(--secondary))",
        });
      });
    }

    // Create links between nodes that appear together
    const nodeIds = new Set(nodes.map((n) => n.id));
    connections.forEach((entryIds, key) => {
      const [source, target] = key.split("||");
      if (nodeIds.has(source) && nodeIds.has(target)) {
        links.push({
          source,
          target,
          value: entryIds.size,
        });
      }
    });

    setGraphData({ nodes, links });
  };

  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      graphRef.current.d3Force("charge").strength(-200);
      graphRef.current.d3Force("link").distance(100);
    }
  }, [graphData]);

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
          <CardDescription>
            Visualize connections in your journal
          </CardDescription>
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
            <div className="w-full h-[600px] bg-background/50 rounded-lg border">
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel="name"
                nodeColor={(node: any) => node.color}
                nodeVal={(node: any) => node.val}
                linkWidth={(link: any) => Math.sqrt(link.value)}
                linkColor={() => "hsl(var(--border))"}
                backgroundColor="transparent"
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(
                    (n) => n + fontSize * 0.4
                  );

                  ctx.fillStyle = node.color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                  ctx.fill();

                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillStyle = "hsl(var(--background))";
                  ctx.fillText(label, node.x, node.y);
                }}
                cooldownTicks={100}
                onEngineStop={() => {
                  if (graphRef.current) {
                    graphRef.current.zoomToFit(400);
                  }
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
