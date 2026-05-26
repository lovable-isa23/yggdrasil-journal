
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_entry_at TIMESTAMPTZ;

UPDATE public.profiles p
SET last_entry_at = sub.max_created
FROM (
  SELECT user_id, MAX(created_at) AS max_created
  FROM public.journal_entries
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id;

CREATE OR REPLACE FUNCTION public.update_profile_last_entry_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_entry_at = NEW.created_at
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_profile_last_entry_at ON public.journal_entries;
CREATE TRIGGER trg_update_profile_last_entry_at
AFTER INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_last_entry_at();
