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
    const { goalTitle, rootText, trunkTitle, recentBranches } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context
    let context = `Goal: "${goalTitle}"`;
    if (rootText) context += `\nWhy it matters: "${rootText}"`;
    if (trunkTitle) context += `\nNext milestone: "${trunkTitle}"`;
    if (recentBranches && recentBranches.length > 0) {
      context += `\n\nRecent actions (avoid repeating these):\n${recentBranches.map((b: string) => `- ${b}`).join("\n")}`;
    }

    const systemPrompt = `You are helping users break down their goals into tiny, actionable weekly steps. Your suggestions should be:
- Specific and concrete (not vague)
- Doable in under 30 minutes each
- Aligned with the goal's purpose and milestone
- Different from any recent actions provided
- Encouraging and motivating

If the "Why it matters" or "Next milestone" is missing, still provide your best suggestions but make them more general.`;

    const userPrompt = `${context}

Generate 3 unique weekly actions that would help make progress on this goal. Each action should be something achievable this week.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_branches",
              description: "Return 2-3 actionable weekly tasks for the goal",
              parameters: {
                type: "object",
                properties: {
                  branches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { 
                          type: "string",
                          description: "Short action title (max 100 chars)"
                        },
                        rationale: { 
                          type: "string",
                          description: "Brief explanation of why this helps"
                        },
                        suggestedDueDay: { 
                          type: "string",
                          enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                          description: "Suggested day of the week to complete this"
                        },
                      },
                      required: ["title", "rationale", "suggestedDueDay"],
                      additionalProperties: false,
                    },
                  },
                  clarifyingQuestion: {
                    type: "string",
                    description: "Optional question if more context would help generate better suggestions",
                  },
                },
                required: ["branches"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_branches" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response format");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-branches:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
