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

    // Fetch user preferences for tags and framework settings
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('enable_chakra_tags, enable_tarot_tags, enable_sacred_geometry, enable_theravada, enable_freudian, enable_jungian, enable_hermetic, enable_advaita, enable_taoist, enable_attachment, enable_ifs, enable_cbt, enable_dbt')
      .eq('user_id', user.id)
      .single();

    const enableChakraTags = userPrefs?.enable_chakra_tags || false;
    const enableTarotTags = userPrefs?.enable_tarot_tags || false;
    const enableSacredGeometry = userPrefs?.enable_sacred_geometry || false;

    // Framework preferences (default to true if not set)
    const enabledFrameworks = {
      theravada: userPrefs?.enable_theravada ?? true,
      freudian: userPrefs?.enable_freudian ?? true,
      jungian: userPrefs?.enable_jungian ?? true,
      hermetic: userPrefs?.enable_hermetic ?? true,
      advaita: userPrefs?.enable_advaita ?? true,
      taoist: userPrefs?.enable_taoist ?? true,
      attachment: userPrefs?.enable_attachment ?? true,
      ifs: userPrefs?.enable_ifs ?? true,
      cbt: userPrefs?.enable_cbt ?? true,
      dbt: userPrefs?.enable_dbt ?? true,
    };
    
    const activeFrameworkCount = Object.values(enabledFrameworks).filter(Boolean).length;
    console.log('Enabled frameworks:', activeFrameworkCount, 'of 10');

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
          content: `Rate this journal entry's psychological/spiritual depth on a scale of 1-11 (scores of 11 are rare).

Scoring guide:
1-2: Surface-level (simple logging, brief notes, basic mood tracking)
3-4: Moderate (some reflection, basic emotional processing, short gratitude lists)
5-6: Thoughtful (personal exploration, emotional awareness, meaningful self-reflection)
7-8: Deep (complex emotions, self-inquiry, pattern exploration, extended reflection)
9-10: Profound (existential themes, unconscious material, identity work, transformation, spiritual insight)
11: Exceptional (identity-shattering revelation, major psychological transformation, deep shadow integration, genuine breakthrough moments) - RARE, reserve for truly extraordinary entries

IMPORTANT: Crisis alone does NOT indicate depth. A frantic crisis entry may be surface-level. Depth comes from REFLECTION, INSIGHT, and SELF-INQUIRY, not emotional intensity.

Consider: length (250+ words suggests engagement), emotional complexity, self-inquiry present, symbolic or dream content, psychological insight, pattern recognition. Bias toward higher scores when genuine reflection is present.

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

    // Filter and randomize framework order based on user preferences
    const frameworkOrder = [
      enabledFrameworks.theravada ? 'theravada' : null,
      enabledFrameworks.freudian ? 'freudian' : null,
      enabledFrameworks.jungian ? 'jungian' : null,
      enabledFrameworks.hermetic ? 'hermetic' : null,
      enabledFrameworks.advaita ? 'advaita' : null,
      enabledFrameworks.taoist ? 'taoist' : null,
      enabledFrameworks.attachment ? 'attachment' : null,
      enabledFrameworks.ifs ? 'ifs' : null,
      enabledFrameworks.cbt ? 'cbt' : null,
      enabledFrameworks.dbt ? 'dbt' : null,
    ].filter(Boolean).sort(() => Math.random() - 0.5) as string[];
    console.log('Framework order for this analysis:', frameworkOrder);

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
            content: `You are a semantic analysis expert specializing in journal entry analysis${applyFrameworks && frameworkOrder.length > 0 ? ` with training in wisdom traditions and psychological frameworks` : ''}. Extract meaningful insights from journal entries.

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
- keywords: Significant keywords (max 10)
- summary: Brief 2-3 sentence summary
- safety_concerns: Detect concerning content including suicidal ideation, self-harm thoughts, plans to harm self or others, severe hopelessness, or crisis situations. Format: {"flag": true/false, "concerns": ["concern1", "concern2"]}
${enableChakraTags ? `- chakra_tags: Identify which chakra energy centers relate to the content (format: [{"chakra": "Root", "description": "brief relevance"}]). Use ONLY these exact chakra names - never use alternative names like "Spleen" or "Spleen/Sacral": "Root" (survival, grounding), "Sacral" (creativity, emotions, passion), "Solar Plexus" (personal power, will), "Heart" (love, compassion), "Throat" (communication, expression), "Third Eye" (intuition, insight), "Crown" (spiritual connection).` : ''}
${enableTarotTags ? `- tarot_tags: Identify relevant tarot archetypes (format: [{"card": "The Fool", "description": "brief relevance"}]). Consider Major Arcana cards and their symbolic meanings.` : ''}
${enableSacredGeometry ? `- sacred_geometry: Identify sacred geometric patterns and principles present (format: [{"pattern": "Flower of Life", "description": "brief relevance"}]). Consider patterns like: Flower of Life (interconnection, creation), Metatron's Cube (balance, divine structure), Sri Yantra (manifestation, cosmic order), Platonic Solids (elements, fundamental structures), Golden Ratio/Phi Spiral (natural growth, harmony), Vesica Piscis (duality, creation), Tree of Life (spiritual journey, interconnection), Merkaba (transformation, spiritual vehicle), Torus (energy flow, cycles), Seed of Life (new beginnings).` : ''}

${applyFrameworks && frameworkOrder.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADVANCED FRAMEWORK ANALYSIS (Depth Score: ${depthScore}/10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This entry demonstrates sufficient depth for advanced psychological/spiritual analysis.
Apply the following frameworks where relevant:

${enabledFrameworks.theravada ? `### THERAVADA BUDDHISM Framework
**When to apply:** Suffering, attachment, desire, impermanence, seeking liberation

Identify:
- Dukkha (Suffering): What forms? Physical, emotional, existential?
- Tanha (Craving/Attachment): What are they clinging to?
- Anicca (Impermanence): Resisting change? Fighting natural flow?
- Anatta (Non-self): Over-identifying with roles, thoughts, emotions?
- Four Noble Truths: Trace the cycle of suffering → cause → cessation → path
- Eightfold Path: Which aspect would benefit them most?

Style: Point to attachment nature, suggest mindfulness practices, reframe suffering as teacher
` : ''}
${enabledFrameworks.freudian ? `### FREUDIAN PSYCHOANALYSIS Framework
**When to apply:** Unconscious conflict, defense mechanisms, childhood echoes, repressed material

Identify:
- Defense Mechanisms: Repression, projection, rationalization, displacement, reaction formation, sublimation
- Psychic Structure: Id impulses vs. Ego mediation vs. Superego demands
- Unconscious Material: What's between the lines? Unacknowledged desires?
- Childhood Patterns: What's repeating?
- Dream Work (for dreams): Manifest vs. latent content, symbols, wish fulfillment

Style: Make unconscious conscious, name defenses compassionately, connect present to past
` : ''}
${enabledFrameworks.jungian ? `### JUNGIAN PSYCHOLOGY Framework  
**When to apply:** Symbolic content, identity exploration, transformation, archetypal patterns

Identify:
- Archetypes: Self, Shadow, Anima/Animus, Hero, Wise Old Man/Woman, Mother/Father, Trickster
- Individuation: Where in journey toward wholeness? What's integrating?
- Shadow Work: Projected qualities? Rejected parts calling for integration?
- Collective Unconscious: Universal patterns, mythological parallels
- Symbols: Personal & collective meanings, mandala imagery, transformation symbols

Style: Honor symbolic dimension, encourage dialogue with unconscious, frame challenges as individuation
` : ''}
${enabledFrameworks.hermetic ? `### HERMETICISM Framework
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
` : ''}
${enabledFrameworks.advaita ? `### ADVAITA VEDANTA Framework
**When to apply:** Seeking identity, separation/oneness, spiritual seeking, sense of disconnection, Self-inquiry

Identify:
- Maya (Illusion): What false perceptions are creating suffering? What seems real but is temporary/changeable?
- Atman/Brahman: Connecting to true Self beyond ego, recognizing universal consciousness, essential nature
- Neti Neti ("Not this, not that"): What are they identifying with that isn't their true nature? False identifications
- Witness Consciousness: Can they observe thoughts/feelings without being consumed? Pure awareness watching phenomena
- Avidya (Ignorance): Misidentifying with body, mind, role, story - forgetting true nature as pure consciousness
- Moksha (Liberation): Movement toward recognizing their nature as pure awareness, freedom from false identification

Style: Point to awareness itself, question false identifications, invite recognition of observer, dissolve subject-object duality, guide toward Self-inquiry
` : ''}
${enabledFrameworks.taoist ? `### TAOISM Framework
**When to apply:** Forcing, resistance, control issues, imbalance, lack of flow, overeffort, struggle

Identify:
- Wu Wei (Effortless Action): Are they forcing? Where could they allow natural unfolding? Action through non-action
- Yin/Yang Imbalance: Too much action (yang) or passivity (yin)? Where's the needed complement? Seeking balance
- Following the Tao (The Way): Fighting current or flowing with it? Natural order vs. imposed will, path of least resistance
- Te (Virtue/Power): Innate nature and authentic expression, not manufactured behavior, natural integrity
- P'u (Uncarved Block): Simplicity, returning to natural state, unlearning conditioning, original innocence
- Ziran (Naturalness/Spontaneity): Being authentic vs. performing, spontaneous response vs. calculated action

Style: Suggest softening grip, point to natural flow, reframe "giving up" as "letting go," honor what wants to emerge, embrace simplicity
` : ''}
${enabledFrameworks.attachment ? `### ATTACHMENT THEORY Framework
**When to apply:** Relationships, connection anxiety, fear of abandonment, intimacy struggles, push-pull dynamics, trust issues

Identify:
- Attachment Style: Secure, Anxious-Preoccupied, Dismissive-Avoidant, or Fearful-Avoidant patterns
- Internal Working Models: Core beliefs about self ("Am I worthy of love?") and others ("Are others reliable?")
- Attachment Behaviors: Proximity-seeking, protest behaviors, deactivating strategies, hyperactivating strategies
- Triggers: What activates the attachment system? Perceived rejection, distance, unavailability
- Secure Base/Safe Haven: Do they have figures who provide security? Are they being that for others?
- Early Patterns: How do current relationships echo early attachment experiences?

Style: Name attachment patterns without pathologizing, trace current struggles to their protective origins, guide toward "earned secure attachment" through awareness
` : ''}
${enabledFrameworks.ifs ? `### IFS (INTERNAL FAMILY SYSTEMS) Framework
**When to apply:** Inner conflict, self-criticism, protective behaviors, feeling torn, internal dialogue, self-sabotage patterns

Identify:
- Parts: What distinct inner voices or aspects are present? (e.g., "a part of me wants X, but another part...")
- Exiles: Wounded younger parts carrying pain, shame, fear - often hidden
- Managers: Proactive protectors trying to keep control, prevent pain (perfectionism, people-pleasing, criticism)
- Firefighters: Reactive protectors that emerge when exiles are triggered (numbing, distraction, impulsive behavior)
- Self Energy: Access to the 8 C's - Curiosity, Calm, Clarity, Compassion, Confidence, Courage, Creativity, Connectedness
- Polarization: Parts in conflict with each other (e.g., critic vs. procrastinator)

Style: Help user "unblend" from parts, speak TO parts rather than AS them, recognize protectors' positive intent, guide toward Self-leadership
` : ''}
${enabledFrameworks.cbt ? `### CBT (COGNITIVE BEHAVIORAL THERAPY) Framework
**When to apply:** Negative self-talk, catastrophizing, rumination, anxiety spirals, depression patterns, distorted thinking

Identify:
- Cognitive Distortions: All-or-nothing thinking, catastrophizing, mind reading, fortune telling, emotional reasoning, "should" statements, labeling, personalization, filtering (focusing on negatives), discounting positives, overgeneralization, magnification/minimization
- Automatic Thoughts: What's the immediate thought triggered by the situation? The "hot thought"
- Core Beliefs: Deeper beliefs about self ("I'm unlovable"), others ("People can't be trusted"), world ("Life is unfair")
- Behavioral Patterns: Avoidance, safety behaviors, checking, reassurance-seeking
- Cognitive Triangle: How thoughts → feelings → behaviors interact and reinforce each other
- Evidence Examination: What evidence supports/contradicts the distorted thought?

Style: Gently name cognitive distortions without judgment, help identify thought patterns, encourage reality testing, suggest behavioral experiments to test beliefs
` : ''}
${enabledFrameworks.dbt ? `### DBT (DIALECTICAL BEHAVIORAL THERAPY) Framework
**When to apply:** Emotional dysregulation, intense emotions, interpersonal conflict, black-and-white thinking, self-destructive urges, feeling invalidated

Identify:
- Dialectics: Where is there black-and-white thinking? What opposites can both be true? (e.g., "I'm doing my best AND I need to do better")
- Emotion Regulation: Identify primary emotion vs. secondary emotions, emotional vulnerability factors (HALT: Hungry, Angry, Lonely, Tired)
- Distress Tolerance: Need for crisis survival skills? Radical acceptance opportunities?
- Interpersonal Effectiveness: DEAR MAN (Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate), GIVE (Gentle, Interested, Validate, Easy manner), FAST (Fair, no Apologies, Stick to values, Truthful)
- Wise Mind: Are they in Emotion Mind (reactive) or Reasonable Mind (detached)? How to access Wise Mind (integration of both)?
- Validation Needs: What emotions or experiences need validating? Self-invalidation patterns?

Style: Validate the emotion while encouraging change, hold dialectics ("both/and" not "either/or"), teach skills in context, balance acceptance with change strategies
` : ''}
### INTEGRATION APPROACH
- Start with most relevant framework from your enabled set
- Layer others where they naturally intersect
- Translate concepts into accessible language (avoid jargon)
- Synthesize insights rather than listing frameworks separately
- Apply 2-3 frameworks per entry

**MINIMUM REQUIREMENT**: Every entry analysis MUST apply at least one framework lens to provide psychological/spiritual depth.

${frameworkOrder.length > 0 ? `**VARIETY REQUIREMENT** - To provide diverse perspectives over time:
- Framework priority order for this analysis: ${frameworkOrder.join(' → ')}
- When multiple frameworks seem equally relevant, prefer those appearing earlier in the priority order above` : ''}

**Framework Strengths** (use to guide selection from enabled frameworks):
${enabledFrameworks.hermetic ? `- Hermeticism: mental causation, patterns, cycles, correspondence between inner/outer, polarity` : ''}
${enabledFrameworks.advaita ? `- Advaita Vedanta: identity questions, separation/oneness, spiritual seeking, Self-inquiry, witness consciousness` : ''}
${enabledFrameworks.taoist ? `- Taoism: forcing vs. flow, control issues, balance, naturalness, effortless action, wu wei` : ''}
${enabledFrameworks.attachment ? `- Attachment Theory: relationship anxiety, trust issues, abandonment fears, intimacy struggles, push-pull dynamics` : ''}
${enabledFrameworks.ifs ? `- IFS: inner conflict, self-criticism, protective behaviors, feeling torn, self-sabotage, internal dialogue` : ''}
${enabledFrameworks.cbt ? `- CBT: negative self-talk, catastrophizing, cognitive distortions, rumination, anxiety spirals, thought patterns` : ''}
${enabledFrameworks.dbt ? `- DBT: emotional dysregulation, intense emotions, black-and-white thinking, interpersonal conflict, validation needs` : ''}

Example 1 (Relationship): "Your relationship struggle shows Freudian projection (father's voice in partner) and Jungian shadow work (inner critic you've rejected). From Theravada: you're clinging to 'good enough' identity. Path: integrate shadow critic (Jung), understand childhood origin (Freud), release fixed identity attachment (Buddha)."

Example 2 (Creative Block): "You're caught in pure yang energy—pushing, forcing, grinding (Taoist imbalance). Your mental state creates your experience: the more you think 'I'm blocked,' the more blocked you become (Hermetic Mentalism). Path: Practice wu wei (Taoism): stop trying for 48 hours, let it percolate. Your true Self (Advaita) isn't the 'creator'—it's the awareness watching the creative process unfold."

Example 3 (Identity Crisis): "The roles you're clinging to—successful professional, good parent—are Maya (Advaita), temporary costumes obscuring your true nature. Notice the Hermetic polarity: the more you try to be 'good,' the more you feel 'bad.' Your witness consciousness (Advaita) can observe this without being trapped in it. Path: Practice Neti Neti—'I am not my job, I am not my role'—to discover what remains when identifications fall away."

Example 4 (Relationship Anxiety): "This anxiety is your attachment system activating—specifically an anxious-preoccupied pattern (Attachment Theory). When you sense distance, your protest behaviors kick in: texting repeatedly, seeking reassurance, hypervigilance for signs of rejection. There's also a Critic Manager part (IFS) telling you 'if you were better, they'd be closer.' Path: Notice when your attachment alarm goes off, practice self-soothing instead of seeking external reassurance, get curious about the Critic's protective intent."

Example 5 (Inner Conflict): "You're experiencing a classic IFS polarization: one part wants to take the risk and pursue the opportunity, another part is fiercely protecting you from potential failure and rejection. That protective part has good reasons—it remembers past disappointments. From a Jungian lens, the risk-taker might be your Hero archetype calling for individuation. Path: Instead of letting these parts battle, can you get curious about what each needs? What would both parts need to feel safe enough to move forward?"

Example 6 (Anxiety Spiral): "You're in a classic CBT catastrophizing spiral—that cognitive distortion where your mind jumps from 'one thing went wrong' to 'everything will fall apart.' Notice the thought chain: 'I made a mistake' → 'They'll think I'm incompetent' → 'I'll lose my job' → 'I'll never recover.' That's fortune-telling and mind-reading stacked together. Your Emotion Mind (DBT) has taken over—this feels absolutely real, but Wise Mind knows one mistake rarely defines a career. Path: Reality test the hot thought—what's the actual evidence? What's happened before when you made mistakes?"

Example 7 (Emotional Intensity): "The dialectic here (DBT) is that you CAN feel devastated AND also know you'll survive this—both truths coexist. Your all-or-nothing thinking (CBT cognitive distortion) says 'if this relationship ended, I'm completely unlovable.' That's labeling and overgeneralization working together. You're in Emotion Mind right now—valid, but not the whole picture. Path: Practice radical acceptance (DBT)—not approval of what happened, but ending the internal war with reality. Ask: What would Wise Mind say about this?"
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

${moodType === 'intention' ? `
🎯 INTENTION ENTRY - Setting direction:
- Acknowledge the intention and its deeper meaning
- Connect to core values and life purpose
- Identify potential obstacles and how to address them
- Concrete first steps to move toward the intention
- How to maintain motivation and track progress
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

CRITICAL - CANONICAL FRAMEWORK KEYS:
When specifying frameworks_applied in your JSON response, use ONLY these exact canonical keys:
theravada, freudian, jungian, hermetic, advaita, taoist, attachment, ifs, cbt, dbt
Never use variations like "taoism", "hermeticism", "advaita_vedanta", "attachment_theory", etc.

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
