import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

const FeatureCard = ({ feature, index }: { feature: any; index: number }) => {
  const { elementRef, isVisible } = useIntersectionObserver();

  return (
    <div 
      ref={elementRef}
      className={`group relative p-8 rounded-2xl bg-card border border-border hover:border-transparent hover:shadow-emphasis transition-all duration-700 ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        transitionDelay: `${index * 100}ms`
      }}
    >
      {/* Gradient border on hover */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`} />
      <div className="absolute inset-[1px] rounded-2xl bg-card z-0" />
      
      <div className="relative z-10 space-y-4">
        <h3 className="text-xl font-semibold">{feature.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  );
};

export const Features = () => {
  const features = [
    {
      title: "Semantic Understanding",
      description: "Advanced AI parsing extracts entities, themes, and meaningful patterns from your journal entries, revealing connections you might have missed.",
      gradient: "from-earth-brown to-primary"
    },
    {
      title: "Interactive Knowledge Graphs",
      description: "Visualize your thoughts and emotions as an interconnected web, discovering patterns and insights through an intuitive, explorable interface.",
      gradient: "from-primary to-secondary"
    },
    {
      title: "Spiritual AI Guidance",
      description: "Receive thoughtful, nondenominational reflective prompts inspired by holistic wisdom, designed to deepen your self-awareness and growth.",
      gradient: "from-secondary to-earth-teal"
    },
    {
      title: "Markdown Support",
      description: "Express yourself freely with flexible markdown formatting, giving you full control over how you capture your thoughts and reflections.",
      gradient: "from-earth-teal to-earth-brown"
    },
    {
      title: "Offline Journaling",
      description: "Continue your practice anywhere, anytime. Your entries sync automatically when you reconnect, ensuring your journey never stops.",
      gradient: "from-accent to-primary"
    },
    {
      title: "Privacy First",
      description: "Your innermost thoughts deserve protection. Built with security and privacy at the core, your data remains yours alone.",
      gradient: "from-primary to-accent"
    }
  ];

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to transform journaling into a practice of deep self-discovery
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
