# Error Pages Design

## Overview

Custom error pages (404, 403, 500, unexpected) for the WebForge editor with full i18n support, proper meta tags, dark mode support, and dedicated test routes for manual visual testing.

## SvelteKit Error Architecture

SvelteKit distinguishes two error types:

1. **Expected errors** — thrown via `error(status, body)` from `@sveltejs/kit`. The body becomes `page.error`.
2. **Unexpected errors** — any unhandled exception. Goes through `handleError` hook, which returns a user-safe `App.Error` object.

Both render the nearest `+error.svelte` boundary. If the layout itself fails, SvelteKit falls back to `src/error.html` (static HTML, no Svelte).

## App.Error Interface

Extend `src/app.d.ts` to include an optional `errorId` for tracking:

```typescript
declare global {
  namespace App {
    interface Error {
      message: string;
      errorId?: string;
    }
    interface Locals {
      locale: string;
    }
  }
}
```

## Component Tree

```
+layout.svelte (existing — provides sidebar, header, locale, theme)
└── +error.svelte (new — error boundary)
    └── ErrorPage.svelte (new — reusable error display)
        ├── Status code (large number)
        ├── Localized title (mapped from status)
        ├── Localized description
        ├── Action buttons (home link, try again)
        └── Error ID (500s only, from App.Error.errorId)
```

The error page renders **inside** the existing layout. The sidebar and header remain visible so users can navigate away. This is standard SvelteKit behavior — `+error.svelte` replaces the page content, not the layout.

## ErrorPage Component

### Props

```typescript
// Props via $props()
interface ErrorPageProps {
  status: number;      // HTTP status code
  message: string;     // Error message from page.error.message
  errorId?: string;    // Optional tracking ID (500s)
}
```

### Status Code → Locale Key Mapping

| Status | Title Key | Description Key |
|--------|-----------|-----------------|
| 403 | `errors.forbidden` | `errors.forbiddenDescription` |
| 404 | `errors.notFound` | `errors.notFoundDescription` |
| 500 | `errors.serverError` | `errors.serverErrorDescription` |
| Other | `errors.genericTitle` | `errors.genericDescription` |

### Layout (ASCII Wireframe)

```
┌─────────────────────────────────────┐
│           (existing header)          │
├─────────────────────────────────────┤
│                                     │
│              4 0 4                  │  ← large status code
│                                     │
│        Page not found               │  ← localized title
│                                     │
│   The page you're looking for       │  ← localized description
│   doesn't exist or has been moved.  │
│                                     │
│      [ Go to homepage ]             │  ← primary action (always)
│      [ Try again ]                  │  ← secondary action (500 only)
│                                     │
│   Error ID: a1b2c3d4               │  ← only for 500s with errorId
│                                     │
└─────────────────────────────────────┘
```

Centered vertically and horizontally in the content area. Uses Tailwind utility classes for layout.

### Styling

- Status code: `text-7xl font-bold text-muted-foreground/50` — large but subdued
- Title: `text-2xl font-semibold` — standard heading
- Description: `text-muted-foreground` — secondary text color
- Home button: `Button variant="default"` — primary action
- Try again button: `Button variant="outline"` — secondary action
- Error ID: `text-xs text-muted-foreground font-mono` — small, monospace
- All colors inherit from the theme system (dark mode automatic via Tailwind)

## +error.svelte

Minimal bridge between SvelteKit's `page` state and the `ErrorPage` component:

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import ErrorPage from '$lib/components/ErrorPage.svelte';
</script>

<svelte:head>
  <title>{page.status} | WebForge</title>
</svelte:head>

<ErrorPage
  status={page.status}
  message={page.error?.message ?? ''}
  errorId={page.error?.errorId}
/>
```

## Static Fallback: src/error.html

For when the layout itself fails (e.g., hooks crash). Minimal static HTML — no Svelte, no JS, no locale support (impossible without runtime). Uses SvelteKit's `%sveltekit.status%` and `%sveltekit.error.message%` placeholders.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>%sveltekit.status% | WebForge</title>
    <style>
      /* Minimal inline styles — no external CSS available */
      body { font-family: system-ui; display: flex; justify-content: center;
             align-items: center; min-height: 100vh; margin: 0;
             background: #0a0a0a; color: #fafafa; }
      .container { text-align: center; }
      .status { font-size: 4rem; font-weight: bold; opacity: 0.5; }
      .message { margin-top: 1rem; opacity: 0.7; }
      a { color: #3b82f6; text-decoration: none; margin-top: 2rem; display: inline-block; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="status">%sveltekit.status%</div>
      <div class="message">%sveltekit.error.message%</div>
      <a href="/">Go to homepage</a>
    </div>
  </body>
</html>
```

## handleError Hooks

### Server (`src/hooks.server.ts`)

Add `handleError` export alongside existing `handle`:

```typescript
export const handleError: HandleServerError = ({ error, status, message }) => {
  const errorId: string = crypto.randomUUID();
  // Log for server-side observability
  console.error(`[${errorId}] Unexpected server error (${status}):`, error);
  return { message, errorId };
};
```

### Client (`src/hooks.client.ts`)

New file:

```typescript
export const handleError: HandleClientError = ({ error, status, message }) => {
  const errorId: string = crypto.randomUUID();
  console.error(`[${errorId}] Unexpected client error (${status}):`, error);
  return { message, errorId };
};
```

## Locale Keys

New `errors` namespace added to `EditorLocaleSchema` and all 7 locale files:

```typescript
errors: v.strictObject({
  notFound: messageTemplate(),
  notFoundDescription: messageTemplate(),
  forbidden: messageTemplate(),
  forbiddenDescription: messageTemplate(),
  serverError: messageTemplate(),
  serverErrorDescription: messageTemplate(),
  genericTitle: messageTemplate(),
  genericDescription: messageTemplate(),
  goHome: messageTemplate(),
  tryAgain: messageTemplate(),
  errorId: messageTemplate({ id: v.string() }),
}),
```

## Test Routes

Route group `(testing)` shares the main layout but groups test-only routes:

```
src/routes/(testing)/test-error/
├── 404/+page.server.ts   → error(404, { message: 'Not found' })
├── 403/+page.server.ts   → error(403, { message: 'Forbidden' })
├── 500/+page.server.ts   → error(500, { message: 'Internal error' })
└── unexpected/+page.server.ts → throw new Error('Unexpected test error')
```

Each `+page.server.ts` is a one-liner `load` function that throws the corresponding error. Visiting `/test-error/404` triggers the 404 error page, etc.

## Accessibility

- Status code has `aria-hidden="true"` (decorative — the title conveys meaning)
- Action buttons are standard `<a>` and `<button>` elements — keyboard navigable
- Focus management: first action button receives focus on error page mount
- Color contrast: all text uses Tailwind semantic colors that pass WCAG AA in both light and dark modes
- `role="alert"` on the error container for screen reader announcement

## Files Summary

| File | Action |
|------|--------|
| `src/app.d.ts` | Modify — add `errorId` to `App.Error` |
| `src/error.html` | Create — static fallback |
| `src/hooks.server.ts` | Modify — add `handleError` export |
| `src/hooks.client.ts` | Create — `handleError` for client errors |
| `src/routes/+error.svelte` | Create — error boundary |
| `src/lib/components/ErrorPage.svelte` | Create — reusable error display |
| `src/lib/components/ErrorPageTest.svelte` | Create — test wrapper |
| `src/lib/components/ErrorPage.test.ts` | Create — unit tests |
| `src/lib/locales/schema.ts` | Modify — add `errors` namespace |
| `src/lib/locales/en.ts` | Modify — add error strings |
| `src/lib/locales/ja.ts` | Modify — add error strings |
| `src/lib/locales/zh.ts` | Modify — add error strings |
| `src/lib/locales/ko.ts` | Modify — add error strings |
| `src/lib/locales/fr.ts` | Modify — add error strings |
| `src/lib/locales/de.ts` | Modify — add error strings |
| `src/lib/locales/es.ts` | Modify — add error strings |
| `src/routes/(testing)/test-error/404/+page.server.ts` | Create |
| `src/routes/(testing)/test-error/403/+page.server.ts` | Create |
| `src/routes/(testing)/test-error/500/+page.server.ts` | Create |
| `src/routes/(testing)/test-error/unexpected/+page.server.ts` | Create |
| `src/hooks.server.test.ts` | Modify — add handleError tests |
| `src/hooks.client.test.ts` | Create — handleError tests |
| `src/routes/error-page.test.ts` | Create — integration tests |
| `e2e/error-pages.test.ts` | Create — E2E tests |
