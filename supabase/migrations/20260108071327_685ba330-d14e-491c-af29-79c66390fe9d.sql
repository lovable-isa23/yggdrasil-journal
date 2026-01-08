-- Create goal_trees table for the Tree of Life feature
CREATE TABLE public.goal_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL UNIQUE REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  root_text TEXT CHECK (char_length(root_text) <= 140),
  trunk_title TEXT CHECK (char_length(trunk_title) <= 80),
  trunk_target_date DATE,
  fruit_text TEXT CHECK (char_length(fruit_text) <= 120),
  fruit_achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_trees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_trees
CREATE POLICY "Users can view own trees" 
ON public.goal_trees FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trees" 
ON public.goal_trees FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trees" 
ON public.goal_trees FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trees" 
ON public.goal_trees FOR DELETE 
USING (auth.uid() = user_id);

-- Create goal_branches table for weekly actions
CREATE TABLE public.goal_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_branches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_branches
CREATE POLICY "Users can view own branches" 
ON public.goal_branches FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own branches" 
ON public.goal_branches FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own branches" 
ON public.goal_branches FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own branches" 
ON public.goal_branches FOR DELETE 
USING (auth.uid() = user_id);

-- Index for fast queries on branches
CREATE INDEX idx_goal_branches_goal_week ON public.goal_branches(goal_id, week_start_date);
CREATE INDEX idx_goal_branches_user_id ON public.goal_branches(user_id);

-- Create goal_branch_history table for archived weekly branches
CREATE TABLE public.goal_branch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  branches JSONB NOT NULL,
  completion_rate INTEGER,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_branch_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_branch_history
CREATE POLICY "Users can view own history" 
ON public.goal_branch_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own history" 
ON public.goal_branch_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history" 
ON public.goal_branch_history FOR DELETE 
USING (auth.uid() = user_id);

-- Index for history queries
CREATE INDEX idx_goal_branch_history_goal ON public.goal_branch_history(goal_id);
CREATE INDEX idx_goal_branch_history_user ON public.goal_branch_history(user_id);