

## Plan: Connection Path Fix, Framework Enforcement, Chakra & Tarot Charts

This plan covers 5 areas: quantum discovery path logic, framework lens enforcement, bidirectional edge deduplication, and two new Insights page visualizations.

---

### 1. Fix Connection Path Logic in Quantum Discovery

**Problem**: The connection path shows nonsensical sequences (e.g., "Josh → inadequacy → Josh → frustration" when starting from "weed"). The root causes:
- The classical random walk path tracking (`currentPath`) doesn't properly reconstruct the shortest path from start to discovered node -- it just records the walk trajectory which can revisit nodes
- Bidirectional edges (A→B and B→A) are stored as separate entries in `relationshipMap` but also added as separate edges in the graph, doubling their weight artificially
- The path is sliced arbitrarily (`currentPath.slice(0, 3)`) losing context

**Fix in `supabase/functions/quantum-discovery/index.ts`**:

1. **Deduplicate bidirectional edges**: When building the `edges` array, check if the reverse edge already exists before adding. Combine weights for duplicate pairs.

2. **Replace random walk path tracking with BFS shortest path**: After the random walk identifies interesting nodes, compute the actual shortest path from start node to each discovered node using BFS on the adjacency graph. This guarantees a clean, non-repeating path.

3. **Increase walk steps** from 100 to 200 for stronger signal and better relevance discrimination.

4. **Raise relevance thresholds**: Change `quantum_discovered` threshold from `0.05` to `0.08` and `reinforced` from `0.03` to `0.05` to surface only stronger connections.

5. **Ensure connection path starts from the selected theme**: The BFS path naturally starts from `startNode`, so the enrichment step just maps the BFS result to node names.

---

### 2. Integrate Google Cirq Quantum Service

**Current state**: The `QUANTUM_SERVICE_URL` secret exists but the code falls back to `classicalRandomWalk` when the service is unavailable. The quantum service integration code is already present (lines 270-315) but needs the connection path reconstruction for quantum results too.

**Fix**: When quantum service returns results, also compute BFS shortest paths for discovered nodes (same as classical). This ensures connection paths are always correct regardless of method. No changes needed to the quantum service call itself -- it's already wired up.

---

### 3. Fix Framework Lens Enforcement in analyze-entry

**Problem**: The prompt says "MUST apply at least 2 different framework lenses" and "For deeper entries (depth >= 5), aim for 3-5 frameworks" but `applyFrameworks` is only true when `depthScore >= 5` (line 254). For depth 5 entries, frameworks are applied but the minimum isn't enforced in the output.

**Fix in `supabase/functions/analyze-entry/index.ts`**:
- Change `const applyFrameworks = depthScore >= 5;` to `const applyFrameworks = depthScore >= 3;` so entries with moderate depth also get at least 1-2 lenses
- For `depthScore >= 5`, strengthen the prompt language to make the minimum 2 frameworks truly mandatory (add "You MUST include at least 2 entries in frameworks_applied")
- For `depthScore >= 7`, require 3+ frameworks
- Add a post-processing validation: if `depthScore >= 5` and `frameworks_applied.length < 2`, log a warning (the AI should comply but this documents intent)

---

### 4. Chakra Resonance Chart (Population Pyramid)

**New component**: `src/components/ChakraAnalytics.tsx`

Fetches all `entry_insights` where `chakra_tags` is not empty, aggregates which chakras appear most frequently, and renders a horizontal bar chart resembling a population pyramid with 7 tiers (Root at bottom, Crown at top). Each chakra bar shows count. Color-coded by chakra (red for Root through violet for Crown).

Uses Recharts `BarChart` with horizontal layout. Each bar shows the chakra name on the Y-axis and count on X-axis.

**Add to Insights page** (`src/pages/Insights.tsx`): Add within the Emotional Analysis section (conditionally shown if `enable_chakra_tags` is true in user preferences).

---

### 5. Tarot Archetype Frequency Chart

**New component**: `src/components/TarotAnalytics.tsx`

Fetches all `entry_insights` where `tarot_tags` is not empty, counts card frequency, and renders a horizontal bar chart showing the most used tarot archetypes sorted by frequency.

Uses Recharts `BarChart` horizontal. Shows top 10-15 most frequent cards.

**Add to Insights page**: Below chakra chart, conditionally shown if `enable_tarot_tags` is true.

---

### 6. Load User Tag Preferences in Insights Page

**File**: `src/pages/Insights.tsx`

Expand the `VisibilityPrefs` interface and `loadVisibilityPrefs` query to also fetch `enable_chakra_tags` and `enable_tarot_tags` from `user_preferences`. Pass these as conditional rendering flags for the new components.

---

### Summary of File Changes

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/quantum-discovery/index.ts` | Modify | Deduplicate bidirectional edges, BFS path reconstruction, raise thresholds |
| `supabase/functions/analyze-entry/index.ts` | Modify | Lower framework threshold to depth >= 3, enforce minimums per depth tier |
| `src/components/ChakraAnalytics.tsx` | Create | Chakra resonance population-pyramid chart |
| `src/components/TarotAnalytics.tsx` | Create | Tarot archetype horizontal bar chart |
| `src/pages/Insights.tsx` | Modify | Add chakra/tarot charts, load tag preferences |

