

## Plan: Insights Page Fixes and Enhancements

### 1. Move Astrology Container (Goals Page Layout)

**File**: `src/pages/Goals.tsx`

Move `AstrologyIndicator` from its own full-width section into the existing 2-column grid, placing it under `MoonPhaseIndicator` (left column) while `SpiritualGuidePanel` stays on the right.

Change the grid from `grid-cols-1 lg:grid-cols-2` with 2 items to a layout where:
- Left column: MoonPhaseIndicator + AstrologyIndicator (stacked)
- Right column: SpiritualGuidePanel

Remove the separate `<div className="mb-12">` wrapper for AstrologyIndicator.

---

### 2. Add Tooltip on Yggi Floating Button

**File**: `src/components/YggiChat.tsx`

Wrap both the mobile and desktop floating buttons in a `Tooltip` (from `@radix-ui/react-tooltip`) with the label "Yggi the Guide".

---

### 3. Reverse Word Trend Count X-Axis

**File**: `src/components/StatisticsDashboard.tsx`

The data in `calculateWordCounts` is already sorted chronologically (oldest first), which means the rightmost bar is the most recent -- this is correct. However, the `filterWordCountData` function formats dates but does not explicitly sort. Add `.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())` before formatting to ensure chronological left-to-right order is preserved after filtering.

If the current behavior shows newest on the left, the fix is to ensure the sort is ascending (oldest to newest) so the most recent date appears on the right.

---

### 4. Make Sidebar Journal Entries Clickable (Sentiment Tracking)

**File**: `src/components/SentimentTracking.tsx`

Add `useNavigate` from `react-router-dom`. Make each entry `Card` in the sidebar clickable with an `onClick` handler that navigates to `/entries` with `{ state: { scrollToEntryId: entry.id } }` and closes the sheet.

---

### 5. Fix Tag Count Mismatch in Sentiment Tracking Sidebar

**Root Cause**: The badge count (e.g., "self-worth (5)") comes from `sentimentData` which is filtered by the selected date range. But `handleItemClick` fetches ALL entries and ALL insights (unfiltered), so clicking a theme shows entries from outside the date range too.

**Fix in `src/components/SentimentTracking.tsx`**:

In `handleItemClick`, filter the insights query to only include entry IDs that are within the current date range. Specifically:
- Get the set of entry IDs from `sentimentData` (the already-filtered dataset)
- Only match against those entry IDs when finding related entries
- This ensures the sidebar entries match the count shown on the badge

The fix:
1. Collect entry IDs from the filtered `sentimentData` by cross-referencing with the entries fetched during `fetchSentimentData`
2. In `handleItemClick`, after fetching all insights, filter `matchingEntryIds` to only those that exist in the current filtered date range
3. Store entry date info alongside sentiment data so we can filter properly

Alternatively (simpler approach): store a map of date-to-entryIds during fetch, then in `handleItemClick`, compute the set of valid entry IDs from the current `sentimentData` dates, and only show entries whose dates are in that set.

---

### Summary of File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/Goals.tsx` | Modify | Move astrology under moon phase in left column |
| `src/components/YggiChat.tsx` | Modify | Add "Yggi the Guide" tooltip to floating button |
| `src/components/StatisticsDashboard.tsx` | Modify | Ensure chronological sort (newest on right) |
| `src/components/SentimentTracking.tsx` | Modify | Make sidebar entries clickable + fix tag count mismatch |

