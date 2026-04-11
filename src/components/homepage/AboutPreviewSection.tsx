import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const AboutPreviewSection = () => {
  const { elementRef, isVisible } = useIntersectionObserver({ threshold: 0.2 });

  return (
    <section
      ref={elementRef}
      className="py-24 px-6 bg-background"
    >
      <div className="container mx-auto max-w-4xl">
        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-2 gap-12 items-center transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Text */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
              Rooted in meaning,
              <br />
              <span className="text-primary">branching toward insight</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Like the world tree Yggdrasil that connects all realms of existence,
              your journal entries form a living network of thoughts, people, and
              experiences. Each entry plants a seed. Over time, patterns emerge
              — branches of understanding that help you see your life more clearly.
            </p>
            <Button
              variant="outline"
              className="rounded-full border-primary/30 hover:border-primary hover:bg-primary/10"
              asChild
            >
              <Link to="/about">Learn more</Link>
            </Button>
          </div>

          {/* Mini tree SVG */}
          <div className="flex justify-center">
            <svg
              viewBox="0 0 200 240"
              className="w-48 h-56 md:w-64 md:h-72"
              aria-hidden
            >
              {/* Trunk */}
              <path
                d="M100 220 L100 100"
                stroke="hsl(var(--foreground))"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                className={cn(isVisible && "animate-draw-line")}
                style={{ strokeDasharray: 200 }}
              />
              {/* Branches */}
              <path d="M100 140 Q70 120, 40 80" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
              <path d="M100 140 Q130 120, 160 80" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
              <path d="M100 120 Q80 100, 55 60" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
              <path d="M100 120 Q120 100, 145 60" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
              <path d="M100 105 Q90 85, 75 45" stroke="hsl(var(--foreground))" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
              <path d="M100 105 Q110 85, 125 45" stroke="hsl(var(--foreground))" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />

              {/* Roots */}
              <path d="M100 220 Q80 230, 55 235" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
              <path d="M100 220 Q120 230, 145 235" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />

              {/* Nodes */}
              {[
                { cx: 40, cy: 80, r: 6 },
                { cx: 160, cy: 80, r: 6 },
                { cx: 55, cy: 60, r: 5 },
                { cx: 145, cy: 60, r: 5 },
                { cx: 75, cy: 45, r: 4 },
                { cx: 125, cy: 45, r: 4 },
                { cx: 100, cy: 30, r: 7 },
              ].map((n, i) => (
                <g key={i}>
                  <circle cx={n.cx} cy={n.cy} r={n.r + 4} fill="hsl(var(--primary))" opacity="0.15" />
                  <circle cx={n.cx} cy={n.cy} r={n.r} fill="hsl(var(--primary))" />
                </g>
              ))}

              {/* Root nodes */}
              <circle cx="55" cy="235" r="3.5" fill="hsl(var(--accent))" />
              <circle cx="145" cy="235" r="3.5" fill="hsl(var(--accent))" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
