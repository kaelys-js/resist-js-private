# Lens Advanced Features — Interactive Playground, Status Dashboard, Figma Link

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three advanced features: an Interactive Playground (live code editor), a Component Status Dashboard (system-wide health overview), and Figma design file linking.

**Architecture:** Playground uses a lightweight code editor (CodeMirror or a textarea with syntax highlighting) that compiles Svelte snippets client-side via the Svelte compiler REPL approach. Status Dashboard is a new page aggregating existing metadata. Figma link is a simple `LensMeta` field.

**Tech Stack:** Svelte compiler (client-side), CodeMirror/textarea, existing Lens metadata, SvelteKit routes

---

### Task 1: Interactive Playground — Code Editor Component

**Files:**
- Create: `packages/shared/ui/src/lens-playground/LensPlayground.svelte`
- Create: `packages/shared/ui/src/lens-playground/index.ts`

**Step 1:** Build a `LensPlayground` component with:

1. **Code editor pane** (left/top):
   - Textarea with monospace font, line numbers, basic syntax highlighting via CSS
   - Pre-populated with the component's default usage example
   - Tab key inserts spaces (not focus change)
   - Debounced change handler (300ms) triggers re-render

2. **Preview pane** (right/bottom):
   - Renders the edited code in an iframe sandbox
   - The iframe loads a minimal HTML page that imports the component library
   - On code change: post the new source to the iframe via `postMessage`, iframe re-renders
   - Error display: if compilation fails, show error message in the preview pane instead of crashing

3. **Toolbar**:
   - Reset button (restore to default code)
   - Copy button (copy current code)
   - Layout toggle (horizontal split / vertical split)
   - Open in isolation (open current code as standalone page)

**Alternative approach if client-side Svelte compilation is too complex:**
Use the existing `/isolate/[name]` page approach — the playground sends prop overrides via URL params or postMessage, and the isolate page renders with those props. This avoids needing the Svelte compiler client-side but limits editing to prop values rather than full markup.

**Step 2:** Run QA + Commit: `feat(lens): add LensPlayground code editor component`

---

### Task 2: Wire Playground into component detail page

**Files:**
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Step 1:** Add a new collapsible "Playground" section after the Examples section:
- Contains `<LensPlayground>` with the component's default import + basic usage pre-filled
- The default code is generated from: component import path + default props + default slot content
- Section icon: `Terminal` or `Code2`

**Step 2:** Run QA + Commit: `feat(lens): add Playground section to component detail page`

---

### Task 3: Component Status Dashboard page

**Files:**
- Create: `packages/products/storylyne/editor/src/routes/(testing)/status/+page.svelte`

**Step 1:** Build the Status Dashboard page showing health of every component:

1. **Summary cards** at the top:
   - Total components count
   - Components with docs (has `docs.md`)
   - Components with examples (has `examples/`)
   - Components with full compatibility (all lens rules pass)
   - Deprecated components count

2. **Component health table**:
   - Columns: Name, Category, Status (new/updated/deprecated/—), Docs (✓/✗), Examples (✓/✗), Compatibility (pass count/total), Props count
   - Sortable by any column
   - Filterable by: category, status, "missing docs", "missing examples", "has violations"
   - Search by name
   - Click row → navigate to component detail page

3. **Completeness score per component**:
   - Calculate from: has docs? has examples? has keyboard docs? has guidelines? all lens rules pass?
   - Show as progress bar or percentage
   - Color coded: green (100%), yellow (50-99%), red (<50%)

4. **Priority list**:
   - "Needs attention" section at top showing components with lowest completeness scores
   - Helps maintainers prioritize documentation work

**Step 2:** Add to sidebar navigation and command search.

**Step 3:** Run QA + Commit: `feat(lens): add Component Status Dashboard page`

---

### Task 4: Figma Link

**Files:**
- Modify: `packages/shared/ui/src/lens/types.ts`
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Step 1: Add `figmaUrl` to `LensMetaSchema`**

```typescript
/** Optional link to the Figma design file for this component. */
figmaUrl: v.optional(v.pipe(StrSchema, v.url())),
```

**Step 2: Render in component detail page header**

In the `LensHeader` component or the detail page header area, if `figmaUrl` is present:
- Show a "Figma" button with the Figma icon (or a `Paintbrush` Lucide icon)
- Opens in new tab
- Tooltip: "Open in Figma"
- Placed alongside existing header actions (copy import, isolation link, etc.)

**Step 3:** Run QA + Commit: `feat(lens): add Figma link support to component metadata`

---

### Task 5: Visual verification + final QA

**Step 1:** Run full test suite: `pnpm qa:test`

**Step 2:** Run full QA: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

**Step 3:** Visual verification via Playwright MCP:
1. Navigate to a component → verify Playground section with code editor
2. Edit code in playground → verify preview updates
3. Navigate to Status Dashboard → verify component health data
4. Add `figmaUrl` to one component's `lens.ts` → verify Figma button appears
5. Take screenshots as proof

**Step 4:** Commit: `feat(lens): advanced features — complete`
