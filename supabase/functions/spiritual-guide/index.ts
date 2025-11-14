import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    const { guidanceType = "weekly_wisdom" } = await req.json();

    // Gather user's spiritual journey context
    const [goalsRes, entriesRes, patternsRes] = await Promise.all([
      supabase
        .from("goals")
        .select("title, goal_type, intention, status, phase, created_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("journal_entries")
        .select("title, entry_date, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("pattern_insights")
        .select("title, pattern_type, description, confidence_score")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)
    ]);

    const goals = goalsRes.data || [];
    const recentEntries = entriesRes.data || [];
    const patterns = patternsRes.data || [];

    // Build context for AI
    const context = {
      activeGoals: goals.map(g => ({
        title: g.title,
        type: g.goal_type,
        intention: g.intention,
        phase: g.phase
      })),
      journalFrequency: recentEntries.length > 0 
        ? `${recentEntries.length} entries in recent history`
        : "Just starting their journey",
      patterns: patterns.map(p => ({
        type: p.pattern_type,
        title: p.title,
        description: p.description
      }))
    };

    // Craft spiritual guidance prompt with Yggi persona
    let systemPrompt = `You are Yggi, a spiritual guide who speaks with warmth, clarity, and insight. 
You're friendly and straightforward—not overly mystical or poetic, but deeply attuned to the spiritual journey.

Think of yourself as a wise friend who gets it. You offer practical spiritual wisdom that resonates 
without the fluff. You speak directly to what matters, with compassion and a touch of knowing humor.

User's Current Journey Context:
- Active Goals: ${JSON.stringify(context.activeGoals)}
- Journal Practice: ${context.journalFrequency}
- Discovered Patterns: ${JSON.stringify(context.patterns)}

Provide guidance that is:
- Personal and relevant to their specific journey
- Warm but straightforward (avoid flowery language)
- Actionable with specific practices or reflections
- Spiritually grounded but accessible
- Brief (2-3 paragraphs maximum)

Remember: You're Yggi. Be insightful, not mystical. Be clear, not cryptic. Be supportive, not preachy.`;

    let userPrompt = "";
    
    if (guidanceType === "weekly_wisdom") {
      userPrompt = "Offer weekly wisdom and encouragement based on their current spiritual journey. What should they focus on this week?";
    } else if (guidanceType === "practice_suggestion") {
      userPrompt = "Suggest a specific spiritual practice that would support their active goals and patterns. Be specific about how to do it.";
    } else if (guidanceType === "pattern_insight") {
      userPrompt = "Provide insight about the patterns they're discovering. What deeper wisdom do these patterns reveal?";
    }

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const guidance = aiData.choices[0].message.content;

    // Store guidance in database
    const { data: savedGuidance, error: saveError } = await supabase
      .from("spiritual_guidance")
      .insert({
        user_id: user.id,
        guidance_type: guidanceType,
        content: guidance,
        context: context
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving guidance:", saveError);
    }

    return new Response(
      JSON.stringify({ 
        guidance,
        id: savedGuidance?.id 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error("Error in spiritual-guide function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
