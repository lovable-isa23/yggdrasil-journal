-- Create micro_wins table for tracking tiny wins on goals
CREATE TABLE public.micro_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) <= 140),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_suggested')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.micro_wins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own micro_wins"
  ON public.micro_wins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own micro_wins"
  ON public.micro_wins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own micro_wins"
  ON public.micro_wins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own micro_wins"
  ON public.micro_wins FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for fast queries
CREATE INDEX idx_micro_wins_goal_id ON public.micro_wins(goal_id);
CREATE INDEX idx_micro_wins_user_created ON public.micro_wins(user_id, created_at DESC);