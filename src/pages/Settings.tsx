import { AuthGuard } from "@/components/AuthGuard";
import { DataExport } from "@/components/DataExport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, BookOpen, BarChart3, Download } from "lucide-react";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

const Settings = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <img 
                  src={yggdrasilLogo} 
                  alt="Yggdrasil" 
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
                <h1 className="text-xl sm:text-2xl font-bold text-primary">
                  Yggdrasil
                </h1>
              </div>
              <div className="flex gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/journal")}
                  className="gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-4"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Journal</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/insights")}
                  className="gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-4"
                  size="sm"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Insights</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-4"
                  size="sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
          <div className="space-y-8 sm:space-y-12">
            {/* Page Title */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                Settings
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                Manage your preferences and data
              </p>
            </div>

            {/* Data Export Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  <CardTitle>Export Your Data</CardTitle>
                </div>
                <CardDescription>
                  Download all your journal entries in JSON or PDF format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataExport />
              </CardContent>
            </Card>

            {/* Preferences Section */}
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Additional settings coming soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  More customization options will be available here in future updates.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Settings;
