# Error Pages Polish — Design Document

**Date:** 2026-03-03
**Scope:** Wording, hover parity, structured logging, errorId E2E consistency

---

## 1. "Reference:" Wording

### Rationale

"Error ID" is not used by any major platform. The industry standard is "Request ID" (AWS, Stripe, Netlify, Vercel). Since WebForge errors aren't always HTTP-request-bound, **"Reference"** is the most neutral, terse label.

### Changes

- Locale key `errors.errorId` template: `"Error ID: {id}"` → `"Reference: {id}"`
- All 7 locale files (en, ja, zh, ko, fr, de, es)
- error.html JS: `"Error ID: " + errorId` → `"Reference: " + errorId`
- ErrorPage.svelte fallback: `"Error ID: ${errorId}"` → `"Reference: ${errorId}"`
- Tooltip remains `"Click to copy"` / `"Copied!"` (industry standard per Shoelace, Flowbite, AWS Cloudscape)

### Locale translations

| Locale | Current | New |
|--------|---------|-----|
| en | `Error ID: {id}` | `Reference: {id}` |
| ja | `エラーID: {id}` | `リファレンス: {id}` |
| zh | `错误ID: {id}` | `参考编号: {id}` |
| ko | `오류 ID: {id}` | `참조: {id}` |
| fr | `Identifiant d'erreur : {id}` | `Référence : {id}` |
| de | `Fehler-ID: {id}` | `Referenz: {id}` |
| es | `ID de error: {id}` | `Referencia: {id}` |

---

## 2. error.html Hover Parity

### Root Cause

Tailwind v4 compiles `hover:bg-muted/50` to:

```css
background-color: var(--muted); /* fallback for older browsers */

@supports (color: color-mix(in lab, red, red)) {
  background-color: color-mix(in oklab, var(--muted) 50%, transparent);
}
```

error.html was using `oklch(0.965 0 0 / 0.5)` — the **oklab** color space produces visually different results than raw oklch alpha.

### Fix

Define CSS custom properties in error.html matching the theme, then use `color-mix(in oklab, ...)`:

```css
:root {
  --muted: oklch(0.965 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --foreground: oklch(0.145 0 0);
  --border: oklch(0.922 0 0);
  --background: oklch(1 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
}

@media (prefers-color-scheme: dark) {
  :root {
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --foreground: oklch(0.985 0 0);
    --border: oklch(0.269 0 0);
    --background: oklch(0.145 0 0);
    --primary: oklch(0.985 0 0);
    --primary-foreground: oklch(0.205 0 0);
  }
}

.error-id-btn {
  color: var(--muted-foreground);
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.error-id-btn:hover {
  color: var(--foreground);
  background-color: color-mix(in oklab, var(--muted) 50%, transparent);
  border-color: var(--border);
}
```

Also update body, description, home-link to use `var(--*)` references instead of hardcoded oklch values. This makes error.html automatically match any future theme changes.

---

## 3. Structured Error Logging

### Server hook (`hooks.server.ts`)

Replace `log.errorObject(appError)` with `log.error()` including full request context:

```typescript
log.error(message, {
  errorId: appError.id,
  errorCode: appError.code,
  url: event.url.pathname,
  method: event.request.method,
  route: event.route?.id ?? null,
  status,
  stack: appError.stack,
  cause: appError.cause ? { code: appError.cause.code, message: appError.cause.message } : undefined,
});
```

### Client hook (`hooks.client.ts`)

Replace `log.errorObject(appError)` with developer-friendly console output:

```typescript
console.groupCollapsed(
  `%c[Error] %c${message} %c(${appError.id})`,
  'color: red; font-weight: bold',
  'color: inherit',
  'color: gray; font-size: 0.9em'
);
console.error(error);
console.table({
  'Error ID': appError.id,
  Code: appError.code,
  URL: globalThis.location?.href,
  Timestamp: appError.timestamp,
});
console.groupEnd();
```

### Logger `errorObject()` fix

Add `errorId: error.id` and `timestamp: error.timestamp` to the structured JSON output in `log.errorObject()`.

---

## 4. ErrorId Consistency E2E Tests

New test section verifying the errorId is consistent across all surfaces:

1. **Svelte page**: `x-error-id` header matches `data-error-id` attribute on the copy button
2. **error.html page**: `x-error-id` header matches `data-error-id` attribute on the copy button
3. **Svelte page**: displayed text contains the same errorId from the header

These extend the existing `error-pages.test.ts` file.

---

## Files Modified

| File | Type |
|------|------|
| `src/error.html` | CSS variables + color-mix + "Reference:" |
| `src/lib/locales/{en,ja,zh,ko,fr,de,es}.ts` | "Reference:" wording |
| `src/lib/components/ErrorPage.svelte` | Fallback label text |
| `src/hooks.server.ts` | Structured logging with request context |
| `src/hooks.client.ts` | console.groupCollapsed pattern |
| `packages/shared/utils/core/src/logger.ts` | errorId in errorObject() |
| `e2e/error-pages.test.ts` | ErrorId consistency tests |
| `src/hooks.server.test.ts` | Updated assertions |
| `src/hooks.client.test.ts` | Updated assertions |
| `packages/shared/utils/core/src/logger.test.ts` | errorObject errorId test |
| `src/lib/components/error-page.test.ts` | Updated label assertions |
