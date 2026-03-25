# @/utils/web-vitals

Client-side Web Vitals collection, diagnostics, and beaconing powered by Perfume.js. Measures TTFB, FCP, LCP, CLS, INP, TBT, and NTBT with actionable diagnostic findings from browser Performance APIs.

## Source Files

| File | Description |
|------|-------------|
| `perfume.ts` | `setupPerfume()` — initializes Perfume.js with an analytics tracker callback |
| `connection.svelte.ts` | Reactive connection quality store using Svelte 5 `$state` runes — merges Network Information API and Perfume.js navigator data |
| `vitals-payload.ts` | `VitalsMetricSchema`, `VitalsDeviceSchema`, `VitalsBeaconPayloadSchema` — wire-safe beacon payload schemas and `toVitalsPayload()` conversion |
| `vitals-beacon.ts` | Queue-based vitals beacon client — queues metrics and flushes via `navigator.sendBeacon()` on page hide or queue overflow |
| `vitals-diagnostics.ts` | Performance API diagnostic observers and collectors — identifies actual elements, resources, and timings causing poor metrics |
| `vitals-logger.ts` | Colorized console logging of Web Vitals with `%c` CSS formatting and diagnostic detail groups |
| `vitals-panel-store.svelte.ts` | Reactive store for the DevToolbar performance panel — holds collected metrics for UI display |

## Usage

```typescript
import { setupPerfume } from '@/utils/web-vitals/perfume';
import { initConnection } from '@/utils/web-vitals/connection.svelte';
import { setupVitalsBeacon, queueVital } from '@/utils/web-vitals/vitals-beacon';
import { setupDiagnosticObservers, collectDiagnostics } from '@/utils/web-vitals/vitals-diagnostics';
import { logVital } from '@/utils/web-vitals/vitals-logger';

// Initialize (call once in hooks.client.ts)
setupDiagnosticObservers();
initConnection();
setupVitalsBeacon();

// Set up Perfume.js with a tracker
setupPerfume((options) => {
  const diagnostics = collectDiagnostics(options.metricName, options.data, options.rating);
  logVital(options.metricName, options.data, options.rating, diagnostics);
  queueVital({ name: options.metricName, value: options.data, rating: options.rating, navigationType: 'navigate' });
});
```

## API Reference

### perfume.ts

- `setupPerfume(tracker)` — Initialize Perfume.js with an analytics tracker callback. Returns `Result<Void>`.
- `AnalyticsTrackerOptions` — Re-export of Perfume.js analytics tracker options type.
- `AnalyticsTrackerFn` — Analytics tracker callback signature type.
- `VitalsScore` — Re-export of Perfume.js vitals score type.

### connection.svelte.ts

- `ConnectionQualitySchema` — Valibot picklist schema for connection quality tiers (`fast`, `medium`, `slow`, `unknown`).
- `ConnectionSnapshotSchema` — Valibot strict object schema for all connection state fields.
- `initConnection()` — Initialize connection quality store from `navigator.connection`. Returns `Result<Void>`.
- `updateFromNavigatorInfo(info)` — Merge Perfume.js navigator info into store. Returns `Result<Void>`.
- `getConnectionQuality()` — Get current quality tier. Returns `Result<ConnectionQuality>`.
- `getEffectiveType()` — Get current effective connection type (e.g. `4g`). Returns `Result<Str>`.
- `getSaveData()` — Get whether data-saver mode is enabled. Returns `Result<Bool>`.
- `getRtt()` — Get estimated round-trip time in ms. Returns `Result<Num>`.
- `getDownlink()` — Get estimated downlink speed in Mbps. Returns `Result<Num>`.
- `getIsLowEndDevice()` — Get whether Perfume.js considers this a low-end device. Returns `Result<Bool>`.
- `getIsLowEndExperience()` — Get whether Perfume.js considers this a low-end experience. Returns `Result<Bool>`.
- `getDeviceMemory()` — Get device memory in GB. Returns `Result<Num>`.
- `getHardwareConcurrency()` — Get logical CPU core count. Returns `Result<Num>`.
- `getConnectionSnapshot()` — Get frozen snapshot of all connection state. Returns `Result<ConnectionSnapshot>`.
- `resetConnection()` — Reset state for test isolation. Returns `Result<Void>`.

### vitals-beacon.ts

- `BeaconQueuedItemSchema` — Valibot schema for a queued metric summary (picked from `VitalsMetricSchema`).
- `BeaconStatusSchema` — Valibot schema for the beacon status diagnostic object.
- `BeaconQueuedItem` — Inferred type for a queued metric summary.
- `queueVital(metric)` — Add a metric to the queue (auto-flushes at 10). Returns `Result<Void>`.
- `flushVitals()` — Flush all queued metrics to `/api/vitals`. Returns `Result<Void>`.
- `setupVitalsBeacon()` — Register `visibilitychange` listener for auto-flush. Returns `Result<Void>`.
- `setDeviceInfo(info)` — Store device context for payloads. Returns `Result<Void>`.
- `getBeaconStatus()` — Get queue depth, session info, and flush status. Returns `Result<BeaconStatus>`.
- `resetBeacon()` — Reset state for test isolation. Returns `Result<Void>`.

### vitals-diagnostics.ts

- `VitalThresholdsSchema` — Valibot schema for metric threshold boundaries (good/poor).
- `DiagnosticFindingSchema` — Valibot schema for a single diagnostic finding (label + value).
- `DiagnosticFinding` — Inferred type for a diagnostic finding.
- `VitalDiagnosticsSchema` — Valibot schema for full metric diagnostics (thresholds + findings).
- `setupDiagnosticObservers()` — Start PerformanceObservers for long tasks and event timings. Returns `Result<Void>`.
- `collectDiagnostics(metricName, value, rating)` — Collect diagnostic findings for a metric. Returns `Result<VitalDiagnostics | null>`.
- `formatThresholds(thresholds)` — Format threshold boundaries as human-readable string. Returns `Result<Str>`.
- `getThresholds(metricName)` — Get threshold boundaries for a metric. Returns `Result<VitalThresholds | null>`.
- `resetDiagnostics()` — Reset all observer data for test isolation. Returns `Result<Void>`.
- `_injectLCPEntries(entries)` — Test-only: inject mock LCP entries. Returns `Result<Void>`.
- `_injectLayoutShiftEntries(entries)` — Test-only: inject mock layout shift entries. Returns `Result<Void>`.

### vitals-logger.ts

- `setVitalsLoggerAppName(name)` — Set the app name prefix for console output. Returns `Result<Void>`.
- `logVital(metricName, value, rating, diagnostics)` — Log a metric with colorized CSS formatting. Returns `Result<Void>`.

### vitals-panel-store.svelte.ts

- `PanelMetricSchema` — Valibot schema for a panel metric entry (name, value, rating, timestamp, diagnostics).
- `reportVitalToPanel(name, value, rating, diagnostics)` — Push a metric to the panel store. Returns `Result<Void>`.
- `getVitalsPanelMetrics()` — Get collected panel metrics. Returns `Result<PanelMetric[]>`.
- `resetPanelMetrics()` — Reset metrics for test isolation. Returns `Result<Void>`.

### vitals-payload.ts

- `toVitalsPayload(metrics, device, url)` — Convert metrics and device info to beacon-safe payload. Returns `Result<VitalsBeaconPayload>`.
