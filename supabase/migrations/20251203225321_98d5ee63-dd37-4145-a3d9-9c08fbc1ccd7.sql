-- Update any challenge mood entries to general
UPDATE journal_entries 
SET mood_type = 'general' 
WHERE mood_type = 'challenge';

-- Normalize framework names in entry_insights
UPDATE entry_insights
SET frameworks_applied = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem::text ILIKE '%taoism%' THEN 'taoist'
      WHEN elem::text ILIKE '%hermeticism%' THEN 'hermetic'
      WHEN elem::text ILIKE '%advaita_vedanta%' THEN 'advaita'
      WHEN elem::text ILIKE '%advaita vedanta%' THEN 'advaita'
      WHEN elem::text ILIKE '%attachment_theory%' THEN 'attachment'
      WHEN elem::text ILIKE '%attachment theory%' THEN 'attachment'
      WHEN elem::text ILIKE '%cognitive_behavioral%' THEN 'cbt'
      WHEN elem::text ILIKE '%dialectical%' THEN 'dbt'
      WHEN elem::text ILIKE '%internal_family_systems%' THEN 'ifs'
      WHEN elem::text ILIKE '%freudian_psychoanalysis%' THEN 'freudian'
      WHEN elem::text ILIKE '%psychoanalysis%' THEN 'freudian'
      ELSE LOWER(TRIM(elem::text, '"'))
    END
  )
  FROM jsonb_array_elements(frameworks_applied) AS elem
)
WHERE frameworks_applied IS NOT NULL AND jsonb_array_length(frameworks_applied) > 0;