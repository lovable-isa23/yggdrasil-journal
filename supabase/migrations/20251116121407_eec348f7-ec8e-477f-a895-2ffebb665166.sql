-- Phase 1: Voice-to-Text - Add audio fields to journal_entries
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS transcription_source text CHECK (transcription_source IN ('typed', 'voice', 'image'));

-- Phase 2: Multi-PDF Upload - Create import_batches table
CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_names text[] NOT NULL,
  entries_created integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on import_batches
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_batches
CREATE POLICY "Users can create own import batches"
ON import_batches
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own import batches"
ON import_batches
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Phase 3: Image Analysis - Add image fields to journal_entries
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS image_description text;

-- Create storage buckets for audio and images
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('audio-recordings', 'audio-recordings', false),
  ('journal-images', 'journal-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio-recordings bucket
CREATE POLICY "Users can upload own audio recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own audio recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own audio recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-recordings' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for journal-images bucket
CREATE POLICY "Users can upload own journal images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own journal images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own journal images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);