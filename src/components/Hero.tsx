import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NeuralNetworkAnimation } from "@/components/homepage/NeuralNetworkAnimation";

export const Hero = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden bg-background grain-overlay">
      <NeuralNetworkAnimation />

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight leading-tight text-foreground">
            A Living Tree
            <br />
            <span className="text-primary">of Ideas</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Explore interconnected thoughts, concepts, and knowledge as a growing world tree.
            Yggdrasil turns your journal into a living map of your mind.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {isAuthenticated ? (
              <Button
                size="lg"
                className="text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                asChild
              >
                <Link to="/journal">Open Journal</Link>
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  onClick={() => window.open('https://book.stripe.com/28E14n0B2bDJ6wE3ojfYY00', '_blank')}
                >
                  Start Exploring
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 rounded-full border-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hover:scale-105"
                  asChild
                >
                  <Link to="/waitlist">Join the Waitlist</Link>
                </Button>
              </>
            )}
          </div>

          {/* Scroll indicator */}
          <div className="pt-12 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 mx-auto flex justify-center">
              <div className="w-1.5 h-3 bg-muted-foreground/30 rounded-full mt-2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Curved organic divider at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <svg
          viewBox="0 0 1440 120"
          className="w-full h-[60px] md:h-[100px]"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0,80 C240,120 480,40 720,70 C960,100 1200,30 1440,60 L1440,120 L0,120 Z"
            fill="hsl(var(--background))"
          />
          <path
            d="M0,85 C240,115 480,50 720,75 C960,100 1200,40 1440,65"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            opacity="0.3"
          />
        </svg>
      </div>
    </section>
  );
};
