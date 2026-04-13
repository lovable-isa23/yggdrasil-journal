import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";
import { cn } from "@/lib/utils";

export const PublicNavbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Demo", href: "#demo" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-sm border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img
              src={yggdrasilLogo}
              alt="Yggdrasil"
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-bold text-primary">Yggdrasil</span>
          </a>

          <nav className="flex items-center gap-1 sm:gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hidden sm:inline"
              >
                {link.label}
              </a>
            ))}
            <Button size="sm" asChild>
              <Link to="/journal">Open Journal</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};
