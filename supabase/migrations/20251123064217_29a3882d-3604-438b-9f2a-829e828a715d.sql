-- Add sacred geometry preference to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS enable_sacred_geometry boolean DEFAULT false;