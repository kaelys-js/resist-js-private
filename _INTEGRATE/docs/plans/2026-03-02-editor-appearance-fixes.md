# Editor Appearance Fixes & Enhancements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Design doc:** `docs/plans/2026-03-02-editor-appearance-i18n-design.md` (updated)

**QA after every file edit:**

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 1: Fix Language Switching — SSR Locale Sync

The store always initializes as `'en'` because it never reads the SSR-detected locale.

### 1a. Create `src/app.d.ts`

```typescript
declare global {
	namespace App {
		interface Locals {
			locale: string;
		}
	}
}

export {};
```

### 1b. Update `src/hooks.server.ts`

Add `event.locals.locale = locale;` after computing the locale, before `resolve()`.

### 1c. Create `src/routes/+layout.server.ts`

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return { locale: locals.locale };
};
```

### 1d. Update `src/routes/+layout.svelte`

- Accept `data` from `$props()`
- On mount, call `localeStore.setLocale(data.locale)` if it differs from current

---

## Task 2: Redesign ModeToggle — Single Icon + Dropdown

Replace the 3-button pill with a single icon button + dropdown menu.

### 2a. Rewrite `src/lib/components/ModeToggle.svelte`

- Single `Button variant="ghost" size="icon"` as `DropdownMenu.Trigger`
- Show Sun icon (light) or Moon icon (dark) with rotate/scale animations
- `DropdownMenu.Content` with 3 items: Light (Sun), Dark (Moon), System (Monitor)
- Each item: icon + localized label via `t()` + check mark if active
- Use `mode` for resolved display, `userPrefersMode` for check state
- Localized labels: `t(localeStore.t.settings.light, 'Light')` etc.

---

## Task 3: Add 8 New Themes to CSS

### 3a. Add theme blocks to `src/app.css`

For each new theme (ocean, rose, lavender, sunset, slate, copper, aurora, amethyst):
- Light variant: `[data-theme='name']` block
- Dark variant: `[data-theme='name'].dark` block
- Override: `--sidebar`, `--sidebar-primary`, `--sidebar-accent`, `--primary`, `--ring` (light)
- Override: `--background`, `--card`, `--popover`, `--sidebar`, `--sidebar-primary`, `--sidebar-accent`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring` (dark)

### 3b. Add theme transition CSS

In `@layer base` block, add to `body`:

```css
body {
  @apply bg-background text-foreground;
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

---

## Task 4: Update Locale Schema + All 7 Locale Files

### 4a. Add 8 new theme keys to `schema.ts`

Add to `settings` namespace: `themeOcean`, `themeRose`, `themeLavender`, `themeSunset`, `themeSlate`, `themeCopper`, `themeAurora`, `themeAmethyst`.

### 4b. Update all 7 locale files

Add translated theme names for: en, ja, zh, ko, fr, de, es.

---

## Task 5: Update ThemeSwitcher with New Themes

### 5a. Add 8 new theme entries to ThemeSwitcher.svelte

Each entry needs: `id`, `label` (localized), `dots` (4 oklch colors).

---

## Task 6: QA + Commit Design Doc

Run full QA. Commit the design doc update.
