import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const betaBenefits = [
  "Immediate access to graph-powered journaling",
  "Direct influence on feature development",
  "Priority support",
  "Lifetime discount",
];

const waitlistBenefits = [
  "Free access when we launch",
  "Early notification",
  "Behind-the-scenes updates",
];

export const BetaWaitlistCTA = () => {
  const { elementRef, isVisible } = useIntersectionObserver({ threshold: 0.2 });

  return (
    <section 
      id="pricing"
      ref={elementRef}
      className="py-24 px-6 bg-gradient-to-b from-background to-card grain-overlay relative overflow-hidden"
    >
      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Help shape the future of journaling
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Yggdrasil is in early beta. Join our paid beta program to get immediate access 
            and shape development, or join the free waitlist for later access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Beta Access Card */}
          <div
            className={cn(
              "relative p-8 pt-10 rounded-2xl border-2 border-secondary/50 bg-card glass",
              "transition-all duration-700 hover:shadow-emphasis hover:border-secondary",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {/* Badge */}
            <div className="absolute -top-3 left-6 px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Paid Beta
            </div>

            <h3 className="text-xl font-semibold mb-2 mt-2">
              Beta Access
            </h3>

            <div className="mb-4">
              <span className="text-4xl font-bold text-foreground">$5.99</span>
              <p className="text-sm text-muted-foreground mt-1">one-time fee</p>
              <p className="text-xs text-muted-foreground/80 mt-2 italic">
                Early adopter pricing — becomes a monthly subscription at launch.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {betaBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>

            <Button 
              size="lg"
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              onClick={() => window.open('https://book.stripe.com/28E14n0B2bDJ6wE3ojfYY00', '_blank')}
            >
              Join Beta Now
            </Button>
          </div>

          {/* Waitlist Card */}
          <div
            className={cn(
              "relative p-8 pt-10 rounded-2xl border border-border bg-card",
              "transition-all duration-700 hover:shadow-medium hover:border-primary/50",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "150ms" }}
          >
            {/* Badge */}
            <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Free Waitlist
            </div>

            <h3 className="text-xl font-semibold mb-4 mt-2">
              Join the Waitlist
            </h3>

            <ul className="space-y-3 mb-8">
              {waitlistBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>

            <Button 
              size="lg"
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              asChild
            >
              <Link to="/waitlist">Join the Waitlist</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};
