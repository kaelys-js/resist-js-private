# Lens System Pages — Part 2: Foundations, Content Guidelines, Patterns

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three design-focused top-level pages: Foundations (design principles behind tokens), Content Guidelines (UI writing standards), and Patterns (how to compose components for common tasks).

**Architecture:** Three new SvelteKit routes. Foundations auto-extracts data from design tokens + app.css. Content Guidelines is structured markdown. Patterns combines prose with live component examples.

**Tech Stack:** SvelteKit routes, Svelte 5, existing token extraction, CodeBlock, LensComponentRenderer

**Depends on:** Part 1 (sidebar navigation entries added).

---

### Task 1: Foundations landing page + Color sub-page

**Files:**
- Create: `packages/products/storylyne/editor/src/routes/(testing)/foundations/+page.svelte`
- Create: `packages/products/storylyne/editor/src/routes/(testing)/foundations/color/+page.svelte`

**Step 1:** Foundations landing page — card grid linking to sub-pages:
- Color (palette swatches preview)
- Typography (font scale preview)
- Spacing (spacing scale preview)
- Elevation (shadow levels preview)
- Motion (animation curves preview)
- Breakpoints (responsive breakpoints)

Each card shows a visual preview + title + one-line description.

**Step 2:** Color sub-page:
- Extract semantic color roles from design tokens (already parsed by `extract-tokens.ts`)
- Group by role: primary, secondary, destructive, muted, accent, background, foreground, border, etc.
- Each color shows: swatch, CSS variable name, Tailwind class, hex value (light + dark), contrast ratio against background
- "Usage" column: when to use this color (e.g., "Primary actions, links, focus rings")
- Auto-detect accessibility: mark colors that fail WCAG AA contrast

**Step 3:** Run QA + Commit: `feat(lens): add Foundations landing + Color page`

---

### Task 2: Typography + Spacing + Elevation sub-pages

**Files:**
- Create: `packages/products/storylyne/editor/src/routes/(testing)/foundations/typography/+page.svelte`
- Create: `packages/products/storylyne/editor/src/routes/(testing)/foundations/spacing/+page.svelte`
- Create: `packages/products/storylyne/editor/src/routes/(testing)/foundations/elevation/+page.svelte`

**Step 1:** Typography page:
- Extract font sizes from Tailwind config / CSS variables
- Render each size with: sample text, Tailwind class (`text-sm`, `text-lg`), pixel/rem values, line height, weight
- Usage guidance: when to use each size (headings, body, captions, labels)
- Font family display with specimen

**Step 2:** Spacing page:
- Extract spacing scale from Tailwind (0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, ...)
- Visual bars showing relative sizes
- Tailwind class mapping (p-2, m-4, gap-6, etc.)
- Guidelines: when to use tight vs. loose spacing

**Step 3:** Elevation page:
- Extract shadow tokens from CSS / Tailwind
- Cards at each elevation level showing the shadow visually
- z-index layering guide
- Guidelines: when to elevate (dropdowns, modals, tooltips, cards)

**Step 4:** Run QA + Commit: `feat(lens): add Typography, Spacing, Elevation foundation pages`

---

### Task 3: Motion + Breakpoints sub-pages

**Files:**
- Create: `packages/products/storylyne/editor/src/routes/(testing)/foundations/motion/+page.svelte`
- Create: `packages/products/storylyne/editor/src/routes/(testing)/foundations/breakpoints/+page.svelte`

**Step 1:** Motion page:
- Document animation durations (150ms, 200ms, 300ms, 500ms) with live previews
- Easing curves visualization (ease-in, ease-out, ease-in-out, spring)
- Interactive demo: click to trigger each animation type
- Guidelines: what to animate (entrances, state changes), what NOT to animate, reduced-motion handling

**Step 2:** Breakpoints page:
- Document responsive breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px)
- Visual representation showing screen widths
- Component behavior at each breakpoint (which components adapt, how)
- Mobile-first methodology explanation

**Step 3:** Run QA + Commit: `feat(lens): add Motion and Breakpoints foundation pages`

---

### Task 4: Content Guidelines page

**Files:**
- Create: `packages/products/storylyne/editor/src/routes/(testing)/content/+page.svelte`

**Step 1:** Build the Content Guidelines page with structured sections:

1. **Voice & Tone** — Friendly but professional, confident but not arrogant, clear but not condescending
2. **Button Labels** — Use action verbs ("Save", "Delete", "Create"), avoid generic ("Submit", "OK", "Click here"). Do/Don't examples.
3. **Error Messages** — What happened + how to fix it. Avoid blame ("You entered wrong..."), be specific ("Email must include @"). Do/Don't examples.
4. **Empty States** — Helpful guidance, not just "No data". Show next action. Do/Don't examples.
5. **Tooltips** — Brief, no redundancy with visible label. When to use vs. not use.
6. **Placeholder Text** — Show format examples ("name@example.com"), not instructions ("Enter your email"). Do/Don't examples.
7. **Capitalization** — Title Case for headings, Sentence case for descriptions, ALL CAPS never.
8. **Truncation** — Middle truncation for file paths, end truncation for text, always show ellipsis.
9. **Numbers & Dates** — Relative time ("2 hours ago"), locale-aware formatting, number abbreviation (1.2k, 3.4M).

Each section uses a Do/Don't card pattern: green-bordered card with ✓ for correct, red-bordered card with ✗ for incorrect.

**Step 2:** Run QA + Commit: `feat(lens): add Content Guidelines page`

---

### Task 5: Patterns page

**Files:**
- Create: `packages/products/storylyne/editor/src/routes/(testing)/patterns/+page.svelte`
- Create: `packages/products/storylyne/editor/src/routes/(testing)/patterns/[pattern]/+page.svelte`

**Step 1:** Patterns landing page — card grid linking to pattern sub-pages:
- Form Layouts
- Data Tables
- Navigation
- Empty States
- Loading States
- Error Handling
- Confirmation Flows
- Authentication

Each card has: icon, title, description, component count badge.

**Step 2:** Pattern detail page template:
- Description of the pattern and when to use it
- Live example(s) using actual components from the library (rendered via Svelte components or code snippets)
- Component list: which components are used in this pattern (linked to component pages)
- Code snippets: copy-paste ready Svelte markup
- Variations: different approaches for different contexts
- Accessibility considerations for the pattern

**Step 3:** Create at least 3 pattern pages as examples:
- **Form Layouts**: single column, two column, with validation, with sections
- **Empty States**: no data, no results, first-time, error
- **Loading States**: skeleton, spinner, progressive, optimistic

**Step 4:** Run QA + Commit: `feat(lens): add Patterns page with form, empty state, and loading patterns`

---

### Task 6: Update sidebar + command search for all new pages

**Files:**
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/+layout.svelte`

**Step 1:** Add sidebar entries for Foundations (with sub-pages), Content, and Patterns. Group under a "System" or "Design" section in the sidebar, visually separated from Components and Tokens.

**Step 2:** Add all new pages + sub-pages to command search global items.

**Step 3:** Run QA + Commit: `feat(lens): add all new pages to sidebar and command search`

---

### Task 7: Visual verification + final QA

**Step 1:** Run full test suite: `pnpm qa:test`

**Step 2:** Run full QA: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

**Step 3:** Visual verification via Playwright MCP for all new pages.

**Step 4:** Commit: `feat(lens): foundations, content, patterns pages — complete`
