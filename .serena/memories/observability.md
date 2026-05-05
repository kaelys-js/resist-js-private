# Observability — Web Vitals + error beacon + breadcrumbs

> Captured 2026-05-05. Branch: `main`. Companions: `utils-web-vitals-overview`, `utils-beacon-overview`, `utils-result-overview`, `storylyne-hooks` (host integration), `storylyne-api` (server endpoints), `error-handling` (the AppError/Result type system).
> 
> **Companion memory: `error-handling`** — covers the *type system* (`AppError`, `Result<T>`, `ERRORS` registry, RFC 9457 formatting). This memory covers the *runtime flow* (sendBeacon → server log, breadcrumb buffer mechanics, vitals diagnostics). Read both when working on error/telemetry features. No content overlap — they describe different layers.

The observability stack moves runtime telemetry from the browser to the server in two parallel pipelines:

```
[browser]
  perfume.js → analyticsTracker → vitals-payload → vitals-beacon (queue + flush)
                                                      ↓ navigator.sendBeacon (page-unload + idle)
                                                      ↓ POST /api/vitals (text/plain JSON)
                                                      ↓ log.info('[vitals] LCP=...ms ...')
                                                      
  window.onerror / unhandledrejection → setupGlobalErrorHandling → onError callback →
    fromUnknownError → CapturedError → beaconError → toBeaconPayload (PII-stripped) →
                                                      ↓ navigator.sendBeacon
                                                      ↓ POST /api/errors (text/plain JSON)
                                                      ↓ log.error('[client-beacon] CODE (id) fatal=... env=...')

  fetch() → breadcrumbs.ts patched fetch → addBreadcrumb('http', { method, url, status, duration })
  goto() → addNavigationBreadcrumb(url) → addBreadcrumb('nav', { from, to })
  Result.err(...) → @/utils/result/breadcrumbs::addBreadcrumb('error', { code, message })
                                                      ↓
                                                      ↓ (drained into beacon payload at error time)
```

## `@/utils/web-vitals` — client-side Web Vitals stack

See `utils-web-vitals-overview` for per-file API. Summary:

| File | Purpose |
|------|---------|
| `perfume.ts` | `setupPerfume(opts)` — installs `perfume.js` ^9.4.0 with an analytics tracker |
| `vitals-payload.ts` | `toVitalsPayload(metric, opts) → VitalsBeaconPayload`; `stripUrlParams(url)` |
| `vitals-beacon.ts` | `setupVitalsBeacon`, `queueVital`, `flushVitals`, `getBeaconStatus`, `setDeviceInfo`, `resetBeacon`. `BEACON_URL`, `MAX_QUEUE_SIZE` |
| `connection.svelte.ts` | `navigator.connection` reactive store: `getConnectionQuality`, `getDeviceMemory`, `getDownlink`, `getEffectiveType`, `getHardwareConcurrency`, `getRtt`, `getSaveData`, `getIsLowEndDevice`/`Experience`. `initConnection`, `readFromConnection`. `EFFECTIVE_TYPE_REGEX`, `SLOW_TYPES` |
| `vitals-diagnostics.ts` | `collectDiagnostics(metric)`, `setupDiagnosticObservers()`. Per-metric: `diagnoseCLS/FCP/INP/LCP/TBT/TTFB`. `THRESHOLDS` table, `COLLECTORS`, `getThresholds`, `formatThresholds`, `describeElement`/`describeNode`, `shortenUrl` |
| `vitals-logger.ts` | `logVital`, `printDiagnosticDetails`, `setVitalsLoggerAppName` (CSS-styled console output) |
| `vitals-panel-store.svelte.ts` | `getVitalsPanelMetrics`, `reportVitalToPanel`, `resetPanelMetrics`. Reactive store consumed by `DevToolbarPerf.svelte` |

Vitest project: `utils-web-vitals` (jsdom + svelte plugin).

## `@/utils/beacon` — error beacon client

See `utils-beacon-overview` for per-file API. Summary:

| File | Purpose |
|------|---------|
| `beacon.ts` | `beaconError(err, opts?)` — async send to `/api/errors` (or configured URL) |
| `beacon-payload.ts` | `BeaconPayload` Valibot schema; `toBeaconPayload(err, ctx)` |
| `breadcrumbs.ts` | `initFetchBreadcrumbs()` patches global `fetch`; `teardownFetchBreadcrumbs()` restores it; `addNavigationBreadcrumb(url)` for router; `extractMethod`, `extractUrl` |

Vitest project: `utils-beacon` (node).

## Breadcrumb buffer (cross-package)

The breadcrumb ring buffer is shared across:
- **`@/utils/result/breadcrumbs.ts`** — `addBreadcrumb`, `clearBreadcrumbs`, `drainBreadcrumbs`, `getBreadcrumbs`. `MAX_BREADCRUMBS` constant (typically 100).
- **`@/utils/beacon/breadcrumbs.ts`** — installs the fetch patch; calls into `@/utils/result`'s `addBreadcrumb` from inside the patched fetch.
- **Storylyne** `hooks.client.ts` calls `initFetchBreadcrumbs([])` once at hydration. The buffer is then populated by every fetch + every `addNavigationBreadcrumb` call from the SvelteKit router.

When `beaconError(...)` fires, it calls `drainBreadcrumbs()` to capture the buffer into the payload AND clears it (so the next error doesn't re-include the same breadcrumbs).

## Host integration: `@storylyne/editor`

### `src/hooks.client.ts` (module-level, runs once on hydration)

```ts
setupLogging({ service: 'editor-client', initFromEnv: true });
setVitalsLoggerAppName('Storylyne');
initFetchBreadcrumbs([]);
setupGlobalErrorHandling({
  release: __APP_VERSION__,
  tags: { branch: __GIT_BRANCH__, side: 'client' },
  captureCSP: !dev,            // dev intentionally has no CSP
  onError: (captured) => {
    logErrorToConsole(captured);
    beaconError(captured, '/api/errors');
  },
});
initConnection();
setupVitalsBeacon();
setupDiagnosticObservers();
setupPerfume(analyticsTracker);
```

`analyticsTracker(metric, data, navigatorInformation, rating)`:
1. Captures `navigatorInformation` once per page load → `updateFromNavigatorInfo` + `setDeviceInfo`.
2. Skips meta-metrics (`navigationTiming`, `networkInformation` are objects, not numbers).
3. Defaults missing `rating` to `'good'`.
4. `collectDiagnostics(metricName, data, rating)` for non-good metrics.
5. Routes to `logVital` (console), `queueVital` (beacon), and `reportVitalToPanel` (DevToolbarPerf store).

Source-map decoder (~250 lines, bespoke base64 VLQ implementation in `hooks.client.ts` — not extracted into utils):
- `extractSource(stack)` — walks `\n`-split stack lines, skips `node_modules`/`node:internal`/`packages/shared/`, matches either `https?://host/path:line:col` (browser dev URL) or `(/abs/path:line:col)` (Node FS), returns `SourceLocation { display, url, fileUrl, genLine, genCol }`. Handles Vite `@fs/` prefix and strips query strings.
- `decodeVLQ(encoded: Str): Num[]` — standard base64 VLQ decoder (32-bit values, continuation bits).
- `fetchSourceMap(fileUrl)` — fetches the JS file, scans for `//# sourceMappingURL=`, supports both `data:application/json;base64,...` inline maps and external `.map` files. Validated with `SourceMapV3Schema`. Cached in module-scope `_sourceMapCache: Map<Str, SourceMapV3 | null>`.
- `resolveSourcePosition(fileUrl, genLine, genCol)` — walks `mappings.split(';')` line-by-line maintaining delta state across all preceding lines, then on the target line picks the segment whose accumulated `genCol` is closest to (but ≤) the target.
- `logErrorToConsole(captured)` — async; `console.groupCollapsed` with colored CSS labels (`%c[Error] %cCODE %cat URL — message`). Renders Code/Source/Message/Error ID/Capture ID/Type/Environment/Fatal/Severity/URL/Timestamp/HTTP/Fingerprint/Release/Server in a key-value table. Separate collapsed groups for Cause chain (recursive) and Validation issues.

`handleError: HandleClientError = ({ error, status, message })`:
- `fromUnknownError(error)` — preserves existing `AppError` (with code/validation/cause) or wraps in `INTERNAL.UNEXPECTED`.
- If wrapped, re-wraps as `INTERNAL.UNEXPECTED` with `{ status, message }` meta.
- `reportError(appError, false as Bool)` — fires the `onError` pipeline.
- Returns `{ message, errorId: appError.id }` for `+error.svelte`.

### `src/hooks.server.ts` (module-level)

```ts
setupLogging({ service: 'editor-server', initFromEnv: true, format: 'json' });
setupGlobalErrorHandling({
  release: __APP_VERSION__,
  serverName: __GIT_COMMIT__,
  tags: { branch: __GIT_BRANCH__, side: 'server' },
  onError: logCapturedError,
});
```

`logCapturedError(captured)`:
- `log.info` if `type === 'signal'`, otherwise `log.error`.
- Logs every `CapturedError` envelope field as structured JSON: `severity`, `httpStatus`, `meta`, `validation`, `help`, `source`, `related`, `causeChain`, `breadcrumbs`, `fingerprint`, `tags`, `user`, `contexts`, `release`, `serverName`.
- `collectCauseChain(root)` — flattens `appError.cause` chain into `Array<{ code, message }>`.
- `extractSource(stack)` — server variant only matches FS paths (no browser URLs).

`handleError: HandleServerError = ({ error, event, status, message })`:
- Same `fromUnknownError` → conditional rewrap as client.
- Wrap meta is rich: `{ status, message, url: event.url.pathname, method: event.request.method, route: event.route?.id ?? null, locale: event.locals.locale, userAgent, referer, searchParams, isDataRequest }`.
- `reportError(appError, false as Bool)` → onError pipeline.
- `event.setHeaders({ 'x-error-id': appError.id })` (try/catch — fails on fatal errors mid-response).
- Returns `{ message: '${message} (Reference: ${id})', errorId: appError.id }`.

## Server endpoints

### `POST /api/errors` (`src/routes/api/errors/+server.ts`)

- Receives PII-stripped error payloads from client `navigator.sendBeacon()`.
- `MAX_BODY_SIZE = 65_536` (64KB). Returns `413` if exceeded; `400` for empty/malformed JSON or schema failure.
- Body parsed via `request.text()` (sendBeacon sends `text/plain`), validated against `BeaconPayloadSchema` — **strict** (rejects PII fields like `user`, `contexts`, `meta`, `original`, `serverName`).
- On success: `log.error('[client-beacon] CODE (id) fatal=... env=...')` (Workers Logs captures structured JSON automatically).
- Returns `204 No Content` (beacon ignores body).

### `POST /api/vitals` (`src/routes/api/vitals/+server.ts`)

- Same shape as `/api/errors` (64KB cap, `request.text()` parse, strict Valibot schema rejecting PII fields).
- Validates against `VitalsBeaconPayloadSchema`.
- `formatMetric(metric)` — appends `'ms'` unit for `TIMING_METRICS = {'TTFB','FCP','LCP','FID','INP','TBT','NTBT'}`, else no unit.
- Logs: `log.info('[vitals] LCP=2450ms ... url=... device=lowEnd|normal session=...')`.
- Returns `204`.

## Diagnostics (`vitals-diagnostics.ts`)

Per-metric diagnosis runs only when the metric `rating !== 'good'`. Captures attribution data from PerformanceObservers:

| Metric | Attribution fields |
|--------|--------------------|
| **CLS** | Largest layout shift cluster, top elements (BFS by area), shifts count |
| **FCP** | First-paint timing, render-blocking resources, font-loading delay |
| **INP** | Slowest interaction event, target element, duration breakdown (input/processing/presentation) |
| **LCP** | LCP element (with selector + size), resource-load time, render time |
| **TBT** | Top long-task source attribution (via `PerformanceLongTaskTiming`) |
| **TTFB** | DNS / TCP / TLS / request / response timing breakdown |

`THRESHOLDS` table holds green/yellow/red boundaries per metric (RUM-grade defaults from web.dev).

`describeElement(el)` and `describeNode(node)` build CSS-selector-like identifiers for DOM elements (tag + id + class + position-among-siblings).

## DevToolbarPerf integration

`vitals-panel-store.svelte.ts::getVitalsPanelMetrics()` returns the current set of `PanelMetric[]` for `DevToolbarPerf.svelte` (storylyne component, 630 lines). The store is fed by `reportVitalToPanel(metric)` calls inside the `analyticsTracker` in `hooks.client.ts`. Real-time updates via Svelte 5 runes.

## Connection-quality store

`connection.svelte.ts` reactively reads `navigator.connection.{effectiveType, rtt, downlink, saveData, deviceMemory}` and computes `ConnectionQuality` (e.g. `lowEnd | normal`). Used by:
- `analyticsTracker` to tag vitals payloads.
- Server `hooks.server.ts` reads `request.headers['save-data'] === 'on'` and stores `event.locals.saveData = bool`.
- Components can conditionally lazy-load heavy chart/animation libraries when `getIsLowEndExperience() === true`.

## Logger (`@/utils/core/logger`)

Both client and server use the same structured logger:
- `setupLogging({ service, initFromEnv, format? })` — global setup.
- Levels: `silent | error | warn | info | debug | trace`. Order: `LOG_LEVEL_ORDER`.
- Transports — pluggable; default = console; can add `addTransport({ name, log })` for custom destinations.
- Redaction — `setRedaction({ paths: DEFAULT_REDACT_PATHS, depth })`. Default redacts `password`, `token`, `secret`, `apiKey`, `authorization`, `cookie` keys at any depth.
- Sampling — `setSampling({ rate })` for rate-limiting.
- Buffering — `enableBuffer({ size, flushInterval })` — defers logs until flushed (used in serverless cold-start paths).
- Async context — `withContext(ctx, fn)` — propagates context through async boundaries (Node `AsyncLocalStorage`).
- Format — `'pretty'` (default in dev) or `'json'` (default for `editor-server`). JSON mode emits one line per log entry → Workers Logs captures structured JSON directly.

## Tests

- `utils-web-vitals` vitest project — covers all `*.test.ts` files under `@/utils/web-vitals/src/`.
- `utils-beacon` vitest project — `beacon.test.ts`, `beacon-payload.test.ts`, `breadcrumbs.test.ts`, `integration.test.ts`.
- `storylyne-editor` covers `hooks.client.test.ts`.
- `storylyne-editor-server` covers `hooks.server.test.ts` and `api/errors/server.test.ts`, `api/vitals/server.test.ts`.
- `e2e/vitals.spec.ts` — exercises the full pipeline against a real server.

## Privacy / PII

The schemas at both `BeaconPayloadSchema` (errors) and `VitalsBeaconPayloadSchema` (vitals) are STRICT — they explicitly disallow PII fields: `user`, `contexts`, `meta`, `original`, `serverName`. If a client tries to send any of those, the server's Valibot parse fails and the request is rejected with 400. The client-side beacon payload-builders (`toBeaconPayload`, `toVitalsPayload`) also strip these fields before transmission. URL params are stripped via `stripUrlParams(url)` to avoid query-string leakage.

The redaction config in the structured logger is the third defense layer — even if PII somehow gets into a log call, `redactObject` walks the object and replaces matched paths with `[REDACTED]`.
