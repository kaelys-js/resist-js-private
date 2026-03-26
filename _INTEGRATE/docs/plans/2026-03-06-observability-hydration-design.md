# Client Observability & Hydration Polish — Design Document

**Date:** 2026-03-06
**Status:** Draft
**Scope:** Bug fixes (hydration flash) + new feature (Perfume.js / RUM / connection awareness)

---

## 1. Overview

Two distinct workstreams:

**A. Hydration Flash Fixes (bug fixes):**
- Sidebar width flashes from server default (288px) → client saved value during hydration
- Theme flashes from default → client saved theme during hydration

**B. Client Observability (new feature):**
- Perfume.js integration for Web Vitals collection
- Real User Monitoring beacon to `/api/vitals`
- Connection quality awareness (Network Information API + Save-Data)
- Vitals warning/error logging
- Dev toolbar performance panel

---

## 2. Hydration Flash Fixes

### 2A. Sidebar Width Flash

**Root cause:** `getInitialSidebarPercent()` in `+layout.svelte` runs client-side only (`typeof window === 'undefined'` guard). During SSR, the server renders with default CSS `--sidebar-width: calc(var(--spacing) * 72)` = 288px. If the client has saved a different width (e.g., 350px) in `localStorage` under `app:sidebar-px`, there's a visible layout shift when the client-side code reads localStorage and recalculates.

**Fix: Cookie-based SSR injection**

1. When sidebar width changes (in `paneStorage.setItem` and `handleSidebarResize`), also write a cookie: `app:sidebar-px=350; max-age=31536000; path=/; SameSite=Lax`
2. In `hooks.server.ts`, read `event.cookies.get('app:sidebar-px')` and inject into HTML via `transformPageChunk`
3. In `app.html`, add `data-sidebar-width=""` attribute on `<html>` tag as a placeholder
4. The `transformPageChunk` replaces `data-sidebar-width=""` with `data-sidebar-width="350"`
5. Extend the existing inline `<script>` in `app.html` to read `data-sidebar-width` and set `--sidebar-width` CSS custom property synchronously

**Cookie sanitization:** The sidebar width value is a numeric string — validate it as a number in range [100, 1000] before injecting into HTML to prevent XSS.

**First-time visitors:** No cookie exists → server renders with default 288px → no flash (client also uses 288px default). Correct behavior.

### 2B. Theme Flash

**Root cause:** The inline script in `app.html` handles `dark`/`light` mode correctly but does NOT handle the **theme** (midnight, forest, ocean, etc.). The `data-theme` attribute is only set after Svelte hydrates and `$effect` fires `setTheme()` via mode-watcher — causing a brief flash of default-themed colors.

**Fix: Cookie-based SSR injection + inline script extension**

1. When theme changes (in `editor-state.svelte.ts`), also write a cookie: `app:theme=midnight; max-age=31536000; path=/; SameSite=Lax`
2. In `hooks.server.ts`, read `event.cookies.get('app:theme')` and inject via `transformPageChunk`
3. In `app.html`, add `data-theme=""` attribute on `<html>` tag as placeholder
4. `transformPageChunk` replaces `data-theme=""` with `data-theme="midnight"`
5. Extend inline script to also read `data-theme` from the cookie/localStorage and set the `data-theme` attribute synchronously — this is a belt-and-suspenders approach: the server already sets it, but the inline script ensures it's correct even if the cookie is stale

**Theme sanitization:** Validate against the `SUPPORTED_THEMES` picklist. If the cookie value is not in the list, strip it (use empty string = default theme).

**Shared utility:** Create `src/lib/utils/preference-cookie.ts` — a small helper for reading/writing preference cookies with sanitization. Used by both sidebar and theme persistence.

### Data Flow (Hydration Fixes)

```
┌─────────────┐    cookie     ┌─────────────────┐    HTML attr     ┌──────────┐
│ Client JS   │ ───────────── │ hooks.server.ts  │ ────────────── │ app.html │
│ (on change) │  set cookie   │ transformPage    │  data-theme=   │ inline   │
│             │               │ Chunk            │  data-sidebar  │ <script> │
└─────────────┘               └─────────────────┘                └──────────┘
       │                              │                                │
       │ localStorage                 │ reads cookie                   │ sets CSS
       │ (existing)                   │ sanitizes                      │ props &
       │                              │ injects into HTML              │ attrs
       ▼                              ▼                                ▼
  Svelte hydrates              Server-rendered HTML             Zero flash
  with matching                has correct values
  values                       on first paint
```

---

## 3. Perfume.js Integration

### 3A. Package

- `perfume.js` v9.x (~5KB gzipped, zero dependencies)
- Installed as a runtime dependency in the editor package

### 3B. Initialization Module — `src/lib/perf/perfume.ts`

```typescript
import { initPerfume } from 'perfume.js';
import type { IPerfumeOptions } from 'perfume.js';

export function setupPerfume(tracker: AnalyticsTrackerFn): Result<Void> {
  // Client-only — guarded by `browser` check at call site
  initPerfume({
    analyticsTracker: tracker,
    resourceTiming: false,   // Opt-in later if needed
    elementTiming: false,    // Opt-in later if needed
  });
  return okUnchecked<Void>(undefined);
}
```

- Called from `hooks.client.ts` alongside existing error setup
- `analyticsTracker` callback wires into the vitals beacon

### 3C. Analytics Tracker Callback

The `analyticsTracker` receives an options object per metric:

```typescript
{
  metricName: 'LCP' | 'FCP' | 'CLS' | 'INP' | 'TBT' | 'TTFB' | 'NTBT' | 'navigationTiming' | 'networkInformation';
  data: number;                           // Metric value (ms or unitless for CLS)
  attribution: Record<string, unknown>;   // Metric-specific context
  navigatorInformation: {
    deviceMemory: number;
    hardwareConcurrency: number;
    serviceWorkerStatus: string;
    isLowEndDevice: boolean;
    isLowEndExperience: boolean;
  };
  rating: 'good' | 'needsImprovement' | 'poor';
  navigationType: string;
}
```

Our tracker:
1. Logs to console (dev: all metrics color-coded; prod: only `poor` as warnings)
2. Queues metric in the vitals beacon buffer
3. Updates the connection quality store with `navigatorInformation`

---

## 4. Vitals Beacon

### 4A. Payload Schema — `src/lib/perf/vitals-payload.ts`

```typescript
const VitalsMetricSchema = v.strictObject({
  /** Web Vital metric name (e.g. 'LCP', 'FCP', 'CLS'). */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Metric value in milliseconds (or unitless for CLS). */
  value: v.number(),
  /** Performance rating based on Web Vitals thresholds. */
  rating: v.picklist(['good', 'needsImprovement', 'poor']),
  /** How the user navigated to the page. */
  navigationType: v.string(),
});

const VitalsDeviceSchema = v.strictObject({
  /** Whether Perfume.js considers this a low-end device. */
  isLowEndDevice: v.boolean(),
  /** Whether Perfume.js considers this a low-end experience (device + network). */
  isLowEndExperience: v.boolean(),
  /** Device RAM in GB (0 if unavailable). */
  deviceMemory: v.number(),
  /** Logical CPU core count. */
  hardwareConcurrency: v.number(),
  /** Network effective type at page load. */
  effectiveType: v.string(),
  /** Whether user has data-saver enabled. */
  saveData: v.boolean(),
});

const VitalsBeaconPayloadSchema = v.strictObject({
  /** Random session identifier (no PII). */
  sessionId: v.pipe(v.string(), v.uuid()),
  /** Page URL path (no query params — PII risk). */
  url: v.string(),
  /** Timestamp of beacon flush. */
  timestamp: v.pipe(v.string(), v.isoTimestamp()),
  /** Array of collected metrics since last flush. */
  metrics: v.array(VitalsMetricSchema),
  /** Device and network context. */
  device: VitalsDeviceSchema,
});
```

**PII stripping:**
- URL: path only (strip query params, hash, origin)
- No user identifiers
- Session ID: random UUID generated per page load (not persisted)
- Device info: coarsened by the browser already (deviceMemory rounded, rtt rounded)

### 4B. Beacon Client — `src/lib/perf/vitals-beacon.ts`

```typescript
const BEACON_URL = '/api/vitals';
const queue: VitalsMetric[] = [];
let device: VitalsDevice | null = null;
const sessionId: Str = crypto.randomUUID();

export function queueVital(metric: VitalsMetric): Result<Void> { ... }
export function setDeviceInfo(info: VitalsDevice): Result<Void> { ... }
export function flushVitals(): Result<Void> { ... }
export function setupVitalsBeacon(): Result<Void> { ... }
```

**Flush strategy:**
- Flush on `visibilitychange` → `hidden` (most reliable, bfcache-compatible)
- Also flush when queue reaches 10 items (batching for long sessions)
- Uses `navigator.sendBeacon()` with `text/plain` Blob (same pattern as error beacon — avoids CORS preflight)
- Fallback: `fetch()` with `keepalive: true`
- Skipped in dev mode (`import.meta.env.DEV`)

### 4C. Server Endpoint — `src/routes/api/vitals/+server.ts`

- POST endpoint, same pattern as `/api/errors`
- 64KB body size limit
- Validates against `VitalsBeaconPayloadSchema`
- Returns 204 No Content
- Logs each metric via `log.info()` — Workers Logs captures automatically
- Log format: `[vitals] LCP=2450ms rating=needsImprovement url=/scenes/1 device=lowEnd`

---

## 5. Connection Quality Store

### `src/lib/perf/connection.ts`

Reactive connection quality module using module-level `$state` (same pattern as editor-state).

```typescript
// Connection quality tiers
type ConnectionQuality = 'fast' | 'medium' | 'slow' | 'unknown';

// State shape
let _effectiveType: Str = $state('4g');
let _saveData: Bool = $state(false);
let _rtt: Num = $state(0);
let _downlink: Num = $state(0);
let _quality: ConnectionQuality = $state('unknown');
let _isLowEndDevice: Bool = $state(false);
let _isLowEndExperience: Bool = $state(false);
let _deviceMemory: Num = $state(0);
let _hardwareConcurrency: Num = $state(0);
```

**Sources of truth (merged):**
1. `navigator.connection` (Network Information API) — `effectiveType`, `rtt`, `downlink`, `saveData`
2. Perfume.js `navigatorInformation` — `isLowEndDevice`, `isLowEndExperience`, `deviceMemory`, `hardwareConcurrency`

**Quality tier logic:**
```
saveData=true → 'slow'
effectiveType in ['slow-2g', '2g'] → 'slow'
effectiveType === '3g' → 'medium'
effectiveType === '4g' → 'fast'
API unavailable → 'unknown'
```

**Change detection:**
- Listens for `navigator.connection.onchange` to update reactive state
- Perfume.js `navigatorInformation` reported once at page load → merged in

### Server-Side: Save-Data Header

In `hooks.server.ts`, read the `Save-Data` request header:
```typescript
const saveData: Bool = event.request.headers.get('save-data') === 'on';
event.locals.saveData = saveData;
```

Exposed via `event.locals` for load functions to conditionally reduce payload size.

---

## 6. Vitals Logger

### `src/lib/perf/vitals-logger.ts`

Console logging integration for vitals metrics:

```typescript
export function logVital(
  metricName: Str,
  value: Num,
  rating: Str,
  navigatorInfo: NavigatorInfo,
): Result<Void>
```

**Dev mode:** Log ALL metrics with color-coded ratings:
- `good` → green
- `needsImprovement` → orange/yellow
- `poor` → red

**Production mode:** Only log `poor` metrics as `log.warn()`.

**Format:**
```
[perf] LCP 2450ms ⚠ needsImprovement (navigate, 4g, 8GB, 8 cores)
[perf] CLS 0.05 ✓ good
[perf] INP 650ms ✗ poor (reload, 3g, 4GB, 4 cores, low-end)
```

---

## 7. Dev Toolbar Panel

### `src/lib/components/DevToolbarPerf.svelte`

A new panel added to the existing DevToolbar. Shows:

**Section 1: Web Vitals**
- TTFB, FCP, LCP, CLS, INP, TBT values with color-coded badges (good=green, needs-improvement=yellow, poor=red)
- Each metric shows `value` + `rating`
- "No data yet" placeholder until metrics arrive

**Section 2: Device & Connection**
- `effectiveType` (4g/3g/2g/slow-2g)
- `saveData` flag
- `deviceMemory` GB
- `hardwareConcurrency` cores
- `isLowEndDevice` / `isLowEndExperience` badges
- Connection quality tier badge (fast/medium/slow)

**Section 3: Beacon Status**
- Metrics queued count
- Last flush timestamp
- Session ID (truncated)

**Integration:** Added as a 4th panel option in DevToolbar.svelte (alongside Feature Flags, App Preferences, Debug Settings).

---

## 8. Module Dependency Graph

```
hooks.client.ts
  ├── setupPerfume() ─────────── perf/perfume.ts
  │     └── analyticsTracker
  │           ├── logVital() ──── perf/vitals-logger.ts
  │           ├── queueVital() ── perf/vitals-beacon.ts
  │           └── updateConn() ── perf/connection.ts
  └── setupVitalsBeacon() ────── perf/vitals-beacon.ts
        └── flushVitals()
              └── sendBeacon('/api/vitals')
                    └── routes/api/vitals/+server.ts
                          └── validates VitalsBeaconPayloadSchema
                                └── log.info() → Workers Logs

hooks.server.ts
  └── handle()
        ├── reads cookie 'app:sidebar-px'
        ├── reads cookie 'app:theme'
        ├── reads header 'Save-Data'
        └── transformPageChunk() injects data-sidebar-width, data-theme

app.html (inline script)
  ├── reads data-sidebar-width → sets --sidebar-width
  └── reads data-theme → sets data-theme attr

+layout.svelte
  └── paneStorage.setItem → writes sidebar-px cookie

editor-state.svelte.ts
  └── setTheme() → writes theme cookie

DevToolbar.svelte
  └── DevToolbarPerf.svelte (new panel)
        ├── reads perf/connection.ts state
        └── reads vitals-beacon.ts queue state
```

---

## 9. File Inventory

### New Files

| File | Purpose |
|------|---------|
| `src/lib/perf/perfume.ts` | Perfume.js initialization wrapper |
| `src/lib/perf/perfume.test.ts` | Unit tests for perfume init |
| `src/lib/perf/vitals-beacon.ts` | Vitals metric queue + sendBeacon flush |
| `src/lib/perf/vitals-beacon.test.ts` | Unit tests for beacon queue/flush |
| `src/lib/perf/vitals-payload.ts` | Valibot schemas for beacon payload |
| `src/lib/perf/vitals-payload.test.ts` | Unit tests for payload validation |
| `src/lib/perf/vitals-logger.ts` | Console logging with color-coded ratings |
| `src/lib/perf/vitals-logger.test.ts` | Unit tests for log formatting |
| `src/lib/perf/connection.ts` | Reactive connection quality state |
| `src/lib/perf/connection.test.ts` | Unit tests for connection quality |
| `src/lib/utils/preference-cookie.ts` | Read/write/sanitize preference cookies |
| `src/lib/utils/preference-cookie.test.ts` | Unit tests for cookie helpers |
| `src/routes/api/vitals/+server.ts` | POST endpoint for vitals beacon |
| `src/routes/api/vitals/server.test.ts` | Unit tests for endpoint |
| `src/lib/components/DevToolbarPerf.svelte` | Dev toolbar performance panel |
| `src/lib/components/DevToolbarPerf.test.ts` | Component tests for perf panel |
| `e2e/vitals.test.ts` | E2E: vitals beacon sent, endpoint responds 204 |
| `e2e/hydration-flash.test.ts` | E2E: sidebar width + theme cookie → no flash |

### Modified Files

| File | Changes |
|------|---------|
| `app.html` | Add `data-theme=""` + `data-sidebar-width=""` on `<html>`, extend inline script |
| `hooks.server.ts` | Read cookies, inject via `transformPageChunk`, read `Save-Data` header |
| `hooks.client.ts` | Call `setupPerfume()` + `setupVitalsBeacon()` |
| `+layout.svelte` | Write sidebar cookie in `paneStorage.setItem` + `handleSidebarResize` |
| `editor-state.svelte.ts` | Write theme cookie in `setTheme()` |
| `DevToolbar.svelte` | Add 4th panel button + render DevToolbarPerf |
| `app.d.ts` | Add `saveData: Bool` to `App.Locals` |
| `hooks.server.test.ts` | Test cookie reading + transformPageChunk injection |
| `app-html.test.ts` | Test new inline script behavior |

---

## 10. Accessibility

- Dev toolbar panel follows existing keyboard navigation pattern (roving tabindex)
- Color-coded badges use text labels alongside color (not color-alone)
- All metric values use `aria-label` for screen readers
- Connection quality badges announce via live region when quality changes

---

## 11. Testing Strategy

### Unit Tests
- `preference-cookie.ts` — read/write/sanitize, XSS injection, range validation
- `vitals-payload.ts` — schema validation, PII stripping, edge cases
- `vitals-beacon.ts` — queue/flush lifecycle, sendBeacon mock, fallback to fetch, dev-skip
- `vitals-logger.ts` — rating color codes, dev vs prod behavior, format correctness
- `connection.ts` — quality tier mapping, API unavailable fallback, change event handling
- `perfume.ts` — initialization, tracker wiring
- `api/vitals/+server.ts` — 204 response, 400 on invalid payload, 400 on oversize

### Integration Tests
- `hooks.server.test.ts` — cookie reading, transformPageChunk injection with sidebar + theme
- `hooks.client.ts` — perfume + beacon setup alongside existing error setup

### E2E Tests
- Sidebar cookie persistence → page reload → no layout shift
- Theme cookie persistence → page reload → correct theme on first paint
- Vitals beacon fires on page unload (intercept `/api/vitals` network request)
- `/api/vitals` endpoint returns 204 for valid payload

---

## 12. Production Considerations

- **Bundle size:** Perfume.js is ~5KB gzipped, zero deps. Connection module is ~1KB. Total: ~6KB added to client.
- **Privacy:** No PII in vitals payload. Session IDs are ephemeral (per page load). URLs stripped to path only.
- **Performance:** `analyticsTracker` fires asynchronously via `requestIdleCallback` (Perfume.js internal). Beacon uses `sendBeacon` (non-blocking). Zero main-thread impact.
- **Sampling:** Not implemented initially — all sessions report. Can add later via feature flag or percentage gate.
- **Cookie overhead:** Two small cookies (`app:sidebar-px`, `app:theme`) sent with every request. Combined ~40 bytes. Negligible.
