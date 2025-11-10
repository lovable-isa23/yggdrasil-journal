import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MINUTES = 1;
const RATE_LIMIT_MAX_REQUESTS = 5;

async function checkRateLimit(supabase: any, userId: string, functionName: string): Promise<{ allowed: boolean; message?: string }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  
  // Get current rate limit entry
  const { data: rateLimitData, error: rateLimitError } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .gte('window_start', windowStart.toISOString())
    .single();

  if (rateLimitError && rateLimitError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Rate limit check error:', rateLimitError);
    return { allowed: true }; // Fail open to not block users due to rate limit errors
  }

  if (!rateLimitData) {
    // First request in this window
    await supabase
      .from('rate_limits')
      .insert({
        user_id: userId,
        function_name: functionName,
        request_count: 1,
        window_start: new Date().toISOString(),
      });
    return { allowed: true };
  }

  if (rateLimitData.request_count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetTime = new Date(new Date(rateLimitData.window_start).getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    return { 
      allowed: false, 
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MINUTES} minute(s). Try again after ${resetTime.toLocaleTimeString()}.` 
    };
  }

  // Increment counter
  await supabase
    .from('rate_limits')
    .update({ request_count: rateLimitData.request_count + 1 })
    .eq('id', rateLimitData.id);

  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from request first for rate limiting
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

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(supabase, user.id, 'generate-reflection');
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { recentEntries } = await req.json();

    // Input validation
    if (!recentEntries || recentEntries.length === 0) {
      throw new Error('No entries provided for reflection generation');
    }

    if (!Array.isArray(recentEntries)) {
      throw new Error('recentEntries must be an array');
    }

    if (recentEntries.length > 10) {
      throw new Error('Maximum 10 entries allowed for reflection generation');
    }

    // Validate each entry
    for (const entry of recentEntries) {
      if (!entry.title || !entry.content) {
        throw new Error('Each entry must have title and content');
      }
      if (typeof entry.title !== 'string' || entry.title.length > 200) {
        throw new Error('Entry titles must be strings with max 200 characters');
      }
      if (typeof entry.content !== 'string' || entry.content.length > 50000) {
        throw new Error('Entry content must be strings with max 50,000 characters');
      }
    }

    console.log('Generating reflection for', recentEntries.length, 'entries');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare context from recent entries
    const context = recentEntries.map((entry: any, idx: number) => 
      `Entry ${idx + 1} (${new Date(entry.created_at).toLocaleDateString()}):\n${entry.title}\n${entry.content.substring(0, 500)}...`
    ).join('\n\n');

    // Call Lovable AI for reflection prompt generation
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
            content: `You are a spiritual guide inspired by holistic, nondenominational wisdom. Your role is to craft thoughtful, introspective reflection prompts based on journal entries.

Your prompts should:
- Be gentle, open-ended, and invite deep self-reflection
- Draw from universal wisdom traditions without being specific to any religion
- Help the journaler see patterns and connections in their experiences
- Encourage growth, self-awareness, and inner peace
- Be poetic yet accessible, profound yet grounded
- Be 2-4 sentences long

Style inspiration: The Formless Guide (YouTube) - contemplative, spacious, inviting.`
          },
          {
            role: 'user',
            content: `Based on these recent journal entries, create a meaningful reflection prompt:\n\n${context}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const prompt = aiData.choices[0]?.message?.content;

    if (!prompt) {
      throw new Error('No prompt generated');
    }

    console.log('Generated prompt:', prompt);

    // Store reflection prompt in database (supabase client already initialized above)
    const { error: insertError } = await supabase
      .from('reflection_prompts')
      .insert({
        user_id: user.id,
        prompt: prompt,
        context: `Based on ${recentEntries.length} recent entries`,
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, prompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-reflection:', error);
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
