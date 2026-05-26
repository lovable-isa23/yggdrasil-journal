## Goal
Track the timestamp of each user's most recent journal entry on the `profiles` table, so it's easy to see when a user last journaled (distinct from when their profile row was created).

## Changes

### 1. Database migration
- Add `last_entry_at TIMESTAMPTZ` column to `public.profiles` (nullable).
- Backfill: set `last_entry_at` to `MAX(journal_entries.created_at)` per user.
- Create trigger function `public.update_profile_last_entry_at()` (SECURITY DEFINER, `search_path = public`) that updates `profiles.last_entry_at = NEW.created_at` for `NEW.user_id`.
- Attach `AFTER INSERT` trigger on `public.journal_entries` calling that function.

### 2. No app code changes required
The existing `profiles.updated_at` keeps its original meaning (profile row mutation). New `last_entry_at` is available for any future UI that wants to show "last journaled" — not wired into UI in this change.

## Notes
- Trigger fires on INSERT only (not UPDATE), so editing an old entry won't bump the timestamp. If you'd rather "last activity" include edits, say so and I'll add UPDATE too.
- No RLS change needed — `profiles` policies already cover the new column.
