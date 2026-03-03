# Debug / Developer Mode — Implementation Plan

**Date:** 2026-03-03
**Design doc:** `docs/plans/2026-03-03-debug-devtools-design.md`
**Scope:** Editor-only (`@webforge/editor`)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Task 1: Debug State Schema + URL Param Utilities

**Files:**
- `packages/products/webforge/editor/src/lib/schemas/debug-state.ts` (new)
- `packages/products/webforge/editor/src/lib/schemas/debug-state.test.ts` (new)
- `packages/products/webforge/editor/src/lib/utils/url-params.ts` (new)
- `packages/products/webforge/editor/src/lib/utils/url-params.test.ts` (new)

**What to build:**

1. **`debug-state.ts`** — Valibot schemas:
   - `LOG_LEVELS` const tuple: `['trace', 'debug', 'info', 'warn', 'error']`
   - `LogLevelSchema` — `v.picklist(LOG_LEVELS)`
   - `DebugStateSchema` — `v.strictObject({ enabled: v.optional(v.boolean(), false), logLevel: v.optional(LogLevelSchema, 'info') })`
   - `URL_PARAM_PREFIX` — `'wf.'` constant
   - `UrlOverridesSchema` — `v.record(v.string(), v.string())`
   - Export all types via `v.InferOutput`

2. **`url-params.ts`** — Pure functions:
   - `parseDebugParams(url: URL): Result<UrlOverrides>` — extracts all `wf.*` prefixed params, returns unprefixed keys. E.g., `?wf.debug=true&wf.theme=midnight` → `{ debug: 'true', theme: 'midnight' }`
   - `applyUrlOverrides(editorStore, debugStore, overrides): Result<Void>` — applies overrides:
     - `debug` → `debugStore.setEnabled(value === 'true')`
     - `logLevel` → `debugStore.setLogLevel(value)`
     - `ff.*` → `editorStore.setFeature(flag, value === 'true')` — validates flag key against `FeatureFlagsSchema.entries`
     - App keys (`theme`, `mode`, `locale`, `sidebarOpen`) → validated against `AppPreferencesSchema.entries`, calls appropriate setter
     - Unknown keys → silently ignored
   - `isValidAppKey(key: string): boolean` — checks against `AppPreferencesSchema.entries`
   - `isValidFeatureFlag(key: string): boolean` — checks against `FeatureFlagsSchema.entries`

**Tests (write FIRST):**
- Schema validation: valid/invalid log levels, default values, strict object rejection
- `parseDebugParams`: empty URL, single param, multiple params, non-wf params ignored, special chars
- `applyUrlOverrides`: debug toggle, log level, theme override, feature flag override, invalid values rejected, unknown keys ignored
- `isValidAppKey` / `isValidFeatureFlag`: known keys return true, unknown false

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 2: Debug Store

**Files:**
- `packages/products/webforge/editor/src/lib/stores/debug-state.svelte.ts` (new)
- `packages/products/webforge/editor/src/lib/stores/debug-state.svelte.test.ts` (new)

**What to build:**

1. **Module-level `$state`:**
   - `let _debug: DebugState = $state({ enabled: false, logLevel: 'info' })`
   - `let _urlOverrides: UrlOverrides = $state({})`

2. **`DebugStore` type:**
   - `readonly debug: DebugState` (getter returning `_debug`)
   - `readonly urlOverrides: UrlOverrides` (getter returning `_urlOverrides`)
   - `setEnabled(enabled: boolean): Result<Void>` — validates via `v.boolean()`, updates `_debug`, saves
   - `setLogLevel(level: string): Result<Void>` — validates via `LogLevelSchema`, updates `_debug`, saves

3. **Persistence:** `STORAGE_KEY = 'webforge:debug-state'` — only persists `{ enabled, logLevel }`, NOT url overrides

4. **Factory:**
   - `createDebugStore(url?: URL): Result<DebugStore>` — resets to defaults, loads from localStorage, if `url` provided calls `parseDebugParams(url)` and stores in `_urlOverrides`
   - `initDebugStore(url?: URL): DebugStore` — singleton init (throws on failure)
   - `useDebugStore(): DebugStore` — singleton access (throws if not initialized)

**Tests (write FIRST):**
- `createDebugStore()`: returns ok, default state
- `setEnabled(true/false)`: state updates, persists to localStorage
- `setLogLevel('trace')`: state updates, invalid level returns error
- URL param integration: `createDebugStore(new URL('?wf.debug=true&wf.logLevel=trace', 'http://x'))` → enabled=true, logLevel=trace, urlOverrides populated
- Persistence: save/load cycle via localStorage mock
- Singleton: `initDebugStore` + `useDebugStore` pattern

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 3: Console Styles + Snapshot Diffing

**Files:**
- `packages/products/webforge/editor/src/lib/debug/console-styles.ts` (new)
- `packages/products/webforge/editor/src/lib/debug/console-styles.test.ts` (new)

**What to build:**

1. **`styles` object** — CSS strings for console badges:
   - `storeBadge`: cyan background pill
   - `propPath`: gray monospace
   - `oldValue`: red text
   - `newValue`: green text
   - `timestamp`: dim gray small
   - `debugBadge`: dark yellow pill
   - `warnBadge`: orange pill
   - `errorBadge`: red pill
   - `infoBadge`: blue pill
   - `reset`: inherit color

2. **`formatTimestamp(): string`** — returns `"HH:MM:SS.mmm"` from `Date.now()`

3. **`diffSnapshot(prev, next): Array<{ key, old, new }>`** — shallow comparison of two plain objects, returns array of changed keys with old/new values. Handles nested objects by comparing JSON serialization for deep equality.

**Tests (write FIRST):**
- `styles`: all keys are non-empty strings
- `formatTimestamp`: matches `HH:MM:SS.mmm` format
- `diffSnapshot`: no changes → empty, single change, multiple changes, added key, removed key, nested object change detected, identical objects → empty

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 4: State Change Logger

**Files:**
- `packages/products/webforge/editor/src/lib/debug/state-logger.svelte.ts` (new)
- `packages/products/webforge/editor/src/lib/debug/state-logger.svelte.test.ts` (new)

**What to build:**

1. **`createStateLogger(editorStore, debugStore): { destroy() }`**
   - Uses `$effect` to watch `editorStore.app` and `editorStore.features`
   - On each change: takes `$state.snapshot()`, diffs against previous snapshot
   - For each changed key: `console.groupCollapsed` with styled badges showing:
     - Store name badge (cyan), property path (gray), `"old" → "new"` (red/green), timestamp (dim)
     - Inside group: `old:` and `new:` values
   - Only logs when `debugStore.debug.logLevel` is `debug` or `trace`
   - `destroy()` is returned for cleanup (the `$effect` cleanup handles this via Svelte's lifecycle)

2. **Log level check:**
   - `LOG_LEVEL_PRIORITY` map: `{ trace: 0, debug: 1, info: 2, warn: 3, error: 4 }`
   - State change logs are level `debug` (priority 1)
   - Only log when current level priority <= debug priority

**Tests (write FIRST):**
- Mock `console.groupCollapsed`, `console.log`, `console.groupEnd`
- Create logger with mock stores → mutate store → verify console methods called with expected args
- Log level filtering: set logLevel to 'info' → no output; set to 'debug' → output
- Multiple changes in one tick → each logged separately
- `destroy()` → subsequent changes produce no output

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 5: Devtools API

**Files:**
- `packages/products/webforge/editor/src/lib/debug/devtools-api.svelte.ts` (new)
- `packages/products/webforge/editor/src/lib/debug/devtools-api.svelte.test.ts` (new)

**What to build:**

1. **`EditorDevtools` type** — exported for `app.d.ts`:
   ```
   state: { app, features, debug }   — $state.snapshot() on each access
   set(path, value): void             — generic setter ('app.theme', 'features.settings')
   setTheme/setMode/setLocale/setSidebarOpen/setFeature/setLogLevel — convenience
   enable()/disable()                 — toggle debug mode
   logState()                         — pretty-print full state to console
   logFeatures()                      — pretty-print feature flags table
   register(namespace, api)           — extension registry
   unregister(namespace)              — remove extension
   appName: string                    — from editorStore.app.appName
   version: string                    — from package.json or hardcoded
   ```

2. **`createDevtoolsAPI(editorStore, debugStore): { destroy() }`**
   - Creates the `EditorDevtools` object
   - Sets `window.__EDITOR_DEVTOOLS__` = the object
   - `destroy()` → `delete window.__EDITOR_DEVTOOLS__`

3. **`set(path, value)` implementation:**
   - Split path on `.`: `'app.theme'` → `['app', 'theme']`
   - If `path[0] === 'app'`: validate key against `AppPreferencesSchema.entries`, call appropriate setter
   - If `path[0] === 'features'`: call `setFeature(path[1], value)`
   - If `path[0] === 'debug'`: call debug store setter

4. **`register(namespace, api)` / `unregister(namespace)`:**
   - Stores extensions in a `Map<string, Record<string, unknown>>`
   - `Object.defineProperty` on the devtools object for each namespace
   - `unregister` → `delete` the property

5. **`logState()`:** Uses `console.log` with styled table output (ASCII box drawing) showing all state
6. **`logFeatures()`:** `console.table` of feature flags

**Tests (write FIRST):**
- `createDevtoolsAPI`: sets `window.__EDITOR_DEVTOOLS__`
- `.state` returns current snapshot, updates after store mutation
- `.setTheme('midnight')` → editorStore.app.theme === 'midnight'
- `.setFeature('settings', false)` → editorStore.features.settings === false (reactive)
- `.set('app.theme', 'ocean')` → editorStore.app.theme === 'ocean'
- `.set('features.sidebar', false)` → editorStore.features.sidebar === false
- `.enable()/.disable()` → debugStore.debug.enabled toggles
- `.register('test', { foo: () => 42 })` → `__EDITOR_DEVTOOLS__.test.foo()` === 42
- `.unregister('test')` → `__EDITOR_DEVTOOLS__.test` === undefined
- `.logState()` / `.logFeatures()` → console methods called
- `destroy()` → `window.__EDITOR_DEVTOOLS__` === undefined

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 6: Debug Service Orchestrator + Layout Integration

**Files:**
- `packages/products/webforge/editor/src/lib/debug/init.svelte.ts` (new)
- `packages/products/webforge/editor/src/lib/debug/init.svelte.test.ts` (new)
- `packages/products/webforge/editor/src/routes/+layout.svelte` (modify)
- `packages/products/webforge/editor/src/app.d.ts` (modify)

**What to build:**

1. **`init.svelte.ts`** — `initDebugServices(editorStore, debugStore): void`
   - Uses `$effect` watching `debugStore.debug.enabled`
   - When enabled transitions to `true`: call `createStateLogger()` + `createDevtoolsAPI()`, store cleanup refs
   - When enabled transitions to `false`: call `destroy()` on both, clear refs
   - Logs activation/deactivation to console with styled badge

2. **`+layout.svelte` changes:**
   - Import `initDebugStore`, `applyUrlOverrides`, `initDebugServices`
   - After `initEditorStore()`: `const debugStore = browser ? initDebugStore(page.url) : undefined`
   - Apply URL overrides: `if (browser && debugStore) { applyUrlOverrides(store, debugStore, debugStore.urlOverrides); initDebugServices(store, debugStore); }`

3. **`app.d.ts` changes:**
   - Add `Window` interface augmentation with optional `__EDITOR_DEVTOOLS__`

**Tests (write FIRST):**
- `initDebugServices` with enabled=false: no window global, no console output
- `initDebugServices` with enabled=true: window global registered, logger active
- Toggle enabled false→true→false: global appears then disappears

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 7: Locale Keys

**Files:**
- `packages/products/webforge/editor/src/lib/locales/schema.ts` (modify)
- `packages/products/webforge/editor/src/lib/locales/en.ts` (modify)
- `packages/products/webforge/editor/src/lib/locales/ja.ts` (modify)
- `packages/products/webforge/editor/src/lib/locales/zh.ts` (modify)
- `packages/products/webforge/editor/src/lib/locales/ko.ts` (modify)
- `packages/products/webforge/editor/src/lib/locales/fr.ts` (modify)
- `packages/products/webforge/editor/src/lib/locales/de.ts` (modify)
- `packages/products/webforge/editor/src/lib/locales/es.ts` (modify)

**What to build:**

1. **Schema** — add `debug` section:
   ```typescript
   debug: v.strictObject({
     enabled: messageTemplate(),
     disabled: messageTemplate(),
     logLevel: messageTemplate({ level: v.string() }),
     urlOverride: messageTemplate({ key: v.string(), value: v.string() }),
   }),
   ```

2. **Locale files** — add translated `debug` section to all 7 files:
   - `en`: Debug mode enabled / Debug mode disabled / Log level: {level} / URL override: {key} = {value}
   - `ja`: デバッグモード有効 / デバッグモード無効 / ログレベル: {level} / URLオーバーライド: {key} = {value}
   - `zh`: 调试模式已启用 / 调试模式已禁用 / 日志级别：{level} / URL 覆盖：{key} = {value}
   - `ko`: 디버그 모드 활성화 / 디버그 모드 비활성화 / 로그 레벨: {level} / URL 오버라이드: {key} = {value}
   - `fr`: Mode débogage activé / Mode débogage désactivé / Niveau de log : {level} / Remplacement URL : {key} = {value}
   - `de`: Debug-Modus aktiviert / Debug-Modus deaktiviert / Log-Level: {level} / URL-Überschreibung: {key} = {value}
   - `es`: Modo depuración activado / Modo depuración desactivado / Nivel de log: {level} / Anulación de URL: {key} = {value}

**Tests:** Existing `locales.test.ts` should pass (it validates all locales against schema). Run it to confirm.

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 8: Integration Tests + Final QA

**Files:**
- `packages/products/webforge/editor/src/lib/debug/integration.test.ts` (new)

**What to build:**

1. **Full-flow integration tests:**
   - Create editor store + debug store with URL `?wf.debug=true&wf.logLevel=trace&wf.theme=midnight&wf.ff.settings=false`
   - Verify: debug enabled, logLevel=trace, theme=midnight, settings=false
   - Verify: state logger produces console output on mutation
   - Verify: `window.__EDITOR_DEVTOOLS__` is registered
   - Verify: `__EDITOR_DEVTOOLS__.state.app.theme === 'midnight'`
   - Verify: `__EDITOR_DEVTOOLS__.setTheme('ocean')` → store.app.theme === 'ocean'
   - Verify: `__EDITOR_DEVTOOLS__.set('features.sidebar', false)` → store.features.sidebar === false
   - Verify: `__EDITOR_DEVTOOLS__.register('test', { ping: () => 'pong' })` → accessible
   - Verify: disable debug → window global removed, logger stopped
   - Verify: re-enable → everything comes back

2. **Run full test suite:** `pnpm qa:test`
3. **Run full QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Implementation Order

1. Task 1 → schemas + URL params (pure, no Svelte)
2. Task 3 → console styles + diffing (pure, no Svelte)
3. Task 2 → debug store (depends on Task 1)
4. Task 4 → state logger (depends on Tasks 2, 3)
5. Task 5 → devtools API (depends on Tasks 2, 3)
6. Task 7 → locale keys (independent)
7. Task 6 → orchestrator + layout (depends on Tasks 2, 4, 5)
8. Task 8 → integration tests + final QA (depends on all)
