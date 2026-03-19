

## Plan: Auto-Save Journal Draft to LocalStorage

### Approach

Use `localStorage` to persist the draft (title, content, entry date, selected goals, selected entries) as the user types. On mount, restore from cache if a draft exists and is less than 3 days old. Clear the cache on successful submission.

### Changes

**File: `src/components/JournalEditor.tsx`**

1. Define a localStorage key constant (`journal-draft`) and a draft interface with `{ title, content, entryDate, selectedGoals, selectedEntries, savedAt }`

2. **On mount**: Check localStorage for a saved draft. If it exists and `savedAt` is within 3 days, restore title/content via `reset()`, restore entryDate and selected goals/entries state. Show a subtle toast: "Draft restored."

3. **On change**: Add a `useEffect` watching `title`, `content`, `entryDate`, `selectedGoals`, `selectedEntries`. Debounce (500ms) writes to localStorage with current timestamp as `savedAt`.

4. **On successful submit**: Remove the draft from localStorage (already calls `reset()` — just add `localStorage.removeItem`).

5. **Expiry cleanup**: The restore check simply skips if `savedAt` is older than 3 days and removes the stale draft.

| What | Detail |
|------|--------|
| Storage key | `yggdrasil-journal-draft` |
| Debounce | 500ms to avoid excessive writes |
| TTL | 3 days (259200000ms) |
| Restore trigger | Component mount only |
| Clear trigger | Successful save |

No new files needed. Single file change.

