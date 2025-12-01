import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const annotations = [
  { x: 18, y: 25, text: "This cluster is your career journey", align: "left" as const },
  { x: 75, y: 40, text: "These bridges connect health and work themes", align: "right" as const },
  { x: 35, y: 70, text: "Notice how relationships evolve here", align: "left" as const },
];

const sampleNodes = [
  // Career cluster
  { id: "work", x: 150, y: 120, size: 18, color: "hsl(var(--graph-activities))", label: "Work" },
  { id: "project", x: 100, y: 90, size: 12, color: "hsl(var(--graph-activities))", label: "Project" },
  { id: "deadline", x: 180, y: 80, size: 10, color: "hsl(var(--graph-emotions))", label: "Deadline" },
  { id: "success", x: 130, y: 160, size: 14, color: "hsl(var(--graph-insights))", label: "Success" },
  
  // Health cluster
  { id: "exercise", x: 380, y: 100, size: 14, color: "hsl(var(--graph-relationships))", label: "Exercise" },
  { id: "sleep", x: 420, y: 140, size: 12, color: "hsl(var(--graph-relationships))", label: "Sleep" },
  { id: "energy", x: 350, y: 150, size: 10, color: "hsl(var(--graph-emotions))", label: "Energy" },
  
  // Relationship cluster
  { id: "sarah", x: 200, y: 280, size: 16, color: "hsl(var(--graph-relationships))", label: "Sarah" },
  { id: "coffee", x: 160, y: 320, size: 10, color: "hsl(var(--graph-activities))", label: "Coffee" },
  { id: "family", x: 250, y: 310, size: 14, color: "hsl(var(--graph-relationships))", label: "Family" },
  { id: "joy", x: 210, y: 350, size: 12, color: "hsl(var(--graph-emotions))", label: "Joy" },
  
  // Bridge nodes
  { id: "stress", x: 280, y: 130, size: 12, color: "hsl(var(--graph-emotions))", label: "Stress" },
  { id: "balance", x: 300, y: 200, size: 10, color: "hsl(var(--graph-insights))", label: "Balance" },
];

const sampleConnections = [
  // Career cluster
  { source: "work", target: "project" },
  { source: "work", target: "deadline" },
  { source: "work", target: "success" },
  { source: "project", target: "deadline" },
  
  // Health cluster
  { source: "exercise", target: "sleep" },
  { source: "exercise", target: "energy" },
  { source: "sleep", target: "energy" },
  
  // Relationship cluster
  { source: "sarah", target: "coffee" },
  { source: "sarah", target: "family" },
  { source: "family", target: "joy" },
  { source: "sarah", target: "joy" },
  
  // Bridges
  { source: "work", target: "stress" },
  { source: "stress", target: "exercise" },
  { source: "stress", target: "balance" },
  { source: "balance", target: "family" },
  { source: "energy", target: "work" },
];

export const GraphSnapshotSection = () => {
  const { elementRef, isVisible } = useIntersectionObserver({ threshold: 0.1 });
  const [animatedNodes, setAnimatedNodes] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (isVisible) {
      // Animate nodes appearing one by one
      sampleNodes.forEach((node, index) => {
        setTimeout(() => {
          setAnimatedNodes(prev => [...prev, node.id]);
        }, index * 100);
      });
    }
  }, [isVisible]);

  const getNodeById = (id: string) => sampleNodes.find(n => n.id === id);

  return (
    <section 
      ref={elementRef}
      className="py-24 px-6 bg-card grain-overlay relative overflow-hidden"
    >
      <div className="container mx-auto max-w-6xl relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Your journal becomes a living landscape
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Watch as your thoughts, relationships, and experiences weave together into patterns you can explore
        </p>

        <div className="relative bg-background/50 rounded-3xl border border-border p-4 md:p-8 overflow-hidden">
          {/* SVG Graph */}
          <svg 
            ref={svgRef}
            className="w-full h-[300px] md:h-[400px]" 
            viewBox="0 0 500 400"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Connections */}
            {sampleConnections.map((conn, i) => {
              const source = getNodeById(conn.source);
              const target = getNodeById(conn.target);
              if (!source || !target) return null;
              
              const isSourceVisible = animatedNodes.includes(conn.source);
              const isTargetVisible = animatedNodes.includes(conn.target);
              
              return (
                <line
                  key={i}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  className={cn(
                    "transition-opacity duration-500",
                    isSourceVisible && isTargetVisible ? "opacity-40" : "opacity-0"
                  )}
                />
              );
            })}

            {/* Nodes */}
            {sampleNodes.map((node) => {
              const isNodeVisible = animatedNodes.includes(node.id);
              
              return (
                <g key={node.id}>
                  {/* Glow */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 8}
                    fill={node.color}
                    opacity={isNodeVisible ? 0.2 : 0}
                    className="transition-opacity duration-500"
                  />
                  {/* Pulse ring */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 4}
                    fill="none"
                    stroke={node.color}
                    strokeWidth="1"
                    opacity={isNodeVisible ? 0.3 : 0}
                    className={cn(
                      "transition-opacity duration-500",
                      isNodeVisible && "animate-pulse-slow"
                    )}
                  />
                  {/* Core */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size}
                    fill={node.color}
                    className={cn(
                      "transition-all duration-500",
                      isNodeVisible ? "opacity-100" : "opacity-0 scale-0"
                    )}
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  />
                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + node.size + 14}
                    textAnchor="middle"
                    className={cn(
                      "fill-muted-foreground text-[10px] font-medium transition-opacity duration-500",
                      isNodeVisible ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Annotations */}
          {annotations.map((annotation, index) => (
            <div
              key={index}
              className={cn(
                "absolute hidden md:block max-w-[180px] p-3 rounded-lg bg-card/90 backdrop-blur-sm border border-border shadow-soft",
                "transition-all duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                transitionDelay: `${800 + index * 200}ms`,
                transform: annotation.align === "right" ? "translateX(-100%)" : undefined,
              }}
            >
              <p className="text-xs text-foreground leading-relaxed">
                {annotation.text}
              </p>
              {/* Arrow pointer */}
              <div 
                className={cn(
                  "absolute w-3 h-3 bg-card/90 border-l border-t border-border rotate-45",
                  annotation.align === "left" ? "-right-1.5 top-4" : "-left-1.5 top-4"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
