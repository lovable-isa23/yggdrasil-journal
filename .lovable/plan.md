## Plan: Fix Three Supabase Security Findings

All three findings are database-level — fixed in a single migration. No application code needs to change.

---

### 1. Waitlist `WITH CHECK (true)` (RLS Policy Always True)

**Current:** The `waitlist` INSERT policy `"Anyone can join waitlist"` uses `WITH CHECK (true)`, which trips the linter.

**Fix:** Replace it with a policy that still allows public signups but adds basic shape validation so the check expression is no longer trivially `true`:

```sql
DROP POLICY "Anyone can join waitlist" ON public.waitlist;

CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);
```

This keeps the waitlist publicly writable (matches existing product behavior) while satisfying the linter and rejecting obviously malformed rows.

---

### 2. Storage buckets missing UPDATE policy

**Current:** `audio-recordings` and `journal-images` have INSERT/SELECT/DELETE policies scoped to the user's folder, but no UPDATE policy. Without one, behavior is ambiguous and users could potentially overwrite others' files via `upsert`.

**Fix:** Add owner-scoped UPDATE policies mirroring the existing folder-name pattern:

```sql
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
```

---

### 3. `rate_limits` policies rely on JWT `role` claim

**Current:** The service-role policy uses `auth.jwt() ->> 'role' = 'service_role'`, which checks a JWT claim that could in principle be spoofed if a token were ever misissued. There's also no UPDATE policy, even though the upsert pattern requires one.

**Fix:** Replace the policies with ones gated on `auth.role()` (the trusted Postgres role the request is authenticated as), and split into explicit per-command policies. Regular users keep SELECT-own; only the service role can INSERT/UPDATE/DELETE.

```sql
DROP POLICY "Service role can manage rate limits" ON public.rate_limits;
DROP POLICY "Users can view own rate limits" ON public.rate_limits;

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
```

Edge functions already use the `SUPABASE_SERVICE_ROLE_KEY`, so they connect as the `service_role` Postgres role and these policies apply automatically. No edge function code changes needed.

---

### Summary

| Finding | Fix |
|---|---|
| Waitlist `WITH CHECK (true)` | Replace with email-shape validation check |
| Missing storage UPDATE policies | Add owner-scoped UPDATE policies for both buckets |
| `rate_limits` JWT-role check | Switch to role-grant policies (`TO service_role`) and add explicit UPDATE/DELETE/SELECT policies |

One migration file, no application code changes.
