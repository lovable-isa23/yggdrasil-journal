import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

const JourneyCard = ({ step, index }: { step: any; index: number }) => {
  const { elementRef, isVisible } = useIntersectionObserver();

  return (
    <div 
      ref={elementRef}
      className={`relative group transition-all duration-700 ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        transitionDelay: `${index * 150}ms`
      }}
    >
      <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-medium h-full flex flex-col">
        <div className="text-5xl mb-2">{step.icon}</div>
        <div className="text-sm font-mono text-primary font-bold">{step.number}</div>
        <h3 className="text-xl font-semibold">{step.title}</h3>
        <p className="text-sm text-muted-foreground flex-grow">{step.description}</p>
      </div>
      
      {/* Connecting line for desktop */}
      {index < 2 && (
        <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
      )}
    </div>
  );
};

export const UserJourney = () => {
  const steps = [
    {
      number: "01",
      title: "Journal",
      description: "Log in and create journal entries with personalized AI-generated prompts guiding your reflection",
      icon: "✍️"
    },
    {
      number: "02",
      title: "Visualize",
      description: "See your thoughts and reflections come alive through interactive semantic knowledge graphs",
      icon: "🌐"
    },
    {
      number: "03",
      title: "Grow",
      description: "Cultivate self-awareness and personal growth with tailored insights from your journaling journey",
      icon: "🌱"
    }
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="bg-gradient-to-r from-earth-brown to-primary bg-clip-text text-transparent">
              Your Journey
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From discovery to growth, here's how Yggdrasil guides your path to self-awareness
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <JourneyCard key={index} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
