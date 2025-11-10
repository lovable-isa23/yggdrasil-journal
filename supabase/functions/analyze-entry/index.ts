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

    // Input validation
    if (!entryId || !content) {
      throw new Error('Entry ID and content are required');
    }

    if (typeof title !== 'string' || title.length > 200) {
      throw new Error('Title must be a string with max 200 characters');
    }

    if (typeof content !== 'string' || content.length > 50000) {
      throw new Error('Content must be a string with max 50,000 characters');
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

Analyze the journal entry and extract:
- entities: Key people, places, events, or concepts (max 10)
- themes: Overarching themes or topics (max 5)
- emotions: Emotions with intensity 1-10 (format: [{"emotion": "happy", "intensity": 8}])
- keywords: Significant keywords (max 15)
- summary: Brief 2-3 sentence summary
- safety_concerns: Detect concerning content including suicidal ideation, self-harm thoughts, plans to harm self or others, severe hopelessness, or crisis situations. Format: {"flag": true/false, "concerns": ["concern1", "concern2"]}

IMPORTANT: For safety_concerns, only flag true if there is genuine risk language (e.g., "I want to end my life", "not worth living", "plan to hurt myself", "everyone would be better off without me"). Do not flag general sadness, stress, or normal difficult emotions.

Respond with ONLY a valid JSON object in this exact format:
{
  "entities": ["entity1", "entity2"],
  "themes": ["theme1", "theme2"],
  "emotions": [{"emotion": "joy", "intensity": 7}],
  "keywords": ["keyword1", "keyword2"],
  "summary": "Your summary here.",
  "safety_concerns": {"flag": false, "concerns": []}
}`
          },
          {
            role: 'user',
            content: `Analyze this journal entry:\n\nTitle: ${title}\n\nContent: ${content}`
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    // Extract the content and parse JSON
    const aiContent = aiData.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
      console.log('Parsed analysis:', analysis);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI analysis');
    }

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
        safety_concerns: analysis.safety_concerns || { flag: false, concerns: [] },
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
