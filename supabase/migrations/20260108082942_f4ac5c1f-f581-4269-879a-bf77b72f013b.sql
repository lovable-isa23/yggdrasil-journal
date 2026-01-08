-- Add position column to goal_branches for ordering
ALTER TABLE public.goal_branches 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Add visibility toggles to user_preferences
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS show_emotional_analysis BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_framework_analysis BOOLEAN DEFAULT true;