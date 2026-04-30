# Error Handling System

Universal error handling for all runtimes (CLI, browser, Cloudflare Workers, Node, Deno, Bun). Every function returns `Result<T>` and never throws. One setup call wires everything together.

## Packages

| Package | What it owns |
|---------|-------------|
| `@/schemas/result/result` | `Result<T>`, `AppError`, `ERRORS`, `err()`, `ok()`, `okUnchecked()`, all schemas |
| `@/schemas/result/captured-error` | `CapturedError`, `Breadcrumb`, user/context/fingerprint schemas |
| `@/utils/result/safe` | `safeParse()`, `fromUnknownError()` |
| `@/utils/result/combinators` | `map`, `andThen`, `orElse`, `match`, `combine`, `fromThrowable` |
| `@/utils/result/format` | `formatErrorDisplay`, `formatErrorDebug`, `toRfc9457`, `toHttpResponse`, `formatErrorSafe` |
| `@/utils/result/error-utils` | `isAppE
r
r
o
r`, `hasCode`, `getCauseChain`, `getDomain`, `isRetryable` |
| `@/ut



ils/result/breadcrumbs` | `addBreadcrumb`, `drainBreadcrumbs`, `clearBreadcrumbs` |
| `@/utils/core/signal` | `setupGlobalErrorHandling()`, `reportError()` |

## Setup

Call `setupGlobalErrorHandling()` once at process/app startup. It handles every runtime automatically:

```typescript
import { setupGlobalErrorHandling } from '@/utils/core/signal';

const teardown = setupGlobalErrorHandling({
  onError: (captured) => {
    // Log, send to Sentry, write to stderr, etc.
    console.error(captured.error.code, captured.error.message);
  },
  // Optional ambient context attached to every CapturedError:
  release: '1.2.3',
  serverName: 'api-worker-us-east',
  tags: { service: 'user-api', environment: 'production' },
  user: { id: 'user-123' },
  contexts: { os: { name: 'macOS', version: '15.2' } },
});

// Call teardown() to remove all handlers (testing, hot reload)
```

What it registers per runtime:

| Runtime | Handlers |
|---------|----------|
| Node/Deno/Bun TTY | `uncaughtException`, `unhandledRejection`, `SIGINT`, `SIGTERM`, `SIGHUP` |
| Cloudflare Workers | `unhandledrejection` on `globalThis` |
| Browser | `error`, `unhandledrejection`, `securitypolicyviolation` (optional CSP + resource errors) |

## Core Pattern

Every function returns `Result<T>`. Check `.ok` before using `.data`:

```typescript
import { err, ERRORS } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

function loadUser(id: string): Result<User> {
  const parsed = safeParse(UserIdSchema, id);
  
if (!parsed.ok) return parsed;

  const user = db.find(parsed.data);
  
if (!user) {
    return err(ERRORS.DB.NOT_FOUND, {
      meta: { table: 'users', id },
      httpStatus: 404,
    });
  }

  return ok(UserSchema, user);
}
```

## `err()` — Creating Errors

`err()` auto-generates `id` (UUID), `timestamp` (ISO 8601), and `stack`. It also applies per-code defaults for `severity` and `httpStatus` from the `ERROR_DEFAULTS` registry.

```typescript
// Minimal — message generated from ERROR_MESSAGES template
err(ERRORS.IO.READ_FAILED, { meta: { path: '/config.ts' } })

// Explicit message
err(ERRORS.AUTH.UNAUTHORIZED, 'Invalid credentials')

// Full options
err(ERRORS.HTTP.SERVER_ERROR, 'Service unavailable', {
  severity: 'warning',
  httpStatus: 503,
  help: 'Retry after 5 seconds',
  retry: { retryable: true, retryAfterMs: 5000, maxRetries: 3 },
  tags: { service: 'payments', region: 'us-east-1' },
  links: [{ description: 'Status page', url: 'https://status.example.com' }],
  cause: previousError,
  related: [otherError1, otherError2],
})
```

### AppError Fields

| Field | Type | Auto | Description |
|-------|------|------|-------------|
| `code` | `KnownErrorCode` | | Hierarchical code from `ERRORS` registry |
| `message` | `string` | | Human-readable description |
| `id` | `string` | yes | UUID v4, unique per occurrence |
| `timestamp` | `string` | yes | ISO 8601 |
| `stack` | `string` | yes | Stack trace |
| `severity` | `ErrorSeverity` | defaults | `'fatal'` `'error'` `'warning'` `'info'` `'advice'` |
| `httpStatus` | `HttpStatusCode` | defaults | 100-599 |
| `help` | `string` | | Actionable fix suggestion |
| `links` | `ErrorHelpLink[]` | | Documentation URLs |
| `tags` | `ErrorTags` | | `string -> string` indexed pairs |
| `retry` | `RetryInfo` | | `retryable`, `retryAfterMs`, `maxRetries` |
| `validation` | `ValidationDetail` | | Valibot issue details |
| `source` | `ErrorSource` | | JSON Pointer, parameter, or header |
| `cause` | `AppError` | | Typed cause chain |
| `related` | `AppError[]` | | Non-causal sibling errors |
| `meta` | `Record<string, unknown>` | | Arbitrary debugging context |

## Error Domains

21 domains, each with specific error codes:

`VALIDATION`, `CONFIG`, `AUTH`, `DB`, `IO`, `HTTP`, `NETWORK`, `RUNTIME`, `CLI`, `FUNCTION`, `LOCALE`, `TEMPLATE`, `WORKSPACE`, `SIGNAL`, `PROCESS`, `RATE_LIMIT`, `RESOURCE`, `ENCODING`, `QUEUE`, `CACHE`, `INTERNAL`

## Error Flow

```
err(ERRORS.AUTH.UNAUTHORIZED, ...)
  |
  | Result bubbles up via: if (!result.ok) return result;
  |
  v
Entry point (dispatchTool, fetch handler, etc.)
  |
  | reportError(result.error)  <-- wraps in CapturedError
  |
  v
CapturedError {
  type: 'resultError',
  error: AppError (full context preserved),
  breadcrumbs: [...events leading up to error],
  fingerprint: ['AUTH.UNAUTHORIZED'],
  tags, user, contexts, release, serverName,
}
  |
  | onError(captured)  <-- your callback
  |
  v
Log / Sentry / stderr / telemetry
```

Thrown exceptions follow the same path but with `type: 'uncaughtException'` or `'unhandledRejection'`, and the thrown value is converted via `fromUnknownError()`.

## Combinators

Functional transforms that complement `if (!result.ok) return result;`:

```typescript
import { map, andThen, orElse, match, unwrapOr, combine } from '@/utils/result/combinators';

// Transform success value
const name = map(getUser(id), (u) => u.name);

// Chain Result-returning functions
const profile = andThen(getUser(id), (u) => getProfile(u.profileId));

// Recover from errors
const config = orElse(loadConfig(path), () => ok(ConfigSchema, DEFAULT));

// Exhaustive pattern matching
const msg = match(result, {
  ok: (user) => `Hello, ${user.name}`,
  err: (error) => `Error: ${error.message}`,
});

// Extract with default
const count = unwrapOr(parseCount(input), 0);

// Combine multiple Results
const all = combine([getA(), getB(), getC()]);
// all.data = [a, b, c] if all succeed, first error otherwise
```

## Formatting

Format errors for different audiences:

```typescript
import {
  formatErrorDisplay,
  formatErrorDebug,
  formatErrorJson,
  toRfc9457,
  toHttpResponse,
  formatErrorSafe,
} from '@/utils/result/format';

// User-facing single line
formatErrorDisplay(error)
// 'AUTH.UNAUTHORIZED: Invalid credentials. Tip: Call POST /auth/refresh'

// Developer multi-line with all fields
formatErrorDebug(error)
// [AUTH.UNAUTHORIZED] Invalid credentials
//   id: 550e8400-...
//   severity: warning
//   httpStatus: 401
//   help: Call POST /auth/refresh
//   tags: { service=user-api }
//   ...

// RFC 9457 Problem Details (HTTP APIs)
const problem = toRfc9457(error, 'https://api.example.com/errors');

// Ready-to-send HTTP Response with application/problem+json
const response = toHttpResponse(error, 'https://api.example.com/errors');

// PII-free for telemetry (strips message, meta, source, validation, stack)
const safe = formatErrorSafe(error);
```

## Breadcrumbs

Record events leading up to errors. Auto-drained into `CapturedError` by `setupGlobalErrorHandling()`:

```typescript
import { addBreadcrumb } from '@/utils/result/breadcrumbs';

addBreadcrumb({
  type: 'http',
  category: 'fetch',
  message: 'GET /api/users -> 200',
  level: 'info',
});

addBreadcrumb({
  type: 'navigation',
  message: '/dashboard -> /settings',
});

// When an error occurs, breadcrumbs are automatically attached
// to the CapturedError via drainBreadcrumbs()
```

Max 100 breadcrumbs, FIFO eviction.

## Error Inspection

```typescript
import {
  isAppError,
  hasCode,
  hasAnyCode,
  isInDomain,
  getCauseChain,
  findInCauseChain,
  getRootCause,
  getDomain,
  getSeverity,
  isRetryable,
} from '@/utils/result/error-utils';

// Type guard
if (isAppError(unknown)) { /* typed as AppError */ }

// Code matching
hasCode(error, ERRORS.AUTH.UNAUTHORIZED)
hasAnyCode(error, [ERRORS.AUTH.UNAUTHORIZED, ERRORS.AUTH.FORBIDDEN])
isInDomain(error, 'AUTH')

// Cause chain
getCauseChain(error)         // flat array of all errors in chain
findInCauseChain(error, ERRORS.DB.CONNECTION)  // first match or null
getRootCause(error)          // deepest cause

// Classification
getDomain(error)   // 'AUTH'
getSeverity(error) // 'error' (or explicit severity)
isRetryable(error) // true if retry.retryable === true
```

## Rules

1. **Never throw** -- return `err()` instead
2. **Never use `v.parse`** -- it throws. Use `safeParse()` from `@/utils/result/safe`
3. **Always check `.ok`** before accessing `.data` -- `if (!result.ok) return result;`
4. **Never use ternary fallbacks** -- `result.ok ? result.data : fallback` swallows errors
5. **Use `okUnchecked<T>()`** when returning already-validated data
6. **Use Valibot types everywhere** -- `Str`, `Num`, `Bool`, not `string`, `number`, `boolean`
