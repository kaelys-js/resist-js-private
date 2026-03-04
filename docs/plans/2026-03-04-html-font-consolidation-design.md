# HTML & Font Consolidation — Design Document

**Date:** 2026-03-04
**Scope:** Centralize font config, fix error.html, self-host fonts, template HTML from app-meta + locale

## Problems

1. **Google Fonts URL duplicated in 3 places** — `app.html`, `error.html`, `app.css` (font-family name)
2. **CSP blocks Google Fonts in production** — `font-src: 'self'` in both `svelte.config.js` and `_headers` blocks `fonts.gstatic.com`. Fonts are broken in production builds.
3. **error.html hardcodes English strings** — title, heading, description, button text all hardcoded instead of sourced from locale
4. **error.html hardcodes "Storyline"** — should come from `app-meta.ts`
5. **error.html has bugs** — double `"` in `<html>` tag (line 2), body uses `system-ui` instead of Inter
6. **Clipboard API has no fallback** — `navigator.clipboard.writeText()` called without try/catch, no legacy fallback
7. **No `dns-prefetch` fallback** — only `preconnect` used (Safari bug can cancel `preconnect` without fallback)

## Solution: Self-Host Fonts + Vite Build Plugin

### Why Self-Host?

Self-hosting Inter + Rajdhani solves multiple issues at once:
- **CSP-compatible** — `font-src: 'self'` works perfectly
- **No external dependency** — no Google Fonts CDN at runtime
- **No preconnect/dns-prefetch needed** — fonts are local
- **Faster** — no DNS lookup, TCP, TLS to Google
- **Works offline** — critical for PWA
- **Better privacy** — no Google tracking

### Font Files

Download Inter Variable (latin, woff2) and Rajdhani (latin, 600+700, woff2) from Google Fonts. Place in `static/fonts/`:

```
static/fonts/
├── inter-latin.woff2          # Inter Variable (all weights 100-900)
└── rajdhani-latin-600-700.woff2  # Rajdhani 600+700
```

Using variable font for Inter means a single file covers all weights (400, 500, 600, 700).

### Font Configuration in app-meta.ts

Add to `app-meta.ts`:

```typescript
// ── Fonts ───────────────────────────────────────────────────────────────────
// Self-hosted font configuration. Used by app.css (@font-face) and
// the Vite HTML template plugin (error.html inline styles).

export const FONT_FAMILIES =
  "'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

export const FONT_DISPLAY_FAMILIES = "'Rajdhani', ui-sans-serif, system-ui, sans-serif";

export const FONT_FACES = [
  { family: 'Inter', style: 'normal', weight: '100 900', src: '/fonts/inter-latin.woff2' },
  { family: 'Rajdhani', style: 'normal', weight: '600 700', src: '/fonts/rajdhani-latin-600-700.woff2' },
] as const;
```

### @font-face in app.css

Replace the Google Fonts `<link>` with `@font-face` in `app.css`:

```css
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

The existing `--font-sans` in `@theme inline` already references `'Inter'` — no change needed there.

### Vite Plugin: `vite-plugin-template-html.ts`

A build-time Vite plugin that replaces `{{placeholders}}` in `app.html` and `error.html`.

**Data sources:**
- `app-meta.ts` — `APP_NAME`, `FONT_FAMILIES`, `FONT_FACES`
- `locales/en.ts` — English error strings (static text only)

**Placeholder map:**

| Placeholder | Source | Value |
|-------------|--------|-------|
| `{{APP_NAME}}` | `app-meta.ts` | `"Storyline"` |
| `{{FONT_FAMILIES}}` | `app-meta.ts` | `"'Inter', ui-sans-serif, ..."` |
| `{{FONT_FACE_CSS}}` | Generated from `FONT_FACES` | Inline `@font-face` declarations |
| `{{errors.serverError}}` | `en.ts` | `"Something went wrong"` |
| `{{errors.serverErrorDescription}}` | `en.ts` | `"Oops! Something broke..."` |
| `{{errors.goHome}}` | `en.ts` | `"Go to homepage"` |
| `{{errors.copied}}` | `en.ts` | `"Copied!"` |
| `{{errors.errorIdPrefix}}` | Derived from `en.ts` | `"Reference: "` (prefix before `{id}`) |

**How `errorIdPrefix` is derived:**
The locale string `errors.errorId` = `"Reference: {id}"`. The plugin splits on `{id}` and takes the prefix: `"Reference: "`.

**Plugin hook:** `configResolved` — reads source HTML, performs replacements, writes back before SvelteKit processes them. This runs early enough that SvelteKit's own HTML processing sees the final files.

Actually, the cleaner approach: use Vite's `transformIndexHtml` — but that doesn't work in SvelteKit for `app.html`. Instead, use a **pre-build approach**: the plugin reads the source files during `buildStart`, performs replacements, and writes to a temp location that SvelteKit reads.

Simplest approach: **`configResolved` + file transform at build start**. The plugin:
1. Reads `src/app.html` and `src/error.html` as templates
2. Replaces all `{{...}}` placeholders
3. Writes the resolved HTML back to `src/app.html` and `src/error.html`
4. After build, restores the original template files

Wait — modifying source files is fragile. Better approach: use SvelteKit's `config.kit.files.appTemplate` to point to a generated file:

Actually the simplest reliable approach: **Vite `config` hook** to transform at the config level, OR just use `buildStart` to write generated files to a `.generated/` directory and point SvelteKit at them.

Final approach (simplest and most reliable): **Pre-process in `buildStart`, restore in `closeBundle`**.

1. `buildStart`: Read template files, replace placeholders, write back to `src/`
2. `closeBundle`: Restore original template content

This is safe because Vite build is synchronous from `buildStart` through `closeBundle`. In dev mode, skip the plugin entirely — the `{{placeholders}}` would be visible but we can handle dev mode by also running replacements in the `configureServer` middleware, or by having the templates use the actual values and the plugin validates they match at build time.

**Better final approach:** Don't use placeholders at all in the source files. Instead, use the plugin to **validate** that the source HTML matches app-meta.ts values. If someone changes `APP_NAME` in app-meta.ts, the build fails with a clear message saying "update error.html title to match". This is simpler and avoids any file mutation.

**Actually simplest approach:** Since these values change rarely (app name, font), just use the Vite plugin to **validate consistency** at build time. But the user specifically wants single-source-of-truth...

**Final decision:** Use a **build script** (`scripts/generate-html.ts`) that runs as a `prebuild` npm script. It reads `src/app.html.template` and `src/error.html.template`, performs replacements, writes `src/app.html` and `src/error.html`. The generated files are committed (not gitignored) so dev mode works without running the script. The build script validates and regenerates.

No — committing generated files is messy. Let me go with the Vite plugin approach using `buildStart`/`closeBundle` with file backup/restore.

**FINAL approach (keeping it simple):**

Use a Vite plugin with two modes:
- **Build mode:** Transform `src/error.html` in-place during `buildStart`, restore in `closeBundle`
- **Dev mode:** No transformation needed — SvelteKit serves `error.html` as-is in dev (and error.html is rarely triggered in dev anyway)

For `app.html`, the only placeholder is `apple-mobile-web-app-title` which already works fine with the hardcoded value. The Google Fonts links just need to be removed (one-time edit, not templated).

So the plugin only needs to transform **`error.html`**. And `app.html` is a one-time manual cleanup.

### app.html Changes (Manual, One-Time)

```html
<!-- REMOVE these lines: -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />

<!-- The apple-mobile-web-app-title already imports from layout.svelte -->
<!-- No templating needed for app.html -->
```

### error.html Template Changes

The error.html file uses `{{placeholders}}` that the Vite plugin resolves at build time:

```html
<title>{{errors.serverError}} | {{APP_NAME}}</title>
```

```css
body {
  font-family: {{FONT_FAMILIES}};
  /* ... */
}
```

```html
<h1>{{errors.serverError}}</h1>
<p class="description">{{errors.serverErrorDescription}}</p>
<a class="home-link" href="/">{{errors.goHome}}</a>
```

```javascript
label.textContent = '{{errors.errorIdPrefix}}' + errorId;
// ...
label.textContent = '{{errors.copied}}';
// reset:
label.textContent = '{{errors.errorIdPrefix}}' + id;
```

### Clipboard Fallback

Replace the current bare `navigator.clipboard.writeText(id)` with:

```javascript
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      navigator.clipboard.writeText(text);
      return;
    } catch (e) {
      // fall through to legacy
    }
  }
  // Legacy fallback for insecure contexts / older browsers
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}
```

No permission check needed — Firefox/Safari don't support `clipboard-write` permission query. Just try/catch with legacy fallback.

### Bug Fixes in error.html

1. **Double quote:** `<html lang="en" dir="ltr"">` → `<html lang="en" dir="ltr">`
2. **Font-family:** `system-ui, -apple-system, sans-serif` → `{{FONT_FAMILIES}}` (includes Inter + fallbacks)
3. **Inline @font-face:** Add `{{FONT_FACE_CSS}}` in `<style>` block so error.html can render Inter from self-hosted files

## Files Modified

| File | Action |
|------|--------|
| `src/lib/config/app-meta.ts` | Add `FONT_FAMILIES`, `FONT_DISPLAY_FAMILIES`, `FONT_FACES` |
| `static/fonts/inter-latin.woff2` | New — self-hosted Inter variable font |
| `static/fonts/rajdhani-latin-600-700.woff2` | New — self-hosted Rajdhani font |
| `src/app.css` | Add `@font-face` declarations, remove Google Fonts dependency |
| `src/app.html` | Remove Google Fonts `<link>` + preconnect tags |
| `src/error.html` | Template with `{{placeholders}}`, fix bugs, add clipboard fallback, inline @font-face |
| `vite-plugin-template-html.ts` | New — Vite plugin for build-time error.html templating |
| `vite.config.ts` | Register the plugin |
| `static/_headers` | No change needed (font-src: 'self' is already correct) |
| `svelte.config.js` | No change needed (CSP font-src: 'self' is already correct) |

## Risk Assessment

- **Low risk**: Self-hosting fonts is standard practice, eliminates external dependency
- **CSP fix is critical**: Google Fonts are currently broken in production — this fix is necessary
- **error.html templating**: Build-time only, no runtime risk. Dev mode shows raw templates (acceptable — error.html rarely triggered in dev)
- **Clipboard fallback**: Additive, no breaking change
- **No new dependencies**: Font files are static assets, plugin is a local file
