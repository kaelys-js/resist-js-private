# Dev Toolbar — Design Document

**Date:** 2026-03-03
**Feature:** Floating Astro-style development toolbar for the editor
**Dependencies:** shadcn-svelte (popover, switch, select, label, scroll-area), existing debug/devtools system

---

## Overview

A floating dev toolbar that appears when debug mode is active, providing GUI access to all feature flags, app preferences, debug state, and devtools API methods. Auto-discovers state from Valibot schemas — zero code changes needed when flags/preferences are added.

Inspired by Astro Dev Toolbar, Nuxt DevTools, and game engine debug overlays.

---

## Component Tree

```
+layout.svelte
└── DevToolbar (fixed, bottom-center, z-[99999])
    ├── Trigger pill ("DEV" badge + caret)
    │   └── Click toggles toolbar open/closed
    ├── Toolbar bar (horizontal icon row, ARIA role="toolbar")
    │   ├── FeatureFlags icon button → opens DevToolbarFeatureFlags popover
    │   ├── AppState icon button → opens DevToolbarAppState popover
    │   ├── Debug icon button → opens DevToolbarDebug popover
    │   ├── Separator
    │   ├── Quick action: toggle dark/light mode (inline button)
    │   ├── Quick action: copy debug info (inline button)
    │   └── Quick action: reset all state (inline button)
    └── Active panel popover (one at a time, opens upward from toolbar)
        ├── DevToolbarFeatureFlags — auto-generated Switch per flag
        ├── DevToolbarAppState — auto-generated Select/Switch/Input per pref
        └── DevToolbarDebug — debug toggle, log level, actions, URL overrides
```

---

## Auto-Discovery Architecture

The toolbar uses Valibot schema introspection to discover controls at runtime.

### Schema → Control Type Mapping

```typescript
// dev-toolbar-registry.ts

discoverFeatureFlags():
  Object.keys(FeatureFlagsSchema.entries)
  → Array<{ key: string; default: boolean }>
  → Renders: Switch per flag

discoverAppPreferences():
  Object.keys(AppPreferencesSchema.entries)
  → For each entry, inspect the Valibot pipe:
    - v.boolean()          → Switch
    - v.picklist(options)  → Select with options
    - v.string()           → Input text field
  → Array<{ key: string; type: 'boolean' | 'picklist' | 'string'; options?: readonly string[]; default: unknown }>

discoverDebugFields():
  Object.keys(DebugStateSchema.entries)
  → Same logic as above
  → Array<{ key: string; type: 'boolean' | 'picklist'; options?: readonly string[]; default: unknown }>

generateDebugUrl(editorStore, debugStore):
  → Builds URL with all wf.* params reflecting current state
  → Returns URL string
```

### Valibot Schema Introspection

Each `v.strictObject()` entry has a `.type` property indicating its Valibot node type. For `v.optional(inner, default)`:
- `entry.type` = `'optional'`
- `entry.wrapped` = the inner schema
- `entry.default` = the default value

For `v.pipe(v.string(), v.minLength(1))`:
- `pipe[0].type` = `'string'`

For `v.picklist(options)`:
- `schema.type` = `'picklist'`
- `schema.options` = the options array

For `v.boolean()`:
- `schema.type` = `'boolean'`

This gives us reliable type detection without hardcoding.

---

## Components

### DevToolbar.svelte (Root)

**Props:** none (uses `useEditorStore()` and `useDebugStore()` singletons)

**State:**
- `toolbarOpen: boolean` = `$state(false)` — whether the icon bar is expanded
- `activePanel: string | null` = `$state(null)` — which popover is open (`'flags'`, `'app'`, `'debug'`, or `null`)

**Lifecycle:**
- Only renders when `debugStore.debug.enabled === true`
- Mounted in `+layout.svelte` with `{#if browser}` guard (no SSR)

**Layout:**
- `position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%)`
- `z-index: 99999` (above everything)
- Dark theme always (matches debug aesthetic): `bg-zinc-900 text-zinc-100 border border-zinc-700`
- Rounded pill shape with subtle shadow

**Keyboard:**
- `Ctrl+Shift+D` toggles toolbar visibility (global keydown listener)
- `Escape` closes active panel
- Arrow Left/Right navigates toolbar icons (ARIA toolbar roving tabindex)

### DevToolbarFeatureFlags.svelte (Panel)

**Props:** `editorStore: EditorStore`

**State:**
- `searchQuery: string` = `$state('')` — filter input
- `flags` = `$derived` from `discoverFeatureFlags()` — auto-discovered flag list
- `filteredFlags` = `$derived` — flags filtered by searchQuery
- `enabledCount` / `totalCount` = `$derived` for badge display

**Controls:**
- Search input at top (shadcn Input)
- Scrollable list of flags (shadcn ScrollArea)
- Each flag: `<Label>` + `<Switch>` — Label is the camelCase key humanized (e.g., `sceneList` → `Scene List`)
- Footer: "Enable All" / "Disable All" buttons
- Badge on toolbar icon: `"14/16"` format showing enabled count

**Data flow:**
- Read: `editorStore.features[flag.key]` (reactive)
- Write: `editorStore.setFeature(flag.key, newValue)`

### DevToolbarAppState.svelte (Panel)

**Props:** `editorStore: EditorStore`

**State:**
- `preferences` = `$derived` from `discoverAppPreferences()` — auto-discovered field list

**Controls per field type:**
- `picklist` → shadcn `Select` with options from the schema's picklist array
  - `theme` → shows all 12 themes
  - `mode` → shows `light`, `dark`, `system`
  - `locale` → shows all 7 locales
- `boolean` → shadcn `Switch`
  - `sidebarOpen` → toggle
- `string` → shadcn `Input`
  - `appName` → text input

- Footer: "Reset to Defaults" button

**Data flow:**
- Read: `editorStore.app[pref.key]` (reactive)
- Write: calls the auto-mapped setter (`setTheme`, `setMode`, etc.)

**Setter mapping:**
```typescript
// Capitalize first letter: 'theme' → 'setTheme'
const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
const setter = editorStore[setterName];
```

### DevToolbarDebug.svelte (Panel)

**Props:** `editorStore: EditorStore`, `debugStore: DebugStore`

**State:**
- `debugFields` = `$derived` from `discoverDebugFields()` — auto-discovered debug fields
- `urlOverrides` = `$derived` from `debugStore.urlOverrides`

**Sections:**
1. **Debug fields** — same auto-generated controls as app state
   - `enabled`: Switch
   - `logLevel`: Select from `LOG_LEVELS`

2. **Quick actions** — buttons:
   - "Log State" → `window.__EDITOR_DEVTOOLS__?.logState()`
   - "Log Features" → `window.__EDITOR_DEVTOOLS__?.logFeatures()`
   - "Copy Debug URL" → builds URL via `generateDebugUrl()`, copies to clipboard

3. **Active URL overrides** — read-only display of `debugStore.urlOverrides`
   - Each override: `wf.key = value` in a compact list
   - Only shown when overrides exist

### DevToolbarQuickActions (inline in toolbar bar)

Not a separate component — inline buttons in `DevToolbar.svelte`:

1. **Toggle mode** — cycles `light` → `dark` → `system`
   - Icon: Sun/Moon/Monitor based on current mode
2. **Copy debug info** — copies state JSON to clipboard
3. **Reset all state** — resets editor + debug stores to defaults (with confirmation)

---

## State Flow

```
User interaction in toolbar
  → DevToolbar*.svelte event handler
    → editorStore.setFeature() / setTheme() / etc.
      → Module-level $state mutation
        → Svelte reactivity propagates to all consumers
          → AppSidebar, SiteHeader, etc. re-render
          → State logger logs the change (if debug logLevel allows)
```

The toolbar is just another consumer/producer of the same reactive state. No special plumbing needed.

---

## Styling

- Always dark theme regardless of app mode (standard for dev tools)
- Uses Tailwind utility classes directly (not CSS variables from the app theme)
- Fixed colors: `bg-zinc-900`, `text-zinc-100`, `border-zinc-700`
- Accent: `bg-cyan-600` / `text-cyan-400` for active states (matches project's cyan accent)
- Popover panels: max-height `60vh`, scrollable content area
- Panel width: `320px` (comfortable for controls)
- Transition: slide-up + fade for panels, scale for toolbar expand

---

## Accessibility

- Toolbar: `role="toolbar"`, `aria-label="Developer toolbar"`, `aria-orientation="horizontal"`
- Roving tabindex: one button has `tabindex="0"`, others `tabindex="-1"`
- Arrow Left/Right to navigate between toolbar buttons
- Each popover panel: `aria-labelledby` pointing to its toolbar button
- All switches have proper `<Label>` associations
- `Escape` closes the active popover and returns focus to the trigger button
- Screen reader announcement when toolbar appears/disappears

---

## Integration Point

In `+layout.svelte`, after the existing debug store initialization:

```svelte
<!-- After existing Sidebar.Provider -->
{#if browser && debugStore?.debug.enabled}
  <DevToolbar />
{/if}
```

The toolbar reads from the same singleton stores via `useEditorStore()` and `useDebugStore()`.

---

## File Structure

```
src/lib/components/
  DevToolbar.svelte                    — Root toolbar + quick actions
  DevToolbarFeatureFlags.svelte        — Feature flags panel
  DevToolbarAppState.svelte            — App preferences panel
  DevToolbarDebug.svelte               — Debug state + actions panel

src/lib/debug/
  dev-toolbar-registry.ts              — Schema introspection utilities
  dev-toolbar-registry.test.ts         — Tests for auto-discovery functions

src/lib/components/ui/                 — shadcn-svelte (install new):
  popover/                             — Popover component
  switch/                              — Switch toggle component
  select/                              — Select dropdown component
  label/                               — Label component
  scroll-area/                         — Scroll area component
```

---

## What Auto-Discovers vs. What's Manual

| Change | Auto-discovered? | Reason |
|--------|------------------|--------|
| New feature flag in `FeatureFlagsSchema` | Yes | `discoverFeatureFlags()` reads schema entries |
| New app preference in `AppPreferencesSchema` | Yes | `discoverAppPreferences()` reads schema entries |
| New theme/mode/locale in `SUPPORTED_*` | Yes | Picklist options read from schema |
| New log level in `LOG_LEVELS` | Yes | Picklist options read from schema |
| New debug field in `DebugStateSchema` | Yes | `discoverDebugFields()` reads schema entries |
| Entirely new state section (e.g., plugins) | No | Requires new panel component + registry function |
