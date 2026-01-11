ALTER TABLE public.entry_insights 
ADD COLUMN IF NOT EXISTS archetype_tags JSONB DEFAULT '[]'::jsonb;