# Editor Appearance & i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Prerequisites

```bash
cd packages/products/webforge/editor
```

QA after every file edit:
```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 1: Install mode-watcher

```bash
cd packages/products/webforge/editor && pnpm add mode-watcher
```

Verify it's in `package.json`.

---

## Task 2: Fix dark mode infrastructure

### 2a. Fix `app.html`

**File:** `packages/products/webforge/editor/src/app.html`

Change:
```html
<html lang="en" class="dark">
```
To:
```html
<html lang="%lang%" dir="%dir%">
```

### 2b. Fix `@custom-variant` in `app.css`

**File:** `packages/products/webforge/editor/src/app.css`

Change line 3:
```css
@custom-variant dark (&:is(.dark *));
```
To:
```css
@custom-variant dark (&:where(.dark, .dark *));
```

### 2c. Add ModeWatcher to layout

**File:** `packages/products/webforge/editor/src/routes/+layout.svelte`

Add `import { ModeWatcher } from 'mode-watcher';` and render `<ModeWatcher defaultMode="system" />` before Sidebar.Provider.

### 2d. Run QA

---

## Task 3: Create ModeToggle component

**File:** `packages/products/webforge/editor/src/lib/components/ModeToggle.svelte`

Three icon buttons (Sun/Monitor/Moon) in a bordered pill:
- Import `Sun`, `Monitor`, `Moon` from `@lucide/svelte/icons/*`
- Import `setMode`, `userPrefersMode` from `mode-watcher`
- Import Button from shadcn-svelte
- Each button calls `setMode('light' | 'system' | 'dark')`
- Active button: `variant="secondary"`, inactive: `variant="ghost"`
- Size: `h-7 w-7` icons, `size-3.5` icon svg
- Wrapper: `flex items-center rounded-md border border-border p-0.5 gap-0.5`

### 3b. Add ModeToggle to SiteHeader

**File:** `packages/products/webforge/editor/src/lib/components/SiteHeader.svelte`

Add a `<div class="ml-auto flex items-center gap-2">` after the breadcrumb, containing `<ModeToggle />`.

### 3c. Run QA

---

## Task 4: Add editor theme CSS

**File:** `packages/products/webforge/editor/src/app.css`

After the `.dark { ... }` block (after line 64), add theme overrides:

```css
/* Theme: Midnight — deep blue/indigo */
[data-theme="midnight"] {
  --sidebar: oklch(0.96 0.02 260);
  --sidebar-primary: oklch(0.50 0.20 260);
  --sidebar-accent: oklch(0.94 0.04 260);
  --primary: oklch(0.55 0.22 260);
  --ring: oklch(0.55 0.22 260);
}

[data-theme="midnight"].dark {
  --background: oklch(0.14 0.03 260);
  --card: oklch(0.14 0.03 260);
  --popover: oklch(0.14 0.03 260);
  --sidebar: oklch(0.12 0.04 260);
  --sidebar-primary: oklch(0.60 0.22 260);
  --sidebar-accent: oklch(0.20 0.06 260);
  --primary: oklch(0.70 0.20 260);
  --secondary: oklch(0.22 0.06 260);
  --muted: oklch(0.22 0.06 260);
  --accent: oklch(0.22 0.06 260);
  --border: oklch(0.24 0.06 260);
  --input: oklch(0.24 0.06 260);
  --ring: oklch(0.60 0.22 260);
}

/* Theme: Warm — amber/earth tones */
[data-theme="warm"] {
  --sidebar: oklch(0.97 0.01 70);
  --sidebar-primary: oklch(0.50 0.16 50);
  --sidebar-accent: oklch(0.95 0.02 70);
  --primary: oklch(0.50 0.16 50);
  --ring: oklch(0.50 0.16 50);
}

[data-theme="warm"].dark {
  --background: oklch(0.15 0.02 50);
  --card: oklch(0.15 0.02 50);
  --popover: oklch(0.15 0.02 50);
  --sidebar: oklch(0.13 0.03 50);
  --sidebar-primary: oklch(0.65 0.16 50);
  --sidebar-accent: oklch(0.22 0.04 50);
  --primary: oklch(0.70 0.14 50);
  --secondary: oklch(0.23 0.04 50);
  --muted: oklch(0.23 0.04 50);
  --accent: oklch(0.23 0.04 50);
  --border: oklch(0.26 0.04 50);
  --input: oklch(0.26 0.04 50);
  --ring: oklch(0.65 0.16 50);
}

/* Theme: Forest — green/emerald */
[data-theme="forest"] {
  --sidebar: oklch(0.97 0.01 150);
  --sidebar-primary: oklch(0.50 0.16 155);
  --sidebar-accent: oklch(0.95 0.02 150);
  --primary: oklch(0.50 0.16 155);
  --ring: oklch(0.50 0.16 155);
}

[data-theme="forest"].dark {
  --background: oklch(0.14 0.02 155);
  --card: oklch(0.14 0.02 155);
  --popover: oklch(0.14 0.02 155);
  --sidebar: oklch(0.12 0.03 155);
  --sidebar-primary: oklch(0.60 0.18 155);
  --sidebar-accent: oklch(0.20 0.04 155);
  --primary: oklch(0.68 0.16 155);
  --secondary: oklch(0.22 0.04 155);
  --muted: oklch(0.22 0.04 155);
  --accent: oklch(0.22 0.04 155);
  --border: oklch(0.25 0.04 155);
  --input: oklch(0.25 0.04 155);
  --ring: oklch(0.60 0.18 155);
}
```

### 4b. Run QA (format check only — biome may flag CSS)

---

## Task 5: Create ThemeSwitcher component

**File:** `packages/products/webforge/editor/src/lib/components/ThemeSwitcher.svelte`

A DropdownMenu.Sub inside the NavUser dropdown:
- Import `Palette` from `@lucide/svelte/icons/palette`
- Import `setTheme`, `theme` from `mode-watcher`
- Import DropdownMenu from shadcn-svelte
- Theme list: `[{ id: '', label: 'Default' }, { id: 'midnight', label: 'Midnight' }, { id: 'warm', label: 'Warm' }, { id: 'forest', label: 'Forest' }]`
- Each item: DropdownMenu.Item with theme name, checkmark on active
- Clicking calls `setTheme(id)`

### 5b. Add ThemeSwitcher to NavUser dropdown

**File:** `packages/products/webforge/editor/src/lib/components/NavUser.svelte`

Add a `<ThemeSwitcher />` as a DropdownMenu.Sub between existing items.

### 5c. Run QA

---

## Task 6: Create i18n locale schema and files

### 6a. Create locale schema

**File:** `packages/products/webforge/editor/src/lib/locales/schema.ts`

Define `EditorLocaleSchema` with namespaces: common, sidebar, header, settings, project, scenes. Use `messageTemplate()` from `@/locale/template`.

### 6b. Create English locale (complete)

**File:** `packages/products/webforge/editor/src/lib/locales/en.ts`

All keys filled with English strings.

### 6c. Create Japanese locale (partial)

**File:** `packages/products/webforge/editor/src/lib/locales/ja.ts`

Translate all keys. Partial is OK — fallback chain handles missing.

### 6d. Create Chinese Simplified locale (partial)

**File:** `packages/products/webforge/editor/src/lib/locales/zh.ts`

### 6e. Create Korean locale (partial)

**File:** `packages/products/webforge/editor/src/lib/locales/ko.ts`

### 6f. Create French locale (partial)

**File:** `packages/products/webforge/editor/src/lib/locales/fr.ts`

### 6g. Create German locale (partial)

**File:** `packages/products/webforge/editor/src/lib/locales/de.ts`

### 6h. Create Spanish locale (partial)

**File:** `packages/products/webforge/editor/src/lib/locales/es.ts`

### 6i. Run QA

---

## Task 7: Create i18n store singleton

**File:** `packages/products/webforge/editor/src/lib/i18n.svelte.ts`

```typescript
import { createLocaleRegistry } from '@/locale/registry';
import { createLocaleStore } from '@/locale/svelte';
import { EditorLocaleSchema } from './locales/schema';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { zh } from './locales/zh';
import { ko } from './locales/ko';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { es } from './locales/es';

// Create registry with all locales, English as default
const registryResult = createLocaleRegistry({
  schema: EditorLocaleSchema,
  defaultLocale: 'en',
  locales: { en, ja, zh, ko, fr, de, es },
  strict: false,
  fallbackLocales: ['en'],
});

if (!registryResult.ok) throw new Error('Locale registry failed');

const storeResult = createLocaleStore(registryResult.data);
if (!storeResult.ok) throw new Error('Locale store failed');

export const localeStore = storeResult.data;
```

### 7b. Run QA

---

## Task 8: Create SSR hooks

### 8a. Create hooks.server.ts

**File:** `packages/products/webforge/editor/src/hooks.server.ts`

```typescript
import type { Handle } from '@sveltejs/kit';
import { getTextDirection } from '@/locale/direction';

const SUPPORTED = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'];

export const handle: Handle = async ({ event, resolve }) => {
  const cookie = event.cookies.get('locale') ?? '';
  const locale = SUPPORTED.includes(cookie) ? cookie : 'en';
  const dirResult = getTextDirection(locale);
  const dir = dirResult.ok ? dirResult.data : 'ltr';

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%lang%', locale).replace('%dir%', dir),
  });
};
```

### 8b. Run QA

---

## Task 9: Create LanguageSwitcher component

**File:** `packages/products/webforge/editor/src/lib/components/LanguageSwitcher.svelte`

A DropdownMenu.Sub inside the NavUser dropdown:
- Import `Globe` from `@lucide/svelte/icons/globe`
- Import `localeStore` from `$lib/i18n.svelte`
- Language list with native names: `[{ code: 'en', name: 'English' }, { code: 'ja', name: '日本語' }, { code: 'zh', name: '中文' }, { code: 'ko', name: '한국어' }, { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' }, { code: 'es', name: 'Español' }]`
- Each item: DropdownMenu.Item with native name, checkmark on active
- Click handler: `localeStore.setLocale(code)`, set cookie, `window.location.reload()`

### 9b. Add LanguageSwitcher to NavUser dropdown

**File:** `packages/products/webforge/editor/src/lib/components/NavUser.svelte`

Add `<LanguageSwitcher />` as a DropdownMenu.Sub after ThemeSwitcher.

### 9c. Run QA

---

## Task 10: Localize existing components

### 10a. Localize AppSidebar.svelte

Replace hardcoded strings with `localeStore.t.*()` calls:
- "Overworld", "Town Interior", "Dungeon B1" — scene names stay hardcoded (user data)
- "Tilesets", "Sprites", "Audio" → `localeStore.t.sidebar.tilesets()` etc.
- "Settings", "Help" → `localeStore.t.common.settings()` etc.

### 10b. Localize NavScenes.svelte

- "Scenes" group label → `localeStore.t.sidebar.scenes()`
- "New Scene" → `localeStore.t.sidebar.newScene()`
- "Rename", "Duplicate", "Delete" → `localeStore.t.common.*()` / `localeStore.t.scenes.*()`

### 10c. Localize NavMain.svelte

- Label prop is now passed as a localized string from parent (already dynamic)

### 10d. Localize SiteHeader.svelte

- "Editor" → `localeStore.t.header.editor()`
- "Scene" → `localeStore.t.header.scene()`

### 10e. Localize NavUser.svelte

- "WebForge Project" → prop (keep as-is, user data)
- "Open Project" → `localeStore.t.project.openProject()`
- "Settings" → `localeStore.t.common.settings()`

### 10f. Run QA

---

## Task 11: Final QA

```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

Verify editor loads: `cd packages/products/webforge/editor && pnpm dev`
