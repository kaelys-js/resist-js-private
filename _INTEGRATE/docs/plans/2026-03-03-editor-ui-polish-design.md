# Editor UI Polish — Design Document

**Date:** 2026-03-03
**Scope:** Resizable sidebar, locale switcher dual display names, remove duplicate ModeToggle

---

## 1. Resizable Sidebar

### Architecture

Replace the fixed-width CSS variable sidebar with PaneForge-based resizable layout.

**Current architecture:**
```
Sidebar.Provider (sets --sidebar-width: 16rem)
├── Sidebar.Root (gap div + fixed container, both use --sidebar-width)
└── Sidebar.Inset (main content)
```

**New architecture:**
```
Sidebar.Provider (still provides context, cookie persistence, keyboard shortcut)
└── PaneGroup (direction="horizontal", autoSaveId="webforge:sidebar-width")
    ├── Pane (sidebar, collapsible, minSize/maxSize constrained)
    │   └── Sidebar.Root (now uses width: 100% instead of --sidebar-width)
    ├── PaneResizer (drag handle between sidebar and content)
    └── Pane (main content, flex: 1)
        └── Sidebar.Inset > SiteHeader + children
```

### Integration with shadcn-svelte Sidebar

The key challenge: shadcn-svelte's `sidebar.svelte` uses a **gap div + fixed-position container** pattern, both sized by `--sidebar-width` CSS variable. PaneForge manages pane sizes as percentages internally.

**Solution:** Override `--sidebar-width` dynamically via PaneForge's `onResize` callback.

1. `+layout.svelte` wraps the sidebar + content in `PaneGroup` / `Pane` / `PaneResizer` / `Pane`
2. The sidebar `Pane` has `onResize={(size) => updateSidebarWidth(size)}` which converts the percentage to a pixel value and sets `--sidebar-width` on the provider wrapper
3. The existing `sidebar.svelte` gap div and fixed container continue to use `--sidebar-width` — they just get a dynamic value now
4. `onCollapse` / `onExpand` callbacks sync with `store.setSidebarOpen()` so the existing collapsed state stays in sync

### Props & State

**PaneGroup:**
- `direction="horizontal"`
- `autoSaveId="webforge:sidebar-width"` — PaneForge handles localStorage persistence natively
- `onLayoutChange` — optional, for programmatic access

**Sidebar Pane:**
- `defaultSize={20}` — ~20% of viewport ≈ 256px at 1280px (matches current 16rem)
- `minSize={12}` — ~12% ≈ 154px minimum
- `maxSize={40}` — ~40% ≈ 512px maximum
- `collapsible={true}`
- `collapsedSize={3}` — ~3% ≈ 38px (close to current 3rem icon mode)
- `onResize={(size) => ...}` — update `--sidebar-width` CSS variable
- `onCollapse={() => store.setSidebarOpen(false)}`
- `onExpand={() => store.setSidebarOpen(true)}`

**Content Pane:**
- No special props — takes remaining space

**PaneResizer:**
- Styled as a thin vertical bar with hover highlight
- Double-click resets to `defaultSize` (PaneForge exposes `pane.resize(size)` on imperative API)

### Feature Flag

- `store.features.resizableSidebar` (new, default: `true`)
- When `false`: skip PaneGroup/PaneResizer entirely, render sidebar + content directly as today
- Schema addition: `resizableSidebar: v.optional(v.boolean(), true)` in `FeatureFlagsSchema`

### CSS Changes

The `PaneResizer` needs minimal styling:
- `w-1.5 bg-transparent hover:bg-border transition-colors` — thin, only visible on hover
- `data-[resize-handle-active]:bg-ring` — accent color when actively dragging

No changes to `sidebar.svelte` internals — it continues to use `--sidebar-width`. The only change is that the value of `--sidebar-width` becomes dynamic.

### Collapse Sync

PaneForge collapse and shadcn sidebar collapse must stay in sync:
- **PaneForge → sidebar:** `onCollapse`/`onExpand` calls `store.setSidebarOpen()`
- **Sidebar → PaneForge:** When `Ctrl+B` toggles sidebar, use PaneForge imperative API (`pane.collapse()` / `pane.expand()`)
- The existing `SidebarRail` (if used) should also trigger PaneForge collapse

### Mobile Behavior

PaneForge is desktop-only. On mobile (`sidebar.isMobile`), the existing Sheet-based slide-out behavior continues unchanged. The `PaneGroup` wrapper should only render on desktop.

---

## 2. Language Switcher — Dual Display Names

### Architecture

Replace the hardcoded `languages` array in `LanguageSwitcher.svelte` with dynamic generation using `Intl.DisplayNames`.

**Current:**
```typescript
const languages = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  ...
] as const;
```

**New:**
```typescript
// In locale-display.ts utility
function getLanguageDisplayNames(codes: readonly string[], currentLocale: string):
  Result<LanguageDisplayInfo[]>

// Returns:
type LanguageDisplayInfo = {
  code: string;
  endonym: string;   // Native name: "日本語"
  exonym: string;    // Name in current locale: "Japanese"
};
```

### Display Format

- **Endonym first, exonym in parentheses:** `日本語 (Japanese)`
- **When endonym === exonym:** Just show one: `English` (not `English (English)`)
- **Comparison is case-insensitive and diacritic-normalized** via `localeCompare`

### Utility: `locale-display.ts`

New file: `src/lib/utils/locale-display.ts`

```typescript
import * as v from 'valibot';
import type { Str } from '@/schemas/common';
import { type Result, ok, err, ERRORS } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

const LanguageDisplayInfoSchema = v.strictObject({
  code: v.string(),
  endonym: v.string(),
  exonym: v.string(),
});
type LanguageDisplayInfo = v.InferOutput<typeof LanguageDisplayInfoSchema>;

function getLanguageDisplayName(code: Str, currentLocale: Str): Result<LanguageDisplayInfo> {
  // Intl.DisplayNames with { type: 'language' }
  // endonym: new Intl.DisplayNames([code], { type: 'language' }).of(code)
  // exonym: new Intl.DisplayNames([currentLocale], { type: 'language' }).of(code)
}

function getLanguageDisplayNames(
  codes: readonly Str[],
  currentLocale: Str
): Result<LanguageDisplayInfo[]> {
  // Map over codes, collect results
}
```

### Component Changes

`LanguageSwitcher.svelte`:
- Replace hardcoded `languages` array with `$derived` using `getLanguageDisplayNames(SUPPORTED_LOCALES, store.app.locale)`
- Each `DropdownMenu.Item` renders:
  - `<span lang={lang.code}>{lang.endonym}</span>` (endonym with `lang` for screen readers)
  - If endonym !== exonym: ` <span class="text-muted-foreground">({lang.exonym})</span>`
- Add `dir` attribute on endonym span — `getTextDirection(lang.code)` already exists in `@/locale/direction`

### Accessibility

- `lang` attribute on endonym text: WCAG 3.1.2 — screen readers use correct pronunciation
- `dir` attribute on RTL language names: future-proofing for Arabic/Hebrew
- Both already have supporting utilities in the codebase (`@/locale/direction`)

---

## 3. Remove Duplicate ModeToggle

### Change

`NavUser.svelte` lines 81–83:
```svelte
{#if store.features.modeToggle}
    <ModeToggle />
{/if}
```
Remove these 3 lines. The `ModeToggle` component in `SiteHeader.svelte` (line 47) is the authoritative instance.

Also remove the `ModeToggle` import (line 11) if it becomes unused.

### Feature Flag Cleanup

The `modeToggle` feature flag in `FeatureFlagsSchema` currently gates the NavUser ModeToggle. After removal:
- The flag is no longer used anywhere
- **Keep the flag** — it could be used later to gate the SiteHeader ModeToggle. Do not remove schema fields without user approval.
- Update `SiteHeader.svelte` to respect the flag: wrap `<ModeToggle />` in `{#if store.features.modeToggle}`

---

## Component Tree (after changes)

```
+layout.svelte
├── <svelte:head> (title, meta)
├── ModeWatcher
└── Sidebar.Provider (open, onOpenChange, style)
    └── {#if store.features.resizableSidebar && !isMobile}
        │   PaneGroup (horizontal, autoSaveId)
        │   ├── Pane (sidebar, collapsible)
        │   │   └── AppSidebar
        │   │       └── NavUser
        │   │           ├── ThemeSwitcher
        │   │           ├── LanguageSwitcher (dual names)
        │   │           └── (ModeToggle REMOVED)
        │   ├── PaneResizer (drag handle)
        │   └── Pane (content)
        │       └── Sidebar.Inset
        │           ├── SiteHeader
        │           │   └── {#if store.features.modeToggle} ModeToggle
        │           └── children()
        {:else}
        │   AppSidebar
        │   Sidebar.Inset > SiteHeader + children
        {/if}
```

---

## Data Flow

### Resizable Sidebar
```
User drags PaneResizer
→ PaneForge updates pane sizes (internal %)
→ onResize callback fires with size %
→ Convert % to CSS value (e.g., "20%" or calc)
→ Update --sidebar-width CSS variable on provider wrapper
→ sidebar.svelte gap div + fixed container resize
→ PaneForge autoSaveId persists to localStorage
→ On collapse: onCollapse → store.setSidebarOpen(false)
→ On Ctrl+B: SidebarState.toggle → pane.collapse()/expand()
```

### Language Switcher
```
store.app.locale changes
→ $derived recalculates getLanguageDisplayNames(SUPPORTED_LOCALES, locale)
→ Intl.DisplayNames generates endonym + exonym for each language
→ DropdownMenu items re-render with dual display
→ User clicks language → switchLanguage() → store.setLocale() → cookie + html lang/dir
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/utils/locale-display.ts` | `getLanguageDisplayName()` + `getLanguageDisplayNames()` utility |
| `src/lib/utils/locale-display.test.ts` | Unit tests for locale display utility |

## Files to Modify

| File | Change |
|------|--------|
| `src/routes/+layout.svelte` | Wrap in PaneGroup/Pane/PaneResizer when resizable flag on |
| `src/lib/components/LanguageSwitcher.svelte` | Dynamic dual display names via Intl.DisplayNames |
| `src/lib/components/NavUser.svelte` | Remove ModeToggle (lines 81–83 + import) |
| `src/lib/components/SiteHeader.svelte` | Gate ModeToggle behind `store.features.modeToggle` |
| `src/lib/schemas/editor-state.ts` | Add `resizableSidebar` to FeatureFlagsSchema |
| `src/lib/stores/editor-state.svelte.ts` | Add `resizableSidebar` to FEATURE_DEFAULTS |
| `src/lib/components/language-switcher.test.ts` | Update for dual display names |
| `src/lib/components/nav-user.test.ts` | Update for ModeToggle removal |
| `src/lib/components/site-header.test.ts` | Update for feature-flagged ModeToggle |
| `e2e/sidebar.test.ts` | Add resize E2E tests |
| `e2e/language-switcher.test.ts` | Update for dual display format |

## shadcn-svelte Installation

```bash
cd packages/products/webforge/editor && npx shadcn-svelte@latest add resizable
```

This installs the `Resizable` wrapper around PaneForge (`PaneGroup`, `Pane`, `PaneResizer`).

---

## Test Plan

### Unit Tests

| Test | File |
|------|------|
| `getLanguageDisplayName('ja', 'en')` returns endonym "日本語" + exonym "Japanese" | `locale-display.test.ts` |
| `getLanguageDisplayName('en', 'en')` returns matching endonym/exonym | `locale-display.test.ts` |
| Returns error for invalid locale code | `locale-display.test.ts` |
| `getLanguageDisplayNames()` returns all 7 languages | `locale-display.test.ts` |
| LanguageSwitcher renders endonym + exonym format | `language-switcher.test.ts` |
| LanguageSwitcher renders `lang` attribute on items | `language-switcher.test.ts` |
| NavUser does NOT render ModeToggle | `nav-user.test.ts` |
| SiteHeader renders ModeToggle when flag is true | `site-header.test.ts` |
| SiteHeader hides ModeToggle when flag is false | `site-header.test.ts` |

### Integration Tests

| Test | File |
|------|------|
| Layout renders PaneGroup when resizableSidebar=true | `routes/layout.test.ts` (new) |
| Layout renders without PaneGroup when resizableSidebar=false | `routes/layout.test.ts` |
| Language switcher updates display when locale changes | `language-switcher.test.ts` |

### E2E Tests

| Test | File |
|------|------|
| Sidebar resize handle is visible and draggable | `e2e/sidebar.test.ts` |
| Sidebar resize persists across reload | `e2e/sidebar.test.ts` |
| Double-click handle resets sidebar width | `e2e/sidebar.test.ts` |
| Ctrl+B still toggles sidebar with resizable layout | `e2e/sidebar.test.ts` |
| Language sub-menu shows dual names (endonym + exonym) | `e2e/language-switcher.test.ts` |
| Switching locale updates language display format | `e2e/language-switcher.test.ts` |
| NavUser dropdown does NOT contain mode toggle items | `e2e/theme-mode.test.ts` (update existing) |
