# Lens System Pages — Part 1: Getting Started, What's New, Icons

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three new top-level pages to the Lens documentation system: Getting Started (onboarding), What's New (library-wide changelog), and Icons (searchable icon gallery).

**Architecture:** Three new SvelteKit routes under `(testing)/` alongside existing `components/` and `tokens/`. Each page follows existing Lens layout conventions (sidebar nav, command search integration). Data sourced from existing metadata (git log, Lucide imports, component registry).

**Tech Stack:** SvelteKit routes, Svelte 5, existing Lens layout, Lucide icons, git log parsing

---

### Task 1: Add sidebar navigation for new pages

**Files:**
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/+layout.svelte`

**Step 1:** Add navigation entries for the three new pages in the sidebar, below the existing "Components" and "Design Tokens" entries. Use icons: `BookOpen` for Getting Started, `Newspaper` for What's New, `Shapes` for Icons.

**Step 2:** Add the new pages to the command search global items so they're searchable.

**Step 3:** Run QA: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

**Step 4:** Commit: `feat(lens): add sidebar navigation for new pages`

---

### Task 2: Getting Started page

**Files:**
- Create: `packages/products/storylyne/editor/src/routes/(testing)/getting-started/+page.svelte`

**Step 1:** Build the Getting Started page with these sections (all static content, no data fetching):

1. **Welcome** — Brief intro to the component library and what Lens provides
2. **Installation** — `pnpm add` command, import setup with `@/ui/` paths
3. **Import Conventions** — Direct imports (`import Button from '@/ui/button/button.svelte'`), namespace imports for compounds (`import * as Card from '@/ui/card'`), type imports
4. **First Component** — Copy-paste example rendering a Button with variants
5. **Project Structure** — Where components live (`packages/shared/ui/src/<name>/`), what files exist (component, lens.ts, examples/, docs.md)
6. **Customization** — How to extend components (class prop, Tailwind overrides)
7. **Next Steps** — Links to Components, Design Tokens, Foundations (when available)

Each section uses collapsible headers matching the component detail page pattern. Code examples use `CodeBlock` component with copy buttons.

**Step 2:** Run QA: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

**Step 3:** Commit: `feat(lens): add Getting Started page`

---

### Task 3: What's New / Library-wide Changelog page

**Files:**
- Create: `packages/products/storylyne/editor/src/routes/(testing)/changelog/+page.svelte`
- Create: `packages/products/storylyne/editor/src/routes/(testing)/changelog/+page.server.ts`

**Step 1:** Create a server load function that runs `git log` across `packages/shared/ui/src/` to get all commits touching components. Parse each commit to extract:
- Hash, message, author, date, body
- Which component directories were touched (from `--name-only` output)
- Group by date (day buckets)

Return as structured data to the page.

**Step 2:** Build the page UI:
- Timeline view grouped by date
- Each entry shows: commit message, component badges (clickable, linking to `/components/<name>`), author, relative time
- Search/filter by component name, commit message, author
- "Show more" pagination (load 50 at a time)
- Filter chips for: "Added" (new files), "Updated" (modified), "Removed" (deleted)

**Step 3:** Run QA: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

**Step 4:** Commit: `feat(lens): add library-wide changelog page`

---

### Task 4: Icons page

**Files:**
- Create: `packages/products/storylyne/editor/src/routes/(testing)/icons/+page.svelte`

**Step 1:** Build the Icons page:

1. **Icon discovery** — Use `import.meta.glob('@lucide/svelte/icons/*')` to discover all available Lucide icons. Lazy-load icon components on scroll (IntersectionObserver).

2. **Grid view** — Cards showing icon visual + name. Grid responsive: 6 cols on wide, 4 on medium, 3 on narrow. Each card:
   - Renders the icon component at size-6
   - Shows the kebab-case name below
   - Click to select → shows detail panel
   - Hover shows larger preview

3. **Search** — Filter icons by name keyword. Debounced input. Show match count.

4. **Detail panel** — When an icon is selected, show:
   - Large preview (size-16)
   - Import statement with copy button: `import X from '@lucide/svelte/icons/x'`
   - Usage example: `<X class="size-4" />`
   - List which components in the library use this icon (grep the codebase at build time or use static analysis)

5. **Size/stroke controls** — Adjustable preview size and stroke width sliders at the top

**Step 2:** Run QA: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

**Step 3:** Commit: `feat(lens): add Icons gallery page`

---

### Task 5: Visual verification + final QA

**Step 1:** Run full test suite: `pnpm qa:test`

**Step 2:** Run full QA: `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

**Step 3:** Visual verification via Playwright MCP:
1. Navigate to each new page via sidebar
2. Verify Getting Started content renders correctly
3. Verify What's New timeline loads with real git data
4. Verify Icons gallery search and grid work
5. Verify command search finds new pages
6. Take screenshots as proof

**Step 4:** Commit: `feat(lens): new pages — complete`
