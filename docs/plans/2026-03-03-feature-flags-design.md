# Feature Flags System — Design Document

**Date:** 2026-03-03
**Scope:** Add 8 new feature flags, wire all 13 flags to components, full test coverage

## Overview

Granular feature flags controlling visibility of every major editor UI element. Each flag is a boolean in `FeatureFlagsSchema`, defaults to `true` (enabled), persists to localStorage, and is toggleable via devtools API and URL overrides.

## Feature Flag Inventory

### Existing Flags (6 wired + 2 unused)

| Flag | Controls | Component | Wired |
|------|----------|-----------|-------|
| `modeToggle` | Dark mode toggle button in header toolbar | `SiteHeader.svelte` | ✅ |
| `resizableSidebar` | PaneForge resize handle on sidebar | `+layout.svelte` | ✅ |
| `settings` | Settings item in sidebar secondary nav | `AppSidebar.svelte` | ✅ |
| `themeSelection` | Theme switcher in project dropdown | `NavUser.svelte` | ✅ |
| `languageSelection` | Language switcher in project dropdown | `NavUser.svelte` | ✅ |
| `sceneList` | Scene list group in sidebar content | `AppSidebar.svelte` | ✅ |
| `assetBrowser` | Assets group (Tilesets/Sprites/Audio) in sidebar | `AppSidebar.svelte` | ✅ |
| `sidebar` | (Unused — in schema but not wired to any component) | — | ❌ |

### New Flags (8)

| Flag | Controls | Component | Element |
|------|----------|-----------|---------|
| `breadcrumb` | Breadcrumb navigation in header | `SiteHeader.svelte` | `<Breadcrumb.Root>` block |
| `sidebarToggle` | Hamburger toggle button in header | `SiteHeader.svelte` | `<Sidebar.Trigger>` + separator |
| `sidebarHelp` | Help item in sidebar secondary nav | `AppSidebar.svelte` | Help entry in `navSecondary` array |
| `projectDropdown` | Entire project dropdown in sidebar footer | `AppSidebar.svelte` | `<NavUser>` component |
| `projectDropdownSettings` | Settings item inside project dropdown menu | `NavUser.svelte` | Settings `<DropdownMenu.Item>` |
| `projectDropdownIcon` | Avatar/logo icon in project dropdown trigger | `NavUser.svelte` | `<Avatar.Root>` in trigger |
| `appIconInSidebar` | WebForge logo in sidebar header | `AppSidebar.svelte` | Logo `<div>` in `Sidebar.Header` |
| `appNameInSidebar` | App name + subtitle text in sidebar header | `AppSidebar.svelte` | Text `<div>` in `Sidebar.Header` |

## Schema Design

```typescript
export const FeatureFlagsSchema = v.strictObject({
  // Existing
  settings: v.optional(v.boolean(), true),
  themeSelection: v.optional(v.boolean(), true),
  languageSelection: v.optional(v.boolean(), true),
  modeToggle: v.optional(v.boolean(), true),
  sidebar: v.optional(v.boolean(), true),
  sceneList: v.optional(v.boolean(), true),
  assetBrowser: v.optional(v.boolean(), true),
  resizableSidebar: v.optional(v.boolean(), true),
  // New
  breadcrumb: v.optional(v.boolean(), true),
  sidebarToggle: v.optional(v.boolean(), true),
  sidebarHelp: v.optional(v.boolean(), true),
  projectDropdown: v.optional(v.boolean(), true),
  projectDropdownSettings: v.optional(v.boolean(), true),
  projectDropdownIcon: v.optional(v.boolean(), true),
  appIconInSidebar: v.optional(v.boolean(), true),
  appNameInSidebar: v.optional(v.boolean(), true),
});
```

All 16 flags: `v.optional(v.boolean(), true)` — boolean, defaults to true, Valibot-validated.

## Component Wiring

### SiteHeader.svelte

```
header
├── [if sidebarToggle] Sidebar.Trigger + Tooltip + Separator
├── [if breadcrumb] Breadcrumb.Root > BreadcrumbList > Items
└── toolbar
    └── [if modeToggle] ModeToggle  (existing)
```

**Changes:**
- Wrap `<Tooltip.Root>` (trigger) + `<Separator>` in `{#if store.features.sidebarToggle}`
- Wrap `<Breadcrumb.Root>` in `{#if store.features.breadcrumb}`

### AppSidebar.svelte

```
Sidebar.Root
├── Sidebar.Header
│   └── Sidebar.MenuButton
│       ├── [if appIconInSidebar] logo div
│       └── [if appNameInSidebar] name + subtitle div
├── Sidebar.Content
│   ├── [if sceneList] NavScenes  (existing)
│   ├── [if assetBrowser] NavMain  (existing)
│   └── NavSecondary (items filtered by settings + sidebarHelp flags)
└── Sidebar.Footer
    └── [if projectDropdown] NavUser
```

**Changes:**
- Wrap logo `<div>` in `{#if store.features.appIconInSidebar}`
- Wrap name `<div>` in `{#if store.features.appNameInSidebar}`
- Add `sidebarHelp` flag to `navSecondary` array (Help currently unconditional)
- Wrap `<NavUser>` in `{#if store.features.projectDropdown}`

### NavUser.svelte

```
DropdownMenu.Root
├── DropdownMenu.Trigger > Sidebar.MenuButton
│   ├── [if projectDropdownIcon] Avatar.Root
│   ├── name + appName text
│   └── ChevronsUpDown icon
└── DropdownMenu.Content
    ├── DropdownMenu.Label (header with avatar + name)
    ├── DropdownMenu.Separator
    └── DropdownMenu.Group
        ├── Open Project
        ├── [if themeSelection] ThemeSwitcher  (existing)
        ├── [if languageSelection] LanguageSwitcher  (existing)
        └── [if projectDropdownSettings] Settings item
```

**Changes:**
- Wrap trigger `<Avatar.Root>` in `{#if store.features.projectDropdownIcon}`
- Wrap Settings `<DropdownMenu.Item>` in `{#if store.features.projectDropdownSettings}`

## Data Flow

```
FeatureFlagsSchema (Valibot)
  → EditorStore.$state (module-level reactive)
    → useEditorStore() (singleton getter)
      → store.features.flagName (reactive read in components)
        → {#if store.features.flagName} (conditional rendering)
```

**Mutation paths:**
1. `store.setFeature('breadcrumb', false)` → validates → updates `$state` → persists to localStorage → component re-renders
2. `window.__EDITOR_DEVTOOLS__.set('features.breadcrumb', false)` → same path
3. URL `?wf.ff.breadcrumb=false` → parsed on load → calls `setFeature()`

## Backwards Compatibility

- Existing flag names unchanged — no localStorage migration needed
- New flags default to `true` — existing users see no change
- `v.optional()` + `v.strictObject()` means old localStorage data missing new keys gets defaults applied via Valibot
- No new locale keys needed (flags are internal, not user-facing labels)

## Test Strategy

### Unit Tests (schema + store)
- All 16 flags have correct defaults
- `setFeature()` accepts all 16 flag keys
- `setFeature()` rejects unknown keys
- Schema validates partial objects (only some flags present)

### Integration Tests (component rendering)
- Each flag ON → controlled element exists in DOM
- Each flag OFF → controlled element absent from DOM
- Multiple flags OFF → layout degrades gracefully (no broken layout)
- Flag changes via store → component re-renders correctly

### E2E Tests (full browser)
- Toggle flags via devtools API → verify DOM changes
- Flag persistence across page loads
- URL override `?wf.ff.flagName=false` → flag applied on load
