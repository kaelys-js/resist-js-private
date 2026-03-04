# Dynamic Browser Configuration — Design Document

**Date:** 2026-03-03
**Scope:** Central app metadata, dynamic manifest/robots/security.txt, theme-color meta tags, Apple PWA meta tags

## Overview

Replace scattered hardcoded browser configuration values with a central config module that all consumers (manifest, meta tags, server routes) import from. Convert static files to SvelteKit prerendered server routes.

## Architecture

```
app-meta.ts (single source of truth)
    │
    ├── manifest.webmanifest/+server.ts  (prerendered JSON)
    ├── robots.txt/+server.ts            (prerendered text)
    ├── .well-known/security.txt/+server.ts (prerendered text)
    ├── +layout.svelte                   (dynamic theme-color meta)
    └── app.html                         (Apple PWA meta — static)
```

All `+server.ts` routes use `export const prerender = true` so adapter-static generates static files at build time. Values come from the central config — single place to update app name, colors, etc.

## Module: `src/lib/config/app-meta.ts`

Central configuration. All values typed, no external dependencies beyond the project's own types.

```typescript
// App identity
APP_NAME: 'WebForge'
APP_SHORT_NAME: 'WebForge'
APP_DESCRIPTION: 'HD-2D RPG creation suite'
APP_ID: '/'
APP_SCOPE: '/'
APP_START_URL: '/'
APP_DISPLAY: 'standalone'
APP_CATEGORIES: ['games', 'developer tools', 'design']

// Theme colors — used by manifest + meta tags
// Default theme ('' empty string in SUPPORTED_THEMES)
THEME_COLOR_LIGHT: '#ffffff'     // oklch(1 0 0) → #ffffff
THEME_COLOR_DARK: '#242424'      // oklch(0.145 0 0) → approx #242424

// Per-theme dark background colors (mapped from oklch → hex)
// Only dark variants needed — all light theme backgrounds are #ffffff (oklch 1 0 0)
// These are the --background values from app.css
THEME_DARK_COLORS: Record<SupportedTheme, string>

// Icons — must match static/ assets
ICONS: Array<{ src, sizes, type, purpose? }>

// Contact / security
CONTACT_EMAIL: 'security@webforge.dev'
CONTACT_URL: 'https://github.com/nicholascostadev/webforge/security'
POLICY_URL: 'https://github.com/nicholascostadev/webforge/security/policy'
PREFERRED_LANGUAGES: 'en, ja, zh, ko, fr, de, es'
CANONICAL_SECURITY_URL: 'https://webforge.dev/.well-known/security.txt'
```

### Theme Color Mapping

Each theme defines `--background` in oklch. We need hex equivalents for `<meta name="theme-color">` and `manifest.json`. Light mode is always `#ffffff` (all themes use `:root { --background: oklch(1 0 0) }` as default, themes only override `.dark`).

Dark mode background colors per theme (oklch → hex conversion):

| Theme | oklch | Hex (approx) |
|-------|-------|--------------|
| (default) | `oklch(0.145 0 0)` | `#242424` |
| midnight | `oklch(0.14 0.03 260)` | `#1a1f2e` |
| warm | `oklch(0.15 0.02 50)` | `#2a2420` |
| forest | `oklch(0.14 0.02 155)` | `#1c2722` |
| ocean | `oklch(0.14 0.02 200)` | `#1b2528` |
| rose | `oklch(0.14 0.02 350)` | `#281c24` |
| lavender | `oklch(0.14 0.03 290)` | `#211c2d` |
| sunset | `oklch(0.15 0.02 30)` | `#2b231e` |
| slate | `oklch(0.15 0.01 240)` | `#232527` |
| copper | `oklch(0.15 0.02 60)` | `#2a2520` |
| aurora | `oklch(0.14 0.02 170)` | `#1b2725` |
| amethyst | `oklch(0.14 0.03 310)` | `#261b2c` |

These will be stored as a `Record<string, { light: string; dark: string }>` map in `app-meta.ts`. The exact hex values will be computed once at module scope (literal strings, no runtime oklch conversion needed).

## Route: `src/routes/manifest.webmanifest/+server.ts`

```typescript
export const prerender = true;

// GET handler returns JSON response with correct content-type
// Imports all values from app-meta.ts
// Response headers: Content-Type: application/manifest+json
```

Manifest fields:
- `name` — from APP_NAME
- `short_name` — from APP_SHORT_NAME
- `description` — from APP_DESCRIPTION
- `start_url` — from APP_START_URL
- `id` — from APP_ID (NEW — PWA app identity)
- `scope` — from APP_SCOPE (NEW)
- `display` — from APP_DISPLAY
- `background_color` — THEME_COLOR_DARK (manifest uses dark since editor defaults to dark mode)
- `theme_color` — THEME_COLOR_DARK
- `categories` — from APP_CATEGORIES (NEW)
- `icons` — from ICONS array

## Route: `src/routes/robots.txt/+server.ts`

```typescript
export const prerender = true;

// GET handler returns text/plain
```

Content:
```
User-agent: *
Disallow: /api/
Allow: /

# AI search assistants — allowed (surface in AI-powered search results)
User-agent: ChatGPT-User
Allow: /

User-agent: Claude-Web
Allow: /

# AI training crawlers — blocked (do not use content for model training)
User-agent: GPTBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: cohere-ai
Disallow: /
```

No sitemap reference — app is noindex.

## Route: `src/routes/.well-known/security.txt/+server.ts`

```typescript
export const prerender = true;

// GET handler returns text/plain
```

RFC 9116 fields:
- `Contact:` — CONTACT_URL
- `Expires:` — ISO 8601 date, 1 year from build time
- `Preferred-Languages:` — PREFERRED_LANGUAGES
- `Canonical:` — CANONICAL_SECURITY_URL
- `Policy:` — POLICY_URL

## Layout Changes: Dynamic `theme-color`

Current (hardcoded):
```html
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
```

New (reactive):
```svelte
<meta name="theme-color" content={themeColorLight} media="(prefers-color-scheme: light)" />
<meta name="theme-color" content={themeColorDark} media="(prefers-color-scheme: dark)" />
```

Where `themeColorLight` and `themeColorDark` are `$derived` from `store.app.theme` + the THEME_COLORS map in app-meta.ts. Light is always `#ffffff` for all themes; dark varies per theme.

Import: `import { THEME_COLORS } from '$lib/config/app-meta';`

Derived:
```typescript
const themeColorLight: string = $derived(THEME_COLORS[store.app.theme]?.light ?? '#ffffff');
const themeColorDark: string = $derived(THEME_COLORS[store.app.theme]?.dark ?? '#242424');
```

## app.html Changes: Apple PWA Meta Tags

Add after the `<meta name="format-detection">` line:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="WebForge" />
```

Note: `apple-mobile-web-app-title` is hardcoded in `app.html` because it's a static template processed before JS runs. It must match `APP_NAME` in `app-meta.ts` — a comment will note this coupling.

## Delete: `static/manifest.webmanifest`

Replaced by the server route. The `<link rel="manifest">` in `app.html` already points to `/manifest.webmanifest` which will now be served by the route.

**app.html manifest link update:** Change from `%sveltekit.assets%/manifest.webmanifest` to `/manifest.webmanifest` since it's now a route, not a static asset.

## E2E Tests

### `e2e/manifest.test.ts` (replaces manifest tests in `icons.test.ts`)

- Valid JSON with correct `Content-Type: application/manifest+json`
- All required fields present: name, short_name, description, start_url, id, scope, display, background_color, theme_color, categories, icons
- Values match APP_NAME, APP_DESCRIPTION, etc.
- Icons array has correct structure (4 entries: 192, 512, maskable-192, maskable-512)
- All icon src paths return 200

### `e2e/robots-txt.test.ts`

- Returns 200 with `text/plain` content type
- Contains `User-agent: *` and `Disallow: /api/`
- Blocks AI training crawlers (GPTBot, anthropic-ai, CCBot, Google-Extended, Bytespider, cohere-ai)
- Allows AI search (ChatGPT-User, Claude-Web)
- Does NOT contain `Sitemap:` (noindex app)

### `e2e/security-txt.test.ts`

- Returns 200 with `text/plain` content type
- Contains required `Contact:` field
- Contains `Expires:` with valid ISO 8601 date in the future
- Contains `Preferred-Languages:`
- Contains `Canonical:` URL
- Contains `Policy:` URL

### Updates to `e2e/head-meta.test.ts`

- Add Apple PWA meta tag tests (apple-mobile-web-app-capable, status-bar-style, title)
- Update theme-color tests to verify default values (#ffffff / #242424)

### Updates to `e2e/icons.test.ts`

- Move manifest structure tests to `e2e/manifest.test.ts`
- Keep icon asset HTTP response tests and icon link resolution tests

## Unit Tests

### `src/lib/config/app-meta.test.ts`

- THEME_COLORS has entry for every SUPPORTED_THEMES value
- All hex values are valid (#rrggbb format)
- Light color for all themes is #ffffff
- APP_NAME, APP_DESCRIPTION are non-empty strings
- ICONS array has 4 entries with correct structure
- CONTACT_EMAIL, POLICY_URL are non-empty

## Files Summary

| Action | Path |
|--------|------|
| Create | `src/lib/config/app-meta.ts` |
| Create | `src/lib/config/app-meta.test.ts` |
| Create | `src/routes/manifest.webmanifest/+server.ts` |
| Create | `src/routes/robots.txt/+server.ts` |
| Create | `src/routes/.well-known/security.txt/+server.ts` |
| Modify | `src/routes/+layout.svelte` |
| Modify | `src/app.html` |
| Delete | `static/manifest.webmanifest` |
| Create | `e2e/manifest.test.ts` |
| Create | `e2e/robots-txt.test.ts` |
| Create | `e2e/security-txt.test.ts` |
| Modify | `e2e/head-meta.test.ts` |
| Modify | `e2e/icons.test.ts` |

All paths relative to `packages/products/webforge/editor/`.
