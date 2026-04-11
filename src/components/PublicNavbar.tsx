import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import { YggdrasilLogo } from "@/components/YggdrasilLogo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "Topics", path: "/topics" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

export const PublicNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > window.innerHeight * 0.8);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border py-2 shadow-sm"
          : "bg-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <YggdrasilLogo
            size={isScrolled ? 28 : 36}
            className="transition-all duration-500"
          />
          <span
            className={cn(
              "font-serif font-bold text-foreground transition-all duration-500",
              isScrolled ? "text-lg" : "text-xl"
            )}
          >
            Yggdrasil
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === link.path
                  ? "text-primary"
                  : "text-foreground/70"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-primary/30 hover:border-primary hover:bg-primary/10"
            asChild
          >
            <Link to="/login">Sign In</Link>
          </Button>
        </nav>

        {/* Mobile hamburger */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <nav className="flex flex-col gap-4 mt-8">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-lg font-medium py-2 px-3 rounded-lg transition-colors hover:bg-muted",
                    location.pathname === link.path
                      ? "text-primary bg-primary/5"
                      : "text-foreground/80"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border my-2" />
              <Button className="rounded-full" asChild>
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  Sign In
                </Link>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
