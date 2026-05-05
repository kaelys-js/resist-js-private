# `@storylyne/editor` — Hooks (`hooks.client.ts` + `hooks.server.ts`)

> Captured 2026-05-05. Branch: `main`. Files: `packages/products/storylyne/editor/src/hooks.{client,server}.ts`.

The two hook files are the editor's request/error boundary — they wire the runtime telemetry stack (logger, signal handler, beacon, perfume vitals) and shape every server response (security headers, locale, theme, preferences, mock data service).

## `hooks.client.ts` — client-side handler

Module-level setup (executes once on hydration):
- `setupLogging({ service: 'editor-client', initFromEnv: true })` — configures the structured logger with redaction & sampling defaults.
- `setVitalsLoggerAppName('Storylyne')`.
- `initFetchBreadcrumbs([])` — patches `fetch` to record a navigation/fetch breadcrumb trail.
- `setupGlobalErrorHandling({ release: __APP_VERSION__, tags: { branch: __GIT_BRANCH__, side: 'client' }, captureCSP: !dev, onError })` — installs `window.onerror` / `unhandledrejection` listeners; the `onError` callback fires `logErrorToConsole` then `beaconError(captured, '/api/errors')`. **`captureCSP` is force-disabled in dev** because dev intentionally has no CSP.
- `initConnection()` + `setupVitalsBeacon()` + `setupDiagnosticObservers()` — Web Vitals plumbing.
- `setupPerfume(analyticsTracker)` — wires Perfume.js. Per metric, `analyticsTracker`:
  1. Captures `navigatorInformation` → `updateFromNavigatorInfo` + `setDeviceInfo` once per page load.
  2. Skips non-numeric meta-metrics (navigationTiming, networkInformation are objects).
  3. Defaults missing `rating` to `'good'` (Perfume sometimes nulls).
  4. `collectDiagnostics(metricName, data, rating)` for non-good metrics.
  5. Routes the metric to `logVital`, `queueVital` (beacon), and `reportVitalToPanel` (DevToolbarPerf store).

Source-map decoder (~250 lines): bespoke VLQ decoder for browser stack traces.
- `extractSource(stack)` — walks `\n`-split stack lines, skips `node_modules`/`node:internal`/`packages/shared/`, matches **either** `https?://host/path:line:col` (browser dev URL) **or** `(/abs/path:line:col)` (Node FS), returns `SourceLocation { display, url, fileUrl, genLine, genCol }`. Handles Vite `@fs/` prefix and strips query strings.
- `decodeVLQ(encoded: Str): Num[]` — standard base64 VLQ decoder (32-bit values, continuation bits). Source map encoding: `[generatedCol, sourceIdx, originalLine, originalCol, nameIdx?]`.
- `fetchSourceMap(fileUrl)` — fetches the JS file, scans for `//# sourceMappingURL=`, supports both `data:application/json;base64,...` inline maps and external `.map` files. Validates with `SourceMapV3Schema` (strict shape: `version`, `sources`, `mappings`). Cached in module-scope `_sourceMapCache: Map<Str, SourceMapV3 | null>`.
- `resolveSourcePosition(fileUrl, genLine, genCol)` — walks `mappings.split(';')` line-by-line maintaining delta state across all preceding lines, then on the target line picks the segment whose accumulated `genCol` is closest to (but ≤) the target.
- `logErrorToConsole(captured)` — async; `console.groupCollapsed` with colored CSS labels (`%c[Error] %cCODE %cat URL — message`). Renders Code/Source/Message/Error ID/Capture ID/Type/Environment/Fatal/Severity/URL/Timestamp/HTTP/Fingerprint/Release/Server in a key-value table. Separate collapsed groups for Cause chain (recursive) and Validation issues (per `appError.validation.issues[]`).

`handleError: HandleClientError = ({ error, status, message })`:
- `fromUnknownError(error)` → either preserves the existing `AppError` (with code/validation/cause) or wraps in `INTERNAL.UNEXPECTED`.
- If wrapped, re-wrap as `INTERNAL.UNEXPECTED` with `{ status, message }` meta.
- `reportError(appError, false as Bool)` — fires the `onError` pipeline.
- Returns `{ message, errorId: appError.id }` for `+error.svelte`.

## `hooks.server.ts` — server-side handler

Security headers (constants):
- `BASE_HEADERS` (always): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `Cross-Origin-Resource-Policy: same-origin`, `Cross-Origin-Embedder-Policy: unsafe-none`, `X-DNS-Prefetch-Control: off`, `X-Permitted-Cross-Domain-Policies: none`, `X-XSS-Protection: 0`.
- `PROD_HEADERS` (production only): `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `getSecurityHeaders()` returns `BASE_HEADERS` in dev, `[...BASE_HEADERS, ...PROD_HEADERS]` in prod (computed per-request so tests can mock `dev`).

Module-level setup:
- `setupLogging({ service: 'editor-server', initFromEnv: true, format: 'json' })`.
- `setupGlobalErrorHandling({ release: __APP_VERSION__, serverName: __GIT_COMMIT__, tags: { branch: __GIT_BRANCH__, side: 'server' }, onError: logCapturedError })`.
- `extractSource(stack)` — same purpose as client version but **only** matches FS paths (no browser URLs).
- `collectCauseChain(root)` — flattens `appError.cause` chain into `Array<{ code, message }>`.
- `logCapturedError(captured)` — uses `log.info` for `type='signal'`, otherwise `log.error`. Logs every CapturedError envelope field as structured JSON (severity/httpStatus/meta/validation/help/source/related/causeChain/breadcrumbs/fingerprint/tags/user/contexts/release/serverName).

Auth helpers:
- `resolveAuth(url)` — checks `?${URL_PARAM_PREFIX}auth=false` (the prefix is `sto.` since `APP_NAME='Storylyne'`); returns `null` for logged-out, `MOCK_USER` otherwise.
- `_waitUntil` (module-scope) + `getWaitUntil()` exported — captures Cloudflare's `event.platform.ctx.waitUntil` per-request.

`handle: Handle = async ({ event, resolve })`:
1. Capture `event.platform?.ctx?.waitUntil`.
2. Test-only catastrophic short-circuit: `event.url.pathname === '/test-error/catastrophic'` → `throw new Error(...)` to exercise the `error.html` fallback.
3. Locale resolution: cookie (`storageKey('locale')`) > Accept-Language > `'en'`. Uses `matchLocale` and `detectFromAcceptLanguage` from `@/locale/detect`.
4. `event.locals.locale = locale`.
5. `event.locals.user = building ? MOCK_USER : resolveAuth(event.url)` (during prerendering URL params aren't readable).
6. Mock data delay: reads `?${URL_PARAM_PREFIX}mockDelay=N` query (or `${storageKey('mockDataDelay')}` cookie) clamped to [0, 10_000]ms. `event.locals.db = createDataService(event.platform, mockDelayMs)` — see `storylyne-overview` for the data service factory.
7. `event.locals.saveData = event.request.headers.get('save-data') === 'on'`.
8. SSR hydration cookies (sanitized to prevent XSS via attribute interpolation):
   - `sidebar-px` → `sanitizeSidebarWidth` → `event.locals.sidebarPx`.
   - `theme` → `sanitizeTheme(raw, SUPPORTED_THEMES)` → ` data-theme="..."` HTML replace.
   - `sidebar-open` → `sanitizeSidebarOpen` → `event.locals.sidebarOpen`.
9. `getTextDirection(locale)` for `dir` attribute (defaults to `ltr` on error, with `log.warn`).
10. `resolve(event, { transformPageChunk })` — replaces `%lang%`, `%dir%`, `data-sidebar-width=""`, `data-theme=""`, `{{APP_NAME}}`, `{{STORAGE_PREFIX}}` placeholders.
11. **Dev safety net**: deletes `content-security-policy` and `content-security-policy-report-only` headers on every dev response (because a stale `internal.js` from a concurrent prod build can leak prod CSP into dev, breaking Vite HMR).
12. Sets all security headers, plus `X-App-Version: __APP_VERSION__`, `X-Git-Commit: __GIT_COMMIT__`.
13. For HTML responses (not `/_app/immutable/`): `Cache-Control: private, no-cache`.

`handleError: HandleServerError = ({ error, event, status, message })`:
- Same `fromUnknownError` → conditional rewrap pattern as client.
- Wrap meta is rich: `{ status, message, url: event.url.pathname, method: event.request.method, route: event.route?.id ?? null, locale: event.locals.locale, userAgent, referer, searchParams, isDataRequest }`.
- `reportError(appError, false as Bool)` → onError pipeline.
- `event.setHeaders({ 'x-error-id': appError.id })` (try/catch — fails on fatal errors mid-response).
- Returns `{ message: '${message} (Reference: ${id})', errorId: appError.id }` — the message includes the ID so `error.html` (which only has `%sveltekit.error.message%`) can display it.

## Tests

`hooks.client.test.ts` and `hooks.server.test.ts` exist — not opened in this pass, but referenced from vitest projects `storylyne-editor` (client/jsdom) and `storylyne-editor-server` (node).
