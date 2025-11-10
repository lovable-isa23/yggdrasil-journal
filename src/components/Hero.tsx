import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";
import yggdrasilHeroBg from "@/assets/yggdrasil-hero-bg.png";

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
    <section className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${yggdrasilHeroBg})`,
        }}
      />
      
      {/* Translucent overlay for text legibility */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src={yggdrasilLogo} 
              alt="Yggdrasil" 
              className="h-32 w-32 object-contain"
            />
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-br from-earth-brown via-primary to-earth-sage bg-clip-text text-transparent">
              Cultivate Self-Awareness
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Yggdrasil is a journaling platform that transforms your thoughts into visual insights, 
            guiding you on a journey of self-discovery through semantic understanding and AI-powered reflection.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            {isAuthenticated ? (
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-earth-brown hover:scale-105"
                asChild
              >
                <Link to="/journal">Open Journal</Link>
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-earth-brown hover:scale-105"
                  asChild
                >
                  <Link to="/waitlist">Join the Waitlist</Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-6 border-2 hover:bg-muted/50 transition-all duration-300"
                  asChild
                >
                  <Link to="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="text-3xl mb-3">🌿</div>
              <h3 className="font-semibold text-lg mb-2">Semantic Parsing</h3>
              <p className="text-sm text-muted-foreground">
                Extract meaningful entities and keywords from your entries
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="text-3xl mb-3">🌌</div>
              <h3 className="font-semibold text-lg mb-2">Visual Insights</h3>
              <p className="text-sm text-muted-foreground">
                Explore your thoughts through interactive graph visualizations
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="font-semibold text-lg mb-2">AI Guidance</h3>
              <p className="text-sm text-muted-foreground">
                Receive thoughtful, spiritual prompts tailored to your journey
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
