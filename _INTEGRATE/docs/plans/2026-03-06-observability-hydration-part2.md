# Client Observability & Hydration Polish — Implementation Plan (Part 2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-03-06
**Design doc:** `docs/plans/2026-03-06-observability-hydration-design.md`
**Part 1:** Hydration flash fixes + Perfume.js core + connection quality + vitals logger
**Scope:** Vitals beacon + endpoint + hooks wiring + dev toolbar + E2E + docs

---

## Task 1: Vitals Payload Schema

**Files:**
- `src/lib/perf/vitals-payload.ts` (new)
- `src/lib/perf/vitals-payload.test.ts` (new)

**Test first:** Write tests for:
- Valid payload passes validation (all fields present and correct types)
- Invalid metric name (empty string) → validation error
- Invalid rating (not in picklist) → validation error
- Invalid sessionId (not UUID) → validation error
- Invalid timestamp (not ISO) → validation error
- `toVitalsPayload()` conversion strips query params from URL
- `toVitalsPayload()` generates UUID sessionId

**Implementation:**
- `VitalsMetricSchema` — metric name, value, rating, navigationType
- `VitalsDeviceSchema` — device context (isLowEnd flags, memory, cores, effectiveType, saveData)
- `VitalsBeaconPayloadSchema` — sessionId, url, timestamp, metrics array, device
- `toVitalsPayload(metrics, device)` — converts internal state to validated beacon payload
- Same pattern as `beacon-payload.ts` — strict schemas, PII stripping, Result<T> returns

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

---

## Task 2: Vitals Beacon Client

**Files:**
- `src/lib/perf/vitals-beacon.ts` (new)
- `src/lib/perf/vitals-beacon.test.ts` (new)

**Test first:** Write tests for:
- `queueVital(metric)` adds to internal queue
- `flushVitals()` sends beacon with correct payload when queue has items
- `flushVitals()` does nothing when queue is empty
- `flushVitals()` clears queue after send
- `setupVitalsBeacon()` registers `visibilitychange` listener
- Beacon skipped in dev mode (`import.meta.env.DEV`)
- Fallback to `fetch` with `keepalive` when `sendBeacon` unavailable
- Queue auto-flushes at 10 items
- `setDeviceInfo()` stores device context for payloads
- `getBeaconStatus()` returns queue length and last flush time

**Implementation:**
```typescript
const BEACON_URL: Str = '/api/vitals';
const MAX_QUEUE_SIZE: Num = 10;

let queue: VitalsMetric[] = [];
let device: VitalsDevice | null = null;
let lastFlushAt: Str | null = null;
const sessionId: Str = typeof crypto !== 'undefined' ? crypto.randomUUID() : 'unknown';

export function queueVital(metric: VitalsMetric): Result<Void> { ... }
export function setDeviceInfo(info: VitalsDevice): Result<Void> { ... }
export function flushVitals(): Result<Void> { ... }
export function setupVitalsBeacon(): Result<Void> { ... }
export function getBeaconStatus(): { queued: Num; lastFlushAt: Str | null; sessionId: Str } { ... }
```

**Flush:**
- Build `VitalsBeaconPayload` via `toVitalsPayload()`
- Serialize as JSON → `Blob` with `text/plain` type (avoid CORS preflight)
- `navigator.sendBeacon(BEACON_URL, blob)` or `fetch()` fallback

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

---

## Task 3: Vitals API Endpoint

**Files:**
- `src/routes/api/vitals/+server.ts` (new)
- `src/routes/api/vitals/server.test.ts` (new)

**Test first:** Write tests for:
- Valid POST → 204 No Content
- Invalid JSON → 400
- Body > 64KB → 400
- Schema validation failure → 400
- GET/PUT/DELETE → 405 Method Not Allowed
- Successful log output format: `[vitals] LCP=2450ms rating=needsImprovement url=/scenes/1`
- Empty metrics array → 204 (valid but no-op)

**Implementation:**
- Same pattern as `/api/errors/+server.ts`
- `POST` handler: read body, validate size, parse JSON, validate schema, log, return 204
- Log format: `[vitals] <metric>=<value><unit> rating=<rating> url=<url> device=<lowEnd|normal>`
- Workers Logs captures `log.info()` output automatically

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

---

## Task 4: hooks.client.ts Wiring

**Files:**
- `src/hooks.client.ts` (modify)

**Test first:** The hooks.client.ts tests already exist. Extend to verify:
- `setupPerfume()` is called during init
- `setupVitalsBeacon()` is called during init
- The analytics tracker wires together: logVital + queueVital + updateFromNavigatorInfo

**Implementation:**
- Import and call `setupPerfume(analyticsTracker)` after `setupGlobalErrorHandling()`
- Import and call `setupVitalsBeacon()` after `setupPerfume()`
- Import and call `initConnection()` after `setupVitalsBeacon()`
- Define `analyticsTracker` inline:
  ```typescript
  function analyticsTracker(options: AnalyticsTrackerOptions): Void {
    const { metricName, data, rating, navigatorInformation, navigationType } = options;
    // Skip non-vital meta-metrics (navigationTiming, networkInformation reported as objects)
    if (typeof data !== 'number') return;
    logVital(metricName, data, rating, navigatorInformation);
    queueVital({ name: metricName, value: data, rating, navigationType });
    updateFromNavigatorInfo(navigatorInformation);
  }
  ```

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

---

## Task 5: Dev Toolbar Performance Panel

**Files:**
- `src/lib/components/DevToolbarPerf.svelte` (new)
- `src/lib/components/DevToolbarPerf.test.ts` (new)
- `src/lib/components/DevToolbar.svelte` (modify)

**Test first:** Write component tests for:
- Renders "Web Vitals" section heading
- Shows "No data yet" when no metrics collected
- Displays metric name, value, and rating badge after data arrives
- Rating badges have correct CSS classes (green/yellow/red)
- Device section shows connection quality, effectiveType, deviceMemory, cores
- Beacon section shows queue count and session ID

**Implementation:**
- `DevToolbarPerf.svelte` reads from:
  - `perf/connection.ts` — all connection getters (reactive via `$state`)
  - `perf/vitals-beacon.ts` — `getBeaconStatus()` for queue state
  - Internal `$state` for collected vitals (populated by an exported `reportVitalToPanel()` function)
- Three sections: Vitals, Device, Beacon
- Color-coded badges using Tailwind classes
- Follows existing DevToolbar panel patterns (same padding, font sizes, layout)

**DevToolbar.svelte changes:**
- Add 4th panel type: `'perf'`
- Add performance button (chart/gauge icon) to toolbar
- Render `DevToolbarPerf` when `activePanel === 'perf'`
- Add keyboard shortcut hint

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

---

## Task 6: E2E Tests

**Files:**
- `e2e/hydration-flash.test.ts` (new)
- `e2e/vitals.test.ts` (new)

**Test first (E2E):**

`hydration-flash.test.ts`:
- Set `app:sidebar-px` cookie → navigate → verify `--sidebar-width` CSS property matches cookie value on first paint
- Set `app:theme` cookie → navigate → verify `data-theme` attribute on `<html>` matches cookie value
- No cookies set → verify defaults are used (no error)
- Invalid cookie values → verify graceful fallback to defaults

`vitals.test.ts`:
- Navigate to page → wait → verify `/api/vitals` POST request is sent (intercept network)
- POST valid vitals payload to `/api/vitals` → verify 204 response
- POST invalid payload → verify 400 response
- POST oversized body → verify 400 response

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format && pnpm qa:test:e2e`

---

## Task 7: Documentation Updates

**Files:**
- `docs/ARCHITECTURE.md` (modify)

**Implementation:**
- Add "Client Observability" section:
  - Perfume.js Web Vitals collection
  - Vitals beacon → `/api/vitals` → Workers Logs
  - Connection quality awareness
  - Dev toolbar performance panel
- Add "Hydration Flash Prevention" section:
  - Cookie-based SSR injection pattern
  - `transformPageChunk` usage for sidebar + theme
  - Inline script behavior
- Update existing "Error Reporting" section to reference the parallel vitals beacon

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

---

## Task 8: Verification & Final QA

**Verification (Step 5b of build-editor):**
- Use Explore agent (very thorough) to audit ALL tasks against plan
- Every file listed must exist
- Every export listed must be present
- Every test listed must exist
- Every integration point must be wired
- Fix any gaps → re-verify → loop until ZERO missing items

**Final QA:**
```bash
pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format
pnpm qa:test
pnpm qa:test:e2e
```

**Commit:** Single commit for Part 2.

---

## Summary

Part 2 delivers:
- ✅ Vitals beacon payload schema with PII stripping
- ✅ Vitals beacon client (queue → flush → sendBeacon)
- ✅ `/api/vitals` POST endpoint (validate → log → 204)
- ✅ hooks.client.ts wiring (Perfume → logger → beacon → connection)
- ✅ DevToolbarPerf panel with vitals, device, and beacon sections
- ✅ E2E tests for hydration flash + vitals beacon
- ✅ ARCHITECTURE.md documentation updates
- ✅ Verification audit with Explore agent
