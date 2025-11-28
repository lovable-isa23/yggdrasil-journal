import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useState } from "react";
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
    src: insightsImage1,
    alt: "AI-powered crisis detection with emergency resources including 988 Suicide & Crisis Lifeline and Crisis Text Line",
    title: "Crisis Safety Support"
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
    src: analyticsImage,
    alt: "Analytics dashboard showing writing trends and statistics",
    title: "Track Your Progress"
  },
  {
    src: reflectionImage,
    alt: "AI-generated reflection prompts",
    title: "Guided Reflections"
  },
  {
    src: sentimentImage,
    alt: "Sentiment tracking over time with emotional patterns",
    title: "Emotional Journey"
  },
  {
    src: graphImage1,
    alt: "Knowledge graph visualization of journal entities",
    title: "Knowledge Connections"
  },
  {
    src: graphImage2,
    alt: "Interactive keyword network visualization",
    title: "Keyword Networks"
  },
  {
    src: patternsImage,
    alt: "Pattern insights showing behavioral trends",
    title: "Pattern Recognition"
  }
];

export const AppShowcase = () => {
  const { elementRef, isVisible } = useIntersectionObserver();
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string; title: string } | null>(null);

  return (
    <>
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl w-full p-0 border-0">
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="w-full h-auto rounded-lg"
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
                        <Carousel className="w-full">
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
