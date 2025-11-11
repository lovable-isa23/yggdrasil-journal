import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('PDF parsing request received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { fileContent, fileName } = await req.json();
    
    if (!fileContent || !fileName) {
      throw new Error('Missing file content or name');
    }

    console.log(`Processing PDF: ${fileName}`);

    const base64Data = fileContent.split(',')[1] || fileContent;
    
    // Extract text using Lovable AI
    const extractionResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: `I have a PDF document (${fileName}). Please analyze this PDF and extract all readable text content. Format the output as clean, structured text. If the PDF contains journal entries, personal reflections, or dated content, try to identify separate entries. Return the text in a readable format with clear sections.`
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!extractionResponse.ok) {
      console.error('AI extraction failed');
      throw new Error('Failed to extract text from PDF');
    }

    const extractionData = await extractionResponse.json();
    const extractedText = extractionData.choices[0]?.message?.content || '';

    console.log(`Extracted ${extractedText.length} characters from PDF`);

    if (extractedText.length < 10) {
      throw new Error('Could not extract meaningful text from PDF. The file may be image-based or empty.');
    }

    // Parse the extracted text into journal entries
    const sections = extractedText.split(/\n\n\n+|---+/);
    
    const entries = sections
      .filter((section: string) => section.trim().length > 50)
      .map((section: string, index: number) => {
        const lines = section.trim().split('\n');
        const title = lines[0]?.substring(0, 200) || `${fileName} - Part ${index + 1}`;
        const content = section.trim().substring(0, 50000);
        
        return {
          title,
          content,
          entry_date: new Date().toISOString(),
        };
      });

    if (entries.length === 0) {
      entries.push({
        title: `Imported from ${fileName}`,
        content: extractedText.substring(0, 50000),
        entry_date: new Date().toISOString(),
      });
    }

    console.log(`Created ${entries.length} entries from PDF`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        entries,
        extractedLength: extractedText.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in parse-pdf function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
