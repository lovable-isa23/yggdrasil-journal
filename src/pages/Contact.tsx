import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Placeholder — no backend handler yet
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-background relative">
      <PublicNavbar />

      {/* Decorative background nodes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <svg viewBox="0 0 600 800" className="w-full h-full opacity-[0.04]">
          <circle cx="100" cy="200" r="80" fill="hsl(var(--primary))" />
          <circle cx="500" cy="150" r="60" fill="hsl(var(--accent))" />
          <circle cx="300" cy="600" r="100" fill="hsl(var(--primary))" />
          <circle cx="50" cy="500" r="40" fill="hsl(var(--accent))" />
          <circle cx="550" cy="700" r="50" fill="hsl(var(--primary))" />
        </svg>
      </div>

      <div className="pt-24 pb-16 px-6 relative z-10">
        <div className="container mx-auto max-w-lg">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            Contact
          </h1>
          <p className="text-muted-foreground mb-10">
            Have a question, feedback, or just want to say hello? We'd love to hear from you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-foreground mb-1 block">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl border-primary/20 bg-background focus-visible:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground mb-1 block">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl border-primary/20 bg-background focus-visible:ring-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="message" className="text-sm font-medium text-foreground mb-1 block">
                Message
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
                className="rounded-xl border-primary/20 bg-background focus-visible:ring-accent resize-none"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
};

export default Contact;
