# Storylyne editor component tests — DOM cleanup gotcha (flaky "document is not defined")

> Captured 2026-06-04. Path: `packages/products/storylyne/editor`. Project: `storylyne-editor` (root `vitest.config.ts`).

## The trap: `globals: true` disables svelte-testing-library auto-cleanup

The `storylyne-editor` vitest project sets `test.globals: true` AND uses the `svelteTesting()` plugin (`@testing-library/svelte/vite`). But `svelteTesting`'s `addAutoCleanup` does `if (test.globals) return` (see `@testing-library/svelte@5.3.1/src/vite.js` ~line 74). So **the auto `afterEach(() => { await act(); cleanup() })` setup file is NEVER injected** for this project.

The editor's own setup file (`src/test-setup-component.ts`, wired via `setupFiles`) only adds polyfills (matchMedia, ResizeObserver, Element.animate) + jest-dom matchers. It does NOT register `cleanup()`.

**Net effect: rendered Svelte components are never explicitly unmounted between tests or after the file.** They are torn down only when Vitest destroys the jsdom environment at end-of-file.

## Why this surfaces as a flaky failure (bits-ui scroll lock)

Any test that renders a bits-ui overlay **in the open state** (e.g. `<DropdownMenu.Root open={true}>`, dialog, popover) mounts `popper-layer-inner.svelte` → `<ScrollLock preventScroll />` → `new BodyScrollLock(true, () => null)` (bits-ui `internal/body-scroll-lock.svelte.js`).

On component destroy, `BodyScrollLock`'s `onDestroyEffect` calls `scheduleCleanupIfNoNewLocks(null, ...)`. Because `restoreScrollDelay` is hardcoded `null`, `actualDelay = 24` → `window.setTimeout(cleanupFn, 24)`. `cleanupFn` → `resetBodyStyle()` → `document.body.setAttribute(...)`.

When destroy happens at jsdom teardown (no explicit unmount), this real 24ms timer outlives the environment → `ReferenceError: document is not defined` thrown from a stray setTimeout with no try/catch → unhandled error → vitest exits 1 even though all tests pass. Flaky because it's a race between the 24ms timer and teardown.

Only `theme-switcher.test.ts` hits it: it's the only component test that renders a dropdown **open at mount**. `header-user`/`nav-project`/`dev-toolbar` tests render overlays **closed**, so no `BodyScrollLock` is created (no lock → no destroy timer).

## The mis-ordered existing mitigation (do not copy)

`theme-switcher.test.ts` (added commit 6ee65f5fe, 2026-03-10) has:

```ts
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});
```

This is WRONG-ordered: nothing has unmounted when `runAllTimers()` runs, so there is no pending 24ms timer to flush. The real timer is scheduled later at teardown, after `useRealTimers()` — exactly the race it was meant to prevent.

## Correct pattern for tests that render OPEN bits-ui overlays

Unmount first (which schedules the fake 24ms timer synchronously via `Svelte.flushSync(Svelte.unmount(...))`), THEN flush, THEN restore:

```ts
import { cleanup, render, screen } from '@testing-library/svelte';
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup(); // unmounts → BodyScrollLock destroy effect schedules the (now fake) 24ms timer
  vi.runAllTimers(); // fires resetBodyStyle against a LIVE document
  vi.useRealTimers();
});
```

`cleanup` is exported from `@testing-library/svelte` (re-exports `Core.cleanup()`); it runs all registered unmount tasks. Fake timers do NOT break `render()` because Svelte mount/tick + bits-ui `afterTick` use microtasks, not macro-timers, and the `Element.prototype.animate` polyfill resolves synchronously.

Systemic alternative (broader): register `afterEach(cleanup)` in `test-setup-component.ts` so all editor component tests unmount — but that alone does NOT fix the timer-after-teardown race; open-overlay tests still need the fake-timer flush. Cleanest systemic fix pairs a global `afterEach(cleanup)` with a global fake-timer flush, but that changes timer semantics for 1498 tests, so the scoped per-file fix is lower-risk.
