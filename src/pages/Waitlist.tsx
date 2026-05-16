import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { waitlistSchema, type WaitlistFormData } from "@/lib/validations";
import { Seo } from "@/components/Seo";

const Waitlist = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
  });

  const onSubmit = async (data: WaitlistFormData) => {
    try {
      const { error } = await supabase
        .from("waitlist")
        .insert([{ 
          email: data.email, 
          name: data.name || null 
        }]);

      if (error) throw error;

      toast.success("You're on the list! We'll be in touch soon.");
      reset();
    } catch (error: any) {
      if (error.message.includes("duplicate key")) {
        toast.error("This email is already on the waitlist!");
      } else {
        toast.error(error.message || "Failed to join waitlist");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-background via-muted/30 to-background relative overflow-hidden">
      <Seo title="Join the Waitlist — Yggdrasil" description="Be among the first to experience transformative semantic journaling with Yggdrasil." path="/waitlist" />
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--earth-brown)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img 
              src={yggdrasilLogo} 
              alt="Yggdrasil" 
              className="h-20 w-20 object-contain mx-auto drop-shadow-xl hover:scale-105 transition-transform duration-300"
            />
          </Link>
          <h1 className="text-3xl font-bold mb-2">Join the Waitlist</h1>
          <p className="text-muted-foreground">
            Be among the first to experience transformative journaling
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-8 rounded-2xl border border-border shadow-medium">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              {...register("name")}
              className="h-12"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              {...register("email")}
              className="h-12"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base bg-gradient-to-r from-primary to-earth-brown hover:scale-[1.02] transition-all duration-300 shadow-soft"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Joining..." : "Join Waitlist"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Waitlist;
