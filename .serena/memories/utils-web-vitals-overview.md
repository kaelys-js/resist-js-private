# `@/utils/web-vitals` — packages/shared/utils/web-vitals

Web Vitals client wrapper around `perfume.js`. Captures performance metrics, queues them, and beacons to a server endpoint.

## Package
- **Name**: `@/utils/web-vitals` (private)
- **Vitest project**: `utils-web-vitals` (jsdom + svelte plugin)
- **Dependencies**: `perfume.js ^9.4.0`
- **Internal deps**: `@/utils/core`, `@/utils/beacon`

## File structure (`src/`)
```
perfume.ts                         ← setupPerfume + analytics tracker
perfume.test.ts
vitals-payload.ts                  ← VitalsBeaconPayload + toVitalsPayload
vitals-payload.test.ts
vitals-beacon.ts                   ← queue + flush via beacon
vitals-beacon.test.ts
connection.svelte.ts               ← network-info reactive store
connection.svelte.test.ts
vitals-diagnostics.ts              ← per-metric diagnosis (CLS/FCP/INP/LCP/TBT/TTFB)
vitals-diagnostics.test.ts
vitals-logger.ts                   ← console output for vitals
vitals-logger.test.ts
vitals-panel-store.svelte.ts       ← Svelte runes store for the dev panel
vitals-panel-store.svelte.test.ts
env.d.ts                           ← ambient env types
vite-env.d.ts                      ← Vite-specific ambient
```
No `index.ts` barrel.

## Public API per file

### `perfume.ts`
- `setupPerfume(opts)` — installs perfume.js + analytics tracker
- Types: `AnalyticsTrackerFn`, `AnalyticsTrackerOptions`, `NavigatorInfo`, `VitalsScore`

### `vitals-payload.ts`
- `toVitalsPayload(metric, opts)` → `VitalsBeaconPayload`
- `stripUrlParams(url)` — removes query string
- Types: `VitalsBeaconPayload`, `VitalsDevice`, `VitalsMetric`

### `vitals-beacon.ts`
- `setupVitalsBeacon(opts)` — install beacon
- `queueVital(metric)` — add to queue
- `flushVitals()` — send queued
- `getBeaconStatus()`
- `setDeviceInfo(info)`
- `resetBeacon()` — test/teardown
- Constants: `BEACON_URL`, `MAX_QUEUE_SIZE`

### `connection.svelte.ts` — Svelte 5 runes store for `navigator.connection`
- `getConnectionQuality()`, `getConnectionSnapshot()`
- `getDeviceMemory()`, `getDownlink()`, `getEffectiveType()`, `getHardwareConcurrency()`
- `getIsLowEndDevice()`, `getIsLowEndExperience()`, `getRtt()`, `getSaveData()`
- `initConnection(opts)` — install + subscribe
- `readFromConnection()` — one-shot read
- `resetConnection()`
- `updateFromNavigatorInfo(info)`
- `deriveQuality(snapshot)` — compute quality bucket
- Types: `ConnectionQuality`, `ConnectionSnapshot`, `NetworkInformation`, `ValidatedNavigatorInfo`
- Constants: `EFFECTIVE_TYPE_REGEX`, `SLOW_TYPES`, `SW_STATUS_REGEX`

### `vitals-diagnostics.ts`
- `collectDiagnostics(metric)` — dispatch to per-metric diagnoser
- `setupDiagnosticObservers()` — install PerformanceObservers
- `resetDiagnostics()`
- Per-metric: `diagnoseCLS`, `diagnoseFCP`, `diagnoseINP`, `diagnoseLCP`, `diagnoseTBT`, `diagnoseTTFB`
- `THRESHOLDS`, `COLLECTORS` — config tables
- `getThresholds(metric)`, `formatThresholds(t)`
- `describeElement(el)`, `describeNode(node)` — DOM-element identification
- `shortenUrl(url)`
- Plus attribution + entry-type schemas

### `vitals-logger.ts`
- `logVital(metric)` — styled console output
- `printDiagnosticDetails(diag)`
- `setVitalsLoggerAppName(name)` — for prefix
- Console-style constants

### `vitals-panel-store.svelte.ts`
- `getVitalsPanelMetrics()` — current metrics for dev panel
- `reportVitalToPanel(metric)`
- `resetPanelMetrics()`
- Type: `PanelMetric`

## Patterns
- **Browser-only** — depends on PerformanceObserver, navigator.connection, navigator.sendBeacon
- Per-metric diagnosis modules use a registry pattern (`COLLECTORS` table)
- Svelte runes (`*.svelte.ts`) for reactive stores — the dev panel can show live vitals
- Beacons are queued and batch-flushed (page-unload triggers flush)
- Threshold tables are data-driven (CLS/LCP/etc. each have green/yellow/red thresholds)

## Used by
- `@storylyne/editor` `src/hooks.client.ts` — `setupPerfume` + `setupVitalsBeacon`
- Storylyne's `DevToolbarPerf` — reads from vitals-panel-store
- Posts to `/api/vitals/+server.ts` route
