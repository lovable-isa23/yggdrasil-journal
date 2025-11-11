-- Create import_history table to track all imports
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  entries_count INTEGER NOT NULL DEFAULT 0,
  import_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own import history"
ON public.import_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own import history"
ON public.import_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import history"
ON public.import_history
FOR DELETE
USING (auth.uid() = user_id);

-- Add import_batch_id to journal_entries to track which import a batch belongs to
ALTER TABLE public.journal_entries
ADD COLUMN import_batch_id UUID REFERENCES public.import_history(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_journal_entries_import_batch ON public.journal_entries(import_batch_id);
CREATE INDEX idx_import_history_user ON public.import_history(user_id, import_date DESC);