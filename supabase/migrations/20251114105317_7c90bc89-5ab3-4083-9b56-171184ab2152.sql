-- Add moon phase tracking to goals
ALTER TABLE goals ADD COLUMN IF NOT EXISTS moon_phase_set TEXT;

-- Add reminder settings to practices
ALTER TABLE goal_practices 
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_time TIME,
  ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7];

-- Add parent_goal_id for goal evolution/branching
ALTER TABLE goals ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES goals(id);

-- Create spiritual guidance table for AI suggestions
CREATE TABLE IF NOT EXISTS spiritual_guidance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  guidance_type TEXT NOT NULL, -- 'weekly_wisdom', 'practice_suggestion', 'pattern_insight'
  content TEXT NOT NULL,
  context JSONB, -- related patterns, goals, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE spiritual_guidance ENABLE ROW LEVEL SECURITY;

-- RLS policies for spiritual_guidance
CREATE POLICY "Users can view own guidance"
  ON spiritual_guidance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own guidance"
  ON spiritual_guidance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own guidance"
  ON spiritual_guidance FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own guidance"
  ON spiritual_guidance FOR DELETE
  USING (auth.uid() = user_id);