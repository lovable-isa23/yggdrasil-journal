-- Add safety concerns field to entry_insights table
ALTER TABLE entry_insights 
ADD COLUMN IF NOT EXISTS safety_concerns jsonb DEFAULT '{"flag": false, "concerns": []}'::jsonb;

-- Add comment explaining the field
COMMENT ON COLUMN entry_insights.safety_concerns IS 'Detects concerning content like suicidal ideation, self-harm, or other crisis situations. Format: {"flag": boolean, "concerns": array of concern types}';