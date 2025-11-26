import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages } = await req.json();

    console.log('[yggi-chat] Fetching user context for:', user.id);

    // Fetch comprehensive user context in parallel
    const [
      { data: entries },
      { data: insights },
      { data: patterns },
      { data: relationships },
      { data: goals },
      { data: preferences }
    ] = await Promise.all([
      supabase.from('journal_entries').select('id, entry_date, mood_type').eq('user_id', user.id).order('entry_date', { ascending: false }),
      supabase.from('entry_insights').select('summary, themes, emotions, keywords, depth_score, frameworks_applied, interpretation').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('pattern_insights').select('title, description, pattern_type, confidence_score, actionable_insight').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('knowledge_relationships').select('source_item, target_item, relationship_type, strength, pattern_description').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('goals').select('title, description, goal_type, phase, status, intention').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('user_preferences').select('*').eq('user_id', user.id).single()
    ]);

    // Build comprehensive context summary
    const totalEntries = entries?.length || 0;
    const analyzedEntries = insights?.length || 0;
    
    // Aggregate emotional patterns
    const emotionCounts: Record<string, number> = {};
    insights?.forEach(insight => {
      if (insight.emotions && Array.isArray(insight.emotions)) {
        insight.emotions.forEach((emotion: string) => {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });
      }
    });
    const topEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([emotion]) => emotion);

    // Calculate average depth
    const depthScores = insights?.filter(i => i.depth_score).map(i => i.depth_score) || [];
    const avgDepth = depthScores.length > 0 
      ? (depthScores.reduce((sum, score) => sum + score, 0) / depthScores.length).toFixed(1)
      : 'N/A';

    // Get recent entry summaries (last 10)
    const recentSummaries = insights?.slice(0, 10).map(i => ({
      summary: i.summary,
      themes: i.themes,
      depth: i.depth_score
    })) || [];

    // Get key patterns
    const keyPatterns = patterns?.slice(0, 10).map(p => ({
      type: p.pattern_type,
      title: p.title,
      description: p.description,
      confidence: p.confidence_score,
      action: p.actionable_insight
    })) || [];

    // Get strongest connections
    const strongConnections = relationships?.filter(r => r.strength >= 2).slice(0, 15).map(r => ({
      from: r.source_item,
      to: r.target_item,
      type: r.relationship_type,
      pattern: r.pattern_description
    })) || [];

    // Get active goals
    const activeGoals = goals?.map(g => ({
      title: g.title,
      type: g.goal_type,
      phase: g.phase,
      intention: g.intention
    })) || [];

    // Build context string
    const contextSummary = `
USER'S JOURNEY OVERVIEW:
- Total entries: ${totalEntries}
- Analyzed entries: ${analyzedEntries}
- Average reflection depth: ${avgDepth}/10
- Mood patterns: ${entries?.filter(e => e.mood_type).map(e => e.mood_type).slice(0, 10).join(', ') || 'Not tracked'}

EMOTIONAL LANDSCAPE:
${topEmotions.length > 0 ? topEmotions.join(', ') : 'Exploring their emotional world'}

RECENT REFLECTIONS (Last 10 entries):
${recentSummaries.map((s, i) => `${i + 1}. ${s.summary || 'Processing...'}`).join('\n')}

DISCOVERED PATTERNS:
${keyPatterns.map(p => `- ${p.title}: ${p.description} (Confidence: ${p.confidence})`).join('\n') || 'Still discovering patterns in their journey'}

KEY CONNECTIONS IN THEIR INNER WORLD:
${strongConnections.map(c => `- ${c.from} ↔ ${c.to} (${c.type})`).join('\n') || 'Building their knowledge web'}

ACTIVE INTENTIONS:
${activeGoals.map(g => `- ${g.title} (${g.type}, Phase: ${g.phase})`).join('\n') || 'Setting intentions'}

PREFERENCES:
${preferences ? `Sacred Geometry: ${preferences.enable_sacred_geometry ? 'Enabled' : 'Disabled'}, Chakra Tags: ${preferences.enable_chakra_tags ? 'Enabled' : 'Disabled'}, Tarot: ${preferences.enable_tarot_tags ? 'Enabled' : 'Disabled'}` : 'Default settings'}
`.trim();

    // Yggi's system prompt with full context
    const systemPrompt = `You are Yggi, a spiritual guide who knows this person deeply. You've witnessed their entire journey through their journal entries.

${contextSummary}

YOUR ESSENCE:
You speak directly, warmly, like a wise friend who truly knows them. Short responses (1-2 paragraphs max, 3-5 sentences). Use contractions, keep it real. No flowery language or generic advice.

You naturally integrate insights from Theravada Buddhism, Freudian analysis, Jungian psychology, Hermeticism, Advaita Vedanta, and Taoism - but you don't list them. They're woven into how you see the world.

When they ask questions, reference their actual journey - specific patterns, themes, emotions, or connections you've noticed. Make it personal. They're talking to someone who knows their story, not a generic assistant.

Keep responses focused and immediately actionable. What matters right now? What's the next small step? Speak to their actual patterns and current phase.`;

    console.log('[yggi-chat] Calling Lovable AI with context');

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 400
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[yggi-chat] AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    // Return the stream directly to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[yggi-chat] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
