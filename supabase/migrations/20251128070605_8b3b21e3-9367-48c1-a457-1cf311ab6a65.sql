-- Add source columns to journal_entries for tracking practice and milestone reflections
ALTER TABLE public.journal_entries 
ADD COLUMN source_practice_id uuid REFERENCES public.goal_practices(id) ON DELETE SET NULL,
ADD COLUMN source_milestone_id uuid REFERENCES public.goal_milestones(id) ON DELETE SET NULL,
ADD COLUMN source_type text DEFAULT 'manual';

-- Add comment for clarity
COMMENT ON COLUMN public.journal_entries.source_type IS 'Entry source: manual, sacred_practice, milestone_reflection, goal_reflection';