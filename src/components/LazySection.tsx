import { useRef, useState, useEffect, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LazySectionProps {
  children: ReactNode;
  height?: string;
  className?: string;
}

export const LazySection = ({ children, height = "200px", className }: LazySectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { rootMargin: "200px", threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!isVisible) {
    return (
      <div ref={ref} className={className}>
        <Skeleton className="w-full rounded-xl" style={{ height }} />
      </div>
    );
  }

  return <div className={className}>{children}</div>;
};
