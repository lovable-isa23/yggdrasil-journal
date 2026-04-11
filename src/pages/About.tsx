import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { YggdrasilLogo } from "@/components/YggdrasilLogo";

const About = () => {
  return (
    <main className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <YggdrasilLogo size={64} className="mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              About Yggdrasil
            </h1>
          </div>

          <div className="prose max-w-none space-y-6 text-muted-foreground leading-relaxed">
            <p className="text-lg">
              In Norse mythology, Yggdrasil is the immense world tree that connects all
              nine realms of existence — a cosmic structure where every branch and root
              sustains life and knowledge.
            </p>

            <p>
              We built Yggdrasil with this metaphor at heart. Your journal entries are
              not isolated pages — they are seeds that grow into an interconnected network
              of understanding. Every person you mention, every emotion you express, every
              pattern that emerges becomes a node in your personal knowledge graph.
            </p>

            <h2 className="text-2xl font-serif font-bold text-foreground mt-12">
              How it works
            </h2>

            <p>
              Write naturally. Yggdrasil's AI reads your entries and automatically
              identifies the people, places, emotions, and themes in your writing. Over
              time, it surfaces patterns you might not notice yourself — connections between
              your work stress and sleep quality, or how certain relationships influence
              your mood.
            </p>

            <h2 className="text-2xl font-serif font-bold text-foreground mt-12">
              A tool for clarity
            </h2>

            <p>
              This isn't about productivity metrics or habit tracking. Yggdrasil is a tool
              for seeing your life more clearly — for understanding the invisible threads
              that connect your experiences and shape who you are becoming.
            </p>

            <p>
              Like the world tree itself, your journal grows richer and more meaningful
              with every entry. The roots deepen, the branches spread, and the view from
              the canopy becomes ever more illuminating.
            </p>
          </div>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
};

export default About;
