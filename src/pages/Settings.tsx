import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

const Settings = () => {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    enable_chakra_tags: false,
    enable_tarot_tags: false,
    dark_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    // Apply dark mode to document
    if (preferences.dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.dark_mode]);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          enable_chakra_tags: data.enable_chakra_tags,
          enable_tarot_tags: data.enable_tarot_tags,
          dark_mode: data.dark_mode,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (updates: Partial<typeof preferences>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newPreferences = { ...preferences, ...updates };

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...newPreferences,
        });

      if (error) throw error;

      setPreferences(newPreferences);
      toast.success('Preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof typeof preferences) => {
    const updates = { [key]: !preferences[key] };
    savePreferences(updates);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/journal")}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <img 
                  src={yggdrasilLogo} 
                  alt="Yggdrasil" 
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0"
                />
                <h1 className="text-lg sm:text-2xl font-bold text-primary truncate">
                  Settings
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
          {loading ? (
            <div className="text-center">Loading preferences...</div>
          ) : (
            <div className="space-y-6">
              {/* Appearance */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Appearance</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="dark-mode" className="text-base font-medium flex items-center gap-2">
                        {preferences.dark_mode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        Dark Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Toggle between light and dark themes
                      </p>
                    </div>
                    <Switch
                      id="dark-mode"
                      checked={preferences.dark_mode}
                      onCheckedChange={() => handleToggle('dark_mode')}
                      disabled={saving}
                    />
                  </div>
                </div>
              </Card>

              {/* Spiritual Systems */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Spiritual Systems</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Enable additional spiritual context in your journal insights
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="chakra-tags" className="text-base font-medium">
                        Chakra System
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Add chakra energy center tags to your insights
                      </p>
                    </div>
                    <Switch
                      id="chakra-tags"
                      checked={preferences.enable_chakra_tags}
                      onCheckedChange={() => handleToggle('enable_chakra_tags')}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="tarot-tags" className="text-base font-medium">
                        Tarot System
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Add tarot archetypal tags to your insights
                      </p>
                    </div>
                    <Switch
                      id="tarot-tags"
                      checked={preferences.enable_tarot_tags}
                      onCheckedChange={() => handleToggle('enable_tarot_tags')}
                      disabled={saving}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
};

export default Settings;
