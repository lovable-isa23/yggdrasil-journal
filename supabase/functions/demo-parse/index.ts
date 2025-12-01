import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Entity {
  name: string;
  type: "person" | "place" | "activity" | "emotion" | "theme";
}

interface ParseResult {
  entities: Entity[];
  connections: Array<{ source: string; target: string }>;
  insights: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit text length
    const limitedText = text.slice(0, 500);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a text analyzer that extracts entities, connections, and insights from journal entries.
            
Analyze the text and extract:
1. Entities: People, places, activities, emotions, and themes mentioned
2. Connections: Relationships between entities (e.g., person + activity)
3. Insights: Brief observations about patterns (e.g., "You mentioned 'work' and 'stress' together")

Keep it concise - max 6 entities, 5 connections, 3 insights.
Entity names should be single words or short phrases (max 2 words).
Insights should be short, conversational observations (max 10 words each).`,
          },
          {
            role: "user",
            content: `Analyze this journal entry:\n\n"${limitedText}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_journal",
              description: "Extract entities, connections, and insights from journal text",
              parameters: {
                type: "object",
                properties: {
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Entity name (1-2 words)" },
                        type: { 
                          type: "string", 
                          enum: ["person", "place", "activity", "emotion", "theme"],
                          description: "Entity type"
                        },
                      },
                      required: ["name", "type"],
                    },
                    maxItems: 6,
                  },
                  connections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        source: { type: "string", description: "Source entity name" },
                        target: { type: "string", description: "Target entity name" },
                      },
                      required: ["source", "target"],
                    },
                    maxItems: 5,
                  },
                  insights: {
                    type: "array",
                    items: { type: "string" },
                    maxItems: 3,
                    description: "Short conversational observations about patterns",
                  },
                },
                required: ["entities", "connections", "insights"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "parse_journal" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result: ParseResult = JSON.parse(toolCall.function.arguments);

    console.log("Demo parse result:", JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Demo parse error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to parse text",
        entities: [],
        connections: [],
        insights: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
