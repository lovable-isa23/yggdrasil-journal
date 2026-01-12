import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { AppNavbar } from "@/components/AppNavbar";
import { Moon, Sun, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";

interface Preferences {
  enable_chakra_tags: boolean;
  enable_tarot_tags: boolean;
  enable_sacred_geometry: boolean;
  enable_archetype_tags: boolean;
  dark_mode: boolean;
  enable_theravada: boolean;
  enable_freudian: boolean;
  enable_jungian: boolean;
  enable_hermetic: boolean;
  enable_advaita: boolean;
  enable_taoist: boolean;
  enable_attachment: boolean;
  enable_ifs: boolean;
  enable_cbt: boolean;
  enable_dbt: boolean;
  enable_stoic: boolean;
  enable_gnostic: boolean;
  show_emotional_analysis: boolean;
  show_framework_analysis: boolean;
}

const FRAMEWORK_CONFIGS = {
  spiritual: [
    { key: 'enable_theravada' as keyof Preferences, icon: '☸️', name: 'Theravada Buddhism', description: 'Suffering, attachment, impermanence, mindfulness' },
    { key: 'enable_advaita' as keyof Preferences, icon: '🕉️', name: 'Advaita Vedanta', description: 'Self-inquiry, witness consciousness, true nature' },
    { key: 'enable_taoist' as keyof Preferences, icon: '☯️', name: 'Taoism', description: 'Flow, balance, wu wei, naturalness' },
  ],
  philosophical: [
    { key: 'enable_hermetic' as keyof Preferences, icon: '🔮', name: 'Hermeticism', description: 'Mental causation, correspondence, polarity, cycles' },
    { key: 'enable_stoic' as keyof Preferences, icon: '🏛️', name: 'Stoicism', description: 'Virtue, dichotomy of control, amor fati' },
    { key: 'enable_gnostic' as keyof Preferences, icon: '✨', name: 'Gnosticism', description: 'Divine spark, gnosis, spiritual liberation' },
  ],
  psychology: [
    { key: 'enable_freudian' as keyof Preferences, icon: '🔺', name: 'Freudian', description: 'Unconscious conflict, defense mechanisms, childhood' },
    { key: 'enable_jungian' as keyof Preferences, icon: '🌓', name: 'Jungian', description: 'Archetypes, shadow work, individuation' },
    { key: 'enable_attachment' as keyof Preferences, icon: '💕', name: 'Attachment Theory', description: 'Relationship patterns, trust, intimacy' },
    { key: 'enable_ifs' as keyof Preferences, icon: '🎭', name: 'IFS', description: 'Inner parts, protectors, Self-leadership' },
    { key: 'enable_cbt' as keyof Preferences, icon: '💭', name: 'CBT', description: 'Cognitive distortions, thought patterns' },
    { key: 'enable_dbt' as keyof Preferences, icon: '⚖️', name: 'DBT', description: 'Dialectics, emotional regulation, wise mind' },
  ],
};

const ALL_FRAMEWORK_KEYS: (keyof Preferences)[] = [
  'enable_theravada', 'enable_freudian', 'enable_jungian', 'enable_hermetic',
  'enable_advaita', 'enable_taoist', 'enable_attachment', 'enable_ifs',
  'enable_cbt', 'enable_dbt', 'enable_stoic', 'enable_gnostic'
];

const Settings = () => {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences>({
    enable_chakra_tags: false,
    enable_tarot_tags: false,
    enable_sacred_geometry: false,
    enable_archetype_tags: false,
    dark_mode: false,
    enable_theravada: true,
    enable_freudian: true,
    enable_jungian: true,
    enable_hermetic: true,
    enable_advaita: true,
    enable_taoist: true,
    enable_attachment: true,
    enable_ifs: true,
    enable_cbt: true,
    enable_dbt: true,
    enable_stoic: true,
    enable_gnostic: true,
    show_emotional_analysis: true,
    show_framework_analysis: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState(0);
  const [reanalyzeTotalEntries, setReanalyzeTotalEntries] = useState(0);

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
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
          enable_chakra_tags: data.enable_chakra_tags ?? false,
          enable_tarot_tags: data.enable_tarot_tags ?? false,
          enable_sacred_geometry: data.enable_sacred_geometry ?? false,
          enable_archetype_tags: (data as any).enable_archetype_tags ?? false,
          dark_mode: data.dark_mode ?? false,
          enable_theravada: data.enable_theravada ?? true,
          enable_freudian: data.enable_freudian ?? true,
          enable_jungian: data.enable_jungian ?? true,
          enable_hermetic: data.enable_hermetic ?? true,
          enable_advaita: data.enable_advaita ?? true,
          enable_taoist: data.enable_taoist ?? true,
          enable_attachment: data.enable_attachment ?? true,
          enable_ifs: data.enable_ifs ?? true,
          enable_cbt: data.enable_cbt ?? true,
          enable_dbt: data.enable_dbt ?? true,
          enable_stoic: (data as any).enable_stoic ?? true,
          enable_gnostic: (data as any).enable_gnostic ?? true,
          show_emotional_analysis: (data as any).show_emotional_analysis ?? true,
          show_framework_analysis: (data as any).show_framework_analysis ?? true,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (updates: Partial<Preferences>) => {
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
        } as any, { onConflict: 'user_id' });

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

  const handleToggle = (key: keyof Preferences) => {
    const updates = { [key]: !preferences[key] };
    savePreferences(updates);
  };

  const allFrameworksEnabled = ALL_FRAMEWORK_KEYS.every(key => preferences[key]);
  const someFrameworksEnabled = ALL_FRAMEWORK_KEYS.some(key => preferences[key]);

  const handleToggleAllFrameworks = () => {
    const newValue = !allFrameworksEnabled;
    const updates: Partial<Preferences> = {};
    ALL_FRAMEWORK_KEYS.forEach(key => {
      updates[key] = newValue;
    });
    savePreferences(updates);
  };

  const enabledCount = ALL_FRAMEWORK_KEYS.filter(key => preferences[key]).length;

  const handleReanalyzeAll = async () => {
    setReanalyzing(true);
    setReanalyzeProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        setReanalyzing(false);
        return;
      }

      // Fetch all journal entries
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!entries?.length) {
        toast.error('No entries to analyze');
        setReanalyzing(false);
        return;
      }
      
      setReanalyzeTotalEntries(entries.length);
      
      // Analyze each entry sequentially (to respect rate limits)
      for (let i = 0; i < entries.length; i++) {
        setReanalyzeProgress(i + 1);
        try {
          await supabase.functions.invoke('analyze-entry', {
            body: { entryId: entries[i].id }
          });
          // Small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (err) {
          console.error(`Failed to analyze entry ${entries[i].id}:`, err);
        }
      }
      
      toast.success('All entries updated with latest analysis features!');
    } catch (error) {
      console.error('Error re-analyzing entries:', error);
      toast.error('Failed to apply updates');
    } finally {
      setReanalyzing(false);
      setReanalyzeProgress(0);
      setReanalyzeTotalEntries(0);
    }
  };

  const renderFrameworkSection = (
    title: string,
    icon: string,
    frameworks: typeof FRAMEWORK_CONFIGS.spiritual
  ) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
        {icon} {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {frameworks.map(framework => (
          <div
            key={framework.key}
            className={`p-3 rounded-lg border transition-colors ${
              preferences[framework.key]
                ? 'bg-primary/5 border-primary/20'
                : 'bg-muted/30 border-border'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <span>{framework.icon}</span>
                  {framework.name}
                </Label>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {framework.description}
                </p>
              </div>
              <Switch
                checked={preferences[framework.key] as boolean}
                onCheckedChange={() => handleToggle(framework.key)}
                disabled={saving}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <AppNavbar />

        {/* Main Content */}
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">Settings</h2>
            <p className="text-muted-foreground mt-1">Customize your Yggdrasil experience</p>
          </div>

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

              {/* Insights Visibility */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Insights Visibility</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose which sections appear on your Insights dashboard
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="show-emotional" className="text-base font-medium flex items-center gap-2">
                        🧠 Emotional Analysis
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Show mood tracking and sentiment analysis
                      </p>
                    </div>
                    <Switch
                      id="show-emotional"
                      checked={preferences.show_emotional_analysis}
                      onCheckedChange={() => handleToggle('show_emotional_analysis')}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="show-framework" className="text-base font-medium flex items-center gap-2">
                        📊 Framework Analysis
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Show psychological and spiritual framework insights
                      </p>
                    </div>
                    <Switch
                      id="show-framework"
                      checked={preferences.show_framework_analysis}
                      onCheckedChange={() => handleToggle('show_framework_analysis')}
                      disabled={saving}
                    />
                  </div>
                </div>
              </Card>

              {/* Analysis Frameworks */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">Analysis Frameworks</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {enabledCount}/12 enabled
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleAllFrameworks}
                      disabled={saving}
                    >
                      {allFrameworksEnabled ? 'Disable All' : 'Enable All'}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose which psychological and spiritual frameworks are applied to your journal analysis
                </p>

                {renderFrameworkSection('Spiritual Traditions', '🕉️', FRAMEWORK_CONFIGS.spiritual)}
                {renderFrameworkSection('Philosophical Systems', '🏛️', FRAMEWORK_CONFIGS.philosophical)}
                {renderFrameworkSection('Psychology', '🧠', FRAMEWORK_CONFIGS.psychology)}

                {!someFrameworksEnabled && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      ⚠️ No frameworks enabled. Your journal analysis will be basic without psychological/spiritual insights.
                    </p>
                  </div>
                )}
              </Card>

              {/* Spiritual Systems */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Spiritual Tags</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Enable additional spiritual context tags in your journal insights
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="chakra-tags" className="text-base font-medium">
                        Chakra System
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Energy centers and their balance states
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
                        Tarot Archetypes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Major arcana symbolism and meanings
                      </p>
                    </div>
                    <Switch
                      id="tarot-tags"
                      checked={preferences.enable_tarot_tags}
                      onCheckedChange={() => handleToggle('enable_tarot_tags')}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="archetype-tags" className="text-base font-medium">
                        Jungian Archetypes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Archetypal patterns and figures in your entries
                      </p>
                    </div>
                    <Switch
                      id="archetype-tags"
                      checked={preferences.enable_archetype_tags}
                      onCheckedChange={() => handleToggle('enable_archetype_tags')}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="sacred-geometry" className="text-base font-medium">
                        Sacred Geometry
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Geometric symbolism and patterns
                      </p>
                    </div>
                    <Switch
                      id="sacred-geometry"
                      checked={preferences.enable_sacred_geometry}
                      onCheckedChange={() => handleToggle('enable_sacred_geometry')}
                      disabled={saving}
                    />
                  </div>
                </div>
              </Card>

              {/* Re-analyze Section */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Apply Updates to Entries</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Re-analyze all your journal entries with the current framework and tag settings.
                  This will update insights for entries created before you changed these settings.
                </p>
                
                {reanalyzing && reanalyzeTotalEntries > 0 && (
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Analyzing entries...</span>
                      <span>{reanalyzeProgress} / {reanalyzeTotalEntries}</span>
                    </div>
                    <Progress value={(reanalyzeProgress / reanalyzeTotalEntries) * 100} />
                  </div>
                )}
                
                <Button
                  onClick={handleReanalyzeAll}
                  disabled={reanalyzing}
                  className="gap-2"
                >
                  {reanalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Re-analyze All Entries
                    </>
                  )}
                </Button>
              </Card>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
};

export default Settings;
