# `@storylyne/editor` — Components (`src/lib/components/`)

> Captured 2026-05-05. Branch: `main`. Path: `packages/products/storylyne/editor/src/lib/components/`.

The editor's component layer is **a thin set of editor-local wrappers** around `@/ui/*` shadcn-svelte components. The wrappers exist to:
1. Pull localized strings from `localeStore` and pass them as `labels` props.
2. Read state from `useEditorStore()` / `useDebugStore()` and pass it to the shared component.
3. Wire feature-flag gates (most components conditionally render based on `store.features.*`).
4. Map editor-local types (e.g. `ServerProject`, `ServerScene`) to the shared component's prop shape.

Files: 38 `.svelte` files total — **16 production components** + **18 test wrappers** (suffix `Test.svelte`, `FlagsTest.svelte`, etc.) + **2 test infra** (`TestProviders.svelte`, `FeatureFlagsTestProviders.svelte`). Plus 17 corresponding `*.test.ts` files.

## Production components

### `AppSidebar.svelte` (102 lines)
Wraps `@/ui/app-sidebar/AppSidebar.svelte` with editor navigation. Props: `user`, `project`, `scenes`, `projectLoading`, `scenesLoading`. Renders:
- `content` snippet: `Sidebar.MenuButton` for `Home` (gated by `features.sidebarHome`), then `<NavScenes />` or `<NavScenesSkeleton />` (gated by `features.sceneList && (!features.authGatedUi || user)`).
- `footer` snippet: `<NavProject />` or `<NavProjectSkeleton />` from `@/ui/nav-project/NavProjectSkeleton.svelte` (gated by `features.projectDropdown`).
- `navItems` derived list: `[Settings, CircleHelp]` filtered by `features.settings`/`features.sidebarHelp`/`authGatedUi`.

### `DevToolbar.svelte` (769 lines — orchestrator)
Top-level dev toolbar shown when `?debug=true` (or `debugStore.debug.enabled`). Comprehensive:
- Mounts only `if (browser && debugStore)` (from `(app)/+layout.svelte`).
- Draggable position: persisted to `localStorage[storageKey('dev-toolbar-pos')]` as `{ x, b }`. `loadPos()` falls back to center-bottom (`window.innerWidth / 2, 16`). PointerEvent drag tracks 4px deadzone before committing as a drag (so click-to-toggle still works). `ResizeObserver` clamps position on viewport resize.
- Roving tabindex (WAI-ARIA toolbar pattern): `TOOLBAR_BUTTON_IDS = ['toolbar-btn-flags', 'toolbar-btn-app', 'toolbar-btn-debug', 'toolbar-btn-perf', 'toolbar-btn-mode', 'toolbar-btn-copy', 'toolbar-btn-reset']`. ArrowLeft/Right/Home/End cycle focus; Escape closes.
- Panels: only one open at a time (`activePanel: Str | null`). `flagsOpen`/`appOpen`/`debugOpen`/`perfOpen` derived from `activePanel`. Effect moves focus into panel content via `requestAnimationFrame` after mount.
- Keyboard shortcuts via `shortcutStore.matches(e, 'TOGGLE_DEV_TOOLBAR' | 'CLOSE_PANEL' | 'DEV_FLAGS_PANEL' | 'DEV_APP_PANEL' | ...)`.
- Mode cycling: `cycleMode()` rotates `MODES = ['light', 'dark', 'system']`.
- Copy debug info: serializes `{ app: ...editorStore.app, features: ...editorStore.features, debug: ...debugStore.debug }` to clipboard, then `copySuccess = true` for 1s.
- Reset all: iterates `discoverAppPreferences(prefEntries)` calling `set${Capitalized}` setters dynamically; iterates `flags` calling `editorStore.setFeature(key, default)`; resets `debugStore.setLogLevel('info')`; clears `localStorage[POS_KEY]` and `storageKey('sidebar-px')`; resets position.
- Renders four panel sub-components (DevToolbarFeatureFlags, DevToolbarAppState, DevToolbarDebug, DevToolbarPerf), each in a Popover. Plus `cycleThemeLabel` derived from `localeStore.t.devToolbar.cycleTheme({ mode: modeDisplayName })` with fallback.

### `DevToolbarAppState.svelte` (439 lines)
App preferences override panel. Reads `discoverAppPreferences(AppPreferencesSchema.entries)` to introspect every preference (with default, options, type). Renders editable controls (text input for `appName`, picklist for `theme`/`mode`/`locale`, Switch for `sidebarOpen`, slider for `mockDataDelay`).

### `DevToolbarDebug.svelte` (511 lines)
Debug-state override panel. Toggles `debugStore.debug.{enabled, logLevel, logState, logEvents, logErrors}`. Includes per-app/per-flag URL override management (the `?sto.${field}=...` URL params).

### `DevToolbarFeatureFlags.svelte` (201 lines)
Feature-flag override panel. `discoverFeatureFlags(FeatureFlagsSchema.entries)`, search-filtered switch list. Helpers `enableAll()`/`disableAll()`. Locale labels via `localeStore.t.devToolbar.labels[key]` (cast to `() => Result<Str>` with `humanizeKey(key)` fallback).

### `DevToolbarPerf.svelte` (630 lines)
Web Vitals panel. Reads from `getVitalsPanelMetrics()` (`@/utils/web-vitals/vitals-panel-store.svelte`). Reactive `$state` driven by `reportVitalToPanel(...)` calls in `hooks.client.ts`'s analyticsTracker.

### `EmptyScenes.svelte` (39 lines)
Sidebar placeholder shown when `scenes.length === 0`. `MapIcon` + "No scenes yet" + "Create your first scene" CTA. Gated by `store.features.emptyScenePlaceholder`. Followed by a `Plus` MenuButton.

### `ErrorPage.svelte` (100 lines)
Wraps `@/ui/error-page/ErrorPage.svelte`. Maps HTTP status `400/403/404/500` to localized `titleKey` and `descriptionKey` records (with generic fallback `errors.genericTitle`/`genericDescription`). `errorIdLabel` derived from `localeStore.t.errors.errorId({ id: errorId })`. Forwards `labels` for `goHome`, `tryAgain`, `copied`, `copyFailed`, `copyErrorIdAriaLabel`, `clickToCopy`. Pulls `announce` from `@/ui/announce/announce.svelte` and forwards it.

### `HeaderUser.svelte` (78 lines)
Wraps `@/ui/header-user/HeaderUser.svelte`. Reads `userName/userEmail/userAvatar` from `useEditorStore().app`. `handleLogOut()` navigates to current URL with `?${URL_PARAM_PREFIX}auth=false` to simulate logged-out (the dev `resolveAuth` mechanism). Forwards `features` (avatar/account/subscription/notifications/shortcuts/settings/whatsNew/logout) and `labels` (all i18n).

### `LanguageSwitcher.svelte` (74 lines)
Wraps `@/ui/language-switcher/LanguageSwitcher.svelte`. Builds `languages: LanguageDisplayInfo[]` from `getLanguageDisplayNames(SUPPORTED_LOCALES, store.app.locale)`. `switchLanguage(code)` uses `document.startViewTransition` if supported (falls back to direct apply); inside the transition: `store.setLocale(code)`, `setPreferenceCookie(STORAGE_PREFIX, 'locale', code)`, `document.documentElement.lang = code`, `document.documentElement.dir = getTextDirection(code).data ?? 'ltr'`.

### `ModeToggle.svelte` (27 lines)
Trivial wrapper around `@/ui/mode-toggle/ModeToggle.svelte`. Forwards `mode` + `setMode` from `useEditorStore()` and `labels` (toggleTheme/toggleMode/light/dark/system).

### `NavProject.svelte` (56 lines)
Wraps `@/ui/nav-project/NavProject.svelte`. Footer of sidebar. Renders dropdown menu items in a `menuItems` snippet:
- `Folder` "Open Project" item (always shown).
- `<ThemeSwitcher />` (gated by `features.themeSelection`).
- `<LanguageSwitcher />` (gated by `features.languageSelection`).
- `Settings` item (gated by `features.projectDropdownSettings`).
Falls back to `'Project'` / `'—'` when no project exists.

### `NavScenes.svelte` (152 lines)
Sidebar scene list. Reads `useSidebar()` to detect collapsed-icon mode (`sidebar.state === 'collapsed' && !sidebar.isMobile`). Two render paths:
- **Collapsed (icon mode)**: single `MapIcon` `Sidebar.MenuButton` triggers a `Popover` containing the scene list.
- **Expanded**: `Collapsible.Root` with `ChevronRight` rotation animation, full menu inside.

The shared `sceneList` snippet renders (per scene): `MapIcon` button (with `isActive`/`aria-current`), then a `DropdownMenu` with header (scene title in glassmorphism background `bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl`), `Pencil` Rename, `Copy` Duplicate, separator, `Trash2` Delete (variant=destructive). Followed by `Plus` "New Scene" button. If `scenes.length === 0`, renders `<EmptyScenes />` instead.

### `NavScenesSkeleton.svelte` (42 lines)
Three skeleton rows during scene streaming. Renders `Skeleton class="h-4 w-16"` for label + 3× `Skeleton class="size-4 shrink-0 rounded"` + `Skeleton class="h-4 w-24"` rows. Has both expanded (`group-data-[collapsible=icon]:hidden`) and icon-collapsed (`hidden group-data-[collapsible=icon]:flex`) variants.

### `SiteHeader.svelte` (85 lines)
Wraps `@/ui/site-header/SiteHeader.svelte`. Builds breadcrumb trail in a `breadcrumbs` snippet:
- **Error state**: `Home > Error`.
- **Active scene**: `Home > Scenes > {activeSceneName}`.
- **Default**: `Home` only.

`actions` snippet contains `<HeaderUser />` (gated by `features.headerUserDropdown && (!features.authGatedUi || user)`) and `<ModeToggle />` (gated by `features.modeToggle`).

`sidebarToggleShortcut` from `shortcutStore.format('TOGGLE_SIDEBAR')`.

### `ThemeSwitcher.svelte` (150 lines)
Wraps `@/ui/theme-switcher/ThemeSwitcher.svelte`. Hardcoded list of 12 themes (`''`, `midnight`, `warm`, `forest`, `ocean`, `rose`, `lavender`, `sunset`, `slate`, `copper`, `aurora`, `amethyst`) — each with `id`, localized `label`, and 4 oklch color `dots` for the preview swatch.

## Test infrastructure

- `TestProviders.svelte` (22 lines) — wraps test renders with required context providers.
- `FeatureFlagsTestProviders.svelte` (26 lines) — same but with feature-flag context.

## Test wrappers (suffix `Test`/`FlagsTest`/`OverridesTest`)

Each wraps a production component with a known store state for `vitest-svelte` rendering. Pattern: production component imports `useEditorStore`, but in tests we need a fresh store, so the test wrapper instantiates a store and provides via context, then renders the production component as a child.

Files (small, 14-51 lines each): `AppSidebarTest`, `AppSidebarFlagsTest`, `DevToolbarAppStateTest`, `DevToolbarDebugOverridesTest`, `DevToolbarDebugTest`, `DevToolbarFeatureFlagsTest`, `DevToolbarTest`, `EmptyScenesFlagsTest`, `EmptyScenesTest`, `ErrorPageTest`, `HeaderUserTest`, `LanguageSwitcherTest`, `ModeToggleTest`, `NavProjectFlagsTest`, `NavProjectTest`, `NavScenesTest`, `NavSecondaryTest`, `SiteHeaderFlagsTest`, `SiteHeaderTest`, `ThemeSwitcherTest`.

Tests live alongside in kebab-case `.test.ts` files (e.g., `app-sidebar.test.ts`, `dev-toolbar.test.ts`, `nav-scenes.test.ts`, `feature-flags.integration.test.ts`).

## Pattern conventions

1. **Locale workaround pattern**: parametric locale functions are typed as `unknown` due to Valibot schema DeepReadonly mangling. Idiom: `const result: Result<Str> = (localeStore.t.X.Y as (p: { foo: Str }) => Result<Str>)({ foo: '...' });` then `if (!result.ok) log.warn(...)`. UI boundary — error logged, fallback used, never thrown.
2. **Type-cast tuple destructuring**: many components write `let { foo = null }: { foo?: Foo | null } = $props();` with explicit prop type annotation.
3. **Feature-flag gating**: components universally check `store.features.X` and `(!store.features.authGatedUi || user)` before rendering.
4. **Domain-error handling**: components never throw — they `log.warn` to the structured logger and use a fallback string. The shared logger's redaction config strips PII from forwarded error contexts.
5. **PaneForge / sidebar style hacks**: PaneForge breaks Tailwind peer-data selectors. `(app)/+layout.svelte` has `insetClass` that applies `md:m-2 md:ms-0 md:!w-auto md:rounded-xl md:shadow-sm` directly — `!w-auto` overrides component's `w-full` so flex-col stretch respects margins.
