import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // Generate key from secret
    const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Decrypt
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: 'Encryption key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to fetch all entries for the user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: entries, error: fetchError } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        *,
        entry_insights!left(depth_score, frameworks_applied, chakra_tags, tarot_tags, sacred_geometry, summary, interpretation)
      `)
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt entries
    const decryptedEntries = await Promise.all(
      (entries || []).map(async (entry) => {
        const decryptedTitle = await decrypt(entry.title, encryptionKey);
        const decryptedContent = await decrypt(entry.content, encryptionKey);
        
        // Extract fields from joined entry_insights
        const insights = entry.entry_insights;
        const depth_score = insights?.depth_score ?? null;
        const frameworks_applied = insights?.frameworks_applied ?? [];
        const chakra_tags = insights?.chakra_tags ?? [];
        const tarot_tags = insights?.tarot_tags ?? [];
        const sacred_geometry = insights?.sacred_geometry ?? [];
        const summary = insights?.summary ?? null;
        const interpretation = insights?.interpretation ?? null;
        
        // Remove the nested entry_insights object and flatten
        const { entry_insights, ...entryData } = entry;
        
        return {
          ...entryData,
          title: decryptedTitle,
          content: decryptedContent,
          depth_score,
          frameworks_applied,
          chakra_tags,
          tarot_tags,
          sacred_geometry,
          summary,
          interpretation,
          source_type: entry.source_type || 'manual',
          source_practice_id: entry.source_practice_id || null,
          source_milestone_id: entry.source_milestone_id || null,
        };
      })
    );

    return new Response(JSON.stringify({ entries: decryptedEntries }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in decrypt-entries function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
