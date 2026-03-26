# Editor Appearance & i18n Design

## Overview

Three features for the editor UI:

1. Dark/light/system mode toggle with system preference respect
2. Editor color themes (named color personalities beyond dark/light)
3. Full multi-language (i18n) support with runtime switching

## 1. Mode Toggle (Dark / Light / System)

### Library

**mode-watcher** (svecosystem) — official shadcn-svelte recommendation. Manages `.dark` class on `<html>`, persists to localStorage, prevents FOITH via inline head script, supports Svelte 5.

### Architecture

```
ModeWatcher (in +layout.svelte)
  ├── reads localStorage on mount
  ├── listens to prefers-color-scheme media query
  ├── applies/removes .dark class on <html>
  └── injects inline <script> in <head> to prevent FOITH

ModeToggle (in SiteHeader, right side)
  ├── 3-button icon group: Sun / Monitor / Moon
  ├── calls setMode('light' | 'system' | 'dark')
  └── reads userPrefersMode for active state
```

### Changes to Existing Files

**`app.html`:** Remove `class="dark"` from `<html>` — ModeWatcher manages it.

```html
<html lang="%lang%" dir="%dir%">
```

**`app.css` line 3:** Fix dark variant selector.

```css
/* Before: */
@custom-variant dark (&:is(.dark *));
/* After: */
@custom-variant dark (&:where(.dark, .dark *));
```

**`+layout.svelte`:** Add `<ModeWatcher defaultMode="system" />` before Sidebar.Provider.

### New Component: ModeToggle.svelte

```
src/lib/components/ModeToggle.svelte
```

Single icon button with dropdown menu (standard shadcn pattern):

- **Trigger:** `Button variant="ghost" size="icon"` showing the current resolved mode icon:
  - Light → Sun icon
  - Dark → Moon icon
  - System → Monitor icon (when `userPrefersMode` is `'system'`)
- **Icon animation:** Sun/Moon overlay with rotate/scale CSS transitions (`-rotate-90 scale-0` ↔ `rotate-0 scale-100`, `duration-200`)
- **Dropdown content:** Three items with icon + localized label + check mark:
  - Sun + `settings.light` → `setMode('light')`
  - Moon + `settings.dark` → `setMode('dark')`
  - Monitor + `settings.system` → `setMode('system')`
- Uses `mode.current` for resolved icon display, `userPrefersMode.current` for check mark

Placed in SiteHeader right side: `<div class="ml-auto flex items-center gap-2">`.

## 2. Editor Color Themes

### Architecture

Two independent axes via mode-watcher:

```
mode  (dark/light/system) → .dark class on <html>
theme (named personality)  → data-theme="X" attribute on <html>
```

CSS layering: `:root` → `.dark` → `[data-theme]` → `[data-theme].dark`

### Theme Definitions

Added to `app.css` after the `.dark` block:

| Theme | Personality | Hue | Key Colors |
|-------|------------|-----|------------|
| (default) | Neutral gray | 0 (achromatic) | Current values, no data-theme |
| midnight | Deep blue/indigo | 260 | Blue-purple sidebar, indigo primary |
| warm | Amber/earth tones | 50 | Warm beige bg, amber primary |
| forest | Green/emerald | 155 | Green sidebar accent, emerald primary |
| ocean | Deep teal/cyan | 200 | Teal sidebar, cyan primary |
| rose | Soft pink/mauve | 350 | Pink sidebar, rose primary |
| lavender | Purple/lilac | 290 | Lavender sidebar, purple primary |
| sunset | Orange/coral | 30 | Coral sidebar, warm orange primary |
| slate | Cool blue-gray | 240 | Low-chroma blue-gray, subtle accent |
| copper | Bronze/rust | 60 | Bronze sidebar, copper primary |
| aurora | Teal-green/mint | 170 | Mint sidebar, teal primary |
| amethyst | Deep violet | 310 | Violet sidebar, deep purple primary |

Each theme overrides only the semantic tokens it changes. Both light and dark variants are defined.

### Theme Transition

Smooth color transitions when switching themes via CSS:

```css
body {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

Applied to `body` and sidebar wrapper elements for a polished switching feel.

### New Component: ThemeSwitcher.svelte

```
src/lib/components/ThemeSwitcher.svelte
```

A dropdown menu item in the NavUser dropdown showing theme options. Each option shows a row of 4 color dots (preview of primary, accent, sidebar, sidebar-primary) + theme name. Clicking calls `setTheme(id)`.

### Integration

NavUser dropdown gains a "Theme" submenu between the existing items and the separator.

## 3. Multi-Language (i18n)

### Architecture

Uses the **existing `@/locale` infrastructure** — no new library. The shared packages provide:

- `@/locale/template` — `messageTemplate()` schemas, `buildLocale()` compiler
- `@/locale/registry` — `createLocaleRegistry()` with fallback chains
- `@/locale/svelte` — `createLocaleStore()` with `$state` reactivity
- `@/locale/detect` — `detectLocale()` from cookie/header/navigator
- `@/locale/direction` — `getTextDirection()` for RTL support

### Data Flow

```
hooks.server.ts
  ├── reads 'locale' cookie
  ├── falls back to Accept-Language header
  ├── stores locale in event.locals.locale
  ├── injects lang/dir into HTML via transformPageChunk

+layout.server.ts
  └── returns { locale: locals.locale } to client

+layout.svelte
  ├── receives data.locale from server
  └── calls localeStore.setLocale(data.locale) on mount

i18n.svelte.ts (singleton)
  ├── createLocaleRegistry({ schema, defaultLocale, locales })
  ├── createLocaleStore(registry)
  └── exports: localeStore (reactive locale + t accessor)

Components
  ├── import { localeStore } from '$lib/i18n.svelte'
  ├── use t() helper for concise string access
  └── {t(localeStore.t.common.save, 'Save')}

LanguageSwitcher
  ├── localeStore.setLocale(code)
  ├── document.cookie = `locale=${code}; ...`
  └── window.location.reload() (SSR picks up new lang/dir)
```

### Locale File Structure

```
src/lib/locales/
├── schema.ts       — Valibot schema (source of truth for all keys)
├── en.ts           — English (complete)
├── ja.ts           — Japanese (partial, fallback to en)
├── zh.ts           — Chinese Simplified (partial)
├── ko.ts           — Korean (partial)
├── fr.ts           — French (partial)
├── de.ts           — German (partial)
└── es.ts           — Spanish (partial)
```

### Translation Key Namespaces

```typescript
const EditorLocaleSchema = v.strictObject({
  common: v.strictObject({
    save: messageTemplate(),
    cancel: messageTemplate(),
    delete: messageTemplate(),
    rename: messageTemplate(),
    duplicate: messageTemplate(),
    loading: messageTemplate(),
    settings: messageTemplate(),
    help: messageTemplate(),
  }),
  sidebar: v.strictObject({
    scenes: messageTemplate(),
    newScene: messageTemplate(),
    assets: messageTemplate(),
    tilesets: messageTemplate(),
    sprites: messageTemplate(),
    audio: messageTemplate(),
  }),
  header: v.strictObject({
    editor: messageTemplate(),
    scene: messageTemplate(),
  }),
  settings: v.strictObject({
    appearance: messageTemplate(),
    language: messageTemplate(),
    theme: messageTemplate(),
    light: messageTemplate(),
    dark: messageTemplate(),
    system: messageTemplate(),
    themeDefault: messageTemplate(),
    themeMidnight: messageTemplate(),
    themeWarm: messageTemplate(),
    themeForest: messageTemplate(),
    themeOcean: messageTemplate(),
    themeRose: messageTemplate(),
    themeLavender: messageTemplate(),
    themeSunset: messageTemplate(),
    themeSlate: messageTemplate(),
    themeCopper: messageTemplate(),
    themeAurora: messageTemplate(),
    themeAmethyst: messageTemplate(),
  }),
  project: v.strictObject({
    openProject: messageTemplate(),
    webforgeProject: messageTemplate(),
  }),
  scenes: v.strictObject({
    rename: messageTemplate(),
    duplicate: messageTemplate(),
    delete: messageTemplate(),
  }),
});
```

### New Component: LanguageSwitcher.svelte

```
src/lib/components/LanguageSwitcher.svelte
```

A dropdown menu item in the NavUser dropdown. Globe icon + current language name in native form. Clicking opens a submenu with all available languages. Each shows: native name (e.g., "日本語", "Deutsch"). Clicking a language:

1. Calls `localeStore.setLocale(code)`
2. Sets `locale` cookie for SSR
3. Calls `window.location.reload()` for SSR HTML attribute update

### SSR Integration

**`src/hooks.server.ts`:**

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const locale = event.cookies.get('locale') ?? detectFromHeader(event) ?? 'en';
  event.locals.locale = locale;  // Pass to +layout.server.ts
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%lang%', locale).replace('%dir%', getDir(locale)),
  });
};
```

**`src/app.d.ts`:**

```typescript
declare global {
  namespace App {
    interface Locals {
      locale: string;
    }
  }
}
```

**`src/routes/+layout.server.ts`:**

```typescript
export const load = async ({ locals }) => ({ locale: locals.locale });
```

**`app.html`:**

```html
<html lang="%lang%" dir="%dir%">
```

## Component Tree Summary

```
+layout.svelte
├── <ModeWatcher defaultMode="system" />
├── <Sidebar.Provider>
│   ├── <AppSidebar>
│   │   ├── Header (WebForgeLogo)
│   │   ├── NavScenes (localized labels)
│   │   ├── NavMain label="Assets" (localized)
│   │   ├── NavSecondary (localized Settings/Help)
│   │   └── NavUser
│   │       ├── [dropdown] Open Project (localized)
│   │       ├── [dropdown] Theme → ThemeSwitcher
│   │       ├── [dropdown] Language → LanguageSwitcher
│   │       └── [dropdown] Settings (localized)
│   └── <Sidebar.Inset>
│       ├── <SiteHeader>
│       │   ├── Sidebar.Trigger
│       │   ├── Breadcrumb (localized)
│       │   └── ModeToggle (right side)
│       └── content area
```

## Dependencies

```
mode-watcher  — dark/light/system mode + theme management
```

No other new dependencies. i18n uses existing `@/locale/*` packages.

## Accessibility

- ModeToggle: `aria-label` on each button, `title` tooltip
- ThemeSwitcher: standard DropdownMenu semantics from bits-ui
- LanguageSwitcher: `aria-label="Language"` on trigger, native language names for universal recognition
- RTL: `dir` attribute on `<html>` via SSR hook, Tailwind v4 logical properties
