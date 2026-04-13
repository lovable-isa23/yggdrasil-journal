import { Users, BarChart3, Quote } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

export const SocialProofSection = () => {
  const { elementRef, isVisible } = useIntersectionObserver({ threshold: 0.2 });

  return (
    <section
      ref={elementRef}
      className={cn(
        "py-12 px-6 border-y border-border/50 bg-muted/20 transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center">
          {/* Left */}
          <div className="flex flex-col items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <p className="text-sm font-medium text-foreground">Join our growing community</p>
          </div>

          {/* Center — Testimonial */}
          <div className="flex flex-col items-center gap-3 px-4">
            <Quote className="h-5 w-5 text-secondary/60" />
            <blockquote className="text-sm italic text-foreground leading-relaxed">
              "The analytics are INCREDIBLY insightful"
            </blockquote>
            <cite className="text-xs text-muted-foreground not-italic">— sny</cite>
          </div>

          {/* Right */}
          <div className="flex flex-col items-center gap-2">
            <BarChart3 className="h-6 w-6 text-secondary" />
            <p className="text-sm font-medium text-foreground">100+ journal entries analyzed</p>
          </div>
        </div>
      </div>
    </section>
  );
};
