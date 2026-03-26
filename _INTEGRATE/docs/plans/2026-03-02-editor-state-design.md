# Editor Global State Management — Design

## Overview

Centralize the editor's fragmented state (mode-watcher, locale cookie, sidebar cookie) into a single Valibot-backed reactive store. All mutations validated, all reads fine-grained reactive, all persistence unified through localStorage.

## Current State (Fragmented)

| State | Storage | Access | Problem |
|-------|---------|--------|---------|
| Theme | mode-watcher (localStorage) | `setTheme()` / `theme.current` | No validation, not schema-backed |
| Mode | mode-watcher (localStorage) | `setMode()` / `userPrefersMode.current` | Same |
| Locale | Cookie `locale` + `localeStore` | `localeStore.setLocale()` | Split across cookie + store + SSR |
| Sidebar | Cookie `sidebar:state` + context | `useSidebar().setOpen()` | Cookie + context, not unified |
| App name | Hardcoded `'WebForge'` in NavUser | — | Not configurable |
| Feature flags | Don't exist | — | No way to toggle editor features |

## Target Architecture

```
EditorStore (singleton, module-level $state)
├── app: AppPreferences
│   ├── appName: Str          (default: 'WebForge')
│   ├── theme: ThemeId        (default: '')
│   ├── mode: Mode            (default: 'system')
│   ├── locale: LocaleCode    (default: 'en')
│   └── sidebarOpen: Bool     (default: true)
└── features: FeatureFlags
    ├── settings: Bool        (default: true)
    ├── themeSelection: Bool  (default: true)
    ├── languageSelection: Bool (default: true)
    ├── modeToggle: Bool      (default: true)
    ├── sidebar: Bool         (default: true)
    ├── sceneList: Bool       (default: true)
    └── assetBrowser: Bool    (default: true)
```

## Schemas

File: `src/lib/schemas/editor-state.ts`

```typescript
import * as v from 'valibot';

export const SUPPORTED_LOCALES = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'] as const;
export const SUPPORTED_THEMES = [
  '', 'midnight', 'warm', 'forest', 'ocean', 'rose',
  'lavender', 'sunset', 'slate', 'copper', 'aurora', 'amethyst',
] as const;
export const SUPPORTED_MODES = ['light', 'dark', 'system'] as const;

export const AppPreferencesSchema = v.strictObject({
  appName: v.optional(v.pipe(v.string(), v.minLength(1)), 'WebForge'),
  theme: v.optional(v.picklist(SUPPORTED_THEMES), ''),
  mode: v.optional(v.picklist(SUPPORTED_MODES), 'system'),
  locale: v.optional(v.picklist(SUPPORTED_LOCALES), 'en'),
  sidebarOpen: v.optional(v.boolean(), true),
});

export const FeatureFlagsSchema = v.strictObject({
  settings: v.optional(v.boolean(), true),
  themeSelection: v.optional(v.boolean(), true),
  languageSelection: v.optional(v.boolean(), true),
  modeToggle: v.optional(v.boolean(), true),
  sidebar: v.optional(v.boolean(), true),
  sceneList: v.optional(v.boolean(), true),
  assetBrowser: v.optional(v.boolean(), true),
});

export const EditorStateSchema = v.strictObject({
  app: AppPreferencesSchema,
  features: FeatureFlagsSchema,
});
```

## Store Implementation

File: `src/lib/stores/editor-state.svelte.ts`

### Pattern: Module-level `$state` + factory

```typescript
// Reactive state (module-level, one per client)
let _app = $state<AppPreferences>(defaults);
let _features = $state<FeatureFlags>(defaults);

// Store object with getters + validated setters
export type EditorStore = {
  readonly app: AppPreferences;
  readonly features: FeatureFlags;
  setTheme(theme: ThemeId): Result<Void>;
  setMode(mode: Mode): Result<Void>;
  setLocale(locale: LocaleCode): Result<Void>;
  setAppName(name: Str): Result<Void>;
  setSidebarOpen(open: Bool): Result<Void>;
  setFeature(flag: keyof FeatureFlags, enabled: Bool): Result<Void>;
  save(): Result<Void>;
  load(): Result<Void>;
};
```

### Persistence

- **Key:** `'webforge:editor-state'` in localStorage
- **Format:** JSON string of `{ app: AppPreferences, features: FeatureFlags }`
- **Load:** On `initEditorStore()`, parse localStorage → `safeParse(EditorStateSchema, data)` → hydrate `$state`
- **Save:** On every mutation, serialize to localStorage (debounced is unnecessary — writes are infrequent)

### Sync Layer

The store is the source of truth. External systems are synced via `$effect()` in `+layout.svelte`:

```
store.app.mode    → $effect → setMode() (mode-watcher)
store.app.theme   → $effect → setTheme() (mode-watcher)
store.app.locale  → $effect → localeStore.setLocale() + cookie + html attrs
store.app.sidebarOpen → read by sidebar-provider as defaultOpen
```

Components call store methods instead of mode-watcher/localeStore directly. The `$effect` sync keeps external libraries updated.

### SSR Considerations

- `$state` in `.svelte.ts` is per-client (SvelteKit creates a new module scope per request)
- `localStorage` access guarded with browser check in `load()`
- SSR still detects locale from cookie in `hooks.server.ts` and passes via `+layout.server.ts`
- Client-side: `initEditorStore()` loads from localStorage, overriding the SSR-detected locale if different

## Data Flow

```
                    ┌─────────────────┐
                    │  localStorage   │
                    │ webforge:editor │
                    └────────┬────────┘
                             │ load()/save()
                    ┌────────▼────────┐
                    │  EditorStore    │
                    │  $state runes   │
                    └──┬──┬──┬──┬────┘
          $effect sync │  │  │  │ reactive reads
    ┌──────────────────┘  │  │  └──────────────────┐
    ▼                     ▼  ▼                      ▼
mode-watcher      localeStore  sidebar-context   components
(theme, mode)     (locale)     (sidebarOpen)     ({#if features.x})
```

## Component Integration

### +layout.svelte
```svelte
<script lang="ts">
  import { initEditorStore } from '$lib/stores/editor-state.svelte';
  import { setMode, setTheme } from 'mode-watcher';
  import { localeStore } from '$lib/i18n.svelte';

  const store = initEditorStore();

  // Sync store → external systems
  $effect(() => { setMode(store.app.mode); });
  $effect(() => { setTheme(store.app.theme); });
  $effect(() => {
    if (store.app.locale !== localeStore.locale) {
      localeStore.setLocale(store.app.locale);
    }
  });
</script>
```

### ModeToggle.svelte
```svelte
<script lang="ts">
  import { useEditorStore } from '$lib/stores/editor-state.svelte';
  const store = useEditorStore();
</script>
<!-- store.setMode('dark') instead of setMode('dark') -->
```

### Feature flag gating
```svelte
{#if store.features.themeSelection}
  <ThemeSwitcher />
{/if}
```

## Files Modified

| File | Change |
|------|--------|
| `src/lib/schemas/editor-state.ts` | **New** — Valibot schemas |
| `src/lib/stores/editor-state.svelte.ts` | **New** — reactive store |
| `src/lib/schemas/editor-state.test.ts` | **New** — schema tests |
| `src/lib/stores/editor-state.test.ts` | **New** — store tests |
| `src/routes/+layout.svelte` | Init store, add $effect sync |
| `src/lib/components/ModeToggle.svelte` | Use store.setMode() |
| `src/lib/components/ThemeSwitcher.svelte` | Use store.setTheme() |
| `src/lib/components/LanguageSwitcher.svelte` | Use store.setLocale() |
| `src/lib/components/NavUser.svelte` | Read store.app.appName |
| `src/lib/components/AppSidebar.svelte` | Feature flag gating on nav sections |

## No shadcn Primitives Needed

This is a state-only change. No new UI components.
