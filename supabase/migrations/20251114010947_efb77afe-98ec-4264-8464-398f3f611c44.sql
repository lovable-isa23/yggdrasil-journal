-- Update the goals table to ensure linked_patterns can store full pattern objects
-- The column already exists as jsonb, this migration adds a comment for clarity
COMMENT ON COLUMN public.goals.linked_patterns IS 'Stores full pattern objects with id, title, and pattern_type for persistence';