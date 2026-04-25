## Plan: Homepage reorder + Journal editor row layout

### 1. Reorder homepage sections (`src/pages/Index.tsx`)

Change the section order inside `<Suspense>` to:
1. `Hero` (already outside Suspense — stays first)
2. `HowItWorksSection` ("How It Works")
3. `LiveDemoSection` ("Try It Yourself")
4. `UseCaseCards` ("What You'll Discover")
5. `GraphSnapshotSection` ("Living Landscape")
6. `SocialProofSection` (Social proof)
7. `BetaWaitlistCTA` (final CTA)

No other files affected. Anchor IDs (`#demo`, `#how-it-works`, `#pricing`) in `PublicNavbar` continue to work since the section IDs remain on the same components.

### 2. Entry Date + Category on same row (`src/components/JournalEditor.tsx`)

- Wrap the existing "Entry Date" block and the "Mood / Category" block in a single `grid grid-cols-1 sm:grid-cols-2 gap-4` container so they sit side-by-side (50/50) on tablet+ and stack on mobile.
- Rename the label "Mood / Category" → "Category".
- Rename the Select placeholder from "Select a mood" → "Select a category".
- Keep the underlying `mood` state variable, `mood_type` payload field, and all 6 options (Dream, Reflection, Gratitude, Intention, Shadow Work, General) unchanged — purely a label/layout change.

### Files changed
- `src/pages/Index.tsx`
- `src/components/JournalEditor.tsx`
