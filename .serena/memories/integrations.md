# Integrations — webforge / resist-js-private

> Captured 2026-05-05. Branch: `main`. Companion to `env-and-secrets`, `data-layer`, `storylyne-preview-simulator`.
> 
> **Companion memories with adjacent content (no merge needed)**:
> - `storylyne-preview-simulator` — covers the simulator subprocesses (xcrun/adb/scrcpy/playwright) at the implementation level (file-by-file). This memory enumerates them at the cross-cutting "every external call site" level.
> - `storylyne-api` — covers the `/api/lens/screenshot/**` endpoints. This memory describes the underlying subprocess invocations they make.
> - `observability` — covers the beacon pipeline. This memory cross-references `/api/errors` and `/api/vitals` as internal HTTP integrations.
> - `secrets-infisical-overview` — covers the `@infisical/sdk` wrapper. This memory enumerates Infisical SDK + curl-fallback call sites.
> 
> All complementary. Read this memory for "where does this codebase reach beyond itself"; read the others for per-area implementation detail.

This memory catalogs every external service, third-party library with side-effects, and subprocess this codebase calls. Categorized by integration type.

## HTTP integrations (fetch())

### Internal (same-origin) HTTP

These are calls between the browser client and the storylyne SvelteKit server (or between server modules and other server endpoints):

- **`POST /api/errors`** — client error beacon. Called by `beaconError(captured, '/api/errors')` from `@/utils/beacon/beacon` (invoked in `hooks.client.ts:54` from the `onError` handler). Uses `navigator.sendBeacon()` (not `fetch`) for reliability during page unload. Server validates against `BeaconPayloadSchema` in `src/routes/api/errors/+server.ts`.
- **`POST /api/vitals`** — Web Vitals beacon. Called by `setupVitalsBeacon()` + `flushVitals()` from `@/utils/web-vitals/vitals-beacon` (registered to `visibilitychange`). Uses `sendBeacon`. Server validates against `VitalsBeaconPayloadSchema`.
- **`POST /api/lens/compile-standalone`** — called by `downloadStandaloneHtml(componentDir, props, children, darkMode, theme)` in `packages/shared/ui/src/lens/export-utils.ts`. Returns a Blob → triggers download.
- **`GET /api/lens/screenshot/*`** — called by Lens UI components to render real-browser screenshots; see `storylyne-api` and `storylyne-preview-simulator` memories for the full route tree.
- **`fetch(fileUrl)`** in `hooks.client.ts:360, 387` — fetches compiled JS files and source maps for source-map-based stack-trace resolution. Caches results in `_sourceMapCache: Map`.

### External HTTP

The codebase makes very few external HTTPS calls. The exhaustive list:

- **Infisical SDK** (`@infisical/sdk` — `packages/shared/secrets/infisical/src/secrets.ts`):
  - `client.getSecret({ environment, projectId, secretName, path, includeImports })` (`secrets.ts:222`).
  - `client.listSecrets({ environment, projectId, path, includeImports, tagSlugs? })` (`secrets.ts:127`).
  - All HTTP calls happen inside the SDK; the wrapper just calls SDK methods and converts thrown errors to `Result`.
  - Connection target: `INFISICAL_SITE_URL` env var (defaults to `https://app.infisical.com`).

- **Infisical REST API via curl** (`packages/shared/utils/cli/src/tools/secrets-setup/utils/provision.ts:71`):
  - `infisicalApi(siteUrl, method, path, body)` shells out to `curl -s -X ${method} '${siteUrl}${path}' -H 'Content-Type: application/json' ${body ? "-d '...'" : ''}`.
  - Used during the `secrets-setup` flow to bootstrap an Infisical project (create projects with custom envs, etc.) — the SDK doesn't expose all admin operations.

### Internal (localhost) HTTP

Used by the dev-only Lens screenshot pipeline:

- **`fetch('http://localhost:9222/json')`** — Chrome DevTools Protocol target discovery (Android emulator + Chrome on it). See `packages/products/storylyne/editor/src/routes/api/lens/screenshot/android/+server.ts:144` and `packages/products/storylyne/editor/src/lib/server/simulator/android-cdp.ts`.
- **`fetch('http://localhost:<port>/json')`** — iOS debug proxy target discovery. See `packages/products/storylyne/editor/src/lib/server/simulator/ios-debug-proxy.ts:226`.

## SDK integrations (no direct HTTP)

- **`@infisical/sdk` v2** — secret management. See above + `secrets-infisical-overview` memory.
- **`@cloudflare/workers-types`** — TS types only; no runtime.
- **`wrangler` CLI** (devDep, only for storylyne) — `wrangler dev`, `wrangler deploy`, `wrangler secret put`, `wrangler tail`, `wrangler d1 migrations` (none used yet).
- **`@capacitor/{cli,core,ios,android}`** (products-template/app only) — native iOS/Android shells. See `deployment` memory.
- **`@playwright/test` + `playwright`** — E2E suites + dev-only Lens screenshot rendering. Dev/test only.
- **`@sveltejs/kit` + `@sveltejs/adapter-cloudflare` + `@sveltejs/adapter-static`** — SvelteKit framework + adapters.
- **`@sveltejs/vite-plugin-svelte`** — Vite Svelte 5 integration.
- **`@tailwindcss/vite` + `@tailwindcss/node`** — Tailwind v4 Vite plugin + standalone Node API (used by `compile-standalone` route).
- **`@vscode/vsce`** — VS Code extension packaging tool (devDep in `@resist/vscode`).

## Beacon / telemetry pipeline

### Client side (`packages/products/storylyne/editor/src/hooks.client.ts`)

1. **`setupLogging({ service: 'editor-client', initFromEnv: true })`** — structured `@/utils/core/logger` setup.
2. **`setVitalsLoggerAppName('Storylyne')`** — labels console output.
3. **`initFetchBreadcrumbs([])`** — patches `globalThis.fetch` to record HTTP method+URL+status as breadcrumbs (skip list defaults to `['/api/errors']` to prevent recursion). Stored in `@/utils/result/breadcrumbs` ring buffer (max 50 entries).
4. **`setupGlobalErrorHandling({ ..., onError: (captured) => { logErrorToConsole(captured); beaconError(captured, '/api/errors'); } })`** — `signal.ts` from `@/utils/core` registers browser handlers (`error`, `unhandledrejection`, optionally CSP `securitypolicyviolation` + resource errors). Captured errors flow to console + beacon.
5. **`initConnection()`** — reads `navigator.connection` (effectiveType, downlink, rtt, saveData, deviceMemory, hardwareConcurrency).
6. **`setupVitalsBeacon()`** — registers `visibilitychange → flushVitals()` to send queued vitals on tab hide/close.
7. **`setupDiagnosticObservers()`** — `PerformanceObserver` for long tasks, event timings, layout shifts.
8. **`setupPerfume(analyticsTracker)`** — initializes `perfume.js` Web Vitals collector. `analyticsTracker` callback fires once per metric (TTFB, FCP, LCP, CLS, INP, TBT, NTBT, navigationTiming, networkInformation):
   - First fire: `setDeviceInfo(...)` populates beacon device metadata.
   - Each numeric metric → `logVital()` (console) + `queueVital()` (beacon queue) + `reportVitalToPanel()` (dev-toolbar).

### Server side (`packages/products/storylyne/editor/src/hooks.server.ts`)

1. **`setupLogging({ service: 'editor-server', initFromEnv: true, format: 'json' })`** — JSON output for Workers Logs.
2. **`setupGlobalErrorHandling({ release: __APP_VERSION__, serverName: __GIT_COMMIT__, tags: { branch: __GIT_BRANCH__, side: 'server' }, onError: logCapturedError })`** — registers Node uncaughtException/unhandledRejection (in dev) or Worker `unhandledrejection` (in prod).
3. **`logCapturedError(captured)`** — flattens `AppError` cause chain, walks stack to find the first non-internal/non-shared frame, writes structured `log.error()` with everything (errorId, captureId, source, environment, fatal, severity, httpStatus, meta, validation, help, related, breadcrumbs, fingerprint, tags, user, contexts, release, serverName).
4. **`handleError({ error, event, status, message })`** — extracts/wraps thrown errors via `fromUnknownError`, routes through `reportError()` → `onError` → `logCapturedError` → `log.error()` → Workers Logs. Returns `{ message: '${message} (Reference: ${appError.id})', errorId: appError.id }` so `error.html` can display the ID.
5. **`event.platform.ctx.waitUntil`** captured per-request in `_waitUntil` for downstream handlers to defer non-critical async work (log flushing, transport calls) without blocking the response.

## Cloudflare integrations

### Workers runtime

- **`event.platform.env`** — Worker bindings object. Currently EMPTY (no D1/KV/R2/DO/AI/Queues/Vectorize/mTLS/service bindings declared in `wrangler.jsonc`).
- **`event.platform.ctx.waitUntil(promise)`** — defer work past the response. Captured by `getWaitUntil()` accessor in `hooks.server.ts:225`. Used for log flushing pipelines (none consume it currently).
- **`ASSETS` binding** — declared in `wrangler.jsonc` for serving `.svelte-kit/cloudflare/` static files.
- **Workers Logs (observability)** — enabled with 100% sampling (`head_sampling_rate: 1.0`). Captures all `console.*` output as structured events. Forward externally via Logpush in dashboard.

### Cloudflare CLI integrations

- **`wrangler deploy`** — manual production deploy (no CI).
- **`wrangler secret put <KEY>`** via stdin — driven by `secrets sync` tool from Infisical → CF.
- **`wrangler tail`** — live log tailing, exposed via `pnpm tool product-logs <product> --service api` (uses `@/cli` `product-logs` tool).
- **`wrangler d1 migrations`** — not used (no migrations exist).

## Dev-only subprocess integrations (Lens screenshot pipeline)

These run only in `vite dev` mode (gated on `dev` from `$app/environment`); the corresponding API routes return 404 in production.

### iOS Simulator (macOS only)

Spawned via `node:child_process` (`execFile`/`spawn`). See `storylyne-preview-simulator` memory.

- **`xcrun simctl help`** — availability check (`isXcrunAvailable()`).
- **`xcrun simctl list --json`** — enumerate simulators (UDID, name, state, OS).
- **`xcrun simctl boot <udid>`** / **`shutdown`** — pool management.
- **`xcrun simctl io <udid> screenshot <path>`** — PNG capture (also via `IosPreviewCapturePool` for ~20 FPS streaming with parallel slots).
- **`xcrun simctl io <udid> tap`** / **`swipe`** / **`sendkey`** — input injection.
- **`xcrun simctl openurl <udid> <url>`** — navigate Safari to a URL.
- **`xcrun simctl status_bar`** — status-bar override.
- **`xcrun simctl ui <udid> {appearance,contentSize,...}`** — accessibility settings (dark mode, content size, increase contrast, reduce motion, reduce transparency).
- **AppleScript fallback** — for mouse hover/move (simctl doesn't support move-without-click).

### Android Emulator (cross-platform with SDK)

Spawned via `node:child_process`. See `storylyne-preview-simulator` memory.

- **`adb version`** — availability check.
- **`adb -s <serial> ...`** — most commands targeted at a specific emulator serial.
- **`adb -s <serial> exec-out screencap -p`** — PNG capture (uses `exec-out` not `shell` to avoid LF→CRLF binary corruption; `-p` for PNG format).
- **`adb -s <serial> shell ...`** — generic shell exec.
- **`adb -s <serial> push <local> <remote>`** — push files (used for scrcpy-server JAR push).
- **`adb -s <serial> shell am start ...`** — start activity (open Chrome with URL).
- **`adb -s <serial> forward tcp:9222 localabstract:chrome_devtools_remote`** — port-forward CDP for Chrome DevTools Protocol.
- **`emulator -avd <name> ...`** — boot emulator.
- **`avdmanager create avd -n <name> -k <system-image>`** — create AVD.
- **`adb -s <serial> emu kill`** — shut down emulator (or `pkill emulator`).

### scrcpy (Android screen mirroring/streaming via H.264)

- **`scrcpy-server.jar`** — pushed via `adb push` to `/data/local/tmp/scrcpy-server.jar` on device (path constant `SCRCPY_SERVER_PATH`, version pinned to `'3.1'` in `SCRCPY_VERSION`).
- **`adb -s <serial> shell CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server <version> ...`** — start the server on-device.
- Server streams H.264 NAL units over a forwarded socket (default 8 Mbps).
- Control messages encoded by `scrcpy-control.ts` (binary big-endian; `MSG_INJECT_KEYCODE=0`, `MSG_INJECT_TEXT`, etc.).
- Vastly superior to `adb exec-out screencap` (1-2 FPS) — gets 30-60 FPS at sub-5ms input latency.

### Playwright (real-browser rendering)

3 engines used: chromium, firefox, webkit. Two paths:

1. **E2E tests** (`packages/products/storylyne/editor/e2e/*.test.ts`) — 25 suites driven by `@playwright/test`.
2. **Lens screenshot** (`src/routes/api/lens/screenshot/+server.ts` + `src/lib/server/preview/`) — uses `playwright` (not `@playwright/test`) directly:
   - Spawns chromium/firefox/webkit pages.
   - Uses `page.screenshot({ type: 'jpeg' })` in tight loop (`screenshot-loop.ts`) for Firefox/WebKit (~30-50 FPS).
   - Uses Chrome DevTools Protocol `Page.startScreencast` for Chromium (`cdp-screencast.ts`) — 30-60 FPS, dirty-frame-only via `Page.screencastFrame` events.
   - Input via CDP `Input.dispatch*Event` (chromium) or Playwright's input API (firefox/webkit) — `cdp-input.ts`.

### Chrome DevTools Protocol (direct WebSocket)

Beyond Playwright's CDP wrapping, raw CDP is used for Android Chrome:

- **`ws://localhost:9222/devtools/page/<id>`** — connect via `ws` package (Node WebSocket client).
- **`Log.enable` + `Log.entryAdded`** — capture Chrome console logs (`android-cdp.ts:captureConsoleLogs`).
- **`Runtime.evaluate`** — run JS in the page (`android-page-load.ts:waitForPageReady` polls `[data-lens-ready]`).

### Other subprocess invocations

- **`git`** — many `execSync('git ...')` calls in `@/utils/core/git` for branch/commit/dirty detection. Used by lint rules (`workspace/no-tracked-env-files`, `cli-helpers.getGitChangedFiles`), the changelog API (`/api/lens/changelog/[name]`), Vite factory (`getGitInfo`), SvelteKit factory (`getGitCommitShort`).
- **`infisical` CLI** — used by `secrets login/logout/whoami` and `secrets-setup` tools (alongside the SDK). Some operations are CLI-only.
- **`brew`** — `waitForBrewLock` in installer.ts; some tools install via Homebrew.
- **`mise`** — preferred package manager for Node tools (see `MISE_BACKENDS` in installer.ts). pnpm itself is provisioned via mise — `feedback_mise_pnpm` memory notes this requires `eval mise activate` in Bash before pnpm works.
- **`npx` / `pnpx`** — for one-off tool invocations.
- **External linters** — 115 wrappers in `@/lint/src/tools/`. Each wraps a CLI: `actionlint`, `ruff`, `mypy`, `ktlint`, `swiftlint`, `golangci-lint`, `knip`, `madge`, `dependency-cruiser`, `syncpack`, `publint`, `oxlint`, `tsgo`, `svelte-check`, `jsonnetfmt`, `shellcheck`, etc. All called via `execFile`/`spawn` from worker threads.

## In-process third-party libraries (no HTTP/subprocess)

These are bundled into the runtime; no external IO:

- **`sharp ^0.34.5`** (storylyne dep) — image processing. Likely used in screenshot pipeline (PNG → JPEG conversion, resize). No direct call observed in this onboarding pass.
- **`modern-screenshot ^4.6.8`** — DOM-to-image (PNG, JPEG, SVG, WebP). Used in `packages/shared/ui/src/lens/export-utils.ts` (`domToPng`, `domToJpeg`, `domToSvg`, `domToBlob`).
- **`shiki ^4.0.2`** — syntax highlighter. Used by Lens UI for code block rendering.
- **`perfume.js ^9.4.0`** — Web Vitals collection. Wrapped by `@/utils/web-vitals/perfume`. Reports to `analyticsTracker` callback registered in `hooks.client.ts`.
- **`embla-carousel-svelte`**, **`layerchart`**, **`paneforge`**, **`vaul-svelte`** — Svelte UI components.
- **`bits-ui`** — primitive UI library (Radix-equivalent for Svelte).
- **`tailwind-merge`**, **`tailwind-variants`** — class merging.
- **`mode-watcher`** — system theme detection.
- **`svelte-sonner`** — toast notifications.
- **`formsnap` + `sveltekit-superforms`** — form handling.
- **`@internationalized/date`** — date manipulation.
- **`@tanstack/table-core`** — table data layer.
- **`@lucide/svelte`** + **`lucide-svelte`** — icon set.
- **`tw-animate-css`** — Tailwind animation utilities.
- **`esbuild ^0.27.3`** + **`@tailwindcss/node`** + **`svelte/compiler`** — used by `compile-standalone` API to produce a single-file standalone HTML for any component.
- **`ws ^8.19.0`** — Node WebSocket implementation. Used by:
  - Lens preview WS server (`vite-plugin-preview-ws.ts`).
  - Direct CDP connection to Android Chrome (`android-cdp.ts`, `android-page-load.ts`).
  - scrcpy video/control sockets (via Node `net.Socket`, not `ws`).
- **`pngjs ^7.0.0`** (devDep) — PNG parsing for tests.

## Internal package dependencies (cross-references)

The `@/secrets/infisical` package is the only one with non-trivial external runtime dependencies (`@infisical/sdk`). Other shared packages are pure:
- `@/lint` — runtime dep `oxc-parser` (in-process AST parsing).
- `@/utils/core` — only `valibot`.
- `@/ui` — `bits-ui`, `lucide-svelte`, `paneforge`, `vaul-svelte`, `shiki`, `tailwind-merge`, `tailwind-variants`, `modern-screenshot`, `svelte-sonner`.
- `@/utils/web-vitals` — `perfume.js`.
- `@/test-presets` — `vitest`, `playwright`.

## Anticipated-but-not-wired integrations

The `@/schemas/core-config/secret-schemas.ts` declares schemas for many third-party services that have NO consuming code in the codebase:

- **Analytics**: PostHog (`POSTHOG_API_KEY`), Google Analytics (`GA_MEASUREMENT_ID`).
- **Payment**: Lemon Squeezy (`LEMON_SQUEEZY_API_KEY`).
- **Subscriptions**: RevenueCat (`REVENUECAT_API_KEY`).
- **Email**: Resend (`RESEND_API_KEY`).
- **Status pages**: BetterStack/Statuspage-style (`STATUS_PAGE_TOKEN`).
- **VPS**: Hetzner (`HETZNER_TOKEN`) — for Coder.com dev container provisioning.
- **Turbo remote cache**: `TURBO_TOKEN` + `TURBO_TEAM`.

These are infrastructural placeholders. The schemas exist to validate that secrets are present; no client/SDK code calls these services.

## Critical relationships

1. **Adding a new external HTTP integration**: should be wrapped in `@/secrets/infisical` schema (add a `*Schema` to `secret-schemas.ts`), use `getSecret` to fetch credentials, and follow the Result pattern (no thrown errors except at integration boundaries marked with `// integration boundary:` comments).
2. **Adding a new beacon endpoint**: server route validates against a strict Valibot schema, rejects payloads > 64KB, returns 204 (`Response(null, { status: 204 })` for `sendBeacon` compatibility). Client uses `navigator.sendBeacon()`, not `fetch`.
3. **Lens screenshot routes need `dev` gating** — `if (!dev) return new Response(..., { status: 404 })` is the convention. Same for any new dev-only API.
4. **Subprocess invocations should use `execFile` (not `exec`)** — avoids shell injection. Pass args as array, not string.
5. **CDP connections** to Android Chrome use raw `ws` package + `adb forward`. CDP to Playwright pages goes through `page.context().newCDPSession(page)`.
6. **Workers can't `throw` for Result errors** — `// integration boundary:` comment + `throw new Error(...)` is the escape hatch (e.g., `createSecretsProxy` in `cloudflare.ts`).
