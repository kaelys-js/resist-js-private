# Devtools & debug-state — cross-cutting subsystem

> Captured 2026-05-05. Branch: `main`. Companions: `utils-devtools-overview` (per-file `@/utils/devtools` API), `storylyne-overview` (host-app integration), `storylyne-components` (DevToolbar* components).

The devtools subsystem is the bridge between the host app's reactive state and the in-page dev toolbar / browser console. Core tenets:
1. **Generic over the host's app store** — `@/utils/devtools` defines `AppStoreContract` + `DebugStoreContract` interfaces; the host (Storylyne) provides concrete stores satisfying those contracts.
2. **localStorage-persisted, URL-overridable** — debug state and feature flags persist to `localStorage[STORAGE_KEY]` (validated against `DebugStateSchema` on read), and any URL query param matching `${URL_PARAM_PREFIX}<key>=<value>` or `${URL_PARAM_PREFIX}ff_<flag>=<bool>` overrides the persisted value.
3. **`window.__DEVTOOLS__` console API** — exposes a programmatic interface for power users so they can call `__DEVTOOLS__.flags.set('themeSelection', false)` etc. from devtools.
4. **Welcome banner + state-change logging** — styled `console.log`/`console.groupCollapsed` banners on hydration; per-key change watchers log diffs.

## Library: `@/utils/devtools` (`packages/shared/utils/devtools/src/`)

See `utils-devtools-overview` memory for per-file API. Summary:

| File | Purpose |
|------|---------|
| `devtools-api.svelte.ts` | `createDevtoolsAPI` (the `window.__DEVTOOLS__` factory) + `BUILD_INFO`/`buildInfoResult` accessors |
| `init.svelte.ts` | `activateDebugServices` / `syncDebugServices` — top-level setup. Console banners (`logWelcomeBanner`, `BADGE_API/BUILD/FLAGS/OVERRIDES/STATE`). `FF_PREFIX` constant. |
| `debug-state-store.svelte.ts` | `createDebugStore` Svelte 5 runes store; persistence + URL overrides + `DEBUG_DEFAULTS` |
| `debug-state-schema.ts` | `DebugStateSchema` Valibot, `LogLevelSchema`, `LOG_LEVELS` |
| `dev-toolbar-registry.ts` | Introspection: `discoverAppPreferences`, `discoverDebugFields`, `discoverFeatureFlags` (returns `FieldDescriptor[]` / `FlagDescriptor[]`); `humanizeKey`/`humanizeOption`; `OPTION_LABELS` |
| `state-logger.svelte.ts` | `createStateLogger` + `createWatcher` per-key + `logChange(diff)` |
| `console-styles.ts` | `diffSnapshot`, `formatTimestamp`, CSS-string `styles` |
| `url-params.ts` | `parseDebugParams`, `applyUrlOverrides`, `buildSetterMap`, `isValidAppKey`, `isValidFeatureFlag`, `FF_PREFIX` |
| `types.ts` | `AppStoreContract`, `DebugStoreContract`, `DebugState`, `DevtoolsConfig`, `LogLevel`, `LOG_LEVELS` |

Vitest project: `utils-devtools` (jsdom, +svelte plugin, +define globals).

## Host integration: `@storylyne/editor`

### Stores

- **`src/lib/stores/debug-state.svelte.ts`** — wraps `@/utils/devtools/debug-state-store::createDebugStore` with editor-specific `URL_PARAM_PREFIX` (`'sto.'` from `app-meta.URL_PARAM_PREFIX`). Exposes `useDebugStore()`. State shape: `{ enabled, logLevel, logState, logEvents, logErrors }` plus a `urlOverrides: Map`. Singleton scope via module-level `_singleton` cache. `STORAGE_KEY = storageKey('debug-state')` = `'storylyne:debug-state'`.

- **`src/lib/stores/editor-state.svelte.ts`** — the host app store. Holds `app: { appName, theme, mode, locale, sidebarOpen, userName, userEmail, userAvatar, subscriptionPlan, mockDataDelay }` + `features: <30 boolean flags>`. Implements `AppStoreContract` so devtools can introspect it.

### Config: `src/lib/config/devtools-config.ts`

- `getDevtoolsConfig()` returns `DevtoolsConfig` for `createDevtoolsAPI` / `activateDebugServices`. Fields: storage key prefix, URL param prefix (`'sto.'`), feature-flag schema, app-preferences schema, build info.
- `APP_KEYS` and `FEATURE_FLAG_KEYS` constants enumerate every key that the URL override system may set.

### Hook bootstrap: `src/hooks.client.ts`

```ts
activateDebugServices({
  appStore: useEditorStore(),
  debugStore: useDebugStore(),
  config: getDevtoolsConfig(),
});
```

This single call performs:
1. Loads `BUILD_INFO` (from `__APP_VERSION__` / `__GIT_*` / `__BUILD_TIMESTAMP__` define globals).
2. Mounts `window.__DEVTOOLS__` via `createDevtoolsAPI`.
3. Calls `logWelcomeBanner(buildInfo)` — styled console banner with `BADGE_BUILD`, `BADGE_API`, `BADGE_FLAGS`, `BADGE_OVERRIDES`, `BADGE_STATE`.
4. Initializes the state-logger (subscribes per-key watchers).
5. Parses `window.location.search` via `parseDebugParams` and applies overrides via `applyUrlOverrides`.

### UI: DevToolbar components

- **`DevToolbar.svelte`** — orchestrator (769 lines). Mounts only `if (browser && debugStore)`. Draggable, persists position to `localStorage[storageKey('dev-toolbar-pos')]`. Roving-tabindex toolbar with arrow-key navigation. Four panels (mutually exclusive, opened from buttons in the toolbar):
  - **`DevToolbarFeatureFlags.svelte`** (201 lines) — `discoverFeatureFlags(FeatureFlagsSchema.entries)` → switch list, per-flag locale label via `localeStore.t.devToolbar.labels[key]` with `humanizeKey(key)` fallback. `enableAll()`/`disableAll()` helpers.
  - **`DevToolbarAppState.svelte`** (439 lines) — `discoverAppPreferences(AppPreferencesSchema.entries)` → editable controls (text input, picklist, Switch, slider per type).
  - **`DevToolbarDebug.svelte`** (511 lines) — toggles `debugStore.debug.{enabled, logLevel, logState, logEvents, logErrors}`; manages per-app/per-flag URL overrides (`?sto.${field}=...`).
  - **`DevToolbarPerf.svelte`** (630 lines) — Web Vitals dashboard. Reads from `getVitalsPanelMetrics()` (see `observability` memory).

The toolbar's "Reset all" button iterates `discoverAppPreferences(prefEntries)` calling `set${Capitalized}` setters dynamically; iterates `flags` calling `editorStore.setFeature(key, default)`; resets `debugStore.setLogLevel('info')`; clears `localStorage[POS_KEY]` and `storageKey('sidebar-px')`; resets toolbar position.

Keyboard shortcuts via `shortcutStore.matches(e, 'TOGGLE_DEV_TOOLBAR' | 'CLOSE_PANEL' | 'DEV_FLAGS_PANEL' | 'DEV_APP_PANEL' | …)`.

### Shape of an override URL

For Storylyne (prefix `sto.`):
- `?sto.theme=midnight` — overrides `editor-state.app.theme`.
- `?sto.locale=ja` — overrides `editor-state.app.locale`.
- `?sto.ff_themeSelection=false` — disables the `themeSelection` feature flag for this session.
- `?debug=true` — opens the dev toolbar even when `debugStore.debug.enabled === false`.
- `?sto.mockDelay=2500` — server-side route picks this up via URL param parser (200ms-clamped to `[0, 10_000]`).

`url-params.ts::isValidAppKey(key)` and `isValidFeatureFlag(key)` validate the override name against the schema's `entries` keys before applying — unknown keys are dropped with a `console.warn`.

## Persistence

- `localStorage[STORAGE_KEY]` — `editor-state` JSON (validated against `EditorStateSchema` on read; falls back to defaults on parse failure).
- `localStorage[storageKey('debug-state')]` — debug state JSON.
- `localStorage[storageKey('dev-toolbar-pos')]` — toolbar position `{ x, b }`.
- `localStorage[storageKey('sidebar-px')]` — resizable sidebar width (number).
- Cookies (server-readable for SSR hydration): `theme`, `sidebar-open`, `sidebar-px`, `<storage-prefix>:locale`, `<storage-prefix>:mockDataDelay`. Sanitized in `hooks.server.ts` before being interpolated into HTML attributes.

## Schema introspection mechanism

Both `discoverAppPreferences` and `discoverFeatureFlags` use the same idiom:

```ts
const fields: FieldDescriptor[] = [];
for (const [key, schema] of Object.entries(introspectionTarget.entries)) {
  // Walk the Valibot schema's pipe to find:
  //   - default value (from v.optional(s, default))
  //   - options (from v.picklist(['a', 'b', 'c']))
  //   - type kind (string / number / boolean)
  fields.push({
    key,
    label: humanizeKey(key),
    defaultValue,
    options,
    kind,
  });
}
```

Implemented via the `_introspectPipe` helper (similar to `@/schemas/template-literal/regex.ts::_introspectPipe`). The result drives the auto-generated DevToolbar UI — adding a new feature flag in `FeatureFlagsSchema` immediately appears in the flags panel without UI code changes.

## State-change logging

When `debugStore.debug.logState === true`:
1. `createStateLogger(opts)` is called from `init.svelte.ts::activateDebugServices`.
2. For each key in `appStore.app` and `appStore.features`, `createWatcher(key, $effect)` registers a Svelte 5 runes watcher that compares `prev` vs `next` (snapshot via structuredClone — Svelte's `$state.snapshot` is bypassed because of `DeepReadonly` mangling).
3. On change: `diffSnapshot(prev, next) → SnapshotDiff` (computes added/removed/changed key paths).
4. `logChange(diff)` formats as `console.log('%c[State Δ] %ckey: %cprev %c→ %cnext', styles.badge, styles.key, styles.prev, styles.arrow, styles.next)`.

`LOG_LEVEL_PRIORITY = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 }` — entries are filtered if `debugStore.debug.logLevel < required level`.

## `window.__DEVTOOLS__` API surface

After `activateDebugServices`, the console exposes (via `createDevtoolsAPI`):

```ts
window.__DEVTOOLS__: {
  build: BuildInfo;          // version + git commit + build timestamp
  flags: {
    list(): FlagDescriptor[];
    get(key): boolean;
    set(key, value): void;
    enableAll(): void;
    disableAll(): void;
    reset(): void;
  };
  app: {
    list(): FieldDescriptor[];
    get(key): unknown;
    set(key, value): void;
    reset(): void;
  };
  debug: {
    get(): DebugState;
    set(partial): void;
    reset(): void;
  };
  perf: DevtoolsPerf;        // see observability memory
  beacon: { status(): BeaconStatus };
  help(): void;              // styled console help table
}
```

`getDevtoolsKey(opts)` and `getBuildKey(opts)` are localStorage key helpers used internally — separate from the app's STORAGE_KEY namespace.

## Tests

- `utils-devtools` vitest project covers `@/utils/devtools/*.test.ts` files (see `utils-devtools-overview` for per-file tests).
- `storylyne-editor` covers DevToolbar component tests — DevToolbarTest, DevToolbarFeatureFlagsTest, DevToolbarAppStateTest, DevToolbarDebugOverridesTest, DevToolbarDebugTest. Uses test-wrapper pattern (component + `TestProviders.svelte` for context).
- E2E suite `e2e/dev-toolbar.spec.ts` exercises the in-page UI.

## Dependencies

```
DevToolbar.svelte (storylyne)
  ├─ useEditorStore() / useDebugStore() (stores)
  ├─ shortcutStore (keyboard-shortcuts-store)
  ├─ getVitalsPanelMetrics (web-vitals — see observability)
  ├─ discoverAppPreferences / discoverDebugFields / discoverFeatureFlags (@/utils/devtools/dev-toolbar-registry)
  ├─ humanizeKey / OPTION_LABELS (@/utils/devtools/dev-toolbar-registry)
  └─ localeStore (i18n.svelte) — for label translations

activateDebugServices (@/utils/devtools/init.svelte)
  ├─ createDevtoolsAPI (window.__DEVTOOLS__)
  ├─ logWelcomeBanner (badges)
  ├─ createStateLogger (state-logger.svelte)
  ├─ parseDebugParams + applyUrlOverrides (url-params)
  └─ debugStore.setEnabled() etc.
```

## Key architectural decision

The devtools subsystem treats the host app's store as a **first-class introspection target**. The host doesn't import any devtools UI code; it just provides stores that satisfy `AppStoreContract` + `DebugStoreContract`. The DevToolbar* components in `@storylyne/editor` are HOST-OWNED — they read from the host store and use `discover*` helpers from `@/utils/devtools` to enumerate fields/flags. This keeps `@/utils/devtools` framework-agnostic (it doesn't ship Svelte UI) while enabling rich auto-generated dev panels in the host.
