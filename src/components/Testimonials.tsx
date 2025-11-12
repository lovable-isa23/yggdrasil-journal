import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Content Creator",
    content: "This is amazing. I really like it. The timeline is sick!",
    rating: 5,
    avatar: "SJ"
  },
  {
    name: "Michael Chen",
    role: "Software Developer",
    content: "The knowledge graph visualization completely changed how I reflect on my thoughts. It's like seeing the connections in my mind come to life.",
    rating: 5,
    avatar: "MC"
  },
  {
    name: "Emily Rodriguez",
    role: "Psychology Student",
    content: "Finally, a journaling app that goes beyond simple note-taking. The AI insights are incredibly perceptive and helpful for my personal growth journey.",
    rating: 5,
    avatar: "ER"
  }
];

export const Testimonials = () => {
  const { elementRef, isVisible } = useIntersectionObserver();

  return (
    <section 
      ref={elementRef}
      className="py-24 px-6 bg-gradient-to-b from-background to-muted/30"
    >
      <div className="container mx-auto max-w-6xl">
        <div 
          className={`text-center mb-16 space-y-4 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="bg-gradient-to-r from-primary via-earth-teal to-earth-sage bg-clip-text text-transparent">
              What Our Users Say
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands who have transformed their journaling experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: `${index * 150}ms`
              }}
            >
              <Card className="h-full hover:shadow-medium transition-all duration-300 border-border/50">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
