-- Add weighted_strength column to knowledge_relationships for depth-weighted pattern detection
ALTER TABLE knowledge_relationships 
ADD COLUMN IF NOT EXISTS weighted_strength numeric DEFAULT 0;