-- Drop the existing insecure SELECT policy
DROP POLICY IF EXISTS "Users can view own waitlist entry" ON public.waitlist;

-- Create a new secure SELECT policy that only allows authenticated users to view waitlist entries
-- This prevents public email harvesting while still allowing public signups
CREATE POLICY "Only authenticated users can view waitlist" 
ON public.waitlist 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- The existing INSERT policy "Anyone can join waitlist" remains unchanged and allows public signups