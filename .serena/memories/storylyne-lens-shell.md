# `@storylyne/editor` — Lens documentation shell

> Captured 2026-05-05. Path: `packages/products/storylyne/editor/src/routes/(testing)/+layout.svelte`. **3,585 lines** — the largest single Svelte component in the codebase. Renders the Lens documentation system that introspects all 873 `@/ui` components. Companion to `storylyne-routes` and `storylyne-overview`.

## What this file is

The `(testing)` route group's layout. Sits under the minimal root layout (`src/routes/+layout.svelte` — 15 lines, CSS-only) and provides its own complete UI shell — sidebar + breadcrumb + search + notifications + toaster — independent of the editor app's chrome.

The editor app's `(app)/+layout.svelte` is ~600 lines (the editor's main shell with resizable sidebar, dev toolbar, mode-watcher sync, streaming data resolution); this `(testing)/+layout.svelte` is **6× larger** because it bakes the entire Lens UI into a single layout file.

## Why intentionally bundled with the editor (not its own product)

- Lens needs to render real components in the editor's CSS context (theme custom properties, font faces, layout primitives) to accurately preview them.
- Splitting it into its own SvelteKit app would either (a) duplicate the editor's app.css + theme system, or (b) require shared CSS injection — both worse than the current bundling.
- Production gating: the `(testing)` group has no auth/data dependencies; it sits in the same SvelteKit build but is not linked from production navigation. The editor's main app sidebar doesn't link to `(testing)` routes.

## Top-of-file imports + setup

### Eager component discovery via `import.meta.glob`

```ts
const allModules                = import.meta.glob('@/ui/*/*.svelte');                                          // lazy — 873 entries
const lensMetaModules           = import.meta.glob('@/ui/*/lens.ts',          { import: '*', eager: true });    // eager — metadata up front
const rawSources                = import.meta.glob('@/ui/*/*.svelte',          { query: '?raw', import: 'default', eager: true });  // eager — raw .svelte source for prop extraction
const rawTsSources              = import.meta.glob('@/ui/*/*.ts',              { query: '?raw', import: 'default', eager: true });  // raw TS for cross-file type resolution
const docsModules               = import.meta.glob('@/ui/*/docs.md',           { query: '?raw', import: 'default', eager: true });  // markdown docs
const appCss                    = import.meta.glob('/src/app.css',             { query: '?raw', import: 'default', eager: true });  // for design token extraction
const exampleSourceModules      = import.meta.glob('@/ui/*/examples/*.svelte');                                 // for compatibility checking
```

The eager globs lock in metadata + raw sources at build time. The lazy glob (`allModules`) defers actual component module loading until rendered.

### Lens utilities imported

From `@/ui/lens/`:
- `extractDir(path)` — derives kebab-case dir name from a file path.
- `toTitle(name)` — converts kebab-case to Title Case.
- `parseLensMeta(metaModule)` — validates a `lens.ts` exported `meta` against `LensMetaSchema`.
- `findPrimaryKey(componentName)` — finds the primary `.svelte` file for a component dir.
- `extractComponentDescription(rawSvelte)` — extracts JSDoc from `<script lang="ts">` block.
- `computeLensCompatibility(...)` — runs all 16 Lens compat rules against a component.
- `extractProps(rawSource, ...)` — extracts the `<script module>` Valibot schema → PropsTable rows.
- `extractVariants(rawSource)` — extracts `tv()` variant configs.
- `extractDeps(rawSource, ...)` — builds `DepTree` (UI / workspace / external imports).
- `extractTokens(...)` — extracts CSS custom-property tokens from app.css.
- `auditAccessibility(...)` — `A11yAuditResult`.
- `detectBrowserSupport(...)` — `BrowserSupportResult`.

### Core data structures (top of `<script>`)

After the imports, the layout builds:
- **`metaByName: Map<Str, LensMeta>`** — component name → parsed Lens metadata.
- **`metaErrors: Map<Str, Str>`** — components whose `lens.ts` failed to parse.
- **`examplesByName: Map<Str, LensExample[]>`** — component name → declared examples.
- **`groupedComponents: CategoryGroup[]`** — `CATEGORY_ORDER.map(cat => ({ category: cat, components: ... }))` filtered for non-empty groups.
- **`compatByName: Map<Str, LensCompatibility>`** — per-component compat rule results from `computeLensCompatibility(...)`.
- **`globalSearchItems: SearchItem[]`** — flat list with hierarchical groups (cmdk auto-hides empty groups):
  - `Component` (873 items).
  - `Component › Props` (per component, one entry per prop).
  - `Component › Variants` (per `tv()` variant value).
  - `Component › Examples` (per declared example).
  - `Component › Dependencies › UI Components`.
  - `Component › Dependencies › Workspace`.
  - `Component › Dependencies › External`.

This is the data feed for `<CommandSearch>` (cmdk-based palette).

## Notification center

Lives in this file (calls into `$lib/stores/lens-notifications.svelte`):
- `loadNotifications()` on mount.
- `pushNotification`/`pushNotificationBatch` — emit on Lens compat rule failures, lint result discoveries, etc.
- `getNotifications()`, `getUnreadCount()`, `markRead`, `markAllRead`, `removeNotification`, `removeByCategory`, `clearAllNotifications` — bound to UI controls.
- `getPreferences`/`updatePreferences`/`isTypeEnabled` — preference panel.
- Two-step "Confirm Clear All" gate (button → confirm button) prevents accidental wipe.
- Severity filter dropdown (info/success/warning/error).
- "Show toasts" preference toggles whether new notifications also fire `toast()` calls (svelte-sonner).

## Markup structure (skim — no exact line numbers since file is ~3,585 lines)

```svelte
<ModeWatcher />
<Sidebar.Provider>
  <Sidebar.Sidebar>
    <Sidebar.Header>
      <AppLogo />
      <CommandSearch trigger="..." searchItems={globalSearchItems} />
      <SidebarToggle />
    </Sidebar.Header>
    <Sidebar.Content>
      <!-- Per-category Sidebar.Group -->
      {#each groupedComponents as group}
        <Collapsible.Root>...</Collapsible.Root>
        <!-- with Lens compat indicators per component -->
      {/each}
    </Sidebar.Content>
  </Sidebar.Sidebar>
  <Sidebar.Inset>
    <header>
      <SidebarToggle />
      <Breadcrumb.Root>...</Breadcrumb.Root>
      <Popover.Root>
        <!-- Notification center popover -->
      </Popover.Root>
      <ModeToggle />
    </header>
    <main>
      {@render children()}
    </main>
  </Sidebar.Inset>
</Sidebar.Provider>

<Toaster richColors closeButton />
```

The `<Toaster>` styling is matched to the editor's glassmorphism theme via custom rich-color CSS overrides.

## Hot keys + view modes

The component declares (or inherits via the keyboard-shortcuts store):
- **`Cmd/Ctrl+K`** — open `<CommandSearch>` palette.
- **Component grid view** vs. **list view** vs. **by-category view** — toggle via UI buttons that update local `$state`.
- **Severity filter** for notifications: dropdown updates filter state.
- Sidebar group expansion state persisted to `localStorage` via internal `$effect`.

## Reactive state (Svelte 5 runes)

Top of the script declares `$state` for:
- `searchOpen: Bool` — CommandSearch visibility.
- `searchQuery: Str` — current query.
- `selectedCategory: Str | null` — sidebar filter.
- `expandedGroups: Set<Str>` — per-category expansion.
- `notificationsOpen: Bool`, `severityFilter: NotificationType | 'all'`, etc.

These drive `$derived` views like:
- `filteredItems: SearchItem[]` derived from `globalSearchItems` + `searchQuery`.
- `unreadCount: Num` derived from `getUnreadCount()` (re-evaluated when notifications mutate).
- `breadcrumbSegments: Str[]` derived from `page.route.id`.

## Integration with `lens-notifications` store

The layout pushes notifications when:
- A Lens compat rule fails for a component (e.g., missing `@values` JSDoc tag).
- A component's `lens.ts` fails to parse against `LensMetaSchema`.
- A user marks/dismisses notifications via the UI.

Push targets fire `toast(...)` from `svelte-sonner` if `preferences.showToasts === true`.

## Why size matters

This file is structurally cohesive — Lens shell logic, sidebar tree, search palette, breadcrumb, and notifications are all tightly coupled (sidebar emits to search, search emits to breadcrumb, notifications watches all three). Splitting it into smaller components would require many cross-component prop chains for state that's already neatly encapsulated. The trade-off: a single very large file vs. many small files with prop drilling.

## Tests

`(testing)/+layout.svelte` itself has no paired component test (it's a layout — testing it requires the full route tree). The Lens utilities it imports DO have paired tests in `@/ui/lens/`:
- `lint-lens.test.ts` — validates EVERY component has a valid `lens.ts` (catches drift).
- Per-utility tests (`extract-props.test.ts`, `extract-variants.test.ts`, etc.).
- `compute-compatibility.test.ts` — tests the 16 Lens compat rules.

E2E coverage from Playwright suites under `e2e/` exercises the rendered layout (search, navigation, notifications).

## Cross-references

- `storylyne-routes` — full route tree, including `(testing)` page-level files.
- `storylyne-overview` — high-level architecture explaining why Lens is bundled with the editor.
- `storylyne-stores-and-config` — `lens-notifications.svelte.ts` and `lens-categories.ts` (consumed here).
- `ui-overview` — the 873-component inventory + `lens.ts` convention this layout introspects.
- `ui-component-anatomy` — component file structure that `extractProps`/`extractVariants` parse.
