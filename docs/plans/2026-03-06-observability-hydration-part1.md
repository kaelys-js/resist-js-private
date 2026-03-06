# Client Observability & Hydration Polish — Implementation Plan (Part 1)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-03-06
**Design doc:** `docs/plans/2026-03-06-observability-hydration-design.md`
**Scope:** Hydration flash fixes + Perfume.js core + connection quality + vitals logger
**Part 2:** Vitals beacon + endpoint + dev toolbar + E2E tests

---

## Task 1: Preference Cookie Utility

**Files:**
- `src/lib/utils/preference-cookie.ts` (new)
- `src/lib/utils/preference-cookie.test.ts` (new)

**Test first:** Write tests for:
- `setPreferenceCookie(name, value)` — sets document.cookie with max-age 1 year, path=/, SameSite=Lax
- `getPreferenceCookie(name)` — reads from document.cookie string
- `sanitizeSidebarWidth(value)` — clamps to [100, 1000], returns number or null for invalid
- `sanitizeTheme(value)` — validates against SUPPORTED_THEMES, returns theme or empty string
- Edge cases: empty string, XSS injection attempts (`"><script>`), non-numeric sidebar values
- SSR safety: returns null/undefined when `document` is unavailable

**Implementation:**
```typescript
import * as v from 'valibot';
import type { Str, Num } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { SUPPORTED_THEMES } from '$lib/schemas/editor-state';

export function setPreferenceCookie(name: Str, value: Str): Result<Void> { ... }
export function getPreferenceCookie(name: Str): Str | null { ... }
export function sanitizeSidebarWidth(raw: Str | null): Num | null { ... }
export function sanitizeTheme(raw: Str | null): Str { ... }
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 2: Sidebar Cookie Persistence (Hydration Fix A1)

**Files:**
- `src/routes/+layout.svelte` (modify)
- `src/lib/utils/preference-cookie.test.ts` (extend if needed)

**Test first:** Add integration-style unit test verifying:
- `paneStorage.setItem()` writes both localStorage AND cookie
- `handleSidebarResize()` writes both localStorage AND cookie
- Cookie value matches localStorage value

**Implementation:**
- Import `setPreferenceCookie` in `+layout.svelte`
- In `paneStorage.setItem()`: after `localStorage.setItem(SIDEBAR_PX_KEY, ...)`, also call `setPreferenceCookie('sidebar-px', sidebarPx)`
- In `handleSidebarResize()`: after `localStorage.setItem(SIDEBAR_PX_KEY, ...)`, also call `setPreferenceCookie('sidebar-px', widthPx)`

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 3: Theme Cookie Persistence (Hydration Fix A2)

**Files:**
- `src/lib/stores/editor-state.svelte.ts` (modify)
- `src/lib/stores/editor-state.svelte.test.ts` (extend)

**Test first:** Add test verifying:
- `setTheme()` writes cookie alongside localStorage
- Cookie value matches the theme being set
- Setting theme to empty string (default) writes empty cookie

**Implementation:**
- Import `setPreferenceCookie` in `editor-state.svelte.ts`
- In the `setTheme(theme)` method, after updating `_app.theme`, call `setPreferenceCookie('theme', theme)`
- Guard with `typeof document !== 'undefined'` for SSR safety

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 4: Server-Side Cookie Injection

**Files:**
- `src/hooks.server.ts` (modify)
- `src/hooks.server.test.ts` (extend)
- `src/app.d.ts` (modify — add `saveData` to `App.Locals`)

**Test first:** Add tests for:
- `transformPageChunk` replaces `data-sidebar-width=""` with saved value from cookie
- `transformPageChunk` replaces `data-theme=""` with saved value from cookie
- Invalid sidebar cookie value (non-numeric, out of range) → falls back to empty string
- Invalid theme cookie value (XSS, unsupported theme) → falls back to empty string
- Missing cookies → attributes stay empty (default behavior)
- `Save-Data: on` header sets `event.locals.saveData = true`
- Missing `Save-Data` header → `event.locals.saveData = false`

**Implementation:**
- Read cookies: `event.cookies.get('app:sidebar-px')`, `event.cookies.get('app:theme')`
- Sanitize with `sanitizeSidebarWidth()` and `sanitizeTheme()`
- Extend `transformPageChunk`:
  ```typescript
  transformPageChunk: ({ html }) =>
    html
      .replace('%lang%', locale)
      .replace('%dir%', dir)
      .replace('data-sidebar-width=""', sidebarPx ? `data-sidebar-width="${sidebarPx}"` : 'data-sidebar-width=""')
      .replace('data-theme=""', theme ? `data-theme="${theme}"` : 'data-theme=""'),
  ```
- Read `Save-Data` header: `event.request.headers.get('save-data') === 'on'`
- Set `event.locals.saveData = saveData`
- Update `App.Locals` in `app.d.ts` to include `saveData: Bool`

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 5: Inline Script Extension (app.html)

**Files:**
- `src/app.html` (modify)
- `src/app-html.test.ts` (extend)

**Test first:** Extend `app-html.test.ts` to verify:
- `app.html` contains `data-sidebar-width=""` on `<html>` tag
- `app.html` contains `data-theme=""` on `<html>` tag
- Inline script reads `data-sidebar-width` and sets `--sidebar-width` CSS property
- Inline script reads `data-theme` attribute (belt-and-suspenders with cookie-based `localStorage`)
- Inline script reads `localStorage` `app:theme` for belt-and-suspenders fallback

**Implementation:**
Update `<html>` tag:
```html
<html lang="%lang%" dir="%dir%" data-theme="" data-sidebar-width="">
```

Extend inline script:
```javascript
(function () { try {
  // Mode (existing)
  var m = localStorage.getItem('app:mode');
  var dark = m === 'dark' || (m !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  // Theme (new) — server injects data-theme via cookie, but handle localStorage fallback
  var t = document.documentElement.getAttribute('data-theme');
  if (!t) {
    t = localStorage.getItem('app:theme') || '';
    if (t) document.documentElement.setAttribute('data-theme', t);
  }
  // Sidebar width (new) — server injects data-sidebar-width via cookie
  var sw = document.documentElement.getAttribute('data-sidebar-width');
  if (sw && +sw > 0) {
    document.documentElement.style.setProperty('--sidebar-width', sw + 'px');
  }
} catch (e) { console.error('[{{APP_NAME}}] Preferences could not be loaded:', e); }
})();
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 6: Perfume.js Installation + Init Module

**Files:**
- `package.json` (add `perfume.js` dependency)
- `src/lib/perf/perfume.ts` (new)
- `src/lib/perf/perfume.test.ts` (new)

**Install:** `cd packages/products/webforge/editor && pnpm add perfume.js`

**Test first:** Write tests for:
- `setupPerfume(tracker)` calls `initPerfume` with the tracker
- `setupPerfume` returns `Result<Void>` success
- Tracker function is called when Perfume reports a metric (mock initPerfume)

**Implementation:**
```typescript
import { initPerfume } from 'perfume.js';
import type { Str, Void } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';

export type AnalyticsTrackerOptions = {
  readonly metricName: Str;
  readonly data: number;
  readonly attribution: Record<string, unknown>;
  readonly navigatorInformation: NavigatorInfo;
  readonly rating: 'good' | 'needsImprovement' | 'poor';
  readonly navigationType: Str;
};

export type AnalyticsTrackerFn = (options: AnalyticsTrackerOptions) => void;

export function setupPerfume(tracker: AnalyticsTrackerFn): Result<Void> {
  initPerfume({ analyticsTracker: tracker });
  return okUnchecked<Void>(undefined);
}
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 7: Connection Quality Store

**Files:**
- `src/lib/perf/connection.ts` (new)
- `src/lib/perf/connection.test.ts` (new)

**Test first:** Write tests for:
- `initConnection()` reads `navigator.connection` if available
- `getConnectionQuality()` returns correct tier for each effectiveType
- `saveData=true` overrides to 'slow'
- API unavailable → quality is 'unknown'
- `updateFromNavigatorInfo()` merges Perfume.js device data
- All getters return correct values after initialization

**Implementation:**
```typescript
import type { Str, Num, Bool, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import * as v from 'valibot';

export const ConnectionQualitySchema = v.picklist(['fast', 'medium', 'slow', 'unknown']);
export type ConnectionQuality = v.InferOutput<typeof ConnectionQualitySchema>;

// Module-level $state (same pattern as editor-state)
let _effectiveType: Str = $state('4g');
let _saveData: Bool = $state(false);
let _rtt: Num = $state(0);
let _downlink: Num = $state(0);
let _quality: ConnectionQuality = $state('unknown');
let _isLowEndDevice: Bool = $state(false);
let _isLowEndExperience: Bool = $state(false);
let _deviceMemory: Num = $state(0);
let _hardwareConcurrency: Num = $state(0);

export function initConnection(): Result<Void> { ... }
export function updateFromNavigatorInfo(info: NavigatorInfo): Result<Void> { ... }
export function getConnectionQuality(): ConnectionQuality { ... }
// ... readonly getters for all fields ...
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 8: Vitals Logger

**Files:**
- `src/lib/perf/vitals-logger.ts` (new)
- `src/lib/perf/vitals-logger.test.ts` (new)

**Test first:** Write tests for:
- `logVital('LCP', 2450, 'needsImprovement', navigatorInfo)` logs warning in prod
- `logVital('CLS', 0.05, 'good', navigatorInfo)` logs info in dev, nothing in prod
- `logVital('INP', 650, 'poor', navigatorInfo)` logs warning in both dev and prod
- Format string matches spec: `[perf] LCP 2450ms ⚠ needsImprovement`
- Non-timing metrics (CLS) don't append 'ms'

**Implementation:**
```typescript
import type { Str, Num, Void } from '@/schemas/common';
import { log } from '@/utils/core/logger';
import type { Result } from '@/schemas/result/result';
import { okUnchecked } from '@/schemas/result/result';
import { dev } from '$app/environment';

const TIMING_METRICS: ReadonlySet<Str> = new Set(['TTFB', 'FCP', 'LCP', 'FID', 'INP', 'TBT', 'NTBT']);
const RATING_ICONS: Record<Str, Str> = { good: '✓', needsImprovement: '⚠', poor: '✗' };

export function logVital(metricName: Str, value: Num, rating: Str, navigatorInfo: NavigatorInfo): Result<Void> {
  const unit: Str = TIMING_METRICS.has(metricName) ? 'ms' : '';
  const icon: Str = RATING_ICONS[rating] ?? '?';
  const msg: Str = `[perf] ${metricName} ${Math.round(value)}${unit} ${icon} ${rating}`;

  if (rating === 'poor') {
    log.warn(msg);
  } else if (dev) {
    log.info(msg);
  }
  // In production, 'good' and 'needsImprovement' are silent (data is beaconed, not logged)

  return okUnchecked<Void>(undefined);
}
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Summary

Part 1 delivers:
- ✅ Sidebar width hydration flash fix (cookie → SSR → inline script)
- ✅ Theme hydration flash fix (cookie → SSR → inline script)
- ✅ Perfume.js installed and initialized
- ✅ Connection quality reactive store
- ✅ Vitals console logger with color-coded ratings
- ✅ Preference cookie utility with sanitization

Part 2 will deliver:
- Vitals beacon (queue + flush + payload schema)
- `/api/vitals` server endpoint
- `hooks.client.ts` wiring (Perfume → logger → beacon → connection)
- DevToolbarPerf panel
- E2E tests for hydration + vitals
- Documentation updates
