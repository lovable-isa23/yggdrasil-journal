import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entryId, title, content } = await req.json();

    if (!entryId || !content) {
      throw new Error('Entry ID and content are required');
    }

    console.log('Analyzing entry:', entryId);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Call Lovable AI for semantic analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a semantic analysis expert specializing in journal entry analysis. Extract meaningful insights from journal entries.

Your task is to analyze the journal entry and return a JSON object with:
- entities: Array of key people, places, events, or concepts mentioned (max 10)
- themes: Array of overarching themes or topics (max 5)
- emotions: Array of emotions detected with intensity (1-10 scale)
- keywords: Array of significant keywords (max 15)
- summary: A brief 2-3 sentence summary

Return ONLY valid JSON, no additional text or markdown.`
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent: ${content}`
          }
        ],
        tools: [
          {
            type: "function",
            name: "analyze_journal_entry",
            description: "Analyze a journal entry and extract semantic insights",
            parameters: {
              type: "object",
              properties: {
                entities: {
                  type: "array",
                  items: { type: "string" },
                  description: "Key entities mentioned in the entry"
                },
                themes: {
                  type: "array",
                  items: { type: "string" },
                  description: "Main themes of the entry"
                },
                emotions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      emotion: { type: "string" },
                      intensity: { type: "number" }
                    }
                  },
                  description: "Emotions detected with intensity 1-10"
                },
                keywords: {
                  type: "array",
                  items: { type: "string" },
                  description: "Significant keywords"
                },
                summary: {
                  type: "string",
                  description: "Brief summary of the entry"
                }
              },
              required: ["entities", "themes", "emotions", "keywords", "summary"]
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_journal_entry" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    // Extract the tool call result
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('Parsed analysis:', analysis);

    // Get user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid auth token');
    }

    // Store insights in database
    const { error: insertError } = await supabase
      .from('entry_insights')
      .upsert({
        entry_id: entryId,
        user_id: user.id,
        entities: analysis.entities || [],
        themes: analysis.themes || [],
        emotions: analysis.emotions || [],
        keywords: analysis.keywords || [],
        summary: analysis.summary || '',
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, insights: analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
