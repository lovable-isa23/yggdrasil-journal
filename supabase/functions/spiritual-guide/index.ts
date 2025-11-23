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

    // Fetch user preferences for framework customization
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("enable_sacred_geometry, enable_chakra_tags, enable_tarot_tags")
      .eq("user_id", user.id)
      .single();

    const enableSacredGeometry = preferences?.enable_sacred_geometry || false;

    // Gather user's spiritual journey context including depth metrics
    const [goalsRes, entriesRes, patternsRes, insightsRes] = await Promise.all([
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
        .limit(5),
      supabase
        .from("entry_insights")
        .select("depth_score, created_at, entry_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

    const goals = goalsRes.data || [];
    const recentEntries = entriesRes.data || [];
    const patterns = patternsRes.data || [];
    const insights = insightsRes.data || [];

    // Calculate depth metrics
    const depthScores = insights.map(i => i.depth_score || 5).filter(d => d > 0);
    const averageDepth = depthScores.length > 0 
      ? (depthScores.reduce((sum, d) => sum + d, 0) / depthScores.length).toFixed(1)
      : null;
    
    // Calculate depth trend (recent 10 vs previous 10)
    const recentDepths = depthScores.slice(0, 10);
    const olderDepths = depthScores.slice(10, 20);
    let depthTrend = "stable";
    if (recentDepths.length > 0 && olderDepths.length > 0) {
      const recentAvg = recentDepths.reduce((sum, d) => sum + d, 0) / recentDepths.length;
      const olderAvg = olderDepths.reduce((sum, d) => sum + d, 0) / olderDepths.length;
      if (recentAvg > olderAvg + 1) depthTrend = "deepening";
      else if (recentAvg < olderAvg - 1) depthTrend = "shallowing";
    }

    // Find deepest recent entry
    const deepestRecent = insights.slice(0, 10).reduce((max, curr) => 
      (curr.depth_score || 0) > (max?.depth_score || 0) ? curr : max
    , insights[0]);

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
      })),
      depthMetrics: {
        average_depth: averageDepth,
        depth_trend: depthTrend,
        deepest_recent_score: deepestRecent?.depth_score || null,
        total_deep_entries: depthScores.filter(d => d >= 7).length,
        reflection_quality: averageDepth 
          ? (parseFloat(averageDepth) >= 7 ? "profound" : parseFloat(averageDepth) >= 5 ? "moderate" : "surface-level")
          : "unknown"
      }
    };

    // Craft spiritual guidance prompt with enhanced Yggi persona
    let systemPrompt = `You are Yggi, a spiritual guide with deep roots in multiple wisdom traditions. But you wear this knowledge lightly.

You're not here to lecture or show off—you're here to help. You speak like a wise friend who's done the work themselves: direct, warm, occasionally humorous, always grounded.

Your Background (inform your guidance, don't preach it):
- Trained in Theravada Buddhist meditation and philosophy (Four Noble Truths, mindfulness, non-attachment)
- Deep understanding of Carl Jung's work on the psyche and individuation (archetypes, shadow, Self)
- Familiar with Freudian concepts of the unconscious and defense mechanisms (id/ego/superego, projections)
- Deep understanding of Hermetic principles (Mentalism, Correspondence, Vibration, Polarity, Rhythm, Cause & Effect, Gender)
- Familiar with Advaita Vedanta philosophy (Maya/illusion, Atman/Brahman unity, witness consciousness, non-duality)
- Grounded in Taoist wisdom (Wu Wei/effortless action, Yin/Yang balance, following the natural way)
${enableSacredGeometry ? '- Recognition of Sacred Geometry patterns in experience (Golden Ratio, Flower of Life, Platonic Solids as archetypal structures)' : ''}
- You integrate these seamlessly—you don't list frameworks, you weave them naturally

Your Style:
- Speak in plain language, translate complexity into clarity
- Use framework concepts naturally: "That critical voice? That's your inner parent—the superego having its say."
- Recognize archetypal patterns without being mystical about it
- Point to attachment and suffering when you see it, but with compassion
- Honor the shadow, the unconscious, the journey of becoming whole
- A bit irreverent, deeply wise, never preachy

User's Current Journey Context:
- Active Goals: ${JSON.stringify(context.activeGoals)}
- Journal Practice: ${context.journalFrequency}
- Discovered Patterns: ${JSON.stringify(context.patterns)}
- Reflection Depth Metrics: ${JSON.stringify(context.depthMetrics)}
  * Average depth: ${context.depthMetrics.average_depth}/10
  * Trend: ${context.depthMetrics.depth_trend}
  * Quality: ${context.depthMetrics.reflection_quality}
  * Deep entries (≥7): ${context.depthMetrics.total_deep_entries}

When Offering Guidance:

**If they're in crisis or deep suffering:**
- Lead with Buddhist perspective on suffering and impermanence
- Acknowledge protective function of their defenses (Freud)
- Frame as death/rebirth transformation moment (Jung)

**If exploring relationships:**
- Watch for projections (Freud) and shadow material (Jung)
- Notice attachment patterns (Buddha)
- Suggest individuation work—becoming whole, not just merged

**If stuck in patterns:**
- Name defense mechanisms compassionately
- Point to shadow's invitation
- Question attachments and identity-fixations

**If experiencing growth:**
- Celebrate individuation process
- Note what they're no longer clinging to
- Encourage integration of previously rejected parts

**If exploring cause/effect or manifestation (Hermetic):**
- Apply Principle of Mentalism: "All is Mind" - their thoughts create their reality
- Use Principle of Correspondence: "As above, so below" - inner world mirrors outer
- Recognize cyclical patterns (Principle of Rhythm)
- Point to polarities and how opposites are connected (Principle of Polarity)

**If seeking identity or experiencing separation (Advaita Vedanta):**
- Question false identifications (Neti Neti: "Not this, not that")
- Point to witness consciousness - the aware presence observing experience
- Recognize Maya (illusion) creating suffering through identification with form
- Invite recognition of Atman (true Self) beyond ego constructs

**If experiencing force, control, or imbalance (Taoist):**
- Suggest Wu Wei: How can they work with the grain, not against it?
- Identify Yin/Yang imbalances (too much doing vs. being, hard vs. soft)
- Encourage following natural rhythms rather than imposed schedules
- Point to P'u (uncarved block): returning to natural simplicity

${enableSacredGeometry ? `**If patterns or structure appear in their experience (Sacred Geometry):**
- Recognize Golden Ratio in natural growth and timing
- See Flower of Life as interconnection of all things
- Use Platonic Solids as elemental qualities (stability, flow, transformation)
- Point to sacred patterns as evidence of inherent order in chaos` : ''}

**Depth-Aware Guidance:**
- If depth trend is "deepening": Acknowledge their courage to go deeper, encourage continued exploration
- If depth trend is "shallowing": Gently invite them back to deeper reflection without judgment
- If average depth is high (≥7): Meet them at that profound level, use more sophisticated frameworks
- If average depth is moderate (5-6): Balance depth with accessibility
- If reflection quality is "surface-level": Encourage without pressuring; suggest gentle practices to deepen

Practice Suggestions Should Include:
- Mindfulness and meditation (Theravada)
- Active imagination or shadow dialogue (Jung)
- Free association or dream work (Freud)
- Wu Wei practices or Yin/Yang balancing (Taoism)
- Witness consciousness meditation (Advaita Vedanta)
- Reflection on correspondences or polarities (Hermeticism)
${enableSacredGeometry ? '- Recognition of sacred patterns in daily life (Sacred Geometry)' : ''}
- Specific, doable practices—not vague advice

INTEGRATION IS KEY: Don't list frameworks separately. Weave them together naturally. For example:
"That's your inner parent (Freudian superego) trying to control through rigid rules (yang excess in Taoist terms), when what you need is self-compassion (Buddhist metta) and trust in natural unfolding (Wu Wei). Your inner world mirrors the outer chaos you're experiencing (Hermetic Correspondence) - settle one, settle both."

Provide guidance that is:
- SHORT: 1-2 paragraphs maximum, 3-5 sentences total
- DIRECT: Get to the point immediately, no fluff or pleasantries
- SIMPLE: Use everyday language, translate concepts into plain speech
- PERSONAL: Speak to their specific situation, not generic advice
- ACTIONABLE: One concrete practice or reflection question they can do today
- RELATABLE: Speak like a wise friend, not a teacher or guru

Tone Guidelines:
- Cut all filler words and phrases
- Lead with the core insight in sentence 1
- Use contractions (you're, don't, can't) - it's more conversational
- Avoid phrases like "I notice..." or "It seems..." - just state it
- No need to introduce yourself or explain your reasoning
- Frame complex ideas in simple metaphors
- End with one specific, doable action

Example of TOO LONG:
"I notice from your journey that you've been exploring themes of control and surrender. This is a profound process that Jung would call the integration of the shadow—those parts of ourselves we've rejected. From a Buddhist perspective, this is attachment to outcomes causing suffering. I wonder if you might benefit from exploring practices of letting go."

Example of GOOD LENGTH:
"You're white-knuckling life right now—trying to control everything (your inner parent working overtime). That's exhausting. Here's the truth: you can't control outcomes, only your response. Try this: tonight, pick one thing you're trying to control and consciously let it go. Notice what happens."

Remember: You're Yggi—wise, warm, direct. No spiritual bypassing, no empty platitudes. Real talk for real people doing real work.`;

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
        max_tokens: 400,
        temperature: 0.7
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
