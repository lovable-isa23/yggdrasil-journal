-- Fix: Restrict waitlist SELECT access to service role only
-- This prevents any authenticated user from reading all waitlist emails

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Only authenticated users can view waitlist" ON waitlist;

-- Create a service-role-only policy for viewing waitlist data
CREATE POLICY "Only service role can view waitlist" 
ON waitlist FOR SELECT
USING ((auth.jwt() ->> 'role') = 'service_role');