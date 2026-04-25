-- 1. Waitlist: replace WITH CHECK (true) with basic shape validation
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

-- 2. Storage: add owner-scoped UPDATE policies
CREATE POLICY "Users can update own audio recordings"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-recordings'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'audio-recordings'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own journal images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'journal-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'journal-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. rate_limits: switch from JWT-claim checks to role-grant policies
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.rate_limits;

CREATE POLICY "Service role can insert rate limits"
ON public.rate_limits
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update rate limits"
ON public.rate_limits
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete rate limits"
ON public.rate_limits
FOR DELETE
TO service_role
USING (true);

CREATE POLICY "Service role can view rate limits"
ON public.rate_limits
FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Users can view own rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);