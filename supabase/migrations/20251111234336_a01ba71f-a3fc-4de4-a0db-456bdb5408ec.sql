-- Add chakra_tags and tarot_tags columns to entry_insights table
ALTER TABLE public.entry_insights 
ADD COLUMN IF NOT EXISTS chakra_tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tarot_tags JSONB DEFAULT '[]'::jsonb;