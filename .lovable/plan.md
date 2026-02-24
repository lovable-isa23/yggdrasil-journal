

## Plan: Multi-Feature Enhancement for Goals, Yggi, Quantum Discovery, and Astrology

This plan covers 9 distinct improvements across several files.

---

### 1. Show Archived/Completed Goals

**Problem**: The GoalTracker query fetches all goals but `handleDeleteGoal` permanently deletes them. Users can't see archived goals.

**Solution**:
- Change `handleDeleteGoal` to set `status: 'archived'` instead of deleting
- Add a toggle/section at the bottom of GoalTracker to show/hide archived and completed goals
- Filter the main goal list to show only `active` goals by default, with a "Show completed & archived" toggle

**File**: `src/components/GoalTracker.tsx`
- Add state `showArchived` (default false)
- Split goals into `activeGoals` and `archivedGoals`
- Render archived goals in a separate collapsible section with muted styling
- Update `handleDeleteGoal` to use `.update({ status: 'archived', archived_reason: 'User archived' })` instead of `.delete()`

---

### 2. Include Goals and Insights/Interpretations in Yggi Context

**Problem**: Yggi currently fetches goals but only `active` ones and doesn't include interpretations from `entry_insights`.

**Solution**:
- Fetch ALL goals (remove `.eq('status', 'active')` filter) so Yggi knows completed/archived journey history
- Include `interpretation` data from `entry_insights` in the context summary
- Add goal descriptions and completion reflections to the context

**File**: `supabase/functions/yggi-chat/index.ts`
- Remove `.eq('status', 'active')` from goals query, fetch all goals
- Add goal descriptions and completion reflections to the ACTIVE INTENTIONS section
- Add a new "COMPLETED JOURNEYS" section for completed/archived goals
- Include interpretation summaries from recent insights in the RECENT REFLECTIONS section
- Increase `max_tokens` from 400 to 800

---

### 3. Allow Clearing of Date Picker in GoalDialog

**Problem**: Once a date is selected in the GoalDialog, there's no way to clear it.

**Solution**: Add a clear button next to the date display.

**File**: `src/components/GoalDialog.tsx`
- Add `pointer-events-auto` to the Calendar component
- When a date is selected, show an "X" button next to the date text to clear it
- Add `onSelect` handler that allows setting `undefined`

---

### 4. Make Micro-Wins Collapsible

**Problem**: The Micro-Wins section is always expanded inside goal cards, taking up space.

**Solution**: Wrap it in a Collapsible component similar to TreeOfLife.

**File**: `src/components/GoalTracker.tsx`
- Wrap the micro-wins section in a `Collapsible` with a trigger header showing the win count
- Default to collapsed state

---

### 5. Diversify Goal Icon When Suggesting Goals from Patterns

**Problem**: The `SpiritualGuidePanel` goal suggestion dialog uses the same `Target` icon for all goals regardless of type.

**Solution**: Map `goal_type` from the AI response to the correct journey type icons.

**Files**:
- `src/components/SpiritualGuidePanel.tsx`: Add a `getGoalTypeIcon` helper (matching GoalTracker's logic) and use it in the suggestion cards
- `supabase/functions/suggest-goals/index.ts`: Update the `goal_type` enum to match the app's actual types (`shadow-work`, `spiritual-practice`, `emotional-healing`, `manifestation`, `creative-expression`, `relationship-work`, `general`) instead of the current mismatched types (`spiritual`, `personal`, `health`, etc.)

---

### 6. Fix Hidden Connections Theme Limiting and Relevance

**Problem**: Themes are sliced alphabetically (`.slice(0, 25)`) rather than by relevance. Connection paths don't start from the chosen theme.

**Solution**:
- In the edge function, sort available themes by strength before limiting
- On the frontend, pass pre-sorted themes to the dropdown
- Update the connection path display to always start from the selected dropdown theme

**Files**:
- `supabase/functions/quantum-discovery/index.ts`: Already sorts by strength (top 16 nodes). No changes needed here.
- `src/components/PatternInsights.tsx`: When building `availableThemes`, sort by relevance/frequency rather than alphabetically before passing to QuantumDiscovery
- `src/components/QuantumDiscovery.tsx`: Remove the `.slice(0, 25)` cutoff (themes are already pre-sorted by relevance). Ensure connection path visualization starts from the dropdown-selected theme.

---

### 7. Fix Sidebar Entry Navigation Links

**Problem**: QuantumDiscovery navigates to `/journal` (line 74) instead of `/entries`. PatternInsights sidebar entries are not clickable at all.

**Solution**:
- `src/components/QuantumDiscovery.tsx`: Change `navigate("/journal", ...)` to `navigate("/entries", ...)`
- `src/components/PatternInsights.tsx`: Make sidebar entry cards clickable, navigating to `/entries` with `scrollToEntryId` state (matching the pattern used in QuantumDiscovery and SentimentTracking)

---

### 8. Add Astrology/Zodiac Section

**Problem**: Users want astrology notes (zodiac, planetary alignments) alongside the moon phases.

**Solution**: Create a new component and utility module for basic astrological data.

**New file**: `src/lib/astrology.ts`
- Calculate current zodiac sign based on date
- Provide basic planetary day/hour associations (Sun=Sunday, Moon=Monday, etc.)
- Include current zodiac season guidance
- Calculate rising sign approximation based on time of day

**New file**: `src/components/AstrologyIndicator.tsx`
- Card component similar to MoonPhaseIndicator
- Display current zodiac sign with emoji and element (Fire/Water/Earth/Air)
- Show planetary ruler of the day
- Include spiritual guidance based on current astrological energy
- Show zodiac element and modality (Cardinal/Fixed/Mutable)

**File**: `src/pages/Goals.tsx`
- Add `AstrologyIndicator` below MoonPhaseIndicator in the grid (or as a separate card below)

---

### 9. Summary of All File Changes

| File | Action | Changes |
|------|--------|---------|
| `src/components/GoalTracker.tsx` | Modify | Archive instead of delete; show archived goals toggle; make micro-wins collapsible |
| `supabase/functions/yggi-chat/index.ts` | Modify | Include all goals + interpretations in context; increase max_tokens to 800 |
| `src/components/GoalDialog.tsx` | Modify | Add date picker clear button + pointer-events-auto |
| `src/components/SpiritualGuidePanel.tsx` | Modify | Use diversified goal type icons in suggestions |
| `supabase/functions/suggest-goals/index.ts` | Modify | Fix goal_type enum to match app types |
| `src/components/QuantumDiscovery.tsx` | Modify | Remove theme slice limit; fix navigation to /entries |
| `src/components/PatternInsights.tsx` | Modify | Sort themes by relevance; make sidebar entries clickable with navigation |
| `src/lib/astrology.ts` | Create | Zodiac/planetary calculations and guidance |
| `src/components/AstrologyIndicator.tsx` | Create | Astrology display card |
| `src/pages/Goals.tsx` | Modify | Add AstrologyIndicator below moon phases |

