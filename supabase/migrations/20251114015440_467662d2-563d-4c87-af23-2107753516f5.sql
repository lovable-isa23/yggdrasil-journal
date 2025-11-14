-- Create goal_practices table for suggested practices
CREATE TABLE IF NOT EXISTS public.goal_practices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  practice_type TEXT NOT NULL, -- meditation, journaling, ritual, movement, breathwork, study
  frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, custom
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create practice_logs table for tracking practice completions
CREATE TABLE IF NOT EXISTS public.practice_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID NOT NULL REFERENCES public.goal_practices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goal_reflections table for structured check-ins
CREATE TABLE IF NOT EXISTS public.goal_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reflection_type TEXT NOT NULL DEFAULT 'checkin', -- checkin, milestone, completion
  what_worked TEXT,
  what_challenged TEXT,
  insights TEXT,
  next_steps TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wisdom_cards table for lessons from completed goals
CREATE TABLE IF NOT EXISTS public.wisdom_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  lesson TEXT NOT NULL,
  context TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add columns to goals table
ALTER TABLE public.goals 
  ADD COLUMN IF NOT EXISTS completion_reflection TEXT,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Enable RLS on new tables
ALTER TABLE public.goal_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wisdom_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_practices
CREATE POLICY "Users can view own practices" ON public.goal_practices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own practices" ON public.goal_practices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practices" ON public.goal_practices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own practices" ON public.goal_practices
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for practice_logs
CREATE POLICY "Users can view own practice logs" ON public.practice_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own practice logs" ON public.practice_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice logs" ON public.practice_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice logs" ON public.practice_logs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for goal_reflections
CREATE POLICY "Users can view own reflections" ON public.goal_reflections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reflections" ON public.goal_reflections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections" ON public.goal_reflections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reflections" ON public.goal_reflections
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for wisdom_cards
CREATE POLICY "Users can view own wisdom cards" ON public.wisdom_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own wisdom cards" ON public.wisdom_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wisdom cards" ON public.wisdom_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wisdom cards" ON public.wisdom_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at on goal_practices
CREATE TRIGGER update_goal_practices_updated_at
  BEFORE UPDATE ON public.goal_practices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();