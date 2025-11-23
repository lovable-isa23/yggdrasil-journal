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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `Based on this sacred intention and goal type, suggest 3 specific spiritual practices that would support this journey:

Intention: "${intention}"
Goal Type: ${goalType}

For each practice, provide:
1. A clear, actionable title
2. Detailed, step-by-step instructions
3. Practice type (meditation, breathwork, visualization, journaling, movement, ritual, or study)
4. Recommended frequency (daily, weekly, or monthly)

Provide thoughtful, personalized practices that align with the intention.`;

    console.log("Calling Lovable AI Gateway...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are Yggi, a wise spiritual guide helping users discover meaningful practices for their sacred intentions. Provide thoughtful, personalized practice suggestions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_practices",
            description: "Return 3 spiritual practice suggestions based on the user's intention",
            parameters: {
              type: "object",
              properties: {
                practices: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      type: { 
                        type: "string",
                        enum: ["meditation", "breathwork", "visualization", "journaling", "movement", "ritual", "study"]
                      },
                      frequency: {
                        type: "string",
                        enum: ["daily", "weekly", "monthly"]
                      }
                    },
                    required: ["title", "description", "type", "frequency"],
                    additionalProperties: false
                  }
                }
              },
              required: ["practices"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_practices" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("Lovable AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("Lovable AI response:", JSON.stringify(aiData));

    // Extract practices from tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No valid tool call in response");
    }

    const practicesData = JSON.parse(toolCall.function.arguments);
    const practices = practicesData.practices || [];

    console.log("Practice suggestions generated:", practices.length);

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
