import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("Analyzing patterns for user:", user.id);

    // Fetch all insights and entries for this user
    const { data: insights, error: insightsError } = await supabase
      .from("entry_insights")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (insightsError) throw insightsError;

    const { data: entries, error: entriesError } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false });

    if (entriesError) throw entriesError;

    if (!insights || insights.length < 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Need at least 2 analyzed entries to detect patterns" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build comprehensive context for AI analysis
    const insightsSummary = insights.map((insight, idx) => {
      const entry = entries?.find(e => e.id === insight.entry_id);
      return {
        index: idx + 1,
        date: entry?.entry_date || "unknown",
        entities: insight.entities || [],
        themes: insight.themes || [],
        keywords: insight.keywords || [],
        emotions: insight.emotions || [],
        summary: insight.summary || "",
      };
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are an expert pattern analyst specializing in psychological and behavioral insights. 
Analyze journal entries to discover meaningful patterns, habits, and connections across time.

Focus on:
1. **Recurring relationships**: Which entities, themes, or keywords frequently appear together?
2. **Temporal patterns**: Do certain themes/emotions appear at specific times or follow sequences?
3. **Behavioral patterns**: What habits or behavioral cycles can you identify?
4. **Emotional patterns**: How do emotions correlate with themes, events, or entities?
5. **Causal relationships**: What potential cause-and-effect relationships exist?

Return your analysis as a JSON object with this exact structure:
{
  "relationships": [
    {
      "source": "entity/theme/keyword name",
      "target": "entity/theme/keyword name",
      "type": "co-occurrence|sequential|causal|emotional",
      "strength": <1-10>,
      "context": "brief explanation of the relationship",
      "entry_indices": [1, 3, 5],
      "temporal_pattern": "daily|weekly|monthly|sporadic|null"
    }
  ],
  "patterns": [
    {
      "type": "habit|emotional|behavioral|temporal|cognitive",
      "title": "Clear, concise pattern name",
      "description": "Detailed description of the pattern",
      "confidence": <0.0-1.0>,
      "related_items": ["item1", "item2"],
      "entry_indices": [1, 2, 3],
      "temporal_info": {
        "frequency": "daily|weekly|monthly",
        "trend": "increasing|decreasing|stable",
        "specific_times": "optional context about when"
      },
      "actionable_insight": "Practical suggestion based on this pattern"
    }
  ]
}`;

    const userPrompt = `Analyze these ${insights.length} journal entries and identify meaningful patterns:

${JSON.stringify(insightsSummary, null, 2)}

Provide deep insights about habits, emotional patterns, behavioral cycles, and relationships between different aspects of the person's life. Focus on actionable patterns that could help with self-improvement or understanding.`;

    console.log("Calling Lovable AI for pattern analysis...");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");
    
    const content = aiData.choices[0].message.content;
    
    // Extract JSON from potential markdown code blocks
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      jsonContent = content.split("```")[1].split("```")[0].trim();
    }

    const analysis = JSON.parse(jsonContent);

    // Store relationships in database
    const relationshipsToInsert = analysis.relationships.map((rel: any) => ({
      user_id: user.id,
      relationship_type: rel.type,
      source_item: rel.source,
      target_item: rel.target,
      strength: rel.strength,
      context: rel.context,
      entry_ids: rel.entry_indices.map((idx: number) => insights[idx - 1]?.entry_id).filter(Boolean),
      pattern_description: rel.context,
      temporal_pattern: rel.temporal_pattern,
    }));

    // Delete old relationships and insert new ones
    await supabase
      .from("knowledge_relationships")
      .delete()
      .eq("user_id", user.id);

    if (relationshipsToInsert.length > 0) {
      const { error: relError } = await supabase
        .from("knowledge_relationships")
        .insert(relationshipsToInsert);

      if (relError) {
        console.error("Error inserting relationships:", relError);
      }
    }

    // Store pattern insights
    const patternsToInsert = analysis.patterns.map((pattern: any) => ({
      user_id: user.id,
      pattern_type: pattern.type,
      title: pattern.title,
      description: pattern.description,
      confidence_score: pattern.confidence,
      related_items: pattern.related_items,
      entry_ids: pattern.entry_indices.map((idx: number) => insights[idx - 1]?.entry_id).filter(Boolean),
      temporal_info: pattern.temporal_info,
      actionable_insight: pattern.actionable_insight,
    }));

    // Delete old patterns and insert new ones
    await supabase
      .from("pattern_insights")
      .delete()
      .eq("user_id", user.id);

    if (patternsToInsert.length > 0) {
      const { error: patternError } = await supabase
        .from("pattern_insights")
        .insert(patternsToInsert);

      if (patternError) {
        console.error("Error inserting patterns:", patternError);
      }
    }

    console.log(`Analysis complete: ${relationshipsToInsert.length} relationships, ${patternsToInsert.length} patterns`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        relationships: relationshipsToInsert.length,
        patterns: patternsToInsert.length,
        analysis 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-patterns:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
