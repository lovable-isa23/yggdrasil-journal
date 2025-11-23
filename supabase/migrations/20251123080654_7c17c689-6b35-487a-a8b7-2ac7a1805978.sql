-- Add sacred_geometry column to entry_insights table
ALTER TABLE entry_insights 
ADD COLUMN sacred_geometry JSONB DEFAULT '[]'::jsonb;