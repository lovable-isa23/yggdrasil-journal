import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";
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
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={yggdrasilLogo} 
              alt="Yggdrasil" 
              className="h-24 w-24 md:h-32 md:w-32 object-contain"
              width="128"
              height="128"
              decoding="async"
            />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-earth-brown via-primary to-secondary bg-clip-text text-transparent">
              Turn your journal into a
            </span>
            <br />
            <span className="text-foreground">
              living map of your mind
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Yggdrasil automatically finds the people, themes, and patterns in your writing—then 
            helps you see your life more clearly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {isAuthenticated ? (
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-secondary hover:bg-secondary/90 text-secondary-foreground hover:scale-105 rounded-full"
                asChild
              >
                <Link to="/journal">Open Journal</Link>
              </Button>
            ) : (
              <>
                {/* Primary: Join Beta Now */}
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-secondary hover:bg-secondary/90 text-secondary-foreground hover:scale-105 rounded-full"
                  onClick={() => window.open('https://book.stripe.com/28E14n0B2bDJ6wE3ojfYY00', '_blank')}
                >
                  Join Beta Now
                </Button>
                
                {/* Secondary: Join Waitlist */}
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 rounded-full"
                  asChild
                >
                  <Link to="/waitlist">Join the Waitlist</Link>
                </Button>
                
                {/* Tertiary: Sign In */}
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6 transition-all duration-300 hover:scale-105 rounded-full border-foreground/20 hover:border-foreground/40 hover:bg-foreground/5"
                  asChild
                >
                  <Link to="/login">Sign In</Link>
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
    </section>
  );
};
