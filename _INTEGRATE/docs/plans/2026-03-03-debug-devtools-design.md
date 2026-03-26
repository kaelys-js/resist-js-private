# Debug / Developer Mode — Design Document

**Date:** 2026-03-03
**Scope:** Editor-only (`@webforge/editor`)
**Skill:** build-editor

---

## Goals

1. **Debug flag** — `?wf.debug=true` URL param or localStorage toggle activates developer mode
2. **Log level control** — `?wf.logLevel=trace` URL param or runtime setter
3. **State change logging** — Nanostores-style console output with styled badges, old/new diffs
4. **Devtools global API** — `window.__EDITOR_DEVTOOLS__` for console-driven state inspection and mutation
5. **URL overrides** — `?wf.theme=midnight&wf.locale=ja&wf.ff.settings=false` override editor state for the session
6. **Zero overhead** — When debug mode is off, no effects, no watchers, no globals. Production-safe.
7. **Fully automated** — Adding new state fields or feature flags requires zero changes to the debug system

---

## Architecture

### Data Flow

```
URL ?wf.* params ──→ parseDebugParams() ──→ DebugStore ($state)
                                                 │
                            ┌────────────────────┤
                            ▼                    ▼
                    applyUrlOverrides()    $effect watchers
                    (EditorStore mutations)       │
                            │              ┌─────┴──────┐
                            ▼              ▼            ▼
                    EditorStore        StateLogger   DevtoolsAPI
                    (reactive)         (console)    (window global)
```

### Initialization Sequence

```
+layout.svelte
  │
  ├─ 1. initEditorStore()           ← existing, unchanged
  ├─ 2. initDebugStore(url)         ← NEW: parse ?wf.* params, create debug state
  ├─ 3. applyUrlOverrides(store)    ← NEW: apply ?wf.theme, ?wf.locale, etc.
  └─ 4. initDebugServices(store)    ← NEW: conditionally start logger + register devtools
```

Steps 2–4 only run client-side (`browser` guard). Step 4 is a no-op when `debug.enabled === false`.

---

## Schemas

### `lib/schemas/debug-state.ts`

```typescript
import * as v from 'valibot';

export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error'] as const;

export const LogLevelSchema = v.picklist(LOG_LEVELS);
export type LogLevel = v.InferOutput<typeof LogLevelSchema>;

/**
 * Debug state schema. NOT persisted to the same localStorage key as editor state.
 * Persisted separately under 'webforge:debug-state' so debug prefs survive
 * across sessions without polluting the main editor state.
 */
export const DebugStateSchema = v.strictObject({
  enabled: v.optional(v.boolean(), false),
  logLevel: v.optional(LogLevelSchema, 'info'),
});
export type DebugState = v.InferOutput<typeof DebugStateSchema>;

/** URL parameter prefix to prevent collisions. */
export const URL_PARAM_PREFIX = 'wf.' as const;

/**
 * Parsed URL overrides. Keys are unprefixed (e.g., 'theme', not 'wf.theme').
 * Values are raw strings — validated against schemas when applied.
 */
export const UrlOverridesSchema = v.record(v.string(), v.string());
export type UrlOverrides = v.InferOutput<typeof UrlOverridesSchema>;
```

### Schema Introspection Strategy

The debug system uses Valibot schema introspection to auto-discover state fields:

- `AppPreferencesSchema.entries` → `{ appName, theme, mode, locale, sidebarOpen }`
- `FeatureFlagsSchema.entries` → `{ settings, themeSelection, ... }`

When a new field is added to either schema, the debug system sees it automatically:
- URL parser accepts `?wf.<newField>=value` if the key exists in schema entries
- State logger watches it (via `$effect` on the full store, diffing snapshots)
- Devtools API exposes it via `.state` (which returns `$state.snapshot()`)
- `setFeature()` already validates against the schema dynamically

No hardcoded field lists anywhere in the debug system.

---

## Module Design

### 1. `lib/stores/debug-state.svelte.ts` — Debug Store

**Pattern:** Mirrors `editor-state.svelte.ts` — module-level `$state`, singleton, `Result<Void>` setters.

```typescript
// Module-level reactive state
let _debug: DebugState = $state({ enabled: false, logLevel: 'info' });
let _urlOverrides: UrlOverrides = $state({});

export type DebugStore = {
  readonly debug: DebugState;
  readonly urlOverrides: UrlOverrides;
  setEnabled(enabled: boolean): Result<Void>;
  setLogLevel(level: string): Result<Void>;
};

export function createDebugStore(url?: URL): Result<DebugStore>;
export function initDebugStore(url?: URL): DebugStore;
export function useDebugStore(): DebugStore;
```

**URL parsing:** `createDebugStore(url)` calls `parseDebugParams(url)` internally.
**Persistence:** `localStorage('webforge:debug-state')` — only `{ enabled, logLevel }`, not URL overrides (those are session-only).

### 2. `lib/utils/url-params.ts` — URL Parameter Parser

Pure functions, no side effects, no Svelte dependencies.

```typescript
/**
 * Extracts all wf.* prefixed parameters from a URL.
 * Returns unprefixed keys mapped to raw string values.
 *
 * ?wf.debug=true&wf.logLevel=trace&wf.theme=midnight&wf.ff.settings=false
 * → { debug: 'true', logLevel: 'trace', theme: 'midnight', 'ff.settings': 'false' }
 */
export function parseDebugParams(url: URL): Result<UrlOverrides>;

/**
 * Applies URL overrides to the editor store.
 * Validates each override against the appropriate schema before applying.
 *
 * Handles three categories:
 * 1. Debug params: 'debug', 'logLevel' → DebugStore setters
 * 2. App params: 'theme', 'mode', 'locale', 'sidebarOpen' → EditorStore setters
 * 3. Feature flag params: 'ff.*' → EditorStore.setFeature()
 *
 * Uses schema introspection to validate:
 * - App keys checked against AppPreferencesSchema.entries
 * - Feature flag keys checked against FeatureFlagsSchema.entries
 * - Unknown keys are silently ignored (not errors)
 */
export function applyUrlOverrides(
  editorStore: EditorStore,
  debugStore: DebugStore,
  overrides: UrlOverrides,
): Result<Void>;
```

### 3. `lib/debug/state-logger.svelte.ts` — State Change Logger

Watches the EditorStore via `$effect` and diffs `$state.snapshot()` on each change.

```
▸ EditorStore.app.theme  "warm" → "midnight"              12:34:56.789
    old: "warm"
    new: "midnight"
```

**Implementation approach:**
- Stores previous snapshot via `let prev = $state.snapshot(store.app)`
- `$effect` fires on any store change → takes new snapshot → deep-compares keys
- For each changed key, logs a `console.groupCollapsed` with styled badges
- Uses `requestIdleCallback` to batch rapid successive changes (e.g., loading from localStorage sets multiple fields)

**Auto-discovery:** Iterates `Object.keys(snapshot)` — no hardcoded property list. New fields are automatically watched.

**Activation:** Only creates `$effect` watchers when `debugStore.debug.enabled === true`. Watches `debugStore.debug.enabled` in a top-level effect to create/destroy sub-effects.

**Log level filtering:** State change logs are at `debug` level. Only shown when `logLevel` is `debug` or `trace`.

```typescript
/**
 * Creates the state change logger. Returns a cleanup function.
 * Automatically watches all EditorStore properties via schema introspection.
 */
export function createStateLogger(
  editorStore: EditorStore,
  debugStore: DebugStore,
): { destroy(): void };
```

### 4. `lib/debug/devtools-api.svelte.ts` — Window Global API

Registers `window.__EDITOR_DEVTOOLS__` when debug mode is enabled.

```typescript
// What gets exposed on the window:
type EditorDevtools = {
  // State inspection — returns $state.snapshot() each access
  readonly state: {
    readonly app: AppPreferences;
    readonly features: FeatureFlags;
    readonly debug: DebugState;
  };

  // Generic state mutation (auto-discovered from schema)
  set(path: string, value: unknown): void;
  // e.g., set('app.theme', 'midnight'), set('features.settings', false)

  // Convenience methods (delegate to EditorStore/DebugStore)
  setTheme(theme: string): void;
  setMode(mode: string): void;
  setLocale(locale: string): void;
  setSidebarOpen(open: boolean): void;
  setFeature(flag: string, enabled: boolean): void;
  setLogLevel(level: string): void;

  // Debug controls
  enable(): void;
  disable(): void;
  logState(): void;          // pretty-print full state snapshot
  logFeatures(): void;       // pretty-print feature flags table

  // Extension registry
  register(namespace: string, api: Record<string, unknown>): void;
  unregister(namespace: string): void;

  // Meta
  readonly appName: string;
  readonly version: string;
};
```

**Key behaviors:**
- `state` uses a getter that calls `$state.snapshot()` each time — always current, never stale
- `set('app.theme', 'midnight')` parses the path, validates against the schema, calls the appropriate store setter
- `register('myPlugin', { ... })` adds properties at the top level: `__EDITOR_DEVTOOLS__.myPlugin.someMethod()`
- `unregister('myPlugin')` removes the namespace
- Global is removed from `window` when debug mode is disabled (`delete window.__EDITOR_DEVTOOLS__`)
- Global key is fixed (`__EDITOR_DEVTOOLS__`) — app-name-agnostic so scripts/extensions can always find it. The `appName` property inside exposes the current name.

```typescript
/**
 * Creates and registers the devtools API on the window object.
 * Returns a cleanup function that removes the global.
 */
export function createDevtoolsAPI(
  editorStore: EditorStore,
  debugStore: DebugStore,
): { destroy(): void };
```

### 5. `lib/debug/console-styles.ts` — Console Styling Utilities

Pure constants and formatting functions. No Svelte, no side effects.

```typescript
/** CSS style strings for console.log('%c...', style) formatting. */
export const styles = {
  storeBadge: 'background:#1a6b6b;color:#fff;padding:1px 6px;border-radius:3px;font-weight:bold',
  propPath: 'color:#888;font-family:monospace',
  oldValue: 'color:#f44',
  newValue: 'color:#4f4',
  timestamp: 'color:#666;font-size:0.85em',
  debugBadge: 'background:#b8860b;color:#fff;padding:1px 6px;border-radius:3px;font-weight:bold',
  warnBadge: 'background:#f90;color:#000;padding:1px 6px;border-radius:3px;font-weight:bold',
  errorBadge: 'background:#f44;color:#fff;padding:1px 6px;border-radius:3px;font-weight:bold',
  infoBadge: 'background:#4a9eff;color:#fff;padding:1px 6px;border-radius:3px;font-weight:bold',
  reset: 'color:inherit',
} as const;

/**
 * Formats a timestamp for console output.
 * @returns "HH:MM:SS.mmm"
 */
export function formatTimestamp(): string;

/**
 * Deep-compares two plain objects and returns changed keys with old/new values.
 */
export function diffSnapshot(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): Array<{ key: string; old: unknown; new: unknown }>;
```

### 6. `lib/debug/init.svelte.ts` — Debug Service Orchestrator

Single entry point that conditionally starts/stops all debug services.

```typescript
/**
 * Initializes all debug services. Call once in +layout.svelte after stores are ready.
 * Watches debug.enabled — starts/stops logger + devtools API reactively.
 *
 * When debug.enabled transitions:
 *   false → true:  create state logger + register window global
 *   true → false:  destroy state logger + remove window global
 */
export function initDebugServices(
  editorStore: EditorStore,
  debugStore: DebugStore,
): void;
```

---

## Integration Points

### `+layout.svelte` changes

```svelte
<script>
  import { initDebugStore } from '$lib/stores/debug-state.svelte';
  import { applyUrlOverrides } from '$lib/utils/url-params';
  import { initDebugServices } from '$lib/debug/init.svelte';
  import { page } from '$app/state';
  import { browser } from '$app/environment';

  // ... existing store init ...
  const store = initEditorStore();

  // NEW: Debug store + URL overrides (client-only)
  const debugStore = browser ? initDebugStore(page.url) : undefined;
  if (browser && debugStore) {
    applyUrlOverrides(store, debugStore, debugStore.urlOverrides);
    initDebugServices(store, debugStore);
  }
</script>
```

### `hooks.client.ts` changes

Minimal — the existing error logging infrastructure stays as-is. The debug system is orthogonal to error handling. No changes needed to `hooks.client.ts` since initialization happens in `+layout.svelte`.

### `app.d.ts` changes

```typescript
declare global {
  namespace App {
    interface Error {
      message: string;
      errorId?: string;
    }
    interface Locals {
      locale: string;
    }
  }

  // Devtools global — only present when debug mode is enabled
  interface Window {
    __EDITOR_DEVTOOLS__?: import('$lib/debug/devtools-api.svelte').EditorDevtools;
  }
}
```

---

## Locale Keys

### Schema additions (`lib/locales/schema.ts`)

```typescript
debug: v.strictObject({
  enabled: messageTemplate(),
  disabled: messageTemplate(),
  logLevel: messageTemplate({ level: v.string() }),
  urlOverride: messageTemplate({ key: v.string(), value: v.string() }),
}),
```

### English strings (`lib/locales/en.ts`)

```typescript
debug: {
  enabled: 'Debug mode enabled',
  disabled: 'Debug mode disabled',
  logLevel: 'Log level: {level}',
  urlOverride: 'URL override: {key} = {value}',
},
```

All 7 locale files get translated equivalents.

---

## Console Output Examples

### Debug mode activation (on page load with `?wf.debug=true`)

```
%c DEBUG %c Debug mode enabled
%c DEBUG %c Log level: info
%c DEBUG %c URL override: theme = midnight
```

### State change (user switches theme in UI)

```
▸ %c EditorStore %c app.theme %c "warm" → "midnight" %c 12:34:56.789
    old: "warm"
    new: "midnight"
```

### `__EDITOR_DEVTOOLS__.logState()` output

```
┌─ Editor State ──────────────────────┐
│ app.appName      "WebForge"         │
│ app.theme        "midnight"         │
│ app.mode         "dark"             │
│ app.locale       "en"               │
│ app.sidebarOpen  true               │
├─ Feature Flags ─────────────────────┤
│ settings         true               │
│ themeSelection   true               │
│ ...                                 │
├─ Debug ─────────────────────────────┤
│ enabled          true               │
│ logLevel         "info"             │
└─────────────────────────────────────┘
```

---

## What's Automated vs. Manual

| Action | Automated? | How |
|--------|-----------|-----|
| New field in `AppPreferencesSchema` | Yes | Schema introspection in logger + devtools `.state` + URL parser |
| New field in `FeatureFlagsSchema` | Yes | Schema introspection + `?wf.ff.*` URL pattern + `setFeature()` |
| New store setter method | No | Add convenience method to devtools API (but `set('path', value)` works immediately) |
| New debug service/namespace | No | Call `register('namespace', api)` from the new module |

The generic `set('app.newField', value)` path always works for new schema fields without any debug system changes. Convenience methods (like `setTheme()`) are optional sugar.

---

## File Summary

| File | Type | Purpose |
|------|------|---------|
| `lib/schemas/debug-state.ts` | New | Valibot schemas for debug config, URL prefix constant |
| `lib/stores/debug-state.svelte.ts` | New | Debug state store, URL param parsing, singleton |
| `lib/utils/url-params.ts` | New | Pure URL param extraction + override application |
| `lib/debug/console-styles.ts` | New | Console CSS styles + diff utility |
| `lib/debug/state-logger.svelte.ts` | New | Reactive state change logger |
| `lib/debug/devtools-api.svelte.ts` | New | Window global devtools API + registry |
| `lib/debug/init.svelte.ts` | New | Debug service orchestrator |
| `lib/locales/schema.ts` | Modify | Add `debug` section |
| `lib/locales/en.ts` | Modify | Add English debug strings |
| `lib/locales/ja.ts` | Modify | Add Japanese debug strings |
| `lib/locales/zh.ts` | Modify | Add Chinese debug strings |
| `lib/locales/ko.ts` | Modify | Add Korean debug strings |
| `lib/locales/fr.ts` | Modify | Add French debug strings |
| `lib/locales/de.ts` | Modify | Add German debug strings |
| `lib/locales/es.ts` | Modify | Add Spanish debug strings |
| `routes/+layout.svelte` | Modify | Init debug store + apply overrides |
| `app.d.ts` | Modify | Window interface augmentation |

**7 new files, 10 modified files.**
