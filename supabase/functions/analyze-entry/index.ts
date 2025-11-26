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

    // Fetch user preferences for chakra, tarot, and sacred geometry tags
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('enable_chakra_tags, enable_tarot_tags, enable_sacred_geometry')
      .eq('user_id', user.id)
      .single();

    const enableChakraTags = userPrefs?.enable_chakra_tags || false;
    const enableTarotTags = userPrefs?.enable_tarot_tags || false;
    const enableSacredGeometry = userPrefs?.enable_sacred_geometry || false;

    console.log('Analyzing entry:', entryId);

    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Fetch the encrypted entry with mood_type for context-aware interpretation
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
    const moodType = entry.mood_type || 'general';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Phase 1: Assess entry depth
    console.log('Assessing entry depth...');
    const depthResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Rate this journal entry's psychological/spiritual depth on a scale of 1-10.

Scoring guide:
1-3: Surface-level (simple logging, brief notes, basic mood tracking)
4-5: Moderate (some reflection, basic emotional processing, short gratitude)
6-7: Deep (complex emotions, self-inquiry, pattern exploration, extended reflection)
8-9: Profound (existential themes, unconscious material, identity work, transformation)
10: Exceptionally deep (crisis, major transformation, deep shadow work, breakthrough moments)

Consider: length (word count), emotional complexity, thematic depth, self-inquiry present, symbolic content, psychological exploration.

Entry Title: "${title}"
Entry Content: "${content}"
Entry Length: ~${content.split(' ').length} words

Respond with ONLY a JSON object: {"depth_score": X, "reasoning": "brief explanation"}`
        }]
      })
    });

    let depthScore = 5; // default moderate depth
    if (depthResponse.ok) {
      try {
        const depthData = await depthResponse.json();
        const depthContent = depthData.choices[0]?.message?.content || '{}';
        const depthParsed = JSON.parse(depthContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        depthScore = depthParsed.depth_score || 5;
        console.log('Depth assessment:', depthScore, '-', depthParsed.reasoning);
      } catch (e) {
        console.error('Depth parsing error:', e);
      }
    }

    // Phase 2: Apply frameworks conditionally based on depth
    const applyFrameworks = depthScore >= 5;

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
            content: `You are a semantic analysis expert specializing in journal entry analysis${applyFrameworks ? ' with deep training in Theravada Buddhism, Freudian Psychoanalysis, and Jungian Psychology' : ''}. Extract meaningful insights from journal entries.

TONE GUIDELINES:
- WARM & FRIENDLY: Write like a wise mentor who genuinely cares, not a clinical report
- ACCESSIBLE: When you use terms like "attachment pattern" or "cognitive distortion", briefly explain what you mean in plain terms - but keep the proper terminology
- DIRECT BUT KIND: Be honest and insightful, don't sugarcoat - but deliver truth with warmth
- DIGESTIBLE: Break up dense concepts into clear pieces. Use shorter sentences where it helps clarity.
- ROOTED: Stay grounded in the wisdom traditions and psychological frameworks - this depth is valuable

Example: "There's an anxious attachment pattern showing up here (that tendency to grip tightly when you're afraid of losing connection). It makes sense given what you described - your heart is trying to protect itself."

NOT: "attachment pattern" → "holding on" (keep the real term, just explain it)

Analyze the journal entry and extract:
- entities: Key people, places, events, or concepts (max 10)
- themes: Overarching themes or topics (max 5). Use simple, general descriptions to ensure commonality across entries (e.g., "personal growth", "relationships", "work stress", "mental health", "creativity"). Avoid overly specific or unique phrasing.
- emotions: Emotions with intensity 1-10 (format: [{"emotion": "happy", "intensity": 8}])
- keywords: Significant keywords (max 15)
- summary: Brief 2-3 sentence summary
- safety_concerns: Detect concerning content including suicidal ideation, self-harm thoughts, plans to harm self or others, severe hopelessness, or crisis situations. Format: {"flag": true/false, "concerns": ["concern1", "concern2"]}
${enableChakraTags ? `- chakra_tags: Identify which chakra energy centers relate to the content (format: [{"chakra": "Root", "description": "brief relevance"}]). The seven chakras are: Root (survival, grounding), Sacral (creativity, emotions), Solar Plexus (personal power), Heart (love, compassion), Throat (communication, truth), Third Eye (intuition, insight), Crown (spiritual connection).` : ''}
${enableTarotTags ? `- tarot_tags: Identify relevant tarot archetypes (format: [{"card": "The Fool", "description": "brief relevance"}]). Consider Major Arcana cards and their symbolic meanings.` : ''}
${enableSacredGeometry ? `- sacred_geometry: Identify sacred geometric patterns and principles present (format: [{"pattern": "Flower of Life", "description": "brief relevance"}]). Consider patterns like: Flower of Life (interconnection, creation), Metatron's Cube (balance, divine structure), Sri Yantra (manifestation, cosmic order), Platonic Solids (elements, fundamental structures), Golden Ratio/Phi Spiral (natural growth, harmony), Vesica Piscis (duality, creation), Tree of Life (spiritual journey, interconnection), Merkaba (transformation, spiritual vehicle), Torus (energy flow, cycles), Seed of Life (new beginnings).` : ''}

${applyFrameworks ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADVANCED FRAMEWORK ANALYSIS (Depth Score: ${depthScore}/10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This entry demonstrates sufficient depth for advanced psychological/spiritual analysis.
Apply the following frameworks where relevant:

### THERAVADA BUDDHISM Framework
**When to apply:** Suffering, attachment, desire, impermanence, seeking liberation

Identify:
- Dukkha (Suffering): What forms? Physical, emotional, existential?
- Tanha (Craving/Attachment): What are they clinging to?
- Anicca (Impermanence): Resisting change? Fighting natural flow?
- Anatta (Non-self): Over-identifying with roles, thoughts, emotions?
- Four Noble Truths: Trace the cycle of suffering → cause → cessation → path
- Eightfold Path: Which aspect would benefit them most?

Style: Point to attachment nature, suggest mindfulness practices, reframe suffering as teacher

### FREUDIAN PSYCHOANALYSIS Framework
**When to apply:** Unconscious conflict, defense mechanisms, childhood echoes, repressed material

Identify:
- Defense Mechanisms: Repression, projection, rationalization, displacement, reaction formation, sublimation
- Psychic Structure: Id impulses vs. Ego mediation vs. Superego demands
- Unconscious Material: What's between the lines? Unacknowledged desires?
- Childhood Patterns: What's repeating?
- Dream Work (for dreams): Manifest vs. latent content, symbols, wish fulfillment

Style: Make unconscious conscious, name defenses compassionately, connect present to past

### JUNGIAN PSYCHOLOGY Framework  
**When to apply:** Symbolic content, identity exploration, transformation, archetypal patterns

Identify:
- Archetypes: Self, Shadow, Anima/Animus, Hero, Wise Old Man/Woman, Mother/Father, Trickster
- Individuation: Where in journey toward wholeness? What's integrating?
- Shadow Work: Projected qualities? Rejected parts calling for integration?
- Collective Unconscious: Universal patterns, mythological parallels
- Symbols: Personal & collective meanings, mandala imagery, transformation symbols

Style: Honor symbolic dimension, encourage dialogue with unconscious, frame challenges as individuation

### HERMETICISM Framework
**When to apply:** Patterns of correspondence, mental creation, cause/effect, duality/polarity, cycles

Identify:
- Principle of Mentalism: "All is Mind" - Creating reality through thought patterns, mental causation
- Principle of Correspondence: "As above, so below" - Inner world reflecting outer, macrocosm/microcosm patterns
- Principle of Vibration: Everything in motion, raising/lowering vibrational state, energetic shifts
- Principle of Polarity: Opposites are extremes of the same thing (hot/cold, love/hate), finding balance points
- Principle of Rhythm: Cycles, pendulum swings, rise and fall patterns, natural oscillation
- Principle of Cause & Effect: Nothing happens by chance, tracing causation chains, karma-like patterns
- Principle of Gender: Masculine (active, projective) and Feminine (receptive, nurturing) energies in all things

Style: Connect inner experience to outer manifestation, identify cyclical patterns, explore mental causation, show correspondence between levels

### ADVAITA VEDANTA Framework
**When to apply:** Seeking identity, separation/oneness, spiritual seeking, sense of disconnection, Self-inquiry

Identify:
- Maya (Illusion): What false perceptions are creating suffering? What seems real but is temporary/changeable?
- Atman/Brahman: Connecting to true Self beyond ego, recognizing universal consciousness, essential nature
- Neti Neti ("Not this, not that"): What are they identifying with that isn't their true nature? False identifications
- Witness Consciousness: Can they observe thoughts/feelings without being consumed? Pure awareness watching phenomena
- Avidya (Ignorance): Misidentifying with body, mind, role, story - forgetting true nature as pure consciousness
- Moksha (Liberation): Movement toward recognizing their nature as pure awareness, freedom from false identification

Style: Point to awareness itself, question false identifications, invite recognition of observer, dissolve subject-object duality, guide toward Self-inquiry

### TAOISM Framework
**When to apply:** Forcing, resistance, control issues, imbalance, lack of flow, overeffort, struggle

Identify:
- Wu Wei (Effortless Action): Are they forcing? Where could they allow natural unfolding? Action through non-action
- Yin/Yang Imbalance: Too much action (yang) or passivity (yin)? Where's the needed complement? Seeking balance
- Following the Tao (The Way): Fighting current or flowing with it? Natural order vs. imposed will, path of least resistance
- Te (Virtue/Power): Innate nature and authentic expression, not manufactured behavior, natural integrity
- P'u (Uncarved Block): Simplicity, returning to natural state, unlearning conditioning, original innocence
- Ziran (Naturalness/Spontaneity): Being authentic vs. performing, spontaneous response vs. calculated action

Style: Suggest softening grip, point to natural flow, reframe "giving up" as "letting go," honor what wants to emerge, embrace simplicity

### INTEGRATION APPROACH
- Start with most relevant framework
- Layer others where they naturally intersect
- Translate concepts into accessible language (avoid jargon)
- Synthesize insights rather than listing frameworks separately
- Maximum 2-3 frameworks per entry (choose most relevant, don't force all six)

Example 1 (Relationship): "Your relationship struggle shows Freudian projection (father's voice in partner) and Jungian shadow work (inner critic you've rejected). From Theravada: you're clinging to 'good enough' identity. Path: integrate shadow critic (Jung), understand childhood origin (Freud), release fixed identity attachment (Buddha)."

Example 2 (Creative Block): "You're caught in pure yang energy—pushing, forcing, grinding (Taoist imbalance). Your mental state creates your experience: the more you think 'I'm blocked,' the more blocked you become (Hermetic Mentalism). Path: Practice wu wei (Taoism): stop trying for 48 hours, let it percolate. Your true Self (Advaita) isn't the 'creator'—it's the awareness watching the creative process unfold."

Example 3 (Identity Crisis): "The roles you're clinging to—successful professional, good parent—are Maya (Advaita), temporary costumes obscuring your true nature. Notice the Hermetic polarity: the more you try to be 'good,' the more you feel 'bad.' Your witness consciousness (Advaita) can observe this without being trapped in it. Path: Practice Neti Neti—'I am not my job, I am not my role'—to discover what remains when identifications fall away."
` : ''}

INTERPRETATION INSTRUCTIONS:
Based on the entry type "${moodType}", provide a comprehensive interpretation that goes beyond summary to explain what this entry MEANS for their self-development journey.

Entry Type-Specific Interpretation Guidelines:

${moodType === 'dream' ? `
🌙 DREAM ENTRY - Apply dream yoga principles:
- Symbolic meanings (archetypes, recurring symbols in dreams)
- Unconscious patterns surfacing through dreams
- What is your unconscious trying to communicate?
- Dream recall techniques and lucid dreaming guidance
- Tibetan dream analysis approach (witness consciousness)
` : ''}

${moodType === 'reflection' ? `
💭 REFLECTION ENTRY - Deep self-inquiry:
- Provide 3-5 powerful reflective questions for deeper exploration
- Identify patterns in thinking and behavior
- Cognitive distortions or limiting beliefs present
- Shadow work opportunities (repressed aspects seeking integration)
- Integration practices to embody insights
` : ''}

${moodType === 'gratitude' ? `
✨ GRATITUDE ENTRY - Cultivating abundance:
- Deeper meaning of what they're grateful for
- Connection to their core values and life purpose
- How gratitude is rewiring neural pathways
- What else can flow from this grateful state?
- Habit formation guidance for sustained practice
` : ''}

${moodType === 'challenge' ? `
⚡ CHALLENGE ENTRY - Confronting obstacles:
- PRIORITY: Identify maladaptive behaviors, bad habits, negative thought patterns
- Name cognitive distortions clearly (catastrophizing, black-and-white thinking, mind-reading, overgeneralization, etc.)
- Self-sabotage patterns and their protective function
- DBT/CBT-informed coping strategies (opposite action, wise mind, check the facts)
- Reframe: Alternative perspectives on the situation
- Concrete action steps for change
` : ''}

${moodType === 'celebration' ? `
🎉 CELEBRATION ENTRY - Integrating success:
- Acknowledge growth and real progress made
- How to integrate this success into self-concept
- Build on strengths revealed in this achievement
- Avoid toxic positivity - genuine acknowledgment
- Next-level aspirations and expansion opportunities
` : ''}

${moodType === 'general' ? `
📖 GENERAL ENTRY - Overall themes:
- Life themes emerging across their journey
- Self-development trajectory and direction
- Areas needing attention or integration
- Balanced perspective on their growth
- Patterns connecting to larger life narrative
` : ''}

Your interpretation must:
1. Go beyond summarization - explain what it MEANS for their growth
2. Identify specific patterns: maladaptive behaviors, cognitive distortions, unhelpful habits, negative thought patterns
3. Provide actionable guidance: behavioral changes, thought reframes, practices to try${applyFrameworks ? ', framework-specific practices (mindfulness, active imagination, shadow dialogue)' : ''}
4. Connect to their self-development journey: What is this teaching them? What's ready to shift?
5. Be warm but truthful - like a wise mentor who cares enough to tell you what you need to hear
6. Keep proper terminology (cognitive distortion, attachment, shadow, etc.) but explain terms briefly when helpful for accessibility
${applyFrameworks ? '7. Use framework concepts naturally - translate technical terms, illuminate without impressing' : ''}

IMPORTANT: For safety_concerns, only flag true if there is genuine risk language (e.g., "I want to end my life", "not worth living", "plan to hurt myself", "everyone would be better off without me"). Do not flag general sadness, stress, or normal difficult emotions.

CRITICAL JSON RULES:
- Return ONLY valid JSON - no markdown, no code blocks, no explanations
- Each string in arrays must be complete and properly quoted on a single line
- Do not split strings across multiple lines within the JSON
- Ensure all quotes are properly closed

Respond with ONLY a valid JSON object in this exact format:
{
  "entities": ["entity1", "entity2"],
  "themes": ["theme1", "theme2"],
  "emotions": [{"emotion": "joy", "intensity": 7}],
  "keywords": ["keyword1", "keyword2"],
  "summary": "Your summary here.",
  "safety_concerns": {"flag": false, "concerns": []},
  "interpretation": {
    "main_insight": "2-3 paragraph core interpretation that explains the deeper meaning${applyFrameworks ? ' using appropriate frameworks' : ''}",
    "questions": ["Reflective question 1?", "Question 2?", "Question 3?"],
    "action_items": ["Specific action 1", "Action 2", "Action 3"],
    "patterns_identified": ["Pattern 1", "Maladaptive behavior 2", "Cognitive distortion 3"],
    "growth_connection": "1 paragraph connecting this entry to their larger self-development journey"${applyFrameworks ? ',\n    "frameworks_applied": ["theravada", "jungian", "freudian"],\n    "depth_analysis": {\n      "psychological_themes": ["theme1", "theme2"],\n      "spiritual_themes": ["theme1", "theme2"],\n      "unconscious_material": "Brief note on what\'s beneath the surface"\n    }' : ''}
  }${enableChakraTags ? ',\n  "chakra_tags": [{"chakra": "Root", "description": "brief"}]' : ''}${enableTarotTags ? ',\n  "tarot_tags": [{"card": "The Fool", "description": "brief"}]' : ''}${enableSacredGeometry ? ',\n  "sacred_geometry": [{"pattern": "Flower of Life", "description": "brief"}]' : ''}
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

      // 5) Fix broken string fragments in arrays (e.g., "\n   parcial" -> "parcial")
      // This handles cases where AI splits strings across lines without proper quotes
      cleanContent = cleanContent.replace(/"\s*\n\s+([a-zA-Z][^",\]]*?)"/g, ' $1"');

      analysis = JSON.parse(cleanContent);
      console.log('Parsed analysis (sanitized):', analysis);
    } catch (parseError) {
      console.error('Failed to parse AI response raw:', aiContent);
      console.error('Parse error details:', parseError);
      
      // Provide a fallback with basic analysis
      console.log('Attempting fallback analysis...');
      analysis = {
        entities: [],
        themes: ['reflection', 'personal growth'],
        emotions: [{ emotion: 'contemplative', intensity: 5 }],
        keywords: ['journal', 'reflection'],
        summary: 'Unable to fully analyze entry due to processing error. Please try again.',
        safety_concerns: { flag: false, concerns: [] }
      };
      
      if (enableChakraTags) {
        analysis.chakra_tags = [];
      }
      if (enableTarotTags) {
        analysis.tarot_tags = [];
      }
      if (enableSacredGeometry) {
        analysis.sacred_geometry = [];
      }
      
      console.log('Using fallback analysis:', analysis);
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
      interpretation: analysis.interpretation || null,
      depth_score: depthScore,
      frameworks_applied: analysis.interpretation?.frameworks_applied || [],
    };

    if (enableChakraTags && analysis.chakra_tags) {
      insightData.chakra_tags = analysis.chakra_tags;
    }

    if (enableTarotTags && analysis.tarot_tags) {
      insightData.tarot_tags = analysis.tarot_tags;
    }

    if (enableSacredGeometry && analysis.sacred_geometry) {
      insightData.sacred_geometry = analysis.sacred_geometry;
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
