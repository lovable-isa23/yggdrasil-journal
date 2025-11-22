-- Add interpretation column to entry_insights table
ALTER TABLE entry_insights 
ADD COLUMN IF NOT EXISTS interpretation jsonb;