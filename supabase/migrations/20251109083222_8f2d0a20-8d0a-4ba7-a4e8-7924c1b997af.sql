-- Create table for storing semantic analysis of journal entries
CREATE TABLE public.entry_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.journal_entries ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  entities JSONB DEFAULT '[]'::jsonb,
  themes JSONB DEFAULT '[]'::jsonb,
  emotions JSONB DEFAULT '[]'::jsonb,
  keywords JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entry_id)
);

-- Enable RLS
ALTER TABLE public.entry_insights ENABLE ROW LEVEL SECURITY;

-- Users can view their own insights
CREATE POLICY "Users can view own insights"
ON public.entry_insights
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own insights
CREATE POLICY "Users can create own insights"
ON public.entry_insights
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own insights
CREATE POLICY "Users can update own insights"
ON public.entry_insights
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own insights
CREATE POLICY "Users can delete own insights"
ON public.entry_insights
FOR DELETE
USING (auth.uid() = user_id);

-- Create table for AI-generated reflection prompts
CREATE TABLE public.reflection_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reflection_prompts ENABLE ROW LEVEL SECURITY;

-- Users can view their own prompts
CREATE POLICY "Users can view own prompts"
ON public.reflection_prompts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own prompts
CREATE POLICY "Users can create own prompts"
ON public.reflection_prompts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own prompts
CREATE POLICY "Users can delete own prompts"
ON public.reflection_prompts
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_entry_insights_entry_id ON public.entry_insights(entry_id);
CREATE INDEX idx_entry_insights_user_id ON public.entry_insights(user_id);
CREATE INDEX idx_reflection_prompts_user_id ON public.reflection_prompts(user_id);
CREATE INDEX idx_reflection_prompts_created_at ON public.reflection_prompts(created_at DESC);