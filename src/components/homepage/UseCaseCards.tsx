import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { Users, Lightbulb, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const useCases = [
  {
    icon: Users,
    title: "Understand relationship patterns",
    description: "See who shows up when you're happiest",
    graphLabel: "Friends • Family",
    color: "from-primary/20 to-earth-teal/20",
    iconColor: "text-primary",
    nodes: [
      { x: 30, y: 40, size: 12, color: "hsl(var(--graph-relationships))" },
      { x: 70, y: 35, size: 10, color: "hsl(var(--graph-relationships))" },
      { x: 50, y: 65, size: 8, color: "hsl(var(--graph-emotions))" },
      { x: 25, y: 70, size: 6, color: "hsl(var(--graph-activities))" },
    ],
  },
  {
    icon: Lightbulb,
    title: "Track creative projects",
    description: "Follow your ideas as they evolve",
    graphLabel: "Ideas • Projects",
    color: "from-secondary/20 to-earth-orange/20",
    iconColor: "text-secondary",
    nodes: [
      { x: 20, y: 50, size: 10, color: "hsl(var(--graph-activities))" },
      { x: 45, y: 30, size: 12, color: "hsl(var(--graph-emotions))" },
      { x: 70, y: 45, size: 8, color: "hsl(var(--graph-activities))" },
      { x: 85, y: 60, size: 6, color: "hsl(var(--graph-insights))" },
    ],
  },
  {
    icon: Heart,
    title: "See your emotional seasons",
    description: "Notice what triggers stress or joy",
    graphLabel: "Moods • Patterns",
    color: "from-earth-brown/20 to-secondary/20",
    iconColor: "text-earth-brown",
    nodes: [
      { x: 25, y: 55, size: 10, color: "hsl(var(--graph-emotions))" },
      { x: 50, y: 40, size: 14, color: "hsl(var(--graph-emotions))" },
      { x: 75, y: 50, size: 8, color: "hsl(var(--graph-relationships))" },
      { x: 60, y: 70, size: 6, color: "hsl(var(--graph-insights))" },
    ],
  },
];

const MiniGraph = ({ nodes, isVisible }: { nodes: typeof useCases[0]["nodes"]; isVisible: boolean }) => {
  return (
    <svg className="w-full h-24 mt-4" viewBox="0 0 100 80">
      {/* Connections */}
      {nodes.map((node, i) => 
        nodes.slice(i + 1).map((target, j) => (
          <line
            key={`${i}-${j}`}
            x1={node.x}
            y1={node.y}
            x2={target.x}
            y2={target.y}
            stroke="hsl(var(--border))"
            strokeWidth="1"
            className={cn(
              "transition-all duration-1000",
              isVisible ? "opacity-60" : "opacity-0"
            )}
            style={{ transitionDelay: `${(i + j) * 100}ms` }}
          />
        ))
      )}
      {/* Nodes */}
      {nodes.map((node, i) => (
        <g key={i}>
          {/* Glow */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.size + 4}
            fill={node.color}
            opacity={0.2}
            className={cn(
              "transition-all duration-500",
              isVisible ? "scale-100" : "scale-0"
            )}
            style={{ 
              transformOrigin: `${node.x}px ${node.y}px`,
              transitionDelay: `${i * 150}ms` 
            }}
          />
          {/* Core */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.size / 2}
            fill={node.color}
            className={cn(
              "transition-all duration-500",
              isVisible ? "scale-100" : "scale-0"
            )}
            style={{ 
              transformOrigin: `${node.x}px ${node.y}px`,
              transitionDelay: `${i * 150}ms` 
            }}
          />
        </g>
      ))}
    </svg>
  );
};

export const UseCaseCards = () => {
  const { elementRef, isVisible } = useIntersectionObserver({ threshold: 0.2 });

  return (
    <section 
      ref={elementRef}
      className="py-24 px-6 bg-background grain-overlay"
    >
      <div className="container mx-auto max-w-6xl relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          What You'll Discover
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          Your journal holds more than memories—it holds patterns waiting to be seen
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <div
                key={useCase.title}
                className={cn(
                  "relative p-6 rounded-2xl border border-border bg-card",
                  "hover:shadow-medium transition-all duration-500 hover:-translate-y-1",
                  "overflow-hidden group",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Gradient background */}
                <div 
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity group-hover:opacity-70",
                    useCase.color
                  )} 
                />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="mb-4">
                    <Icon className={cn("w-8 h-8", useCase.iconColor)} />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {useCase.description}
                  </p>

                  {/* Mini graph */}
                  <MiniGraph nodes={useCase.nodes} isVisible={isVisible} />

                  {/* Graph label */}
                  <div className="text-xs text-muted-foreground text-center mt-2">
                    {useCase.graphLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
