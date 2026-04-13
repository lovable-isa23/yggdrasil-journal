import { useState, useCallback, useRef, useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import yggdrasilHeroBg from "@/assets/yggdrasil-hero-bg.png";

interface Entity {
  name: string;
  type: "person" | "place" | "activity" | "emotion" | "theme";
}

interface Connection {
  source: string;
  target: string;
}

interface DemoResult {
  entities: Entity[];
  connections: Connection[];
  insights: string[];
}

const TYPE_COLORS: Record<string, string> = {
  person: "hsl(var(--graph-relationships))",
  place: "hsl(var(--graph-activities))",
  activity: "hsl(var(--graph-activities))",
  emotion: "hsl(var(--graph-emotions))",
  theme: "hsl(var(--graph-insights))",
};

export const LiveDemoSection = () => {
  const { elementRef, isVisible } = useIntersectionObserver({ threshold: 0.2 });
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isMobile = useIsMobile();

  const parseText = useCallback(async (text: string) => {
    if (text.length < 20) {
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("demo-parse", {
        body: { text: text.slice(0, 500) },
      });

      if (fnError) throw fnError;
      setResult(data);
    } catch (err) {
      console.error("Demo parse error:", err);
      setError("Unable to parse. Try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      parseText(text);
    }, 800);
  }, [parseText]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <section
      id="demo"
      ref={elementRef}
      className="py-24 px-6 grain-overlay relative overflow-hidden"
      style={{
        backgroundImage: `url(${yggdrasilHeroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Semi-transparent overlay for text readability */}
      <div className="absolute inset-0 bg-background/85" />
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Try it yourself
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Type a few sentences about your day and watch your thoughts transform into a visual map
          </p>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-2 gap-8 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Journal Input Panel */}
          <div className="relative">
            {/* Example block above textarea */}
            {!inputText && (
              <div className="mb-4 p-4 rounded-xl border border-border/60 bg-muted/30 italic text-sm text-muted-foreground leading-relaxed">
                <span className="not-italic font-medium text-foreground text-xs uppercase tracking-wide block mb-2">For example:</span>
                "Met Emma for brunch at our favorite café—she's been struggling with her job search and I could see the exhaustion in her eyes. Reminded me of how overwhelmed I felt last year when I was between jobs. Afterward, went for a long walk in the park and felt this unexpected wave of gratitude. Need to text Mom tonight, haven't talked to her in a week."
              </div>
            )}
            <div className="bg-card rounded-2xl border border-border p-6 paper-texture min-h-[300px]">
              <div className="text-xs text-muted-foreground mb-4 flex items-center justify-between">
                <span>Your Journal Entry</span>
                <span>{inputText.length}/500</span>
              </div>
              <textarea
                value={inputText}
                onChange={handleInputChange}
                placeholder="Start typing..."
                className="w-full h-[220px] bg-transparent resize-none border-none focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/60 leading-7"
                maxLength={500}
              />
            </div>
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </div>
            )}
          </div>

          {/* Live Graph Visualization */}
          <div className="bg-card/50 rounded-2xl border border-border p-6 min-h-[300px] relative">
            <div className="text-xs text-muted-foreground mb-4">
              Your Mind Map
            </div>
            
            <GraphVisualization 
              entities={result?.entities || []} 
              connections={result?.connections || []}
              isLoading={isLoading}
            />

            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {!result && !isLoading && !error && inputText.length < 20 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center px-4">
                  Start typing to see your thoughts come alive...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Insight Bubbles */}
        {result?.insights && result.insights.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            {result.insights.map((insight, i) => (
              <div
                key={i}
                className="px-4 py-2 bg-card rounded-full border border-border text-sm text-muted-foreground animate-insight-bubble"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {insight}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const GraphVisualization = ({
  entities,
  connections,
  isLoading,
}: {
  entities: Entity[];
  connections: Connection[];
  isLoading: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (entities.length === 0) {
      setNodePositions(new Map());
      return;
    }

    // Simple force-directed layout
    const positions = new Map<string, { x: number; y: number }>();
    const centerX = 150;
    const centerY = 120;
    
    entities.forEach((entity, i) => {
      const angle = (i / entities.length) * Math.PI * 2;
      const radius = 60 + Math.random() * 40;
      positions.set(entity.name, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    setNodePositions(positions);
  }, [entities]);

  if (entities.length === 0) {
    return null;
  }

  return (
    <svg ref={svgRef} className="w-full h-[200px]" viewBox="0 0 300 240">
      {/* Connections */}
      {connections.map((conn, i) => {
        const sourcePos = nodePositions.get(conn.source);
        const targetPos = nodePositions.get(conn.target);
        if (!sourcePos || !targetPos) return null;

        return (
          <line
            key={i}
            x1={sourcePos.x}
            y1={sourcePos.y}
            x2={targetPos.x}
            y2={targetPos.y}
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
            className="animate-draw-line"
            style={{ 
              strokeDasharray: 200,
              animationDelay: `${i * 100}ms`,
            }}
          />
        );
      })}

      {/* Nodes */}
      {entities.map((entity, i) => {
        const pos = nodePositions.get(entity.name);
        if (!pos) return null;
        const color = TYPE_COLORS[entity.type] || TYPE_COLORS.theme;

        return (
          <g key={entity.name} className="animate-node-appear" style={{ animationDelay: `${i * 80}ms` }}>
            {/* Glow */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={20}
              fill={color}
              opacity={0.2}
            />
            {/* Core */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={10}
              fill={color}
            />
            {/* Label */}
            <text
              x={pos.x}
              y={pos.y + 22}
              textAnchor="middle"
              className="fill-foreground text-[9px] font-medium"
            >
              {entity.name.length > 10 ? entity.name.slice(0, 10) + "..." : entity.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
