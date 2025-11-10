-- Add entry_date column to journal_entries table
ALTER TABLE journal_entries ADD COLUMN entry_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create index for better query performance on date
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);

-- Update entry_insights to use the entry's date for mood tracking
-- (No schema change needed, but this ensures we can join properly)