-- Add depth assessment and framework tracking to entry insights
ALTER TABLE entry_insights 
ADD COLUMN IF NOT EXISTS depth_score integer,
ADD COLUMN IF NOT EXISTS frameworks_applied jsonb DEFAULT '[]'::jsonb;