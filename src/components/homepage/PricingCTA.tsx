import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const betaBenefits = [
  "Full access to all features",
  "Knowledge graph & AI insights",
  "Priority support & feedback channel",
  "Shape the product roadmap",
];

const waitlistBenefits = [
  "Be first to know at launch",
  "Free tier access when ready",
  "Early adopter perks",
];

export const PricingCTA = () => {
  const { elementRef, isVisible } = useIntersectionObserver({ threshold: 0.15 });
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("waitlist").insert({ email: email.trim() });
      if (error) {
        if (error.code === "23505") {
          toast.info("You're already on the list!");
        } else {
          throw error;
        }
      } else {
        toast.success("You're on the list! We'll be in touch.");
        setEmail("");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section ref={elementRef} className="py-24 px-6 bg-card">
      <div className="container mx-auto max-w-5xl">
        <div
          className={cn(
            "text-center mb-16 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Begin your journey
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Choose the path that suits you. Whether you're ready to dive in or prefer to wait, there's a place for you.
          </p>
        </div>

        {/* Pricing cards */}
        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 transition-all duration-700 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Beta Access */}
          <div className="relative rounded-2xl border-2 border-primary/30 bg-background p-8 shadow-md">
            <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
              Recommended
            </div>
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">Beta Access</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Join the beta today and help shape the future of Yggdrasil.
            </p>
            <ul className="space-y-3 mb-8">
              {betaBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
            <Button
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
              onClick={() => window.open('https://book.stripe.com/28E14n0B2bDJ6wE3ojfYY00', '_blank')}
            >
              Join Beta Now
            </Button>
          </div>

          {/* Waitlist */}
          <div className="rounded-2xl border border-border bg-background p-8">
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">Waitlist</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Not ready yet? Join the waitlist and be first to know when we launch.
            </p>
            <ul className="space-y-3 mb-8">
              {waitlistBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full rounded-full border-foreground/20 hover:border-primary/50 hover:bg-primary/5"
              asChild
            >
              <Link to="/waitlist">Join Waitlist</Link>
            </Button>
          </div>
        </div>

        {/* Newsletter + Contact */}
        <div
          className={cn(
            "max-w-lg mx-auto text-center transition-all duration-700 delay-300",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
            Stay in the loop
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get updates on new features and community insights.
          </p>
          <form onSubmit={handleNewsletter} className="flex gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border-primary/20 focus-visible:ring-accent bg-background"
              required
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 flex-shrink-0"
            >
              {isSubmitting ? "..." : "Subscribe"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            Have questions?{" "}
            <Link to="/contact" className="text-primary hover:underline">
              Get in touch
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};
