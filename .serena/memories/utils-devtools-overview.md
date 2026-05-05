# `@/utils/devtools` — packages/shared/utils/devtools

Dev/debug toolbar runtime: localStorage-persisted debug state, URL-param overrides, feature flags, dev-time logging, browser-console banners.

## Package
- **Name**: `@/utils/devtools` (private)
- **Vitest project**: `utils-devtools` (jsdom + vitest define globals)
- **Internal deps**: `@/utils/core`, `@/schemas/result`

## File structure (`src/`)
```
devtools-api.svelte.ts          ← createDevtoolsAPI + console-exposed `window.__DEVTOOLS__` API
devtools-api.svelte.test.ts
init.svelte.ts                  ← activateDebugServices, syncDebugServices, console banners
init.svelte.test.ts
debug-state-store.svelte.ts     ← createDebugStore + persistence
debug-state-store.svelte.test.ts
debug-state-schema.ts           ← DebugStateSchema, LogLevelSchema, LOG_LEVELS
debug-state-schema.test.ts
dev-toolbar-registry.ts         ← discoverAppPreferences/DebugFields/FeatureFlags
dev-toolbar-registry.test.ts
state-logger.svelte.ts          ← createStateLogger + change-watcher
state-logger.svelte.test.ts
console-styles.ts               ← styles, formatTimestamp, diffSnapshot
console-styles.test.ts
url-params.ts                   ← parseDebugParams, applyUrlOverrides
url-params.test.ts
types.ts                        ← contracts and shared types
types.test.ts
```
No `index.ts` barrel.

## Public API per file

### `devtools-api.svelte.ts`
- `createDevtoolsAPI(opts)` — main factory, exposes `window.__DEVTOOLS__`
- `getDevtoolsKey(opts)`, `getBuildKey(opts)` — localStorage key helpers
- `BUILD_INFO`, `buildInfoResult` — build metadata
- Types: `DevtoolsAPI`, `DevtoolsPerf`, `BeaconStatus`
- Help formatters

### `init.svelte.ts`
- `activateDebugServices(opts)` — top-level setup (call from hooks.client)
- `syncDebugServices(state)` — re-sync after state change
- `logWelcomeBanner(buildInfo)` — styled console banner
- `buildKVBlock(...)` — pretty key-value console output
- `isRecognizedOverrideKey(key)` — validate URL override keys
- Constants: `BADGE_API`, `BADGE_BUILD`, `BADGE_FLAGS`, `BADGE_OVERRIDES`, `BADGE_STATE`, `FF_PREFIX`
- Type: `DebugServicesHandle`

### `debug-state-store.svelte.ts`
- `createDebugStore(opts)` — Svelte 5 runes store, persists to localStorage
- `DEBUG_DEFAULTS` — default debug state shape
- Calls `applyUrlOverrides` at init from `url-params.ts`

### `debug-state-schema.ts`
- `DebugStateSchema` — Valibot schema for the persisted state
- `LogLevelSchema`
- `LOG_LEVELS` constant

### `dev-toolbar-registry.ts`
- `discoverAppPreferences(opts)` — introspect app store for user-prefs
- `discoverDebugFields(...)` — find debug-state fields
- `discoverFeatureFlags(...)` — find FF keys
- `generateDebugUrl(state)` — encode state as URL
- `humanizeKey(...)` / `humanizeOption(...)` — display-name conversion
- `introspectEntry(...)` — single-entry helper
- Types: `FieldDescriptor`, `FlagDescriptor`
- `OPTION_LABELS` constant

### `state-logger.svelte.ts`
- `createStateLogger(opts)` — wires up state-change console logging
- `createWatcher(...)` — single-key watcher
- `logChange(diff)` — log a state diff
- `LOG_LEVEL_PRIORITY` constant

### `console-styles.ts`
- `diffSnapshot(prev, next)` → `SnapshotDiff` — compute change diff
- `formatTimestamp(date)`
- `styles` — CSS string constants for console.log styling
- `SnapshotDiff` type

### `url-params.ts`
- `parseDebugParams(url)` — extract debug+flag overrides from URL
- `applyUrlOverrides(state, params)` — merge overrides into state
- `buildSetterMap(...)` — internal helper
- `isValidAppKey(...)`, `isValidFeatureFlag(...)` — validation
- `FF_PREFIX` constant

### `types.ts`
- `AppStoreContract`, `DebugStoreContract` — interfaces app stores must match
- `DebugState`, `DevtoolsConfig`, `LogLevel`
- `LOG_LEVELS`

## Patterns
- **Svelte 5 runes** files use `.svelte.ts` extension
- localStorage persistence with Valibot validation on read
- URL-param overrides for dev-time inspection (`?debug.X=Y` or `?ff.X=true`)
- Console banners styled via `styles` CSS strings
- Generic over the host app's store (uses `AppStoreContract` interface)

## Used by
- `@storylyne/editor` `src/hooks.client.ts` — `activateDebugServices`
- Storylyne's `DevToolbar*` Svelte components introspect via `discoverDebugFields` etc.
