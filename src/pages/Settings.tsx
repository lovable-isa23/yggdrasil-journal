import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Smartphone, Monitor, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";
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

                  <div className="flex items-center justify-between py-3 border-b">
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

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="space-y-1">
                      <Label htmlFor="sacred-geometry" className="text-base font-medium">
                        Sacred Geometry
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Identify geometric patterns and divine proportions in your experiences
                      </p>
                    </div>
                    <Switch
                      id="sacred-geometry"
                      checked={preferences.enable_sacred_geometry}
                      onCheckedChange={() => handleToggle('enable_sacred_geometry')}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-1">
                      <Label htmlFor="archetype-tags" className="text-base font-medium">
                        Jungian Archetypes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Identify archetypal patterns (Hero, Shadow, Anima/Animus, Wise Old Man, etc.)
                      </p>
                    </div>
                    <Switch
                      id="archetype-tags"
                      checked={preferences.enable_archetype_tags}
                      onCheckedChange={() => handleToggle('enable_archetype_tags')}
                      disabled={saving}
                    />
                  </div>
                </div>
              </Card>

              {/* Apply Feature Updates */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Apply Feature Updates</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Apply any feature updates (like new frameworks or analysis improvements) to your existing journal entries
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Apply Updates to All Entries
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Re-analyze entries with the latest framework improvements and diversity requirements
                    </p>
                  </div>
                  <Button
                    onClick={handleReanalyzeAll}
                    disabled={reanalyzing || saving}
                    className="gap-2"
                  >
                    {reanalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating {reanalyzeProgress}/{reanalyzeTotalEntries}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Apply Updates
                      </>
                    )}
                  </Button>
                </div>
                {reanalyzing && (
                  <div className="mt-4 space-y-2">
                    <Progress value={(reanalyzeProgress / reanalyzeTotalEntries) * 100} className="w-full" />
                    <p className="text-xs text-muted-foreground text-center">
                      This may take a few minutes. Please don't close this page.
                    </p>
                  </div>
                )}
              </Card>

              {/* Install App */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Install Yggdrasil as an App</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Access Yggdrasil directly from your home screen for a native app experience with offline access and faster loading
                </p>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="iphone">
                    <AccordionTrigger className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        iPhone (Safari or Chrome)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3">
                        <p className="text-foreground font-medium flex items-center gap-2">
                          💡 Works with both Safari and Chrome on iOS
                        </p>
                      </div>
                      <ol className="space-y-2 list-decimal list-inside">
                        <li>Open this page in <strong>Safari or Chrome</strong></li>
                        <li>Tap the <strong>Share</strong> button <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-100 dark:bg-blue-900/30 rounded">↑</span> at the bottom of your screen</li>
                        <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                        <li>Edit the name if desired, then tap <strong>"Add"</strong></li>
                        <li>Find the Yggdrasil icon on your home screen!</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="android">
                    <AccordionTrigger className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Android (Chrome/Edge)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <ol className="space-y-2 list-decimal list-inside">
                        <li>Open this page in <strong>Chrome</strong> or <strong>Edge</strong></li>
                        <li>Tap the menu (three dots) in the top right corner</li>
                        <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                        <li>Confirm the installation</li>
                        <li>The Yggdrasil icon will appear on your home screen</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="desktop">
                    <AccordionTrigger className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Desktop (Chrome/Edge/Brave)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <ol className="space-y-2 list-decimal list-inside">
                        <li><strong>Chrome/Edge:</strong> Look for the install icon <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-100 dark:bg-blue-900/30 rounded">⊕</span> in the address bar</li>
                        <li>Click the install button and follow the prompts</li>
                        <li>The app will open in its own window and appear in your applications</li>
                      </ol>
                      <p className="text-muted-foreground">
                        <strong>Note:</strong> Firefox doesn't currently support PWA installation on desktop
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2 text-sm">Benefits of Installing:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>✓ Faster loading times</li>
                    <li>✓ Works offline (view past entries)</li>
                    <li>✓ Native app-like experience</li>
                    <li>✓ No app store needed</li>
                    <li>✓ Takes up minimal storage</li>
                  </ul>
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