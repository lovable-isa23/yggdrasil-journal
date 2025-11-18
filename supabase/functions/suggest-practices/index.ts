import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { intention, goalType } = await req.json();

    if (!intention) {
      return new Response(JSON.stringify({ error: "Intention is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating practice suggestions for intention:", intention);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `Based on this sacred intention and goal type, suggest 3 specific spiritual practices that would support this journey:

Intention: "${intention}"
Goal Type: ${goalType}

For each practice, provide:
1. A clear, actionable title
2. A detailed description of how to do the practice
3. The practice type (meditation, journaling, ritual, movement, breathwork, or study)
4. Recommended frequency (daily, weekly, or monthly)

The practices should be:
- Directly aligned with the stated intention
- Practical and achievable
- Varied in type to support different aspects of the journey
- Rooted in authentic spiritual traditions where applicable

Respond with ONLY a valid JSON array in this format:
[
  {
    "title": "Practice Name",
    "description": "Detailed instructions for the practice",
    "type": "meditation",
    "frequency": "daily"
  }
]`;

    const aiResponse = await fetch("https://api.lovable.app/v1/ai/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a spiritual practice guide. Provide only valid JSON responses with no markdown or explanations." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI request failed: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    let practices = [];

    if (aiData.choices && aiData.choices[0]?.message?.content) {
      const content = aiData.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      try {
        practices = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error("Failed to parse AI response:", cleanContent);
        throw new Error("Failed to parse practice suggestions");
      }
    }

    console.log("Generated practices:", practices);

    return new Response(JSON.stringify({ practices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-practices:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
