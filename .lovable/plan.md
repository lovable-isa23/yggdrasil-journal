

## Plan: Framework Lens Filtering & Enhanced Search

### 1. Expand `decrypt-entries` Edge Function

**File**: `supabase/functions/decrypt-entries/index.ts`

Currently only joins `entry_insights(depth_score)`. Expand the join to include `frameworks_applied, chakra_tags, tarot_tags, sacred_geometry, summary, interpretation` and flatten them onto each entry object returned to the client.

---

### 2. Add New Filter Fields to `FilterOptions`

**File**: `src/components/EntryFilters.tsx`

Add to `FilterOptions` interface:
- `selectedFrameworks: string[]` -- canonical keys like `jungian`, `stoic`, `dbt`, etc.
- `selectedChakras: string[]`
- `selectedTarot: string[]`
- `selectedGeometry: string[]`

Add a new "Insights" section inside the Filters popover with:
- **Frameworks**: Toggle badges for the 12 canonical frameworks (theravada, hermetic, advaita, taoist, freudian, jungian, attachment, ifs, cbt, dbt, stoic, gnostic) with display labels
- **Chakras**: Toggle badges for 7 chakras (only shown if any entries have chakra data)
- **Tarot**: Toggle badges for tarot cards found across entries (only shown if any entries have tarot data)
- **Sacred Geometry**: Toggle badges for geometry patterns found (only shown if any entries have geometry data)

Update `activeFilterCount` to include these new filters.

---

### 3. Enhance Search to Cover Insights Data

**File**: `src/components/JournalEntryList.tsx`

Update the search filter block (lines 267-274) to also search through:
- `entry.summary` (insight summary text)
- `entry.interpretation` (interpretation object -- search stringified text fields)
- `entry.chakra_tags` (array of chakra names)
- `entry.tarot_tags` (array of tarot card names)
- `entry.sacred_geometry` (array of geometry pattern names)
- `entry.frameworks_applied` (array of framework objects -- search name/key fields)

---

### 4. Add Framework/Chakra/Tarot/Geometry Filtering Logic

**File**: `src/components/JournalEntryList.tsx`

In the `filteredAndSortedEntries` memo, add filtering for the new filter fields:
- `selectedFrameworks`: Check if `entry.frameworks_applied` contains any matching canonical key
- `selectedChakras`: Check if `entry.chakra_tags` contains any matching chakra
- `selectedTarot`: Check if `entry.tarot_tags` contains any matching card
- `selectedGeometry`: Check if `entry.sacred_geometry` contains any matching pattern

Update the `JournalEntry` interface to include the new fields from the expanded edge function response.

---

### 5. Pass Available Insight Options to EntryFilters

**File**: `src/pages/Entries.tsx`

Compute unique sets of frameworks, chakras, tarot cards, and geometry patterns from loaded entries. Pass these as props to `EntryFilters` so it only shows options that actually exist in the user's data.

---

### Summary

| File | Action |
|------|--------|
| `supabase/functions/decrypt-entries/index.ts` | Expand join to include insights fields |
| `src/components/EntryFilters.tsx` | Add framework/chakra/tarot/geometry filter UI and filter state |
| `src/components/JournalEntryList.tsx` | Expand search + add insight-based filtering |
| `src/pages/Entries.tsx` | Compute available insight options, pass to filters |

