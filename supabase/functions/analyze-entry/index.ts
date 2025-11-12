import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// AES-256-GCM decryption function
async function decrypt(encryptedBase64: string, key: string): Promise<string> {
  // Check if data is already plain text (legacy entries)
  try {
    // Try to decode base64 - if this fails, it's plain text
    atob(encryptedBase64);
  } catch {
    // Not base64, return as plain text
    return encryptedBase64;
  }

  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    // If decryption fails, return original text (likely plain text)
    return encryptedBase64;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MINUTES = 1;
const RATE_LIMIT_MAX_REQUESTS = 10;

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
    const rateLimitCheck = await checkRateLimit(supabase, user.id, 'analyze-entry');
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { entryId } = await req.json();

    // Input validation
    if (!entryId) {
      throw new Error('Entry ID is required');
    }

    // Fetch user preferences
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('enable_chakra_tags, enable_tarot_tags')
      .eq('user_id', user.id)
      .single();

    const enableChakraTags = userPrefs?.enable_chakra_tags || false;
    const enableTarotTags = userPrefs?.enable_tarot_tags || false;

    console.log('Analyzing entry:', entryId);

    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Fetch the encrypted entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      console.error('Entry fetch error:', entryError);
      throw new Error('Entry not found');
    }

    // Decrypt the entry
    const title = await decrypt(entry.title, encryptionKey);
    const content = await decrypt(entry.content, encryptionKey);

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
${enableChakraTags ? `- chakra_tags: Identify which chakra energy centers relate to the content (format: [{"chakra": "Root", "description": "brief relevance"}]). The seven chakras are: Root (survival, grounding), Sacral (creativity, emotions), Solar Plexus (personal power), Heart (love, compassion), Throat (communication, truth), Third Eye (intuition, insight), Crown (spiritual connection).` : ''}
${enableTarotTags ? `- tarot_tags: Identify relevant tarot archetypes (format: [{"card": "The Fool", "description": "brief relevance"}]). Consider Major Arcana cards and their symbolic meanings.` : ''}

IMPORTANT: For safety_concerns, only flag true if there is genuine risk language (e.g., "I want to end my life", "not worth living", "plan to hurt myself", "everyone would be better off without me"). Do not flag general sadness, stress, or normal difficult emotions.

Respond with ONLY a valid JSON object in this exact format:
{
  "entities": ["entity1", "entity2"],
  "themes": ["theme1", "theme2"],
  "emotions": [{"emotion": "joy", "intensity": 7}],
  "keywords": ["keyword1", "keyword2"],
  "summary": "Your summary here.",
  "safety_concerns": {"flag": false, "concerns": []}${enableChakraTags ? ',\n  "chakra_tags": [{"chakra": "Root", "description": "brief"}]' : ''}${enableTarotTags ? ',\n  "tarot_tags": [{"card": "The Fool", "description": "brief"}]' : ''}
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

    // Parse the JSON response with robust sanitization
    let analysis: any;
    try {
      let cleanContent = aiContent.trim();

      // 1) Strip common markdown code fences
      cleanContent = cleanContent.replace(/^```json\s*/i, '');
      cleanContent = cleanContent.replace(/^```\s*/i, '');
      cleanContent = cleanContent.replace(/\s*```\s*$/i, '');

      // 2) Extract JSON object between first '{' and last '}'
      const start = cleanContent.indexOf('{');
      const end = cleanContent.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        cleanContent = cleanContent.slice(start, end + 1);
      }

      // 3) Normalize smart quotes
      cleanContent = cleanContent
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"');

      // 4) Remove trailing commas before closing } or ]
      cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');

      analysis = JSON.parse(cleanContent);
      console.log('Parsed analysis (sanitized):', analysis);
    } catch (parseError) {
      console.error('Failed to parse AI response raw:', aiContent);
      console.error('Parse error details:', parseError);
      throw new Error('Failed to parse AI analysis: ' + (parseError instanceof Error ? parseError.message : 'Unknown parse error'));
    }

    // Store insights in database (supabase client already initialized above)
    const insightData: any = {
      entry_id: entryId,
      user_id: user.id,
      entities: analysis.entities || [],
      themes: analysis.themes || [],
      emotions: analysis.emotions || [],
      keywords: analysis.keywords || [],
      summary: analysis.summary || '',
      safety_concerns: analysis.safety_concerns || { flag: false, concerns: [] },
    };

    if (enableChakraTags && analysis.chakra_tags) {
      insightData.chakra_tags = analysis.chakra_tags;
    }

    if (enableTarotTags && analysis.tarot_tags) {
      insightData.tarot_tags = analysis.tarot_tags;
    }

    const { error: insertError } = await supabase
      .from('entry_insights')
      .upsert(insightData, { onConflict: 'entry_id' });

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
