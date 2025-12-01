ALTER TABLE journal_entries 
ADD COLUMN linked_entries uuid[] DEFAULT '{}';