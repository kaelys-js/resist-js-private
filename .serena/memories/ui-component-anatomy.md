# `@/ui` component anatomy — representative slice

> Captured 2026-05-05. Path: `packages/shared/ui/src/`. Establishes the shadcn-svelte fork's authoring conventions via 15 representative components. Companion to `ui-overview` (873-folder index + `RULES.md` summary). Do NOT enumerate all 873 here.

## Read first
- `packages/shared/ui/RULES.md` — the authoring contract (directory layout, two-script pattern, prop validation, `lens.ts` requirement, 32 categories, `@values` JSDoc tag).
- `packages/shared/ui/src/utils.ts` — `cn(...)` (tailwind-merge wrapper) and the type helpers `WithoutChild`, `WithoutChildren`, `WithoutChildrenOrChild`, `WithElementRef`.

## 15 representative components (covering primitives + overlays + forms + data + layout)

### Single-file components

#### `input/`
Files: `input.svelte`, `lens.ts`, `index.ts` (3 files total).
- The minimal shape: one `.svelte` file, one barrel, one Lens manifest.
- `index.ts` exports `Root` + alias `Root as Input`.

### Compound components — Bits-UI wrappers

These wrap a `bits-ui` primitive (Radix-equivalent) and ship 5–11 sub-component files. The barrel exports BOTH internal Sub-aliases (`Root`, `Title`, `Portal`, ...) AND the canonical `Foo*` aliases (`Dialog`, `DialogTitle`, `DialogPortal`, ...).

#### `dialog/` (10 sub-files)
- Files: `dialog.svelte` + `dialog-{close,content,description,footer,header,overlay,portal,title,trigger}.svelte` + `lens.ts` + `index.ts` + `examples/`.
- `index.ts` re-exports the 10 sub-components plus 10 `Dialog*` PascalCase aliases.
- `lens.ts` shape:
  ```ts
  export const meta: LensMeta = { category: 'overlay', tags: ['dialog', 'modal', 'popup', 'window', 'compound'], description: '...' };
  const examples: LensExample[] = [{ name: 'basic', title: '...', description: '...' }, { name: 'with-form', title: '...', description: '...' }];
  export default examples;
  ```
- `examples/{basic,with-form}.svelte` exist as hand-written usage demos that Lens renders.

#### `sheet/` (8 sub-files)
- Same shape as Dialog: `sheet.svelte` + `sheet-{close,content,description,footer,header,overlay,portal,title,trigger}.svelte` + `lens.ts` + `index.ts` + `examples/`.
- Bottom/side-drawer variant of Dialog (`vaul-svelte` heritage).

#### `alert-dialog/` (10 sub-files, NO examples dir)
- Like Dialog but with `alert-dialog-{action,cancel,...}` instead of `close`. Action/cancel split is the Radix alert-dialog convention (Action confirms, Cancel dismisses; both close the dialog).

#### `dropdown-menu/` (16 sub-files, has examples dir)
- Most complex menu compound: `dropdown-menu.svelte` + 16 sub-components including `checkbox-group`, `checkbox-item`, `radio-group`, `radio-item`, `sub`, `sub-content`, `sub-trigger`, `group-heading`, `shortcut`.
- `dropdown-menu-shortcut.svelte` is a styled inline `<span>` for displaying keyboard hints; not a Bits-UI primitive.

#### `command/` (10 sub-files, has examples dir)
- `command.svelte` + `command-{dialog,empty,group,input,item,link-item,list,loading,separator,shortcut}.svelte`.
- Wraps `cmdk-sv` (or local cmdk port). `command-link-item.svelte` is a router-aware variant (renders `<a>` instead of `<div>`).
- Empty-group filtering is built in (cmdk auto-hides empty groups).

#### `popover/` (5 sub-files, has examples dir)
- `popover.svelte` + `popover-{close,content,portal,trigger}.svelte`.

#### `tooltip/` (5 sub-files, has examples dir)
- `tooltip.svelte` + `tooltip-{content,portal,provider,trigger}.svelte`.
- `tooltip-provider.svelte` is the wrapping context provider — must wrap any subtree that uses tooltips. The Lens `compile-standalone` API specifically inserts this provider as a wrapper around any rendered component (see `storylyne-api`).

#### `tabs/` (4 sub-files)
- `tabs.svelte` + `tabs-{content,list,trigger}.svelte`.

#### `navigation-menu/` (8 sub-files)
- `navigation-menu.svelte` + `navigation-menu-{content,indicator,item,link,list,trigger,viewport}.svelte`.

### With local types/variants

#### `button/`
Files: `button.svelte`, `button.svelte.d.ts` (generated), `index.ts`, `lens.ts`, `types.ts`.

The `types.ts` file is the canonical pattern for components that export type aliases AND a `tv()` variant config:
- **`buttonVariants = tv({...})`** — tailwind-variants config with `variants.variant` (`default`/`destructive`/`outline`/`secondary`/`ghost`/`link`) and `variants.size` (`default`/`sm`/`lg`/`icon`/`icon-sm`/`icon-lg`).
- **`ButtonVariant = VariantProps<typeof buttonVariants>['variant']`** — type derived from the TV config.
- **`ButtonSize = VariantProps<typeof buttonVariants>['size']`**.
- **`ButtonProps = WithElementRef<HTMLButtonAttributes> & WithElementRef<HTMLAnchorAttributes> & { variant?: ButtonVariant; size?: ButtonSize }`** — supports both `<button>` and `<a>` rendering (the component branches on `href` prop).

**Why `types.ts` not inline `<script module>`**: a long file-private comment in `types.ts` explains:
> Defined in a regular `.ts` file (instead of inside `button.svelte`'s `<script module>`) so that `button/index.ts` can re-export them via standard TS module resolution. This sidesteps the workspace-level `*.svelte` ambient declaration in `src/svelte.d.ts`, whose non-standard `export var [key: string]: unknown` syntax is accepted by tsgo but not by svelte-check's named-import resolution for downstream packages such as storylyne-editor.

This is the rationale for any component that ships a `types.ts`. Other components (Dialog, Sheet, etc.) keep their schema inline in `<script module>` because they don't need to export types.

`index.ts` re-exports `Root` + `Root as Button`, `buttonVariants`, `ButtonProps`, `ButtonSize`, `ButtonVariant`, plus a `Props` alias for the (older) `Props` import style.

### Form helpers

#### `form/` (8 sub-files, no examples)
- `form-{button,description,element-field,field-errors,field,fieldset,label,legend}.svelte` + `index.ts` + `lens.ts`.
- Wraps `formsnap` + `sveltekit-superforms`.
- `index.ts` imports `Control` from `formsnap` directly (`import * as FormPrimitive from 'formsnap'; const { Control } = FormPrimitive;`) — the only sub-component NOT defined in this dir.
- Exports both internal aliases (`Field`, `Control`, `Label`, `Button`, `FieldErrors`, `Description`, `Fieldset`, `Legend`, `ElementField`) and `Form*` PascalCase canonical names.

### Data

#### `table/` (8 sub-files, has examples)
- `table.svelte` + `table-{body,caption,cell,footer,head,header,row}.svelte`.
- Backed by `@tanstack/table-core` (devDep) — the wrapper just provides the styled DOM scaffolding; consumers wire up table state with TanStack APIs.

### Layout (most internal moving parts)

#### `sidebar/` (28 sub-files + 4 supporting files = 32 total)
Files: `sidebar.svelte` + `sidebar-{content,footer,group-action,group-content,group-label,group,header,input,inset,menu-action,menu-badge,menu-button,menu-item,menu-skeleton,menu-sub-button,menu-sub-item,menu-sub,menu,provider,rail,separator,trigger}.svelte` + `context.svelte.ts` + `context.svelte.test.ts` + `context-test-harness.svelte` + `constants.ts` + `index.ts` + `lens.ts`.

- **`context.svelte.ts`** — a Svelte 5 runes context store. Pattern: factory creates an instance with `$state`-backed reactive state; `useSidebar()` retrieves via `getContext`. Provides `state.open`, `state.openMobile`, `state.toggle()`, etc.
- **`context.svelte.test.ts`** — paired test running through the `ui-svelte` vitest project.
- **`context-test-harness.svelte`** — test fixture component that provides the context for unit tests.
- **`constants.ts`** — shared layout constants (cookie names, default sizes).
- `index.ts` re-exports 22 sub-components plus PascalCase aliases plus `useSidebar` (the only non-component export).

This is the **most complex compound component** in `@/ui` and serves as the template for any future stateful compound (calendar uses a similar approach but with `@internationalized/date` instead of a custom store).

### Calendar (most internal moving parts among Bits-UI wrappers)

#### `calendar/` (18 sub-files)
- `calendar.svelte` + `calendar-{caption,cell,day,grid-body,grid-head,grid-row,grid,head-cell,header,heading,month-select,month,months,nav,next-button,prev-button,year-select}.svelte`.
- Uses `@internationalized/date` for locale-aware date math (Hebrew/Hijri/Indian/Persian calendars supported).

## Component file structure (every Svelte component)

Per `RULES.md`:

### Block 1: `<script module lang="ts">` — Schema + types
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

Rules:
- Schema name: `{ComponentName}PropsSchema` (PascalCase).
- Type name: `{ComponentName}Props` derived via `v.InferOutput<typeof Schema>`.
- ALWAYS `v.strictObject()` (never `v.object()` — silently ignores unknown keys).
- ALWAYS `StrSchema`/`BoolSchema`/`NumSchema` from `@/schemas/common` (never bare `v.string()`).
- ALWAYS `@values` JSDoc tag with comma-space separated example values.

### Block 2: `<script lang="ts">` — Component logic
```svelte
<script lang="ts">
/** One-line component summary. */
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

Rules:
- **UI is the boundary exception to the Result pattern** — components throw on invalid props (Svelte's `$derived` can't carry `Result<T>`).
- ALWAYS `safeParse + stripSvelteProps` (drops Svelte-internal `$$slots`/`children`).
- ALWAYS `as ComponentProps` cast at end (DeepReadonly→writable cast is safe — props are read-only in templates).
- The JSDoc on the `<script lang="ts">` tag (NOT module) is extracted by `extractComponentDescription()` in `lens/`. It becomes a search keyword in CommandSearch.

## `lens.ts` — REQUIRED for every component

```ts
import type { LensExample, LensMeta } from '../lens/types.js';
export const meta: LensMeta = {
  category: 'overlay',           // one of 32 — see ui-overview
  tags: ['dialog', 'modal', 'compound'],
  description: 'Modal dialog window with backdrop overlay.',
};

const examples: LensExample[] = [
  { name: 'basic', title: 'Basic Dialog', description: '...' },
  { name: 'with-form', title: 'Form Dialog', description: '...' },
];
export default examples;
```

- `examples` is the **default export** when present (matches a Lens convention for example registration).
- Examples reference files in the component's `examples/` directory (`./examples/basic.svelte`, etc.).
- The `lint-lens.test.ts` test in `src/lens/` validates: every component has `lens.ts`, every declared example has a matching file, every category is one of the 32, every required field is present.

## `index.ts` barrel — compound pattern

For multi-part components (Dialog, Sheet, Sidebar, etc.):

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

This allows BOTH usage styles:
- `import * as Dialog from '@/ui/dialog'; <Dialog.Root />`
- `import { Dialog, DialogTitle } from '@/ui/dialog'; <Dialog />`

Some barrels also export `Props as ComponentNameProps` for consumers of the older `Props` import convention.

## `utils.ts` re-exports

`@/ui/utils` exports the Tailwind utility:
- `cn(...inputs: ClassValue[]): Str` — `tailwind-merge` + `clsx` wrapper. Resolves Tailwind conflicts (last utility wins).

Plus type helpers used by every wrapped component:
- `WithoutChild<T>` — strips `child?` snippet prop.
- `WithoutChildren<T>` — strips `children?` snippet prop.
- `WithoutChildrenOrChild<T>` — strips both.
- `WithElementRef<T, U>` — adds `ref?: U | null` (e.g., `WithElementRef<HTMLButtonAttributes>`).

These are used to compose props types like `ButtonProps = WithElementRef<HTMLButtonAttributes> & WithElementRef<HTMLAnchorAttributes> & { variant?: ButtonVariant; size?: ButtonSize }`.

## Tailwind-variants (`tv()`) convention

The shadcn-svelte heritage uses `tailwind-variants` for variant systems:
```ts
const buttonVariants = tv({
  base: 'inline-flex items-center ...',     // base classes
  variants: {
    variant: { default: '...', secondary: '...' },
    size: { default: 'h-9', sm: 'h-8' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
```

Components use `cn(buttonVariants({ variant, size }), className)` to merge base+variant classes with consumer-supplied `className`.

## Testing convention

Every test runs in TWO vitest projects:
- `ui` (Node) — pure-TS tests for utils, lens helpers, schema parsing.
- `ui-svelte` (jsdom + svelte plugin + svelteTesting) — `*.svelte.test.ts` tests that mount components.

Test files paired with Svelte sources (`context.svelte.test.ts` next to `context.svelte.ts`) automatically pick the right project via filename suffix.
