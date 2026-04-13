import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { PenLine, FileText, Target, BarChart3, Settings, LogOut } from "lucide-react";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  action?: () => void;
}

export const AppNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" 
            onClick={() => navigate("/")}
          >
            <img 
              src={yggdrasilLogo} 
              alt="Yggdrasil" 
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0"
            />
            <h1 className="text-lg sm:text-2xl font-bold text-primary truncate">
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
                      className="h-9 w-9"
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
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
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
