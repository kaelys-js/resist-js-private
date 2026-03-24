# @/utils/beacon

Client-side error reporting via `navigator.sendBeacon()`. Converts `CapturedError` envelopes to PII-stripped payloads and sends them to a server endpoint. Includes navigation and fetch breadcrumb tracking.

## Source Files

| File | Description |
|------|-------------|
| `beacon-payload.ts` | `BeaconPayloadSchema` and `toBeaconPayload()` — converts CapturedError to wire-safe format |
| `beacon.ts` | `beaconError()` — sends payloads via sendBeacon with dev-mode skip and SSR guard |
| `breadcrumbs.ts` | Navigation and fetch breadcrumb tracking for error context |

## Usage

```typescript
import { beaconError } from '@/utils/beacon/beacon';
import { addNavigationBreadcrumb, initFetchBreadcrumbs } from '@/utils/beacon/breadcrumbs';

// Initialize fetch breadcrumbs (call once at app startup)
initFetchBreadcrumbs();

// Track navigation
addNavigationBreadcrumb(null, '/home');

// Send error beacon
beaconError(capturedError);
```

## API Reference

| Export | Kind | File | Description |
|--------|------|------|-------------|
| `BeaconPayloadSchema` | schema | `beacon-payload.ts` | Wire format schema for error beacons |
| `BeaconPayload` | type | `beacon-payload.ts` | Inferred payload type |
| `toBeaconPayload` | function | `beacon-payload.ts` | Converts CapturedError to beacon payload |
| `beaconError` | function | `beacon.ts` | Sends error via sendBeacon |
| `addNavigationBreadcrumb` | function | `breadcrumbs.ts` | Adds route change breadcrumb |
| `initFetchBreadcrumbs` | function | `breadcrumbs.ts` | Wraps fetch to record HTTP breadcrumbs |
| `teardownFetchBreadcrumbs` | function | `breadcrumbs.ts` | Restores original fetch |

## Dependencies

- `@/schemas/common` — Primitive types (Str, Void, UuidSchema, etc.)
- `@/schemas/result/captured-error` — CapturedError and breadcrumb schemas
- `@/schemas/result/result` — Result pattern, AppError, error codes
- `@/utils/result/breadcrumbs` — Global breadcrumb trail
- `@/utils/core/logger` — Structured logging
- `@/utils/core/object` — safeStringify
