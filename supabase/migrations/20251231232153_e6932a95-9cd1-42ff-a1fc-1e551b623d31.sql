-- Fix get_entry_depth_counts to validate that caller can only query their own data
CREATE OR REPLACE FUNCTION public.get_entry_depth_counts(p_user_id uuid, p_min_deep_score integer DEFAULT 5)
 RETURNS TABLE(total_entries bigint, deep_entries bigint, analyzed_entries bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate caller can only query their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only query own data';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(je.id) as total_entries,
    COUNT(CASE WHEN ei.depth_score >= p_min_deep_score THEN 1 END) as deep_entries,
    COUNT(CASE WHEN ei.depth_score IS NOT NULL THEN 1 END) as analyzed_entries
  FROM journal_entries je
  LEFT JOIN entry_insights ei ON je.id = ei.entry_id
  WHERE je.user_id = p_user_id;
END;
$function$;