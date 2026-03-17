# Lens Component Detail Page Additions

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add five new sections/features to the component detail page: Slots & Events documentation, Keyboard Navigation docs, Related Components, Usage Guidelines (Do's/Don'ts), and Token Usage Map.

**Architecture:** New extraction utilities in `packages/shared/ui/src/lens/` that parse component source for slots/events/keyboard/tokens. New optional fields in `LensMeta` for manual overrides. New sections in the `[name]/+page.svelte` detail page rendered alongside existing Props/Variants/Examples sections.

**Tech Stack:** TypeScript source parsing (regex-based, matching existing `extract-props.ts` approach), Svelte 5, existing Lens UI components

---

### Task 1: Slots & Events extraction + schema

**Files:**
- Modify: `packages/shared/ui/src/lens/types.ts`
- Create: `packages/shared/ui/src/lens/extract-slots.ts`
- Create: `packages/shared/ui/src/lens/extract-slots.test.ts`

**Step 1: Add schemas to types.ts**

```typescript
/** Metadata for a named slot extracted from component source. */
export const SlotMetaSchema = v.strictObject({
  /** Slot name (e.g., "children", "trigger", "icon"). "default" for the default slot. */
  name: StrSchema,
  /** JSDoc description of expected slot content. */
  description: StrSchema,
  /** Whether the slot receives render props (has parameters). */
  hasProps: BoolSchema,
  /** Render prop parameter types, if any (e.g., "{ open: boolean }"). */
  propsType: v.optional(StrSchema),
});
export type SlotMeta = v.InferOutput<typeof SlotMetaSchema>;

/** Metadata for a callback event prop. */
export const EventMetaSchema = v.strictObject({
  /** Event prop name (e.g., "onclick", "onOpenChange", "onSelect"). */
  name: StrSchema,
  /** JSDoc description of when the event fires. */
  description: StrSchema,
  /** Parameter type signature (e.g., "(open: boolean) => void"). */
  type: StrSchema,
});
export type EventMeta = v.InferOutput<typeof EventMetaSchema>;
```

**Step 2: Write extract-slots.ts**

Parse raw Svelte source to extract:
- **Slots**: Find `{#snippet children}`, `{#snippet trigger}`, etc. in the component template. Also detect `<slot>` and `<slot name="x">` (Svelte 4 compat). Extract JSDoc from the `$props()` destructuring for slot-typed props (type `Snippet`).
- **Events/Callbacks**: Filter `PropMeta[]` for function-typed props starting with `on` (onclick, onOpenChange, onSelect, etc.). Extract parameter types from the type string.

**Step 3: Write tests covering:**
- Component with default slot only
- Component with named slots (trigger, content, icon)
- Component with render prop slots (`{#snippet child({ props })}`)
- Component with callback props (onclick, onOpenChange)
- Component with no slots or events

**Step 4:** Run QA + Commit: `feat(lens): add slot and event metadata extraction`

---

### Task 2: Slots & Events section in detail page

**Files:**
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Step 1:** Call `extractSlots()` and `extractEvents()` on the raw source during component load (alongside existing `extractProps` and `extractVariants` calls).

**Step 2:** Add a new collapsible section "Slots & Events" between Props and Variants:
- **Slots table**: columns — Name, Description, Render Props (shows prop types if any)
- **Events table**: columns — Name, Description, Type signature
- Each slot name is a code badge, events show the full `(param: Type) => void` signature
- Empty state: "No slots or events detected"

**Step 3:** Run QA + Commit: `feat(lens): add Slots & Events section to component detail page`

---

### Task 3: Keyboard Navigation extraction + schema

**Files:**
- Modify: `packages/shared/ui/src/lens/types.ts`
- Create: `packages/shared/ui/src/lens/extract-keyboard.ts`
- Create: `packages/shared/ui/src/lens/extract-keyboard.test.ts`

**Step 1: Add schema**

```typescript
/** A single keyboard interaction for a component. */
export const KeyboardInteractionSchema = v.strictObject({
  /** Key or key combination (e.g., "Enter", "Space", "ArrowDown", "Shift+Tab"). */
  key: StrSchema,
  /** What the key does in context of this component. */
  description: StrSchema,
});
export type KeyboardInteraction = v.InferOutput<typeof KeyboardInteractionSchema>;
```

**Step 2: Add optional `keyboard` field to `LensMetaSchema`**

```typescript
/** Optional keyboard navigation documentation. */
keyboard: v.optional(v.array(KeyboardInteractionSchema)),
```

**Step 3: Write extract-keyboard.ts**

Two-layer approach:
1. **Manual**: If `lens.ts` exports a `keyboard` array, use that (highest priority, most accurate)
2. **Auto-detect**: Scan component source for `onkeydown`, `on:keydown`, event listener patterns. Detect common patterns:
   - `e.key === 'Enter'` → "Enter: Activates the component"
   - `e.key === 'Escape'` → "Escape: Closes/dismisses"
   - `e.key === 'ArrowDown'` → "ArrowDown: Moves focus to next item"
   - `e.key === 'Tab'` → "Tab: Moves focus to next focusable element"

**Step 4:** Write tests + Run QA + Commit: `feat(lens): add keyboard interaction extraction`

---

### Task 4: Keyboard Navigation section in detail page

**Files:**
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Step 1:** Add "Keyboard" section after Slots & Events:
- Table with columns: Key (rendered as `<Kbd>` component), Description
- Keyboard icon in section header
- Auto-detected interactions shown with a subtle "auto-detected" indicator
- Manual overrides from `lens.ts` shown without indicator
- Empty state: "No keyboard interactions documented. Add a `keyboard` export to `lens.ts`."

**Step 2:** Run QA + Commit: `feat(lens): add Keyboard Navigation section to detail page`

---

### Task 5: Related Components

**Files:**
- Modify: `packages/shared/ui/src/lens/types.ts`
- Create: `packages/shared/ui/src/lens/extract-related.ts`
- Create: `packages/shared/ui/src/lens/extract-related.test.ts`
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Step 1: Add optional `related` field to `LensMetaSchema`**

```typescript
/** Optional manually curated related component names. */
related: v.optional(v.array(StrSchema)),
```

**Step 2: Write extract-related.ts**

Auto-detect related components using three signals:
1. **Same category**: Components sharing the same `LensMeta.category` (e.g., all overlays: Dialog, AlertDialog, Sheet, Drawer)
2. **Shared tags**: Components sharing tags (e.g., both tagged `compound` + `shadcn`)
3. **Import dependencies**: Components that import each other (from existing `extractDeps`/`extractReverseDeps`)
4. **Manual override**: `related` field in `LensMeta` takes priority

Score and rank by relevance. Return top 6 related components.

**Step 3: Add "Related Components" section at the bottom of the detail page**

Horizontal card strip showing: component name, category badge, description snippet, link to component page. Compact cards, scrollable if more than 4.

**Step 4:** Write tests + Run QA + Commit: `feat(lens): add Related Components section`

---

### Task 6: Usage Guidelines (Do's & Don'ts)

**Files:**
- Modify: `packages/shared/ui/src/lens/types.ts`
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Step 1: Add schema**

```typescript
/** A single usage guideline entry (do or don't). */
export const UsageGuidelineSchema = v.strictObject({
  /** Whether this is a "do" (true) or "don't" (false). */
  recommended: BoolSchema,
  /** Description of the guideline. */
  description: StrSchema,
  /** Optional code example. */
  code: v.optional(StrSchema),
});
export type UsageGuideline = v.InferOutput<typeof UsageGuidelineSchema>;
```

**Step 2: Add optional `guidelines` field to `LensMetaSchema`**

```typescript
/** Optional usage guidelines (do's and don'ts). */
guidelines: v.optional(v.array(UsageGuidelineSchema)),
```

**Step 3: Also support `guidelines.md`**

Add a `import.meta.glob('@/ui/*/guidelines.md', { query: '?raw', ... })` glob alongside the existing `docs.md` glob. Parse markdown into structured do/don't entries using a simple format:

```markdown
## Do
- Use descriptive button labels like "Save Changes"
- Provide loading state for async actions

## Don't
- Don't use generic labels like "Submit" or "OK"
- Don't disable buttons without explaining why
```

**Step 4: Add "Usage Guidelines" section in detail page**

Render as paired cards:
- Green border + ✓ icon for "Do" entries
- Red border + ✗ icon for "Don't" entries
- Optional code snippet below each entry
- Empty state: "No usage guidelines. Add a `guidelines` export to `lens.ts` or create `guidelines.md`."

**Step 5:** Run QA + Commit: `feat(lens): add Usage Guidelines section`

---

### Task 7: Token Usage Map

**Files:**
- Create: `packages/shared/ui/src/lens/extract-token-usage.ts`
- Create: `packages/shared/ui/src/lens/extract-token-usage.test.ts`
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Step 1: Write extract-token-usage.ts**

Scan raw component source + related .ts files for:
- CSS custom properties: `var(--color-primary)`, `var(--radius-sm)`, etc.
- Tailwind utility classes: `bg-primary`, `text-muted-foreground`, `rounded-lg`, `shadow-md`, `p-4`, etc.

Map each to its design token category:
- Colors: `bg-*`, `text-*`, `border-*`, `ring-*`
- Spacing: `p-*`, `m-*`, `gap-*`, `space-*`
- Border radius: `rounded-*`
- Shadows: `shadow-*`
- Typography: `text-*` (sizes), `font-*`

Return grouped token usage list.

**Step 2: Add "Design Tokens" section in detail page**

Grouped display:
- **Colors used**: swatches with token name, Tailwind class
- **Spacing used**: scale values with visual bar
- **Other**: radius, shadows, typography values

Each token links to the Design Tokens page (`/tokens#<token-name>`).

**Step 3:** Write tests + Run QA + Commit: `feat(lens): add Token Usage Map section`

---

### Task 8: Visual verification + final QA

**Step 1:** Run full test suite: `pnpm qa:test`

**Step 2:** Run full QA: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

**Step 3:** Visual verification via Playwright MCP:
1. Navigate to a component with rich source (e.g., Button, Dialog)
2. Verify Slots & Events section shows extracted data
3. Verify Keyboard section shows detected interactions
4. Verify Related Components shows relevant suggestions
5. Verify Token Usage Map shows extracted tokens
6. Add manual `guidelines` to one component's `lens.ts`, verify Guidelines section renders

**Step 4:** Commit: `feat(lens): component detail page additions — complete`
