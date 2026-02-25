

## Plan: Improve Insights Page Load Times

### Problem Analysis

The Insights page currently has **severe redundant data fetching**. Every component mounts simultaneously on page load and independently fetches overlapping data:

| Data Source | Components That Fetch It |
|---|---|
| `supabase.auth.getUser()` | FrameworkAnalytics, ChakraAnalytics, TarotAnalytics, useDataSufficiency (x5) |
| `decrypt-entries` edge function | StatisticsDashboard, KnowledgeGraph, PatternInsights (on click), SentimentTracking (on click) |
| `entry_insights` table | MoodTracker, SentimentTracking, FrameworkAnalytics, ChakraAnalytics, TarotAnalytics, KnowledgeGraph |
| `journal_entries` table | MoodTracker, SentimentTracking, StatisticsDashboard, KnowledgeGraph |
| `useDataSufficiency()` RPC | StatisticsDashboard, MoodTracker, SentimentTracking, PatternInsights, KnowledgeGraph |

That's **5+ redundant auth calls**, **5+ redundant insight fetches**, and **4+ redundant entry fetches** all firing on initial page load.

---

### Fix 1: Lazy-Load Below-Fold Sections (Biggest Win)

**New file**: `src/components/LazySection.tsx`

A wrapper component using `IntersectionObserver` that only mounts its children when scrolled into the viewport. Shows a lightweight skeleton placeholder until then.

**Changes to `src/pages/Insights.tsx`**:
- Wrap each section (Emotional Analysis, Framework Analysis, Pattern Discovery, Visualizations, Manage Data) in `<LazySection>` 
- Only the Overview (StatisticsDashboard) loads immediately since it's above the fold
- This prevents 4-5 components from fetching data until the user scrolls to them

---

### Fix 2: Shared Insights Data Provider

**New file**: `src/contexts/InsightsDataContext.tsx`

A context provider that fetches the common data **once** and shares it:
- `getUser()` -- called once
- `entry_insights` -- fetched once, shared to MoodTracker, SentimentTracking, FrameworkAnalytics, ChakraAnalytics, TarotAnalytics
- `journal_entries` (id + entry_date) -- fetched once, shared
- `useDataSufficiency` result -- computed once, shared

Each component receives pre-fetched data via context instead of making its own queries.

---

### Fix 3: Update Components to Use Shared Data

Modify these components to accept data via props or context instead of fetching independently:

| Component | Remove | Use Instead |
|---|---|---|
| `MoodTracker` | Own fetch of `entry_insights` + `journal_entries` | Context data |
| `SentimentTracking` | Own fetch of `journal_entries` + `entry_insights` | Context data |
| `FrameworkAnalytics` | Own `getUser()` + `entry_insights` fetch | Context data |
| `ChakraAnalytics` | Own `getUser()` + `entry_insights` fetch | Context data |
| `TarotAnalytics` | Own `getUser()` + `entry_insights` fetch | Context data |

Each component keeps its own processing/aggregation logic but receives raw data from the shared provider.

`StatisticsDashboard` and `KnowledgeGraph` keep their own fetches since they need different data (decrypt-entries, knowledge_relationships) -- but `KnowledgeGraph` benefits from lazy-loading since it's far below the fold.

---

### Fix 4: Deduplicate useDataSufficiency

Currently 5 components each call the `get_entry_depth_counts` RPC independently.

- Call `useDataSufficiency()` once in `InsightsDataContext`
- Pass `hasMinimumData`, `totalEntries`, etc. through context
- Remove individual `useDataSufficiency()` calls from child components

---

### Expected Impact

- **Initial page load**: ~15 network requests reduced to ~3-4 (auth + insights + entries + RPC)
- **Below-fold sections**: Zero requests until scrolled into view
- **Perceived speed**: Overview section renders much faster since it doesn't compete with 10+ parallel requests

---

### Summary of File Changes

| File | Action | Purpose |
|---|---|---|
| `src/components/LazySection.tsx` | Create | IntersectionObserver wrapper for deferred mounting |
| `src/contexts/InsightsDataContext.tsx` | Create | Shared data provider for insights, entries, user, data sufficiency |
| `src/pages/Insights.tsx` | Modify | Wrap sections in LazySection, add InsightsDataProvider |
| `src/components/MoodTracker.tsx` | Modify | Accept shared data via props/context instead of own fetch |
| `src/components/SentimentTracking.tsx` | Modify | Accept shared data via props/context instead of own fetch |
| `src/components/FrameworkAnalytics.tsx` | Modify | Accept shared data via props/context instead of own fetch |
| `src/components/ChakraAnalytics.tsx` | Modify | Accept shared data via props/context instead of own fetch |
| `src/components/TarotAnalytics.tsx` | Modify | Accept shared data via props/context instead of own fetch |

