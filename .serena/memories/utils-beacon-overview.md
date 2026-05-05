# `@/utils/beacon` — packages/shared/utils/beacon

Browser-side error beacon: collects errors + breadcrumbs and sends them to a server endpoint via `navigator.sendBeacon`.

## Package
- **Name**: `@/utils/beacon` (private)
- **Vitest project**: `utils-beacon`
- **Internal deps**: `@/utils/core`, `@/utils/result`, `@/schemas/result`

## File structure (`src/`)
```
beacon.ts             ← beaconError — main entry, send error to server
beacon.test.ts
beacon-payload.ts     ← BeaconPayload + toBeaconPayload (wire format)
beacon-payload.test.ts
breadcrumbs.ts        ← initFetchBreadcrumbs + navigation breadcrumbs
breadcrumbs.test.ts
integration.test.ts   ← end-to-end test (no .ts source pair)
env.d.ts              ← ambient types (vite-style env)
```

## Public API per file

### `beacon.ts`
- `beaconError(err, opts?)` — async send error to `/api/errors` endpoint (or configured)

### `beacon-payload.ts`
- `BeaconPayload` — Valibot schema for the wire-format payload
- `toBeaconPayload(err, ctx)` — convert AppError + context → BeaconPayload

### `breadcrumbs.ts`
- `initFetchBreadcrumbs()` — patches global `fetch` to record requests
- `teardownFetchBreadcrumbs()` — restores original fetch
- `addNavigationBreadcrumb(url)` — manual nav breadcrumb (call from router)
- `extractMethod(input, init?)` — pull HTTP method from fetch args
- `extractUrl(input)` — pull URL from fetch args (string | URL | Request)

## Patterns
- **Browser-only** — relies on `navigator.sendBeacon` (Worker contexts won't have it)
- Fetch patching is opt-in via `initFetchBreadcrumbs()`
- Breadcrumb buffer is the same ring buffer as `@/utils/result`'s `breadcrumbs.ts` (drained for the payload)
- Beacon payload includes captured-error metadata (stack, breadcrumbs, context, fingerprint)

## Used by
- `@storylyne/editor` `src/hooks.client.ts` — installs error beacon
- Posts to `/api/errors/+server.ts` route in storylyne (which logs to server-side error sink)

## Note
Has an `integration.test.ts` with no `.ts` source pair — likely tests cross-module behavior (beacon + breadcrumbs + payload together).
