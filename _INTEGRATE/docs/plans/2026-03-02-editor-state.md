# Editor Global State Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Task 1: Schema file + tests

### 1a. Create schema file

**File:** `packages/products/webforge/editor/src/lib/schemas/editor-state.ts`

- Define `SUPPORTED_LOCALES`, `SUPPORTED_THEMES`, `SUPPORTED_MODES` const arrays
- Define `AppPreferencesSchema` with: `appName`, `theme`, `mode`, `locale`, `sidebarOpen` — all optional with defaults
- Define `FeatureFlagsSchema` with: `settings`, `themeSelection`, `languageSelection`, `modeToggle`, `sidebar`, `sceneList`, `assetBrowser` — all optional booleans defaulting to `true`
- Define `EditorStateSchema` as `v.strictObject({ app: AppPreferencesSchema, features: FeatureFlagsSchema })`
- Export inferred types: `AppPreferences`, `FeatureFlags`, `EditorState`
- Export const arrays for use in components (picklists, etc.)

### 1b. Write schema tests

**File:** `packages/products/webforge/editor/src/lib/schemas/editor-state.test.ts`

Tests:
- `AppPreferencesSchema` accepts empty object (all defaults)
- `AppPreferencesSchema` accepts full valid object
- `AppPreferencesSchema` rejects invalid theme value
- `AppPreferencesSchema` rejects invalid mode value
- `AppPreferencesSchema` rejects invalid locale value
- `AppPreferencesSchema` rejects empty appName (minLength 1)
- `FeatureFlagsSchema` accepts empty object (all defaults true)
- `FeatureFlagsSchema` accepts partial override
- `EditorStateSchema` accepts nested valid object
- `EditorStateSchema` rejects unknown keys (strictObject)
- Defaults: verify AppPreferences defaults are `{ appName: 'WebForge', theme: '', mode: 'system', locale: 'en', sidebarOpen: true }`
- Defaults: verify FeatureFlags defaults are all `true`

### QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 2: Store file + tests

### 2a. Create store file

**File:** `packages/products/webforge/editor/src/lib/stores/editor-state.svelte.ts`

- Module-level `$state<AppPreferences>` and `$state<FeatureFlags>` with schema defaults
- `STORAGE_KEY = 'webforge:editor-state'`
- `EditorStore` type with:
  - `readonly app: AppPreferences` (getter → `_app`)
  - `readonly features: FeatureFlags` (getter → `_features`)
  - `setAppName(name: Str): Result<Void>` — validate non-empty string, update `_app`, auto-save
  - `setTheme(theme): Result<Void>` — validate against picklist, update `_app`, auto-save
  - `setMode(mode): Result<Void>` — validate against picklist, update `_app`, auto-save
  - `setLocale(locale): Result<Void>` — validate against picklist, update `_app`, auto-save
  - `setSidebarOpen(open): Result<Void>` — update `_app`, auto-save
  - `setFeature(flag, enabled): Result<Void>` — validate flag key exists, update `_features`, auto-save
  - `save(): Result<Void>` — serialize `{ app: _app, features: _features }` → `localStorage.setItem(STORAGE_KEY, ...)`
  - `load(): Result<Void>` — `localStorage.getItem(STORAGE_KEY)` → `JSON.parse` → `safeParse(EditorStateSchema, ...)` → hydrate `_app` and `_features`
- `createEditorStore(): Result<EditorStore>` factory:
  - Try `load()` from localStorage
  - If no saved state or parse fails, use schema defaults
  - Return `okUnchecked(store)`
- `initEditorStore(): EditorStore` — creates singleton, throws if creation fails (called once in layout)
- `useEditorStore(): EditorStore` — returns singleton, throws if not initialized

### 2b. Write store tests

**File:** `packages/products/webforge/editor/src/lib/stores/editor-state.test.ts`

Note: These are unit tests. The store uses `$state` runes which require Svelte compilation. Use the svelte test preset. Mock `localStorage` via `vi.stubGlobal`.

Tests:
- `createEditorStore()` returns ok Result with default state
- `store.app` has correct defaults (appName='WebForge', theme='', mode='system', locale='en', sidebarOpen=true)
- `store.features` has all flags true by default
- `store.setTheme('midnight')` updates `store.app.theme` to 'midnight'
- `store.setTheme('invalid')` returns error Result, state unchanged
- `store.setMode('dark')` updates `store.app.mode`
- `store.setMode('invalid')` returns error Result
- `store.setLocale('ja')` updates `store.app.locale`
- `store.setLocale('xx')` returns error Result
- `store.setAppName('My Editor')` updates `store.app.appName`
- `store.setAppName('')` returns error Result (minLength 1)
- `store.setSidebarOpen(false)` updates `store.app.sidebarOpen`
- `store.setFeature('settings', false)` updates `store.features.settings` to false
- `store.setFeature('nonexistent', false)` returns error Result
- `store.save()` writes to localStorage key `'webforge:editor-state'`
- `store.load()` reads from localStorage and hydrates state
- `store.load()` with corrupted localStorage returns error, state stays at defaults
- Auto-save: calling `setTheme()` triggers `save()` (localStorage updated)

### QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 3: Wire store into +layout.svelte

### 3a. Update +layout.svelte

**File:** `packages/products/webforge/editor/src/routes/+layout.svelte`

- Import `initEditorStore` from `$lib/stores/editor-state.svelte`
- Call `initEditorStore()` at top level (replaces direct mode-watcher init)
- Add `$effect()` blocks to sync:
  - `store.app.mode` → `setMode()` (mode-watcher)
  - `store.app.theme` → `setTheme()` (mode-watcher)
  - `store.app.locale` → `localeStore.setLocale()` (only if changed)
- Keep existing `ModeWatcher` component (it still manages the DOM `.dark` class)
- Remove the `onMount` locale sync — the store handles this now via `$effect`
- Pass `store.app.sidebarOpen` as `defaultOpen` to `Sidebar.Provider` (read from store instead of cookie)

### QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 4: Refactor components to use store

### 4a. ModeToggle.svelte

**File:** `packages/products/webforge/editor/src/lib/components/ModeToggle.svelte`

- Import `useEditorStore` instead of `setMode`, `userPrefersMode` from mode-watcher
- Call `store.setMode('light'|'dark'|'system')` in onclick handlers
- Read `store.app.mode` for the checkmark display instead of `userPrefersMode.current`

### 4b. ThemeSwitcher.svelte

**File:** `packages/products/webforge/editor/src/lib/components/ThemeSwitcher.svelte`

- Import `useEditorStore` instead of `setTheme`, `theme` from mode-watcher
- Call `store.setTheme(id)` in onclick handler
- Read `store.app.theme` for the active checkmark instead of `theme.current`

### 4c. LanguageSwitcher.svelte

**File:** `packages/products/webforge/editor/src/lib/components/LanguageSwitcher.svelte`

- Import `useEditorStore` instead of direct `localeStore.setLocale` + cookie
- Call `store.setLocale(code)` in the `apply()` function
- Remove manual cookie setting (store.save() handles persistence)
- Keep the View Transitions API wrapper and html lang/dir attribute updates
- Read `store.app.locale` for the active checkmark instead of `localeStore.locale`

### 4d. NavUser.svelte

**File:** `packages/products/webforge/editor/src/lib/components/NavUser.svelte`

- Import `useEditorStore`
- Replace hardcoded project name with `store.app.appName`

### 4e. AppSidebar.svelte — feature flag gating

**File:** `packages/products/webforge/editor/src/lib/components/AppSidebar.svelte`

- Import `useEditorStore`
- Wrap scene list section with `{#if store.features.sceneList}`
- Wrap asset browser section with `{#if store.features.assetBrowser}`
- Wrap settings nav item with `{#if store.features.settings}`

### 4f. NavUser.svelte — feature flag gating in settings menu

- Wrap theme submenu with `{#if store.features.themeSelection}`
- Wrap language submenu with `{#if store.features.languageSelection}`
- Wrap mode toggle with `{#if store.features.modeToggle}`

### QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

---

## Task 5: Final QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test
```

All tests pass, no type errors, no lint errors in editor files, format clean.
