import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intention, goalType } = await req.json();

    if (!intention) {
      return new Response(JSON.stringify({ error: "Intention is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating practice suggestions for intention:", intention);

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
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

    console.log("Calling OpenAI API...");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      console.error("OpenAI API error:", errorText);
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
