import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Fetch user's pattern insights
    const { data: patterns, error: patternsError } = await supabaseClient
      .from('pattern_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (patternsError) throw patternsError;

    if (!patterns || patterns.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No patterns found',
          message: 'Create some journal entries first to discover patterns and get goal suggestions.'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare patterns summary for AI
    const patternsSummary = patterns.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      type: p.pattern_type,
      actionableInsight: p.actionable_insight,
    }));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Based on the following patterns discovered in the user's journal, suggest 3-5 meaningful goals that would help them grow. Each goal should be specific, actionable, and aligned with their patterns.

Patterns:
${JSON.stringify(patternsSummary, null, 2)}

Provide goal suggestions in the following format:
- Title (concise, inspiring)
- Description (2-3 sentences explaining why this goal matters)
- Goal Type (one of: spiritual, personal, health, career, relationship, creative, learning, general)
- Linked Pattern IDs (array of pattern IDs that relate to this goal)

Return a valid JSON array of goal objects.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are Yggi, a wise spiritual guide helping users set meaningful goals based on their journal patterns. Provide thoughtful, personalized goal suggestions in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_goals",
            description: "Return 3-5 goal suggestions based on journal patterns",
            parameters: {
              type: "object",
              properties: {
                goals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      goal_type: { 
                        type: "string",
                        enum: ["spiritual", "personal", "health", "career", "relationship", "creative", "learning", "general"]
                      },
                      linked_pattern_ids: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: ["title", "description", "goal_type", "linked_pattern_ids"],
                    additionalProperties: false
                  }
                }
              },
              required: ["goals"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_goals" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Failed to generate goal suggestions');
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract goals from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No valid tool call in response');
    }

    const goalsData = JSON.parse(toolCall.function.arguments);
    const goals = goalsData.goals || [];

    return new Response(
      JSON.stringify({ goals }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-goals function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate goal suggestions';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
