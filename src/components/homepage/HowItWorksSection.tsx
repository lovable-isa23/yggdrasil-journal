import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { PenLine, GitBranch, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: PenLine,
    title: "Write naturally",
    description: "No tags, no structure required. Just write like you always do.",
    color: "text-earth-brown",
    bgColor: "bg-earth-brown/10",
  },
  {
    icon: GitBranch,
    title: "Yggdrasil maps your world",
    description: "We automatically find people, themes, moments, and how they connect.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Compass,
    title: "Get insights and prompts",
    description: "See patterns you missed. Get personalized reflection prompts based on your unique story.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
];

export const HowItWorksSection = () => {
  const { elementRef, isVisible } = useIntersectionObserver({ threshold: 0.2 });

  return (
    <section 
      id="how-it-works"
      ref={elementRef}
      className="py-24 px-6 bg-card grain-overlay relative overflow-hidden"
    >
      <div className="container mx-auto max-w-5xl relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          How It Works
        </h2>

        <div className="relative">
          {/* Connecting line - hidden on mobile */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-earth-brown via-primary to-secondary transform -translate-y-1/2 z-0">
            {/* Animated particles along the line */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-3 h-3 rounded-full bg-primary/50 animate-flow-particle" 
                   style={{ offsetPath: "path('M0,0 L100%,0')" }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className={cn(
                    "flex flex-col items-center text-center transition-all duration-700",
                    isVisible 
                      ? "opacity-100 translate-y-0" 
                      : "opacity-0 translate-y-8"
                  )}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  {/* Step number */}
                  <div className="text-sm font-medium text-muted-foreground mb-4">
                    Step {index + 1}
                  </div>

                  {/* Icon container with pulse effect */}
                  <div 
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center mb-6 relative",
                      step.bgColor,
                      "transition-transform hover:scale-110 duration-300"
                    )}
                  >
                    {/* Pulsing ring */}
                    <div 
                      className={cn(
                        "absolute inset-0 rounded-full animate-pulse-slow",
                        step.bgColor
                      )} 
                    />
                    <Icon className={cn("w-10 h-10 relative z-10", step.color)} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed max-w-xs">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Decorative neural branches */}
      <svg 
        className="absolute bottom-0 left-0 w-full h-24 opacity-10"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0,50 Q200,30 400,50 T800,50 T1200,50"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="animate-draw-line"
        />
        <path
          d="M0,70 Q300,50 600,70 T1200,70"
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="1.5"
          className="animate-draw-line"
          style={{ animationDelay: "0.5s" }}
        />
      </svg>
    </section>
  );
};
