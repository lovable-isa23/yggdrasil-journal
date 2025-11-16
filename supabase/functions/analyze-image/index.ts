import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageType } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    console.log('Analyzing image with Lovable AI');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use Lovable AI (Gemini 2.5 Pro) for vision analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a journal entry analyzer. Analyze images as if they are journal entries. For drawings/sketches, describe visual elements, emotions, symbols, colors, and themes. For photos with text, extract the text verbatim. For any image, provide insights that would be meaningful for journaling and self-reflection.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image as a journal entry. Describe what you see, any emotions or themes, and extract any visible text. Provide a thoughtful journaling-style response.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageType};base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limits exceeded, please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required, please add funds to your Lovable AI workspace.');
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('AI analysis failed');
    }

    const result = await response.json();
    const analysis = result.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis returned from AI');
    }

    console.log('Image analysis successful');

    return new Response(
      JSON.stringify({ 
        description: analysis,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});