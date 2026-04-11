

## Revised Plan: Homepage Redesign

### Homepage Section Order (after Hero)

1. **LiveDemoSection** — kept, restyled to new palette
2. **GraphSnapshotSection** — kept, restyled to new palette
3. **AboutPreviewSection** (new) — world tree metaphor + CTA to /about
4. **PricingCTA** (new) — pricing tiers, newsletter signup, contact link

### Section Dividers

- **Hero only**: curved organic SVG divider at bottom (color-rich gradient transition)
- **All other sections**: simple horizontal line or spacing — no curved dividers

### Changes vs Previous Plan

| Change | Detail |
|--------|--------|
| **Removed** LatestEntriesSection | Privacy concern — no user entries shown on public page |
| **Removed** CurvedDivider component | No longer needed as reusable component; curve is hero-only, built inline |
| **Simplified** section separators | Plain horizontal dividers (border or spacing) between sections 1–4 |

### Full File List

**Updated from previous plan:**

- `src/index.css` — new palette, dark mode, utilities
- `tailwind.config.ts` — Playfair Display, animation keyframes
- `index.html` — font link, meta/OG tags
- `src/components/YggdrasilLogo.tsx` (new) — SVG world-tree logo
- `src/components/PublicNavbar.tsx` (new) — transparent → shrink + blur on scroll
- `src/components/PublicFooter.tsx` (new) — minimal footer with root-line SVG
- `src/components/Hero.tsx` — full restyle, serif headline, curved SVG divider at bottom only
- `src/components/homepage/AboutPreviewSection.tsx` (new) — brief metaphor text + SVG tree + /about CTA
- `src/components/homepage/PricingCTA.tsx` (new) — two tier cards + newsletter input + contact
- `src/components/homepage/LiveDemoSection.tsx` — restyle to new palette
- `src/components/homepage/GraphSnapshotSection.tsx` — restyle to new palette
- `src/pages/Index.tsx` — new section order, PublicNavbar + PublicFooter
- `src/components/AppNavbar.tsx` — add scroll-aware shrink behavior
- `src/pages/Topics.tsx` (new) — SEO/blog page, not on homepage
- `src/pages/About.tsx` (new) — world tree metaphor page
- `src/pages/Contact.tsx` (new) — minimal contact form
- `src/App.tsx` — add /topics, /about, /contact routes

**Files to remove:** HowItWorksSection, UseCaseCards, BetaWaitlistCTA, FloatingParticles

**Unchanged:** All internal app pages, Supabase integrations, edge functions, NeuralNetworkAnimation

