# Error Pages Polish — Implementation Plan

**Date:** 2026-03-03
**Design doc:** `docs/plans/2026-03-03-error-pages-polish-design.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Task 1: Fix `log.errorObject()` to include errorId

**Files:** `packages/shared/utils/core/src/logger.ts`, `packages/shared/utils/core/src/logger.test.ts`

### Test first

Add test in `logger.test.ts` (in the existing `errorObject` describe block):

```typescript
it('includes errorId and timestamp in JSON output', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  // ... create AppError with known id and timestamp, call log.errorObject()
  // Assert JSON output contains "errorId" and "timestamp" fields
  spy.mockRestore();
});
```

### Implementation

In `logger.ts` `errorObject()` function (~line 941), add `errorId: error.id` and `timestamp: error.timestamp` to the `emitStructured()` call:

```typescript
return emitStructured('error', error.message, 'stderr', {
  errorId: error.id,           // ADD
  timestamp: error.timestamp,  // ADD
  errorCode: error.code,
  errorMessage: error.message,
  errorStack: error.stack,
  // ... rest unchanged
});
```

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 2: Update locale wording — "Error ID" → "Reference"

**Files:** `src/lib/locales/{en,ja,zh,ko,fr,de,es}.ts`

No test-first needed — locale tests already validate schema compliance.

### Implementation

Update the `errorId` key in each locale file:

- en: `'Reference: {id}'`
- ja: `'リファレンス: {id}'`
- zh: `'参考编号: {id}'`
- ko: `'참조: {id}'`
- fr: `'Référence\u00A0: {id}'`
- de: `'Referenz: {id}'`
- es: `'Referencia: {id}'`

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 3: Fix error.html — CSS variables + color-mix + "Reference:"

**File:** `src/error.html`

No unit tests — E2E tests cover this (Task 7).

### Implementation

**3a. CSS: Replace hardcoded oklch with CSS custom properties**

Add `:root` block with theme variables. Replace all hardcoded color values with `var(--*)` references. Replace `@media (prefers-color-scheme: dark)` body/link/btn overrides with variable overrides in `:root`.

**3b. CSS: Use `color-mix(in oklab, ...)` for hover background**

```css
.error-id-btn:hover {
  color: var(--foreground);
  background-color: color-mix(in oklab, var(--muted) 50%, transparent);
  border-color: var(--border);
}
```

**3c. JS: Update "Error ID:" → "Reference:"**

In the IIFE that extracts the error ID from raw message:
- `label.textContent = 'Reference: ' + errorId;`

In the `copyErrorId()` revert timeout:
- `label.textContent = 'Reference: ' + id;`

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 4: Update ErrorPage.svelte — fallback label text

**Files:** `src/lib/components/ErrorPage.svelte`, `src/lib/components/error-page.test.ts`

### Test first

Update existing test assertions that check for "Error ID:" to check for "Reference:" instead.

### Implementation

In `ErrorPage.svelte` line 105, change fallback:
```typescript
return result.ok ? result.data : `Reference: ${errorId}`;
```

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 5: Rewrite server hook logging

**Files:** `src/hooks.server.ts`, `src/hooks.server.test.ts`

### Test first

Update the existing "logs the error with error code" test to verify structured fields:

```typescript
it('logs structured error with errorId, url, method, and status', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { result } = callServerHandleError({ ... });
  const logOutput = spy.mock.calls[0]?.[0];
  // Assert the JSON output contains errorId, url, method, status fields
  spy.mockRestore();
});
```

### Implementation

Replace `log.errorObject(appError)` with `log.error()` call including request context:

```typescript
log.error(`Unexpected server error (${status}): ${message}`, {
  errorId: appError.id,
  errorCode: appError.code,
  url: event.url.pathname,
  method: event.request.method,
  route: event.route?.id ?? null,
  status,
  stack: appError.stack,
  ...(appError.cause && {
    cause: { code: appError.cause.code, message: appError.cause.message },
  }),
});
```

Update `mockEvent` to include `request.method` and `route` properties.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 6: Rewrite client hook logging

**Files:** `src/hooks.client.ts`, `src/hooks.client.test.ts`

### Test first

Update the "logs the error" test to verify console.groupCollapsed is called:

```typescript
it('logs error with groupCollapsed including errorId', () => {
  const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
  const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

  const result = callHandleError({ ... });

  expect(groupSpy).toHaveBeenCalledWith(
    expect.stringContaining('[Error]'),
    expect.any(String), expect.any(String), expect.any(String)
  );
  expect(tableSpy).toHaveBeenCalledWith(
    expect.objectContaining({ 'Error ID': result.errorId })
  );
  expect(endSpy).toHaveBeenCalled();

  groupSpy.mockRestore();
  errorSpy.mockRestore();
  tableSpy.mockRestore();
  endSpy.mockRestore();
});
```

### Implementation

Replace `log.errorObject(appError)` with:

```typescript
console.groupCollapsed(
  `%c[Error] %c${message} %c(${appError.id})`,
  'color: red; font-weight: bold',
  'color: inherit',
  'color: gray; font-size: 0.9em',
);
console.error(error);
console.table({
  'Error ID': appError.id,
  Code: appError.code,
  URL: globalThis.location?.href ?? 'unknown',
  Timestamp: appError.timestamp,
});
console.groupEnd();
```

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 7: ErrorId consistency E2E tests + update existing E2E assertions

**File:** `e2e/error-pages.test.ts`

### Implementation

**7a. Update existing assertions** — change `/error id/i` regex to `/reference/i` in all existing tests.

**7b. Add new test section:**

```typescript
test.describe('ErrorId consistency', () => {
  test('Svelte: x-error-id header matches data-error-id on page', async ({ page }) => {
    const response = await page.goto('/test-error/unexpected');
    const headerErrorId = await response?.headerValue('x-error-id');
    expect(headerErrorId).toBeTruthy();
    const btn = page.locator('[data-error-id]');
    await expect(btn).toBeVisible();
    const dataErrorId = await btn.getAttribute('data-error-id');
    expect(dataErrorId).toBe(headerErrorId);
  });

  test('Svelte: displayed text contains the errorId from header', async ({ page }) => {
    const response = await page.goto('/test-error/unexpected');
    const headerErrorId = await response?.headerValue('x-error-id');
    expect(headerErrorId).toBeTruthy();
    const btn = page.locator('[data-error-id]');
    await expect(btn).toContainText(headerErrorId!);
  });

  test('error.html: x-error-id header matches data-error-id on page', async ({ page }) => {
    const response = await page.goto('/test-error/catastrophic');
    const headerErrorId = await response?.headerValue('x-error-id');
    expect(headerErrorId).toBeTruthy();
    const btn = page.locator('[data-error-id]');
    await expect(btn).toBeVisible();
    const dataErrorId = await btn.getAttribute('data-error-id');
    expect(dataErrorId).toBe(headerErrorId);
  });
});
```

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`
**E2E:** `pnpm exec playwright test`

---

## Task 8: Update unit tests for wording changes

**Files:** `src/hooks.server.test.ts`, `src/lib/components/error-page.test.ts`

### Implementation

- `hooks.server.test.ts`: Change `expect(...).toContain('Error ID:')` → `expect(...).toContain('Reference:')`
- `error-page.test.ts`: Change any assertions checking for "Error ID:" to "Reference:"

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`
