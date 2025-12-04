-- Add Stoicism and Gnosticism framework preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS enable_stoic boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_gnostic boolean DEFAULT true;