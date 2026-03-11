# Shared UI Component Rules

Rules for creating shared components in `packages/shared/ui/src/` that work correctly
with the Lens automated documentation system.

## Directory Structure

```
packages/shared/ui/src/
  <component-name>/           # kebab-case directory name
    ComponentName.svelte      # PascalCase primary component
    sub-part.svelte           # kebab-case sub-components (compound patterns)
    lens.ts                   # Lens metadata (REQUIRED)
    index.ts                  # Barrel re-export (optional, compound components only)
    examples/                 # Hand-written examples (optional)
      basic.svelte            # kebab-case filename stem
      with-form.svelte
```

**Naming rules:**
- Directory: `kebab-case` matching the component concept (e.g., `button`, `alert-dialog`)
- Primary `.svelte` file: `PascalCase` (e.g., `Button.svelte`, `AlertDialog.svelte`)
- Sub-components: `kebab-case` (e.g., `dialog-content.svelte`, `command-item.svelte`)
- `lens.ts` and `index.ts`: always lowercase

## Component File Structure

Every Lens-integrated component follows this two-script-block pattern:

### Block 1: `<script module lang="ts">` — Schema & Types

This block is parsed by `extract-props.ts` to generate the Props table.

```svelte
<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema, NumSchema } from '@/schemas/common';

export const MyComponentPropsSchema = v.strictObject({
  /** Human-readable description of the prop. @values example1, example2, example3 */
  propName: StrSchema,
  /** Description of optional prop. @values true, false */
  optionalProp: v.optional(BoolSchema),
});
export type MyComponentProps = v.InferOutput<typeof MyComponentPropsSchema>;
</script>
```

**Rules:**
- Schema name: `{ComponentName}PropsSchema` (PascalCase, matching the component)
- Type name: `{ComponentName}Props` derived via `v.InferOutput<typeof Schema>`
- ALWAYS use `v.strictObject()` — never `v.object()` (silently ignores unknown keys)
- ALWAYS use Valibot primitive schemas (`StrSchema`, `BoolSchema`, `NumSchema`) — never bare `v.string()`, `v.boolean()`, `v.number()`
- ALWAYS add a JSDoc comment to every field — undocumented fields are violations
- ALWAYS add `@values` tag with comma-space separated example values for non-trivial props
- The `@values` tag goes at the END of the JSDoc comment: `/** Description. @values a, b, c */`
- Export BOTH the schema and the type — Lens reads the schema for prop extraction

### Block 2: `<script lang="ts">` — Component Logic

```svelte
<script lang="ts">
/**
 * One-line component summary.
 *
 * Extended description of what the component does, when to use it,
 * and any important behavioral notes.
 *
 * @example
 * ```svelte
 * <MyComponent propName="hello" />
 * ```
 */
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps: MyComponentProps = $props();
const validated: MyComponentProps = $derived.by(() => {
  const rawProps: MyComponentProps = stripSvelteProps(allProps);
  const result = safeParse(MyComponentPropsSchema, rawProps);
  if (!result.ok) throw result.error;
  // DeepReadonly from safeParse is safe to cast — props are read-only in templates
  return result.data as MyComponentProps;
});
</script>
```

**Rules:**
- The JSDoc block on the `<script lang="ts">` tag is extracted by `extractComponentDescription()` and used as a search keyword in the global command search
- ALWAYS validate props with `safeParse` — this is the UI boundary exception to the Result pattern (components throw on invalid props because Svelte can't propagate `Result` from `$derived`)
- ALWAYS use `stripSvelteProps()` to remove Svelte-internal keys (`$$slots`, `children`, etc.) before validation
- ALWAYS cast the result with `as MyComponentProps` with the comment explaining DeepReadonly
- Use `$derived.by()` for the validated props — ensures re-validation on prop changes
- All type annotations required — `Str`, `Bool`, `Num` from `@/schemas/common`, never bare `string`/`boolean`/`number`

## The `@values` JSDoc Tag

The `@values` tag provides example values that Lens uses for:
1. Mock data generation in the component renderer (variant previews)
2. Search keywords in the global command search
3. "Accepts" column in the PropsTable tooltip

**Syntax:** `@values value1, value2, value3` (comma-space separated)

```typescript
/** The visual style variant. @values default, secondary, destructive, outline */
variant: v.optional(StrSchema),

/** Maximum width in pixels. @values 100, 200, 400 */
maxWidth: v.optional(NumSchema),

/** Whether to show the close button. @values true, false */
closable: v.optional(BoolSchema),

/** Import path to display. @values @/ui/button, @/ui/dialog, @/ui/input */
text: StrSchema,
```

**Rules:**
- Every non-trivial prop MUST have `@values` — props without `@values` get generic mock data
- Values are comma-space (`, `) separated — NOT bare comma (`,`)
- For boolean props: `@values true, false`
- For string enums/picklists: list all valid options
- For free-text strings: provide 2-3 representative examples
- For numbers: provide representative values showing the range
- For Snippet/Component/function props: `@values <div>content</div>` or similar placeholder
- `@values` must appear on the SAME LINE as the closing `*/` of the JSDoc

## The `lens.ts` Metadata File

Every component directory MUST have a `lens.ts` file:

```typescript
import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'form',
  tags: ['shadcn', 'tv-variant'],
  description: 'Clickable button with multiple style variants and sizes.',
};
```

**Rules:**
- Export a `meta` constant typed as `LensMeta`
- `category` must be one of: `display`, `form`, `layout`, `lens`, `navigation`, `overlay`, `utility`
- `tags` must have at least one entry
- `description` is a single sentence, no period optional

### Categories

| Category | Use for |
|-----------|---------|
| `display` | Read-only visual elements (badge, avatar, card, table, chart) |
| `form` | Interactive input elements (button, input, select, checkbox, slider) |
| `layout` | Structural containers (sidebar, accordion, tabs, separator, resizable) |
| `lens` | Lens system internal components (lens-header, lens-error, lens-props-table) |
| `navigation` | Navigation elements (breadcrumb, pagination, menubar, app-sidebar) |
| `overlay` | Floating/modal elements (dialog, tooltip, popover, dropdown-menu, sheet) |
| `utility` | Functional helpers (mode-toggle, copy-button, language-switcher) |

### Tags

Common tags and when to use them:

| Tag | Meaning |
|------|---------|
| `shadcn` | Component originates from shadcn-svelte |
| `tv-variant` | Uses `tailwind-variants` `tv()` for style variants |
| `compound` | Multi-part component with sub-components (e.g., Dialog.Root + Dialog.Content) |
| `interactive` | Has user interaction beyond basic click |
| `app-specific` | Designed for a specific app layout, not general-purpose |
| `animated` | Has animations or transitions |

## Examples Directory

For compound components or components that need hand-written demos:

```typescript
// lens.ts — with examples
import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['shadcn', 'compound'],
  description: 'Hover tooltip for additional context.',
};

const examples: LensExample[] = [
  {
    name: 'basic',
    title: 'Basic Tooltip',
    description: 'Tooltip appearing above the trigger on hover.',
  },
  {
    name: 'sides',
    title: 'Side Variants',
    description: 'Tooltip positioned on all four sides.',
  },
];

export default examples;
```

**Rules:**
- Each example `name` must match a file in `examples/<name>.svelte`
- `title` is human-readable, displayed as the example section heading
- `description` is optional, shown below the title
- Export examples as the default export
- Example `.svelte` files are self-contained demos — they render the component with representative props

## Tailwind Variants (TV) Pattern

For shadcn-style components using `tailwind-variants`:

```svelte
<script lang="ts" module>
import { type VariantProps, tv } from 'tailwind-variants';

export const buttonVariants = tv({
  base: '...',
  variants: {
    variant: {
      default: '...',
      secondary: '...',
      destructive: '...',
    },
    size: {
      default: '...',
      sm: '...',
      lg: '...',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
</script>
```

**Rules:**
- The `tv()` call is parsed by `extract-variants.ts` to generate the Variants section
- Each variant key becomes a separate variant card group in the Lens renderer
- `defaultVariants` are highlighted in the variant display
- Export the `tv()` result as `{componentName}Variants` (camelCase)
- Tag with `tv-variant` in `lens.ts`

## Props Extraction — What Gets Parsed

The `extract-props.ts` module parses component source to build the Props table.
Understanding what it reads helps write components that document correctly.

### What it reads from `<script module>`:
- `v.strictObject({...})` schema fields — field names become prop names
- JSDoc comments on each field — become the "Description" column
- `@values` tags — become mock values and search keywords
- `v.optional(...)` wrappers — mark props as optional
- Schema types — `StrSchema` → `Str`, `BoolSchema` → `Bool`, `NumSchema` → `Num`
- `v.picklist([...])` — lists valid values
- `v.array(...)` — shows array type
- Nested `v.strictObject()` inside fields — expanded into sub-field tooltips

### What it reads from `<script>` (instance):
- `$props()` destructuring — prop names, defaults, bindable status
- `$bindable()` calls — marks props as two-way bindable
- JSDoc comments on destructured props — alternative description source
- Type annotations — `Str`, `Bool`, etc.

### Cross-file resolution:
- When a prop type references a schema defined in another file (e.g., `LensMetaSchema`),
  the extractor searches all `.ts` files in the UI package to resolve the type definition
- Named schema constants (e.g., `export const FooSchema = v.strictObject(...)`) are resolved
  and their fields are expanded into the type tooltip

## Dependencies Extraction

The `extract-deps.ts` module categorizes all `import` statements:

| Import path pattern | Category | Example |
|---------------------|----------|---------|
| `../` relative paths | **Internal** (UI Components) | `import Button from '../button/button.svelte'` |
| `@/` workspace aliases | **Workspace** | `import { safeParse } from '@/utils/result/safe'` |
| Everything else | **External** (npm packages) | `import * as v from 'valibot'` |

## Result Pattern in Components (UI Boundary Exception)

Components are a UI boundary — they cannot propagate `Result<T>` because Svelte's
reactive system requires values, not Result wrappers. The approved pattern is:

```typescript
// In $derived.by() — throw on validation failure
const validated = $derived.by(() => {
  const result = safeParse(Schema, rawProps);
  if (!result.ok) throw result.error;
  return result.data as MyProps;
});
```

This is the ONLY place where throwing is acceptable. For all other operations
(data fetching, processing, transformations), use the standard Result pattern:

```typescript
const result = safeParse(Schema, data);
if (!result.ok) return result;  // propagate error
```

## Common Mistakes

| Mistake | Why it breaks Lens |
|---------|-------------------|
| Using `v.object()` instead of `v.strictObject()` | Silently ignores unknown keys, defeats schema safety |
| Missing JSDoc on schema fields | Props table shows empty description |
| Missing `@values` tag | Generic/empty mock data in variant previews |
| Bare `v.string()` instead of `StrSchema` | Inconsistent type display, violates project conventions |
| Missing `lens.ts` file | Component won't appear in sidebar or search |
| Wrong `category` in `lens.ts` | Component grouped incorrectly in sidebar |
| No `export` on schema/type | Props extraction can't find the schema |
| Missing `stripSvelteProps()` call | Validation fails on Svelte-internal `$$` keys |
| `@values` with bare comma (no space) | Values split incorrectly — use `, ` separator |
| Missing component JSDoc in `<script lang="ts">` | No description in global search results |
| Example `name` doesn't match filename | Example section renders but can't load the component |
| Missing `tags` in `lens.ts` (empty array) | Validation fails — at least one tag required |

## Checklist for New Components

- [ ] Directory is kebab-case under `packages/shared/ui/src/`
- [ ] Primary `.svelte` file is PascalCase
- [ ] `<script module>` has `v.strictObject()` schema with exported type
- [ ] Every schema field has JSDoc with `@values` tag
- [ ] `<script>` has component-level JSDoc description
- [ ] Props validated with `safeParse` + `stripSvelteProps`
- [ ] `lens.ts` exists with valid `category`, `tags` (1+), and `description`
- [ ] All types use Valibot aliases (`Str`, `Bool`, `Num`) — no bare TypeScript builtins
- [ ] If compound: `index.ts` barrel and optional `examples/` directory
- [ ] If using `tv()`: exported variants constant, tagged `tv-variant`
