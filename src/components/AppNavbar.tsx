import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { PenLine, FileText, Target, BarChart3, Settings, LogOut } from "lucide-react";
import { YggdrasilLogo } from "@/components/YggdrasilLogo";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

export const AppNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 60);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems: NavItem[] = [
    { icon: <PenLine className="h-4 w-4" />, label: "Write", path: "/journal" },
    { icon: <FileText className="h-4 w-4" />, label: "Entries", path: "/entries" },
    { icon: <Target className="h-4 w-4" />, label: "Goals", path: "/goals" },
    { icon: <BarChart3 className="h-4 w-4" />, label: "Insights", path: "/insights" },
    { icon: <Settings className="h-4 w-4" />, label: "Settings", path: "/settings" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={cn(
        "border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 transition-all duration-300",
        isScrolled ? "py-1" : "py-2.5"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer min-w-0"
            onClick={() => navigate("/")}
          >
            <YggdrasilLogo
              size={isScrolled ? 24 : 32}
              className="transition-all duration-300"
            />
            <h1
              className={cn(
                "font-serif font-bold text-foreground truncate transition-all duration-300",
                isScrolled ? "text-base" : "text-lg sm:text-xl"
              )}
            >
              Yggdrasil
            </h1>
          </div>

          {/* Navigation */}
          <TooltipProvider delayDuration={300}>
            <nav className="flex items-center gap-1 flex-shrink-0">
              {navItems.map((item) => (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive(item.path) ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => navigate(item.path)}
                      className="h-8 w-8"
                      aria-label={item.label}
                    >
                      {item.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Sign Out */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </nav>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
};
