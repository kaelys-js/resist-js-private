# HTML & Font Consolidation — Implementation Plan

**Date:** 2026-03-04
**Design:** `docs/plans/2026-03-04-html-font-consolidation-design.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Task 1: Download and self-host font files

**Files:**
- `static/fonts/inter-latin.woff2` (new)
- `static/fonts/rajdhani-latin-600-700.woff2` (new)

Steps:
1. Create `static/fonts/` directory
2. Download Inter Variable latin subset (woff2) from Google Fonts API
3. Download Rajdhani 600+700 latin subset (woff2) from Google Fonts API
4. Verify files exist and are valid woff2

**Font URLs (Google Fonts CSS API v2):**
- Inter variable: Extract woff2 URL from `https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap`
- Rajdhani: Extract woff2 URL from `https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap`

Note: Must use a browser-like User-Agent header to get woff2 format (Google serves different formats based on UA).

**QA:** Verify files are non-empty woff2 binaries

## Task 2: Add font config to app-meta.ts

**File:** `src/lib/config/app-meta.ts`

Add after the Icons section:

```typescript
// ── Fonts ────────────────────────────────────────────────────────────────────
// Self-hosted font configuration. Used by app.css (@font-face) and
// the Vite HTML template plugin (error.html inline styles).

export const FONT_FAMILIES =
	"'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

export const FONT_DISPLAY_FAMILIES = "'Rajdhani', ui-sans-serif, system-ui, sans-serif";

type FontFaceEntry = {
	readonly family: string;
	readonly style: string;
	readonly weight: string;
	readonly src: string;
};

export const FONT_FACES: readonly FontFaceEntry[] = [
	{ family: 'Inter', style: 'normal', weight: '100 900', src: '/fonts/inter-latin.woff2' },
	{
		family: 'Rajdhani',
		style: 'normal',
		weight: '600 700',
		src: '/fonts/rajdhani-latin-600-700.woff2',
	},
];
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

## Task 3: Add @font-face to app.css and remove Google Fonts from app.html

**Files:**
- `src/app.css` — Add `@font-face` declarations at the top (after imports, before @custom-variant)
- `src/app.html` — Remove Google Fonts `<link>` and `preconnect` tags

Changes to `app.css` — add after `@import 'tw-animate-css';`:

```css
/* Self-hosted fonts — see app-meta.ts FONT_FACES for config */
@font-face {
	font-family: 'Inter';
	font-style: normal;
	font-weight: 100 900;
	font-display: swap;
	src: url('/fonts/inter-latin.woff2') format('woff2');
}

@font-face {
	font-family: 'Rajdhani';
	font-style: normal;
	font-weight: 600 700;
	font-display: swap;
	src: url('/fonts/rajdhani-latin-600-700.woff2') format('woff2');
}
```

Changes to `app.html` — remove these 3 lines:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

## Task 4: Create Vite plugin for error.html templating

**File:** `vite-plugin-template-html.ts` (new, in editor root)

The plugin:
1. Imports `APP_NAME`, `FONT_FAMILIES`, `FONT_FACES` from `app-meta.ts`
2. Imports `en` locale from `locales/en.ts`
3. In `buildStart`: reads `src/error.html`, replaces `{{placeholders}}`, writes back. Stores original content for restore.
4. In `closeBundle`: restores original `src/error.html`

Placeholder resolution:
- `{{APP_NAME}}` → `APP_NAME`
- `{{FONT_FAMILIES}}` → `FONT_FAMILIES`
- `{{FONT_FACE_CSS}}` → Generated `@font-face` blocks from `FONT_FACES`
- `{{errors.serverError}}` → `en.errors.serverError`
- `{{errors.serverErrorDescription}}` → `en.errors.serverErrorDescription`
- `{{errors.goHome}}` → `en.errors.goHome`
- `{{errors.copied}}` → `en.errors.copied`
- `{{errors.errorIdPrefix}}` → Derived: split `en.errors.errorId` on `{id}`, take prefix

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

## Task 5: Register plugin in vite.config.ts

**File:** `vite.config.ts`

```typescript
import { templateErrorHtml } from './vite-plugin-template-html';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson(), templateErrorHtml()],
	// ...
});
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

## Task 6: Rewrite error.html with placeholders and fixes

**File:** `src/error.html`

Changes:
1. Fix `<html lang="en" dir="ltr"">` → `<html lang="en" dir="ltr">`
2. Remove Google Fonts `<link>` and `preconnect` tags
3. Add `{{FONT_FACE_CSS}}` in `<style>` block (before `:root`)
4. Change `body` font-family to `{{FONT_FAMILIES}}`
5. Change `<title>` to `{{errors.serverError}} | {{APP_NAME}}`
6. Change `<h1>` to `{{errors.serverError}}`
7. Change `<p class="description">` to `{{errors.serverErrorDescription}}`
8. Change `<a class="home-link">` text to `{{errors.goHome}}`
9. Change JS `'Reference: '` prefix to `'{{errors.errorIdPrefix}}'`
10. Change JS `'Copied!'` to `'{{errors.copied}}'`
11. Add clipboard fallback with try/catch + legacy `execCommand('copy')`
12. Add comment explaining why error.html uses English-only (static fallback, no dynamic locale)

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

## Task 7: Add unit tests for the Vite plugin

**File:** `vite-plugin-template-html.test.ts` (new, in editor root)

Tests:
1. Plugin exports a function that returns a Vite plugin object
2. Plugin has correct name
3. `resolveErrorHtml()` (exported helper) replaces all known placeholders
4. `resolveErrorHtml()` generates valid @font-face CSS from FONT_FACES
5. `resolveErrorHtml()` derives errorIdPrefix correctly from parameterized locale string
6. `resolveErrorHtml()` produces valid HTML (no remaining `{{` placeholders)

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test --project editor` — all tests pass

## Task 8: Verify build works with plugin

Run a full build to verify:
1. `pnpm --filter @webforge/editor build` — build succeeds
2. Check `dist/error.html` — all placeholders resolved, no `{{` remaining
3. Check `src/error.html` — original template restored (has `{{` placeholders)

## Task 9: Run full QA suite

- `pnpm qa:type-check` — 0 errors
- `pnpm qa:lint` — 0 errors
- `pnpm qa:format` — clean
- `pnpm qa:test` — all unit tests pass
- `pnpm qa:test:e2e` — all E2E tests pass

All paths relative to `packages/products/webforge/editor/`.
