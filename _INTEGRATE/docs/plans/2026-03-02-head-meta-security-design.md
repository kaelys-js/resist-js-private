# Head Meta Tags & Security Headers — Design

## Overview

Audit and harden all `<head>` meta tags across normal pages, error pages (`+error.svelte`), and the static fallback (`error.html`). Add security response headers. Achieve comprehensive E2E + integration test coverage for every head element.

## Current State

### app.html (all pages)
```html
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="robots" content="noindex, nofollow" />
<link rel="icon" type="image/svg+xml" href="…/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="…/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="…/apple-touch-icon.png" />
```

### +layout.svelte (all routed pages via `<svelte:head>`)
```html
<title>{store.app.appName}</title>
<meta name="description" content={metaDescription} />
<meta name="application-name" content={metaAppName} />
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
<meta property="og:title" content={store.app.appName} />
<meta property="og:description" content={metaDescription} />
<meta property="og:type" content="website" />
<meta property="og:locale" content={ogLocale} />
```

### +error.svelte (error pages — renders inside +layout.svelte)
```html
<title>{errorTitle} — {page.status} | {store.app.appName}</title>
<meta name="robots" content="noindex, nofollow" />
```

### error.html (static fallback — catastrophic failures only)
```html
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>%sveltekit.status% | WebForge</title>
```

### hooks.server.ts (response headers)
- `x-error-id` header (on errors only)
- `%lang%` / `%dir%` replacement via `transformPageChunk`
- **No security headers**

## Problems

1. **`error.html` missing meta tags** — no `robots`, no `color-scheme`, no favicon links
2. **No security response headers** — no X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP
3. **E2E gaps on error pages** — only 3 meta tests (title, noindex, og:title); missing coverage for description, application-name, theme-color, favicons, og:description, og:type, og:locale, charset, viewport, color-scheme
4. **E2E gaps on normal pages** — favicons not tested
5. **No tests for `error.html` content** — static fallback completely untested
6. **No tests for security headers** — nothing verifies headers on responses

## Changes

### 1. Fix `error.html`

Add missing meta tags to the static fallback:

```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <title>%sveltekit.status% | WebForge</title>
  …
</head>
```

Note: `error.html` can't use `%sveltekit.assets%` — only `%sveltekit.status%` and `%sveltekit.error.message%` are available. Use root-relative paths (`/favicon.svg`).

### 2. Add security headers

Add to `hooks.server.ts` `handle` function — set headers on ALL responses (not just errors):

```typescript
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
```

Applied via the `resolve` response — use SvelteKit's `resolve()` return value and set headers on the response object.

### 3. Consolidated E2E test: `e2e/head-meta.test.ts`

New test file testing every head element on both normal (`/`) and error (`/test-error/404`) pages:

| Element | Normal `/` | Error `/test-error/404` |
|---------|:---:|:---:|
| `charset="utf-8"` | ✅ | ✅ |
| `viewport` | ✅ | ✅ |
| `color-scheme` | ✅ | ✅ |
| `robots noindex,nofollow` | ✅ | ✅ |
| `title` (correct format) | ✅ | ✅ |
| `description` | ✅ | ✅ |
| `application-name` | ✅ | ✅ |
| `theme-color` light | ✅ | ✅ |
| `theme-color` dark | ✅ | ✅ |
| `og:title` | ✅ | ✅ |
| `og:description` | ✅ | ✅ |
| `og:type` | ✅ | ✅ |
| `og:locale` | ✅ | ✅ |
| favicon SVG link | ✅ | ✅ |
| favicon PNG link | ✅ | ✅ |
| apple-touch-icon link | ✅ | ✅ |

Total: 32 assertions (16 per page type).

### 4. E2E test: `e2e/security-headers.test.ts`

Test that security headers are present on responses:

| Header | Normal `/` | Error `/test-error/404` |
|--------|:---:|:---:|
| `X-Frame-Options: DENY` | ✅ | ✅ |
| `X-Content-Type-Options: nosniff` | ✅ | ✅ |
| `Referrer-Policy: strict-origin-when-cross-origin` | ✅ | ✅ |
| `Permissions-Policy` present | ✅ | ✅ |
| `Cross-Origin-Opener-Policy: same-origin` | ✅ | ✅ |

Total: 10 assertions (5 per page type).

### 5. Remove duplicated meta tests from existing E2E files

Move meta-related tests out of `layout.test.ts` and `error-pages.test.ts` into the consolidated `head-meta.test.ts`:

**From `layout.test.ts` — REMOVE these tests** (they'll live in `head-meta.test.ts`):
- `meta description is present`
- `meta application-name is WebForge`
- `og:locale defaults to en_US`
- `og:title matches page title`
- `og:description contains HD-2D`
- `og:type is website`
- `theme-color meta tag for light scheme`
- `theme-color meta tag for dark scheme`
- `color-scheme meta tag is present`
- `viewport meta tag is present`
- `charset meta tag is present`
- `robots noindex meta tag is present`

**Keep in `layout.test.ts`:**
- `page loads with correct title`
- `sidebar is visible on desktop`
- `breadcrumb contains Editor and Scene`

**From `error-pages.test.ts` — REMOVE these tests** (they'll live in `head-meta.test.ts`):
- `error page has noindex meta tag`
- `error page preserves og:title from layout`

**Keep in `error-pages.test.ts`:**
- All status-specific tests (400, 403, 404, 500, unexpected)
- Navigation tests
- Accessibility tests (breadcrumb, alert role, h1, icon)

### 6. Integration test for `error.html` content

New file: `src/error-html.test.ts`

Read `error.html` as a string (via `fs.readFileSync`) and assert all required elements are present:
- `<meta charset="utf-8"`
- `<meta name="viewport"`
- `<meta name="color-scheme" content="light dark"`
- `<meta name="robots" content="noindex, nofollow"`
- `<link rel="icon" type="image/svg+xml"`
- `<link rel="icon" type="image/png"`
- `<link rel="apple-touch-icon"`
- `<title>%sveltekit.status%`

This catches regressions if someone edits `error.html` and removes a meta tag.

### 7. Integration tests for security headers

Add tests to `src/hooks.server.test.ts`:
- Verify `handle` sets all 5 security headers on the resolved response
- Test that headers are present for both normal and error responses

## File Changes Summary

| File | Action |
|------|--------|
| `src/error.html` | **Modify** — add color-scheme, robots, favicon links |
| `src/hooks.server.ts` | **Modify** — add security headers to handle |
| `src/hooks.server.test.ts` | **Modify** — add security header tests |
| `src/error-html.test.ts` | **Create** — error.html content assertions |
| `e2e/head-meta.test.ts` | **Create** — consolidated head meta E2E tests |
| `e2e/security-headers.test.ts` | **Create** — security header E2E tests |
| `e2e/layout.test.ts` | **Modify** — remove meta tests (moved to head-meta.test.ts) |
| `e2e/error-pages.test.ts` | **Modify** — remove meta tests (moved to head-meta.test.ts) |

## Not In Scope

- **CSP** — Babylon.js needs `unsafe-eval` for shader compilation; complex to configure. Separate task.
- **og:image / og:url** — No image asset, localhost URL. Not useful yet.
- **twitter:card** — Private app, no Twitter presence.
- **keywords, author, copyright** — Dead/useless meta tags.
- **favicon.ico** — Modern browsers handle SVG + PNG fine.
