import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

const Topics = () => {
  const topicClusters = [
    { name: "Personal Growth", nodes: ["Self-reflection", "Habits", "Mindset", "Learning"] },
    { name: "Relationships", nodes: ["Family", "Friends", "Community", "Communication"] },
    { name: "Health & Wellness", nodes: ["Exercise", "Nutrition", "Sleep", "Mental Health"] },
    { name: "Career", nodes: ["Goals", "Skills", "Projects", "Networking"] },
    { name: "Creativity", nodes: ["Writing", "Ideas", "Inspiration", "Expression"] },
    { name: "Spirituality", nodes: ["Meditation", "Gratitude", "Purpose", "Presence"] },
  ];

  return (
    <main className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            Topics
          </h1>
          <p className="text-muted-foreground max-w-2xl mb-12">
            Explore the branches of knowledge that grow from journaling practice.
            Each topic is a cluster of interconnected ideas waiting to be discovered.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topicClusters.map((cluster) => (
              <div
                key={cluster.name}
                className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
                  {cluster.name}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {cluster.nodes.map((node) => (
                    <span
                      key={node}
                      className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
};

export default Topics;
