# Dev Toolbar — Implementation Plan

**Date:** 2026-03-03
**Design doc:** `docs/plans/2026-03-03-dev-toolbar-design.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Prerequisites

Install shadcn-svelte components:
```bash
cd packages/products/webforge/editor && npx shadcn-svelte@latest add popover switch select label scroll-area
```

---

## Task 1: Schema Introspection Registry

**Files:**
- `src/lib/debug/dev-toolbar-registry.test.ts` (test first)
- `src/lib/debug/dev-toolbar-registry.ts`

**Test (`dev-toolbar-registry.test.ts`):**
- `discoverFeatureFlags()` returns array with entry per flag in `FeatureFlagsSchema`
- Each entry has `{ key: string; default: boolean }`
- Count matches `Object.keys(FeatureFlagsSchema.entries).length`
- Known flag `'settings'` appears with `default: true`
- `discoverAppPreferences()` returns array with entry per field in `AppPreferencesSchema`
- `theme` has `type: 'picklist'` and `options` includes `'midnight'`
- `sidebarOpen` has `type: 'boolean'`
- `appName` has `type: 'string'`
- `discoverDebugFields()` returns array for `DebugStateSchema`
- `enabled` has `type: 'boolean'`
- `logLevel` has `type: 'picklist'` and `options` includes `'trace'`
- `generateDebugUrl()` builds correct `wf.*` URL params from store state
- `humanizeKey()` converts camelCase to Title Case (`'sceneList'` → `'Scene List'`)

**Implementation (`dev-toolbar-registry.ts`):**

```typescript
type FieldDescriptor = {
  key: string;
  type: 'boolean' | 'picklist' | 'string';
  options?: readonly string[];
  default: unknown;
};

type FlagDescriptor = {
  key: string;
  default: boolean;
};
```

- `discoverFeatureFlags(): FlagDescriptor[]` — iterate `FeatureFlagsSchema.entries`, extract key + default
- `discoverAppPreferences(): FieldDescriptor[]` — iterate `AppPreferencesSchema.entries`, inspect Valibot node type of each entry's `wrapped` schema to determine control type
- `discoverDebugFields(): FieldDescriptor[]` — same for `DebugStateSchema.entries`
- `generateDebugUrl(editorStore, debugStore, baseUrl?): string` — builds URL with `wf.*` params
- `humanizeKey(key: string): string` — splits camelCase, capitalizes words

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 2: DevToolbarFeatureFlags Component

**Files:**
- `src/lib/components/dev-toolbar-feature-flags.test.ts` (test first)
- `src/lib/components/DevToolbarFeatureFlags.svelte`

**Test (`dev-toolbar-feature-flags.test.ts`):**
- Renders a Switch for each feature flag (count matches schema)
- Each Switch has an accessible label (humanized flag name)
- Search input filters flags by name
- "Enable All" button enables all flags
- "Disable All" button disables all flags
- Toggling a Switch calls `editorStore.setFeature()`
- Badge text shows `"N/M"` format (enabled/total)
- Reflects current store state reactively (if a flag is false, switch is off)

**Implementation (`DevToolbarFeatureFlags.svelte`):**
- Props: `editorStore: EditorStore`
- Uses `discoverFeatureFlags()` to get flag list
- `$derived` filteredFlags from searchQuery
- `$derived` enabledCount from store.features
- Renders: Input (search) + ScrollArea containing Label+Switch per flag + footer buttons

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 3: DevToolbarAppState Component

**Files:**
- `src/lib/components/dev-toolbar-app-state.test.ts` (test first)
- `src/lib/components/DevToolbarAppState.svelte`

**Test (`dev-toolbar-app-state.test.ts`):**
- Renders correct control type per field:
  - `theme` → Select with 12 options
  - `mode` → Select with 3 options
  - `locale` → Select with 7 options
  - `sidebarOpen` → Switch
  - `appName` → Input
- Each control has an accessible label
- Changing a Select calls the correct store setter
- Toggling sidebarOpen Switch calls `setSidebarOpen()`
- "Reset to Defaults" button resets all preferences
- Reflects current store state reactively

**Implementation (`DevToolbarAppState.svelte`):**
- Props: `editorStore: EditorStore`
- Uses `discoverAppPreferences()` to get field list
- Renders: for each field, appropriate control based on `type`
  - `picklist` → `Select.Root` + `Select.Trigger` + `Select.Content` + `Select.Item` per option
  - `boolean` → `Switch`
  - `string` → `Input`
- Footer: "Reset to Defaults" button

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 4: DevToolbarDebug Component

**Files:**
- `src/lib/components/dev-toolbar-debug.test.ts` (test first)
- `src/lib/components/DevToolbarDebug.svelte`

**Test (`dev-toolbar-debug.test.ts`):**
- Renders debug enabled Switch
- Renders log level Select with 5 options
- "Log State" button exists and is clickable
- "Log Features" button exists and is clickable
- "Copy Debug URL" button exists
- URL overrides section shows active overrides when present
- URL overrides section hidden when no overrides

**Implementation (`DevToolbarDebug.svelte`):**
- Props: `editorStore: EditorStore`, `debugStore: DebugStore`
- Uses `discoverDebugFields()` for debug controls
- Quick action buttons call devtools API methods
- "Copy Debug URL" calls `generateDebugUrl()` then `navigator.clipboard.writeText()`
- URL overrides: reads `debugStore.urlOverrides`, renders as read-only list

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 5: DevToolbar Root Component

**Files:**
- `src/lib/components/dev-toolbar.test.ts` (test first)
- `src/lib/components/DevToolbar.svelte`

**Test (`dev-toolbar.test.ts`):**
- Renders trigger pill with "DEV" text
- Clicking trigger expands toolbar bar
- Toolbar bar has `role="toolbar"` and `aria-label`
- Three panel buttons visible: flags, app state, debug
- Quick action buttons visible: mode toggle, copy info, reset
- Clicking a panel button opens its popover
- Clicking same button again closes popover
- Only one panel open at a time
- Escape closes active panel
- Toolbar is hidden when debug not enabled

**Implementation (`DevToolbar.svelte`):**
- Uses `useEditorStore()` and `useDebugStore()` singletons
- State: `toolbarOpen`, `activePanel`
- Trigger pill: button with wrench icon + "DEV" badge
- Toolbar bar: horizontal flex with Tooltip-wrapped icon buttons
- Three Popover panels anchored to their toolbar buttons, `side="top"`
- Quick action buttons inline in toolbar
- Keyboard: `Escape` to close panel, arrow keys for navigation
- Global `Ctrl+Shift+D` listener registered in `$effect` for toggle

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 6: Layout Integration

**Files:**
- `src/routes/+layout.svelte` (modify)

**Changes:**
- Import `DevToolbar` component
- Add after `</Sidebar.Provider>`:
  ```svelte
  {#if browser && debugStore}
    <DevToolbar />
  {/if}
  ```
- The `DevToolbar` component internally checks `debugStore.debug.enabled` for visibility
- Add `Ctrl+Shift+D` as a global keyboard shortcut that also enables debug mode if not active

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 7: E2E Tests

**Files:**
- `e2e/dev-toolbar.test.ts`

**Tests:**
- Dev toolbar not visible when debug disabled (default)
- Dev toolbar appears after enabling debug via URL param (`?wf.debug=true`)
- Toolbar trigger pill visible and clickable
- Clicking trigger expands toolbar with panel buttons
- Feature flags panel: opens, shows switches, toggling a flag hides the corresponding UI element
- App state panel: opens, theme select changes theme
- Debug panel: opens, shows log level select
- Quick action: mode toggle cycles through modes
- Keyboard: `Ctrl+Shift+D` toggles toolbar
- Keyboard: `Escape` closes panel

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test:e2e`

---

## Task 8: Documentation

**Files:**
- `docs/ARCHITECTURE.md` (update)

**Changes:**
- Add "Dev Toolbar" section under Editor features
- Document auto-discovery architecture
- Document keyboard shortcuts
- Document URL params for debug activation

**QA:** Verify docs are accurate

---

## Verification

After all tasks:
1. `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format` — all pass
2. `pnpm qa:test` — all unit tests pass
3. `pnpm qa:test:e2e` — all E2E tests pass (including new dev toolbar tests)
4. Adding a new feature flag to `FeatureFlagsSchema` automatically shows in toolbar (manual verify)
