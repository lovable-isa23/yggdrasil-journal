import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const WaitlistCTA = () => {
  return (
    <section className="py-24 px-6 bg-gradient-to-br from-accent via-primary to-secondary relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-earth-brown/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center space-y-8 text-primary-foreground">
          <h2 className="text-4xl md:text-5xl font-bold">
            Begin Your Journey Today
          </h2>
          <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto">
            Join our waitlist for early access to Yggdrasil and discover a new dimension of self-awareness through journaling.
          </p>
          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-background text-foreground hover:bg-background/90 shadow-2xl hover:scale-105 transition-all duration-300"
              onClick={() => window.open('https://book.stripe.com/28E14n0B2bDJ6wE3ojfYY00', '_blank')}
            >
              Join Beta now!
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-10 py-6 bg-background/10 text-primary-foreground border-2 border-background/20 hover:bg-background/20 shadow-xl hover:scale-105 transition-all duration-300"
              asChild
            >
              <Link to="/waitlist">Join Free Waitlist</Link>
            </Button>
          </div>
          <p className="text-sm opacity-75 pt-4">
            Already have an account?{" "}
            <Link to="/login" className="underline hover:opacity-100 transition-opacity">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};
