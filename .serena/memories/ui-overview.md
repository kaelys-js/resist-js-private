# `@/ui` — packages/shared/ui

Massive component library: **873 component subdirectories**. Each is a self-contained component-folder with an enforced authoring convention so the Lens auto-documentation system can introspect it.

## Package
- **Name**: `@/ui` (private)
- **Vitest projects**: `ui` (Node) + `ui-svelte` (jsdom + svelte plugin)
- **Test commands**: runs both projects via `pnpm -w exec vitest run --project ui --project ui-svelte`
- **Key deps**: `bits-ui ^2.16` (headless primitives), `@lucide/svelte`, `paneforge`, `vaul-svelte`, `shiki`, `clsx`, `tailwind-merge`, `tailwind-variants`, `modern-screenshot`, `svelte-sonner`, `@internationalized/date`
- **DevDeps for Lens system**: `@tanstack/table-core`, `embla-carousel-svelte`, `fflate`, `formsnap`, `layerchart`, `mode-watcher`, `sveltekit-superforms`, `svelte ^5.53`, `svelte-check`

## Top-level barrel (`src/index.ts`)
Just re-exports `./utils.ts` — there is **no global barrel** for components. Each component is imported directly via its folder name: `import * as Dialog from '@/ui/dialog'`.

## `src/utils.ts` — shared utilities
- `cn(...inputs: ClassValue[]): Str` — Tailwind-merge + clsx wrapper (resolves Tailwind conflicts so last utility wins)
- Type helpers (for shadcn-svelte wrapper components):
  - `WithoutChild<T>` — strips `child?` snippet prop
  - `WithoutChildren<T>` — strips `children?` snippet prop
  - `WithoutChildrenOrChild<T>` — both
  - `WithElementRef<T, U>` — adds `ref?: U | null`

## RULES.md — mandatory authoring convention

### Directory structure per component
```
<component-name>/                ← kebab-case dir
  ComponentName.svelte           ← PascalCase primary file
  sub-part.svelte                ← kebab-case sub-components
  lens.ts                        ← REQUIRED Lens metadata
  index.ts                       ← optional barrel (for compounds)
  examples/                      ← optional hand-written examples
    basic.svelte
    with-form.svelte
  types.ts                       ← optional types/variants
```

**Naming**:
- Directory: `kebab-case`
- Primary `.svelte`: `PascalCase` (some packages use lowercase like `button.svelte` — both seen in practice)
- Sub-components: `kebab-case` with parent prefix (e.g. `dialog-content.svelte`, `dropdown-menu-item.svelte`)
- `lens.ts` and `index.ts`: lowercase

### Component file structure (two `<script>` blocks)
**Block 1**: `<script module lang="ts">` — schema + types
```svelte
<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema, NumSchema } from '@/schemas/common';

export const ButtonPropsSchema = v.strictObject({
  /** Variant style. @values default, secondary, destructive, outline */
  variant: v.optional(StrSchema),
});
export type ButtonProps = v.InferOutput<typeof ButtonPropsSchema>;
</script>
```
- Schema name: `{ComponentName}PropsSchema`
- Type name: `{ComponentName}Props`
- ALWAYS `v.strictObject()` (never `v.object()`)
- ALWAYS `StrSchema` etc. from `@/schemas/common` (never bare `v.string()`)
- ALWAYS JSDoc on every field with `@values a, b, c` tag (comma-space separated)

**Block 2**: `<script lang="ts">` — component logic
```svelte
<script lang="ts">
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps: ButtonProps = $props();
const validated: ButtonProps = $derived.by(() => {
  const rawProps: ButtonProps = stripSvelteProps(allProps);
  const result = safeParse(ButtonPropsSchema, rawProps);
  if (!result.ok) throw result.error;
  return result.data as ButtonProps;
});
</script>
```
- **UI is the boundary exception to the Result pattern** — components throw on invalid props (Svelte can't propagate Result through `$derived`)
- Always validate via `safeParse` + `stripSvelteProps` (drops `$$slots`, `children`, etc.)

### `lens.ts` — REQUIRED
```ts
import type { LensMeta } from '../lens/types.js';
export const meta: LensMeta = {
  category: 'form',           // one of 32 categories
  tags: ['button', 'tv-variant'],
  description: 'Clickable button with multiple style variants and sizes.',
};
```

### Lens categories (32)
`a11y`, `admin`, `animation`, `commerce`, `content`, `data-display`, `date-time`, `desktop`, `devtools`, `disclosure`, `display`, `education`, `feedback`, `finance`, `form`, `gaming`, `healthcare`, `iot`, `layout`, `legal`, `lens`, `maps`, `marketing`, `media`, `mobile`, `navigation`, `overlay`, `scheduling`, `social`, `typography`, `utility`

### Common tags
`shadcn`, `tv-variant`, `compound`, `interactive`, `app-specific`, `animated`

## The barrel (compound pattern, e.g. `dialog/index.ts`)
```ts
import Root from './dialog.svelte';
import Portal from './dialog-portal.svelte';
import Title from './dialog-title.svelte';
// ...

export {
  Root, Title, Portal, // ...           ← internal aliases
  Root as Dialog,                       ← canonical alias
  Title as DialogTitle,
  Portal as DialogPortal,
  // ...
};
```
Allows BOTH usage styles:
- `import * as Dialog from '@/ui/dialog'; <Dialog.Root />`
- `import { Dialog, DialogTitle } from '@/ui/dialog'; <Dialog />`

## Representative slice — patterns by component shape

### Single-file (~no sub-parts): `switch`, `toast`
```
switch.svelte, lens.ts, index.ts
```

### Compound (Bits-UI wrapper): `dialog`, `popover`, `sheet`, `tooltip`, `command`, `dropdown-menu`, `tabs`, `navigation-menu`
- Multiple sub-component files (e.g. dialog has 9: close/content/description/footer/header/overlay/portal/title/trigger)
- `index.ts` barrel re-exports both Root/Sub aliases AND PascalCase canonical names
- `examples/` with hand-written usage examples (most have this)

### With local types/variants: `button`
- `types.ts` (separate from the .svelte file) — exports `buttonVariants` (TV helper), `ButtonProps`, `ButtonSize`, `ButtonVariant`
- `button.svelte`, `button.svelte.d.ts` (generated by svelte-check)
- `index.ts` re-exports + aliases `Root as Button`

### Stateful with context: `sidebar`
- 19 sub-components (most complex compound)
- `context.svelte.ts` — Svelte 5 runes context store
- `context.svelte.test.ts` — paired test
- `context-test-harness.svelte` — test fixture
- `constants.ts` — shared constants

### Form helpers: `form`
- `form-button.svelte`, `form-description.svelte`, `form-element-field.svelte`, `form-field-errors.svelte`, `form-field.svelte`, `form-fieldset.svelte`, `form-label.svelte`, `form-legend.svelte`
- Wraps `formsnap`/`sveltekit-superforms`

### Data: `table`
- `table-body`, `table-caption`, `table-cell`, `table-footer`, `table-head`, `table-header`, `table-row`, `table.svelte`
- Backed by `@tanstack/table-core`

### Calendar (most internal moving parts)
- 17 sub-components (`calendar-caption`, `calendar-cell`, `calendar-day`, `calendar-grid-*`, `calendar-month-select`, `calendar-year-select`, etc.)
- Uses `@internationalized/date`

## The Lens system (`src/lens/`)
Internal infrastructure that introspects components for auto-documentation:
- `extract-props.ts` — parses `<script module>` blocks to build PropsTable
- `extract-deps.ts`, `extract-sizes.ts`, `extract-tokens.ts`, `extract-variants.ts`
- `detect-accessibility.ts`, `detect-browser-support.ts`
- `lens-utils.ts` — `stripSvelteProps` lives here (referenced from every component)
- `types.ts` — `LensMeta` type, category schema
- `lint-lens.test.ts` — validates ALL components conform to RULES.md
- Visual components: `CompatRuleList.svelte`, `CompatTooltip.svelte`
- Utility: `clipboard.ts`, `export-utils.ts`

## Patterns summary
- **No global barrel** — every component imported via its folder
- **Compound pattern** for multi-part (Dialog.Root + Dialog.Trigger + Dialog.Content)
- **TV-variant** (`tailwind-variants`) for style variants
- **shadcn-svelte heritage** — most components originate from shadcn-svelte
- **Lens-mandatory** — every component MUST have `lens.ts` or it fails `lint-lens.test.ts`
- **Props validated at the UI boundary** via `safeParse` (throws on invalid)

## Sample components from the 873
about-dialog, accordion, accordion-menu, achievement-badge, action-sheet, activity-bar, activity-feed, address-autocomplete, admin-layout, ai-chat, air-quality, alert, alert-dialog, amortization-table, analytics-card, anchor-navigation, animated-background, animated-beam, animated-card, app-bar, app-shell, app-sidebar, area-chart, article-card, audio-player, audio-visualizer, autocomplete, ... (range from common shadcn primitives to specialty patterns).

## When investigating a specific component
- Read `<component-name>/lens.ts` — gives you category + intent
- Read `<component-name>/index.ts` — gives you the public API
- Read `<component-name>/examples/*.svelte` if present — usage patterns
- The `<script module>` block in the main `.svelte` file holds the prop schema
