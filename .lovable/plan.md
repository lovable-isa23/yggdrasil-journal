

## Plan: 13 Multi-Area Improvements

### LANDING PAGE

#### 1. Public Navbar
**New file: `src/components/PublicNavbar.tsx`**
- Sticky header with Yggdrasil logo on left, anchor links on right: `#demo`, `#how-it-works`, `#pricing`
- "Open Journal" button (links to `/journal`) styled as CTA
- Transparent over hero, gains `bg-background/80 backdrop-blur-sm` on scroll (track with `useState` + scroll listener)

**`src/pages/Index.tsx`** — Add `<PublicNavbar />` above `<Hero />`

**`src/components/homepage/LiveDemoSection.tsx`** — Add `id="demo"` to the section  
**`src/components/homepage/HowItWorksSection.tsx`** — Add `id="how-it-works"` to the section  
**`src/components/homepage/BetaWaitlistCTA.tsx`** — Add `id="pricing"` to the section

#### 2. Move Demo Example Text Above Textarea
**`src/components/homepage/LiveDemoSection.tsx`**
- Remove the long placeholder text from the textarea
- Add a styled quote block above the textarea with label "For example:" and the example text in italics, bordered/muted styling
- Leave textarea placeholder as just "Start typing..."

#### 3. Social Proof Row
**New file: `src/components/homepage/SocialProofSection.tsx`**
- Three-column horizontal layout:
  - Left: `Users` icon + "Join our growing community"
  - Center: Testimonial card — quote + attribution
  - Right: `BarChart3` icon + "100+ journal entries analyzed"
- Warm, minimal styling consistent with existing sections

**`src/pages/Index.tsx`** — Insert `<SocialProofSection />` between `<Hero />` and `<LiveDemoSection />`

#### 4. Beta Pricing Display
**`src/components/homepage/BetaWaitlistCTA.tsx`**
- In the "Paid Beta" card, add `$5.99` in large text + "one-time fee" label below the title
- Add urgency line: "Early adopter pricing — becomes a monthly subscription at launch." in `text-muted-foreground` warm tone

#### 5. Privacy & Terms Placeholder Pages
**New files: `src/pages/Privacy.tsx`, `src/pages/Terms.tsx`**
- Each renders `<PublicNavbar />`, page title, placeholder body text
- Consistent styling with app pages

**`src/App.tsx`** — Add routes `/privacy` and `/terms`

#### 6. Landing Page Footer
**New file: `src/components/LandingFooter.tsx`**
- Logo + tagline, links to `/privacy` and `/terms`, copyright line
- Minimal, on-brand

**`src/pages/Index.tsx`** — Add `<LandingFooter />` at bottom

---

### APP — NAVIGATION

#### 7. Labels on App Navbar
**`src/components/AppNavbar.tsx`**
- On `lg` and above: render icon + text label for each nav item (no tooltip needed)
- Below `lg`: keep icon-only with existing tooltips
- Use responsive classes: `<span className="hidden lg:inline">{label}</span>`

---

### APP — WRITE PAGE

#### 8. Content Textarea Font
**`src/components/JournalEditor.tsx`** (line ~428)
- Change `className="... font-mono text-sm"` to `className="... font-['Poppins'] text-base"` on the content textarea
- Verify Poppins is loaded (it is, via the project's font setup)

#### 9. Mood/Category Selector
**`src/components/JournalEditor.tsx`**
- Add `mood` state (default `"general"`)
- Between the Entry Date popover and the Content section, add a labeled `Select` dropdown with options: Dream, Reflection, Gratitude, Intention, Shadow Work, General
- Include `mood` in draft auto-save/restore
- Pass `mood_type: mood` in the `encrypt-entry` body

**`supabase/functions/encrypt-entry/index.ts`**
- Destructure `mood_type` from request body
- Include `mood_type: mood_type || 'general'` in the insert object

---

### APP — ENTRIES PAGE

#### 10. Tooltips on Entry Card Action Icons
**`src/components/JournalEntryList.tsx`** (lines ~615-624)
- Wrap each of the three icon buttons in `<Tooltip>` with:
  - MessageSquareReply → "Reflect with Yggi"
  - Edit → "Edit entry"
  - Trash2 → "Delete entry"
- Wrap the group in a `<TooltipProvider>` (already imported)

#### 11. Rename Depth Badge
**`src/components/JournalEntryList.tsx`** (lines ~145-156)
- Change all `Depth: ${depthScore}` to `Analysis Depth: ${depthScore}` in the `getDepthBadge` function

#### 12. Fix Import History Navbar
**`src/pages/ImportHistory.tsx`**
- Remove the custom header block (lines ~115-170)
- Import and render `<AppNavbar />` instead

---

### APP — SETTINGS PAGE

#### 13. Confirmation Dialog for Re-analyze
**`src/pages/Settings.tsx`**
- Add state `showReanalyzeConfirm`
- The "Re-analyze All Entries" button sets `showReanalyzeConfirm = true` instead of calling `handleReanalyzeAll` directly
- Render an `AlertDialog` with message: "Re-analyze all entries? This will update insights for all [N] entries using your current framework settings. This may take a few minutes." and Confirm/Cancel buttons
- Confirm triggers the existing `handleReanalyzeAll`

---

### File Change Summary

| File | Changes |
|------|---------|
| `src/components/PublicNavbar.tsx` | **New** — landing page navbar |
| `src/components/homepage/SocialProofSection.tsx` | **New** — social proof row |
| `src/components/LandingFooter.tsx` | **New** — landing page footer |
| `src/pages/Privacy.tsx` | **New** — placeholder page |
| `src/pages/Terms.tsx` | **New** — placeholder page |
| `src/pages/Index.tsx` | Add PublicNavbar, SocialProofSection, LandingFooter |
| `src/components/homepage/LiveDemoSection.tsx` | Add `id="demo"`, move example text above textarea |
| `src/components/homepage/HowItWorksSection.tsx` | Add `id="how-it-works"` |
| `src/components/homepage/BetaWaitlistCTA.tsx` | Add `id="pricing"`, add price + urgency line |
| `src/App.tsx` | Add `/privacy` and `/terms` routes |
| `src/components/AppNavbar.tsx` | Show labels on lg+, icon-only below |
| `src/components/JournalEditor.tsx` | Change textarea font to Poppins, add mood selector, include mood in draft + submission |
| `supabase/functions/encrypt-entry/index.ts` | Accept and store `mood_type` |
| `src/components/JournalEntryList.tsx` | Add tooltips to action icons, rename depth badge |
| `src/pages/ImportHistory.tsx` | Replace custom header with `<AppNavbar />` |
| `src/pages/Settings.tsx` | Add confirmation dialog to re-analyze |

