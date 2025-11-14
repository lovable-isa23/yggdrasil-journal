-- Add new columns to goals table for Phase 1
ALTER TABLE goals 
  ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS intention TEXT,
  ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'initiation';

-- Create milestones table
CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reflection TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on milestones
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for milestones
CREATE POLICY "Users can view own milestones" ON goal_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own milestones" ON goal_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own milestones" ON goal_milestones
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own milestones" ON goal_milestones
  FOR DELETE USING (auth.uid() = user_id);

-- Add linked_goals column to journal_entries
ALTER TABLE journal_entries 
  ADD COLUMN IF NOT EXISTS linked_goals UUID[] DEFAULT '{}';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_linked_goals ON journal_entries USING GIN(linked_goals);

-- Create trigger for milestone updated_at
CREATE TRIGGER update_goal_milestones_updated_at
  BEFORE UPDATE ON goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();