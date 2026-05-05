# Svelte 5 Conventions — cross-cutting

> Captured 2026-05-05. Svelte 5 with runes + SvelteKit 2.53. ~30 lint rules under `svelte5/*`. Stores live in `.svelte.ts` files. Production components paired with test wrappers. Bits-UI / paneforge / vaul-svelte for primitives.

## Svelte 5 runes (mandatory — no legacy syntax)

| Rune | Purpose | Usage |
|------|---------|-------|
| `$state` | Reactive state | `let count = $state(0)`; module-level `let _registry = $state(...)` for store singletons |
| `$state.frozen(...)` | Reactive but non-deep-tracked | For large frozen Result data |
| `$derived(...)` | Derived value (sync expression) | `const double = $derived(count * 2)` |
| `$derived.by(() => ...)` | Derived from a function (multi-step) | `const items = $derived.by(() => { /* ... */ return arr; })` |
| `$effect(() => ...)` | Side effects on dep change | `$effect(() => { document.title = title; })` |
| `$props()` | Props destructuring | `let { foo = 'default' }: Props = $props()` |
| `$bindable(default)` | Two-way bindable prop | `let { open = $bindable(false) }: Props = $props()` |

Lint rules (svelte5 category — 18 rules):
- `svelte5/no-create-event-dispatcher` — use callback props instead
- `svelte5/no-effect-mutation` — never mutate `$state` from inside `$effect`
- `svelte5/no-inline-styles` — use class+CSS instead
- `svelte5/no-legacy-event-handlers` — use `onclick={...}` (NOT `on:click={...}`)
- `svelte5/no-legacy-props` — use `$props()` (NOT `export let`)
- `svelte5/no-legacy-reactive-statements` — use `$derived` (NOT `$:`)
- `svelte5/no-legacy-slots` — use snippets `{#snippet}` (NOT `<slot>`)
- `svelte5/no-reactive-class-properties` — class properties cannot be reactive in Svelte 5
- `svelte5/no-rest-props-misuse` — `...restProps` must spread on a single element
- `svelte5/no-state-in-module-context` — `$state` in `<script module>` blocks forbidden (compiles to module-level reactive state which leaks across instances)
- `svelte5/no-untrack-misuse` — `untrack()` used incorrectly (e.g., wrapping reads when you meant writes)
- `svelte5/prefer-derived-by` — multi-statement `$derived` should use `$derived.by(() => ...)` for readability
- `svelte5/prefer-derived-over-effect` — pure derivations should use `$derived`, not `$effect` (avoids stale closures + multiple re-runs)
- `svelte5/require-bindable-for-bind` — props consumed via `bind:` must be declared `$bindable()`
- `svelte5/require-each-key` — `{#each}` blocks need a `(key)` expression
- `svelte5/require-effect-cleanup` — async/timer effects need a cleanup return
- `svelte5/require-snippet-typing` — snippets in `$props()` must be typed (`Snippet<[T]>`)
- `svelte5/component-naming` — component file matches PascalCase identifier

## File extensions

| File type | Extension | Notes |
|-----------|-----------|-------|
| Svelte component | `Foo.svelte` | PascalCase per `naming/svelte-file-pascal-case` lint rule |
| Component sub-parts | `foo-bar.svelte` | Inside compound components (e.g., `dialog-content.svelte`); kebab-case |
| Pure TS module | `bar.ts` | kebab-case per `naming/ts-file-kebab-case` |
| **Svelte 5 runes-using TS module** | `bar.svelte.ts` | REQUIRED extension when runes are used in non-component code; lint rule `typescript/require-svelte-ts-extension` enforces this |
| Test files | `bar.test.ts` / `bar.svelte.test.ts` | `.svelte.test.ts` for tests of `.svelte.ts` modules |

The `.svelte.ts` extension activates Svelte's preprocessor on the file, enabling runes outside of `.svelte` components. Without it, runes throw at runtime.

Examples in storylyne editor:
- `src/lib/stores/editor-state.svelte.ts` — module-level `$state` singleton
- `src/lib/stores/debug-state.svelte.ts`
- `src/lib/stores/i18n.svelte.ts`
- `src/lib/stores/keyboard-shortcuts-store.svelte.ts`
- `src/lib/stores/lens-notifications.svelte.ts`

In `@/utils/devtools`:
- `devtools-api.svelte.ts`
- `init.svelte.ts`
- `debug-state-store.svelte.ts`
- `state-logger.svelte.ts`

## Two-script-block pattern (`@/ui` components)

```svelte
<script module lang="ts">
  /**
   * Public types and the `buttonVariants` value live here so
   * that `button/index.ts` can re-export them via standard TS module
   * resolution (avoiding the wildcard `*.svelte` ambient declaration).
   */
  export {
    buttonVariants,
    type ButtonVariant,
    type ButtonSize,
    type ButtonProps,
  } from './types.js';
</script>

<script lang="ts">
  import { cn } from '../utils.js';
  import { buttonVariants, type ButtonProps } from './types.js';

  let {
    class: className,
    variant = 'default',
    size = 'default',
    ref = $bindable(null),
    href,
    type = 'button',
    disabled,
    children,
    ...restProps
  }: ButtonProps = $props();
</script>

{#if href}
  <a bind:this={ref} ...><{@render children?.()}</a>
{:else}
  <button bind:this={ref} ...>{@render children?.()}</button>
{/if}
```

- **Block 1** (`<script module>`): re-exports types/constants from a sibling `types.ts` file (kept separate to avoid the `*.svelte` ambient module shadowing).
- **Block 2** (`<script>`): instance logic, props destructure with `$props()`, render logic.

For `@/ui` components, the `<script module>` block can also hold the inline prop schema (PropsSchema + PropsType) for components without a sibling `types.ts`. Lens introspects both via `extractProps` (lens-utils.ts).

## Snippet patterns (replace slots)

```svelte
<!-- Parent component -->
<SharedAppSidebar appName="..." navItems={...}>
  {#snippet content()}
    <Sidebar.Group>...</Sidebar.Group>
  {/snippet}
  {#snippet footer()}
    <NavProject {project} />
  {/snippet}
</SharedAppSidebar>
```

```typescript
// Shared component declares snippet props
type AppSidebarProps = {
  content?: Snippet;
  footer?: Snippet;
  // Snippets with parameters: Snippet<[Item, Num]>
};
let { content, footer }: AppSidebarProps = $props();
```

```svelte
<!-- Render snippet (might be undefined) -->
{@render content?.()}
{@render footer?.()}
```

`children` is the conventional name for the default snippet:
```typescript
let { children }: { children?: Snippet } = $props();
{@render children?.()}
```

Lint rule `svelte5/require-snippet-typing` requires explicit `Snippet<...>` typing.

## Singleton store pattern (storylyne editor)

The canonical store layout uses `createX/initX/useX`:

```typescript
// editor-state.svelte.ts
let _app: AppPreferences = $state({ ...APP_DEFAULTS });
let _features: FeatureFlags = $state({ ...FEATURE_DEFAULTS });

// Singleton management
let _singleton: EditorStore | null = null;

export function createEditorStore(): Result<EditorStore> {
  _app = { ...APP_DEFAULTS };
  _features = { ...FEATURE_DEFAULTS };
  load();   // try localStorage (non-fatal)

  const store: EditorStore = {
    get app(): AppPreferences { return _app; },
    get features(): FeatureFlags { return _features; },
    setAppName, setTheme, setMode, ..., setFeature, save, load,
  };

  // Shallow-freeze only the Result wrapper — the store contains $state proxies
  // that reject deep-freezing (Svelte's state_descriptors_fixed error).
  return Object.freeze({ ok: true as const, data: store, error: null }) as Result<EditorStore>;
}

export function initEditorStore(): EditorStore {
  const result = createEditorStore();
  if (!result.ok) throw new Error(`EditorStore creation failed: ${result.error.message}`);
  _singleton = result.data;
  return _singleton;
}

export function useEditorStore(): EditorStore {
  if (_singleton === null) {
    throw new Error('EditorStore not initialized — call initEditorStore() first');
  }
  return _singleton;
}
```

- `init*` is called once in `(app)/+layout.svelte` during `onMount`/initial setup.
- `use*` is called from any component that needs the store (throws if not initialized).
- The store interface uses `get` accessors (`get app(): AppPreferences { return _app; }`) so consumers always see the latest reactive `$state` value.
- All mutators return `Result<Void>` (no exceptions).
- `Object.freeze` only the Result wrapper — Svelte 5 reactive proxies reject deep-freeze (`state_descriptors_fixed` error).

Five storylyne stores follow this exact shape: `editor-state.svelte.ts`, `debug-state.svelte.ts` (wraps `@/utils/devtools/debug-state-store`), `i18n.svelte.ts`, `keyboard-shortcuts-store.svelte.ts`, `lens-notifications.svelte.ts`.

## Stripping `$state` proxies for serialization

Svelte 5 reactive proxies cannot be cloned via `structuredClone()` (throws `DataCloneError`). The workaround is JSON round-trip:

```typescript
// keyboard-shortcuts-store.svelte.ts
function stripStateProxies(registry: ShortcutRegistry): ShortcutRegistry {
  return JSON.parse(JSON.stringify(registry));   // strips proxies
}

update(id, key, modifiers): Result<Void> {
  const plain = stripStateProxies(_registry);
  const result = updateShortcut(plain, id, key, modifiers);   // pure fn over plain object
  if (!result.ok) return result;
  _registry = result.data;
  save();
  return okUnchecked<Void>(undefined);
}
```

Required when passing `$state` values to library code that expects plain objects.

## Test wrappers (storylyne pattern)

Every production component has a paired test wrapper in the same directory:

```
AppSidebar.svelte           ← production component (uses useEditorStore())
AppSidebarTest.svelte       ← test wrapper that calls initEditorStore() and renders <AppSidebar>
AppSidebarFlagsTest.svelte  ← variant test wrapper with feature flags toggled
```

- `TestProviders.svelte` (22 lines) wraps with required context providers.
- `FeatureFlagsTestProviders.svelte` (26 lines) — same plus FF context.
- Tests live in kebab-case `.test.ts` files (e.g., `app-sidebar.test.ts`, `nav-scenes.test.ts`).
- Tests use `@testing-library/svelte` + `vitest` with jsdom in the `storylyne-editor` vitest project.
- Vitest setup: `src/test-setup-component.ts` registers test mocks for `$app/environment`, `$app/navigation`, `$app/state` (from `src/test-mocks/`).

## bits-ui / paneforge / vaul-svelte composition

The `@/ui` library wraps `bits-ui` (headless primitives) with shadcn-svelte conventions. Compound components expose:

```typescript
// dialog/index.ts
import Root from './dialog.svelte';
import Portal from './dialog-portal.svelte';
import Title from './dialog-title.svelte';
// ...

export {
  Root, Title, Portal, Footer, Header, Trigger, Overlay, Content, Description, Close,
  // Public aliases
  Root as Dialog,
  Title as DialogTitle,
  Portal as DialogPortal,
  // ...
};
```

Both usage forms work:
- `import * as Dialog from '@/ui/dialog'; <Dialog.Root />`
- `import { Dialog, DialogTitle } from '@/ui/dialog'; <Dialog />`

Bits-UI primitives wrap as:
```svelte
<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  let { open = $bindable(false), ...restProps }: DialogPrimitive.RootProps = $props();
</script>

<DialogPrimitive.Root bind:open {...restProps} />
```

`paneforge` (Resizable) and `vaul-svelte` (Drawer) follow the same wrapper pattern.

## Locale store integration (`@/locale/svelte`)

```typescript
// i18n.svelte.ts (storylyne)
import { createLocaleRegistry, createLocaleStore } from '@/locale/svelte';
import { EditorLocaleSchema } from '$lib/locales/schema';

const locales = /* ... import.meta.glob for locale files ... */;
const registry = createLocaleRegistry({
  schema: EditorLocaleSchema,
  defaultLocale: 'en',
  locales,
  strict: false,
  fallbackLocales: ['en'],
});
export const localeStore = createLocaleStore(registry);
export { t } from '@/locale/t';   // re-export the convenience helper
```

In components:
```svelte
<script lang="ts">
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  // Reactive — re-renders on locale change:
  const settings: Str = $derived(t(localeStore.t.common.settings, 'Settings'));
</script>
```

`localeStore.t.*` is the runtime tree of locale functions. `t(fn, fallback)` is a UI-boundary helper that calls the locale function and falls back on error.

## Component prop validation (UI library)

```svelte
<script lang="ts">
  const allProps: ButtonProps = $props();
  const validated: ButtonProps = $derived.by(() => {
    const rawProps: ButtonProps = stripSvelteProps(allProps);
    const result = safeParse(ButtonPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    return result.data as ButtonProps;
  });
</script>
```

- **UI is the boundary exception to the no-throw rule** — components throw on invalid props because Svelte can't propagate `Result` through `$derived`.
- `stripSvelteProps(props)` (from `@/ui/lens/lens-utils`) drops Svelte-internal props like `children`, `$$slots`.
- This pattern is enforced by the `lint-lens.test.ts` test (every `@/ui` component must conform).

## Resizable sidebar pattern (paneforge)

```typescript
// (app)/+layout.svelte (storylyne)
const SIDEBAR_DEFAULT_PX: Num = 288;

function getInitialSidebarPercent(): Num {
  const stored = globalThis.localStorage?.getItem(storageKey('sidebar-px'));
  if (stored) {
    // Clean PaneForge's internal key to prevent stale data
    globalThis.localStorage?.removeItem(`paneforge:${STORAGE_PREFIX}:sidebar-width`);
    return Number(stored) / window.innerWidth;
  }
  return SIDEBAR_DEFAULT_PX / window.innerWidth;
}

const paneStorage: PaneGroupStorage = {
  getItem(): Str | null { /* convert px → percentage */ },
  setItem(/* ... */): void { /* convert percentage → px, persist */ },
};
```

PaneForge stores percentages but the user-facing measure is pixels — a custom `paneStorage` adapter converts on every read/write.

## Critical effects pattern: `untrack` for write-only deps

```typescript
$effect(() => {
  const mode = store.app.mode;       // read = dep
  untrack(() => {
    setMode(mode);                   // mode-watcher's $state read would re-trigger this $effect
    setTheme(store.app.theme);
  });
});
```

Without `untrack`, mode-watcher's internal `$state` reads would create circular dep. Lint rule `svelte5/no-untrack-misuse` rejects misuse but the legitimate use is exactly this: wrapping writes that internally read other state.

## SSR considerations

- `if (browser) { ... }` (from `$app/environment`) gates client-only code.
- Stores typically `init*()` only on the client.
- For pre-render SSR, server-supplied data flows via `data` prop from `+layout.server.ts` and is synchronously copied into the store during `init*` to prevent hydration flash.
- Cookies for theme/sidebar/locale are sanitized server-side (see storylyne-hooks memory) and applied via `transformPageChunk` HTML placeholders (`%lang%`, `%dir%`, `data-theme=""`, `data-sidebar-width=""`).
