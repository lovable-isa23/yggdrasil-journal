import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import insightsImage1 from "@/assets/screenshot-insights-1.png";
import analyticsImage from "@/assets/screenshot-analytics.png";
import reflectionImage from "@/assets/screenshot-reflection.png";
import sentimentImage from "@/assets/screenshot-sentiment.png";
import graphImage1 from "@/assets/screenshot-graph-1.png";
import graphImage2 from "@/assets/screenshot-graph-2.png";
import patternsImage from "@/assets/screenshot-patterns.png";
import insightsSummaryImage from "@/assets/screenshot-insights-summary.png";
import insightsAnalysisImage from "@/assets/screenshot-insights-analysis.png";
import insightsThemesImage from "@/assets/screenshot-insights-themes.png";
import insightsSpiritualImage from "@/assets/screenshot-insights-spiritual.png";

interface CarouselImage {
  src: string;
  alt: string;
  caption: string;
}

interface Screenshot {
  src?: string;
  alt: string;
  title: string;
  images?: CarouselImage[];
}

const screenshots: Screenshot[] = [
  {
    src: analyticsImage,
    alt: "Analytics dashboard showing writing trends and statistics",
    title: "Track Your Progress"
  },
  {
    src: sentimentImage,
    alt: "Track your emotional journey over time with intensity graphs, frequent emotion badges, and discover what themes and entities you mention when feeling specific emotions. Understand the patterns behind your feelings.",
    title: "Emotional Journey"
  },
  {
    title: "AI-Powered Insights",
    alt: "Unlock deep understanding with AI-powered summaries, semantic analysis, emotional insights, and spiritual parallels including chakras, tarot archetypes, and sacred geometry—with more to come!",
    images: [
      {
        src: insightsSummaryImage,
        alt: "AI-generated summary",
        caption: "AI-generated summary captures the essence of your entry"
      },
      {
        src: insightsAnalysisImage,
        alt: "Deep analysis with multiple frameworks",
        caption: "Multi-framework insights with patterns, reflections, and action steps"
      },
      {
        src: insightsThemesImage,
        alt: "Themes and emotions extraction",
        caption: "Automatic theme extraction and emotional intensity tracking"
      },
      {
        src: insightsSpiritualImage,
        alt: "Spiritual parallels and connections",
        caption: "Chakra resonance, tarot archetypes, and sacred geometry connections"
      }
    ]
  },
  {
    src: reflectionImage,
    alt: "Receive personalized guidance from Yggi, your AI spiritual companion. Drawing from multiple wisdom traditions including Buddhism, Jungian psychology, and Hermetic philosophy, Yggi offers deep insights into your patterns and growth opportunities.",
    title: "Guided Reflections"
  },
  {
    title: "Knowledge Connections",
    alt: "Map the connections between people, places, themes, and ideas across all your journal entries. Watch your personal knowledge network grow over time.",
    images: [
      {
        src: graphImage1,
        alt: "Entity connections graph",
        caption: "Entity connections: People, places, and things that matter to you"
      },
      {
        src: graphImage2,
        alt: "Theme patterns graph",
        caption: "Theme patterns: Abstract concepts and emotional threads"
      }
    ]
  },
  {
    src: patternsImage,
    alt: "Yggdrasil automatically identifies recurring patterns in your thoughts, emotions, and behaviors across all your entries. Discover deep-seated beliefs, emotional cycles, and cognitive patterns—complete with confidence scores, trend indicators, related keywords, and personalized growth suggestions.",
    title: "Pattern Recognition"
  },
  {
    src: insightsImage1,
    alt: "AI-powered crisis detection with emergency resources including 988 Suicide & Crisis Lifeline and Crisis Text Line",
    title: "Crisis Safety Support"
  }
];

// Carousel dots component
interface CarouselDotsProps {
  count: number;
  api: CarouselApi | undefined;
}

const CarouselDots = ({ count, api }: CarouselDotsProps) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    onSelect();

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const handleDotClick = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  return (
    <div className="flex justify-center gap-2 mt-4">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          onClick={() => handleDotClick(index)}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            index === current
              ? "bg-primary w-4"
              : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
          }`}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
};

export const AppShowcase = () => {
  const { elementRef, isVisible } = useIntersectionObserver();
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string; title: string } | null>(null);
  const [carouselApis, setCarouselApis] = useState<Record<number, CarouselApi>>({});

  const setCarouselApi = useCallback((index: number, api: CarouselApi) => {
    setCarouselApis(prev => ({ ...prev, [index]: api }));
  }, []);

  return (
    <>
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl w-full p-0 border-0">
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="w-full max-h-[90vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-6">
                <h3 className="text-xl font-semibold text-foreground">
                  {selectedImage.title}
                </h3>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <section 
        ref={elementRef}
        className="py-24 px-6 bg-gradient-to-b from-muted/30 to-background"
      >
        <div className="container mx-auto max-w-7xl">
          <div 
            className={`text-center mb-16 space-y-4 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="bg-gradient-to-r from-earth-brown to-primary bg-clip-text text-transparent">
                Experience the Platform
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how Yggdrasil transforms your journaling into meaningful insights
            </p>
          </div>

          <div className="space-y-16">
            {screenshots.map((screenshot, index) => {
              const isEven = index % 2 === 0;
              const hasCarousel = !!screenshot.images;
              
              return (
                <div
                  key={index}
                  className={`transition-all duration-700 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{
                    transitionDelay: `${index * 150}ms`
                  }}
                >
                  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${isEven ? '' : 'lg:grid-flow-dense'}`}>
                    {/* Image or Carousel */}
                    <div className={`${isEven ? '' : 'lg:col-start-2'}`}>
                      {hasCarousel ? (
                        <div>
                          <Carousel 
                            className="w-full" 
                            setApi={(api) => setCarouselApi(index, api)}
                          >
                            <CarouselContent>
                              {screenshot.images!.map((image, imgIndex) => (
                                <CarouselItem key={imgIndex}>
                                  <div 
                                    className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer"
                                    onClick={() => setSelectedImage({ src: image.src, alt: image.alt, title: image.caption })}
                                  >
                                    <div className="aspect-[16/10] overflow-hidden">
                                      <img
                                        src={image.src}
                                        alt={image.alt}
                                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                                      <p className="text-sm text-foreground font-medium">
                                        {image.caption}
                                      </p>
                                    </div>
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <CarouselPrevious className="left-2" />
                            <CarouselNext className="right-2" />
                          </Carousel>
                          <CarouselDots count={screenshot.images!.length} api={carouselApis[index]} />
                        </div>
                      ) : (
                        <div 
                          className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer"
                          onClick={() => setSelectedImage({ src: screenshot.src!, alt: screenshot.alt, title: screenshot.title })}
                        >
                          <div className="aspect-[16/10] overflow-hidden">
                            <img
                              src={screenshot.src}
                              alt={screenshot.alt}
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Caption */}
                    <div className={`space-y-4 ${isEven ? '' : 'lg:col-start-1 lg:row-start-1'}`}>
                      <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-earth-brown to-primary bg-clip-text text-transparent">
                        {screenshot.title}
                      </h3>
                      <p className="text-lg text-muted-foreground">
                        {screenshot.alt}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};
