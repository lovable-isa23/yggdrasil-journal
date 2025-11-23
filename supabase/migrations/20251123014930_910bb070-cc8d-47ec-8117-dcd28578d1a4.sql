-- Create function to efficiently count entries and depth scores
CREATE OR REPLACE FUNCTION get_entry_depth_counts(
  p_user_id UUID,
  p_min_deep_score INTEGER DEFAULT 5
)
RETURNS TABLE (
  total_entries BIGINT,
  deep_entries BIGINT,
  analyzed_entries BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(je.id) as total_entries,
    COUNT(CASE WHEN ei.depth_score >= p_min_deep_score THEN 1 END) as deep_entries,
    COUNT(CASE WHEN ei.depth_score IS NOT NULL THEN 1 END) as analyzed_entries
  FROM journal_entries je
  LEFT JOIN entry_insights ei ON je.id = ei.entry_id
  WHERE je.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;