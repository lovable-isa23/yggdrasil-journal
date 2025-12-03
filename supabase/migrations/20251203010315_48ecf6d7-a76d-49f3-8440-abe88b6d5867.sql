-- Add trial_started_at column to profiles (NULL for existing users = permanent access)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

-- Update the handle_new_user function to set trial_started_at for NEW users only
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_started_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    now()
  );
  RETURN new;
END;
$$;