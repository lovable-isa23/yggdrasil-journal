import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intention, goalType } = await req.json();

    if (!intention || intention.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Intention too short to extract meaningful details" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Extracting goal details from intention:", intention.substring(0, 100) + "...");
    console.log("Goal type:", goalType);

    const goalTypeLabels: Record<string, string> = {
      "shadow-work": "Shadow Work",
      "spiritual-practice": "Spiritual Practice",
      "emotional-healing": "Emotional Healing",
      "manifestation": "Manifestation",
      "creative-expression": "Creative Expression",
      "relationship-work": "Relationship Work",
      "general": "General"
    };

    const systemPrompt = `You are Yggi, a wise spiritual guide helping someone articulate their inner journey. 
Your task is to extract a clear, actionable goal from their expressed intention.

Guidelines:
- Title should be concise (3-8 words), poetic yet clear, capturing the essence of their journey
- Description should be 2-4 sentences offering a structured path with gentle, actionable steps
- Use warm, accessible language - like a wise friend, not a teacher
- Honor the ${goalTypeLabels[goalType] || "General"} nature of their journey
- Don't be generic - reflect their specific words and themes back to them`;

    const userPrompt = `Extract a goal title and description from this intention:

"${intention}"

Create something that feels personal to their journey, not generic advice.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_goal",
              description: "Extract a structured goal from the user's intention",
              parameters: {
                type: "object",
                properties: {
                  title: { 
                    type: "string", 
                    description: "A concise, poetic goal title (3-8 words) that captures the essence of their journey" 
                  },
                  description: { 
                    type: "string", 
                    description: "2-4 sentences offering a structured path with gentle, actionable steps. Reflect their specific themes." 
                  }
                },
                required: ["title", "description"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_goal" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Lovable AI response:", JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_goal") {
      throw new Error("Unexpected response format from AI");
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log("Extracted goal:", extracted);

    return new Response(
      JSON.stringify({ 
        title: extracted.title,
        description: extracted.description
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in extract-goal-details:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to extract goal details" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
