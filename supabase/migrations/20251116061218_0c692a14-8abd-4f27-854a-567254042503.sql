-- Create beta_users table to track Stripe payments and user accounts
CREATE TABLE IF NOT EXISTS public.beta_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id text UNIQUE,
  stripe_checkout_session_id text,
  payment_amount integer,
  payment_status text DEFAULT 'completed',
  joined_discord boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_users ENABLE ROW LEVEL SECURITY;

-- Users can read their own beta data
CREATE POLICY "Users can read own beta data"
  ON public.beta_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert beta users (from webhook)
CREATE POLICY "Service role can insert beta users"
  ON public.beta_users
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Service role can update beta users
CREATE POLICY "Service role can update beta users"
  ON public.beta_users
  FOR UPDATE
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add trigger for updated_at
CREATE TRIGGER update_beta_users_updated_at
  BEFORE UPDATE ON public.beta_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();