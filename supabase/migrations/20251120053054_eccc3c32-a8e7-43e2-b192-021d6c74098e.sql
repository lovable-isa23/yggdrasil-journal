-- Add new columns to journal_entries for enhanced features
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS mood_type text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS mood_color text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON journal_entries USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_journal_entries_favorites ON journal_entries(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_journal_entries_mood ON journal_entries(user_id, mood_type);