# Error Handling — cross-cutting

> Captured 2026-05-05. The single error model used by every package: structured `AppError` carried in `Result<T>`. No throws. Wire-format envelopes use `CapturedError`. HTTP boundaries serialize via RFC 9457.
> 
> **Companion memory: `observability`** — covers the runtime telemetry pipeline (Web Vitals beacon, error beacon, breadcrumbs ring buffer, hooks.client/hooks.server integration, `/api/errors` + `/api/vitals` server endpoints, source-map decoding). This memory focuses on the *type system* (`AppError`, `Result<T>`, `ERRORS` registry, RFC 9457 formatting); `observability` focuses on the *runtime flow* (sendBeacon → server log). They are complementary — read both when working on error/telemetry features.

## Two-package split

| Package | Concern | Key files |
|---------|---------|-----------|
| `@/schemas/result` | **Definitions** — Valibot schemas + types + `ERRORS` registry + `ok()`/`err()` constructors | `src/result.ts`, `src/captured-error.ts` |
| `@/utils/result` | **Runtime** — `safeParse`, `fromUnknownError`, combinators, `format.ts`, `breadcrumbs.ts` | `src/safe.ts`, `src/combinators.ts`, `src/error-utils.ts`, `src/format.ts`, `src/breadcrumbs.ts` |

`@/schemas/result` is a **leaf package** — it inlines `DeepReadonly`, `_deepFreeze`, and `ErrorMetaSchema` from `@/utils/core`/`@/schemas/common` to break the cycle (canonical copies live elsewhere).

## `Result<T>` shape

```typescript
type Result<T> =
  | { readonly ok: true;  readonly data: DeepReadonly<T>; readonly error: null }
  | { readonly ok: false; readonly data: null;            readonly error: AppError };
```

- Both variants are `Object.freeze`'d. Ok values are deep-frozen via `_deepFreeze`.
- TS narrows after `if (!result.ok)` → `result.error: AppError`.
- The `data` field on Ok is `DeepReadonly<T>` — recursively readonly arrays/sets/maps/objects.

## `AppError` shape (`packages/shared/schemas/result/src/result.ts:1053`)

```typescript
type AppError = {
  // Core (always present, auto-populated by err())
  code: KnownErrorCode;          // e.g. "AUTH.INVALID_TOKEN"
  message: string;
  id: string;                    // crypto.randomUUID()
  timestamp: string;             // ISO 8601
  stack: string;                 // captured via Error.captureStackTrace
  // Optional
  validation?: ValidationDetail; // { issues: v.BaseIssue[], flattened: v.FlatErrors }
  source?: ErrorSource;          // { pointer? | parameter? | header? } — at least one
  cause?: AppError;              // typed cause chain
  meta?: Record<string, unknown>;
  severity?: ErrorSeverity;      // 'fatal' | 'error' | 'warning' | 'info' | 'advice'
  httpStatus?: HttpStatusCode;   // 100-599
  help?: string;
  links?: ErrorHelpLink[];       // [{ description, url }]
  tags?: ErrorTags;              // Record<string, string> — for indexing
  retry?: RetryInfo;             // { retryable: boolean, retryAfterMs?, maxRetries? }
  related?: AppError[];          // sibling (non-causal) errors
};
```

- `code: KnownErrorCode` — strict union (compile-time enforcement). `AppErrorSchema` uses `ErrorCodeSchema` (regex `/^[A-Z][A-Z0-9]*(?:\.[A-Z][A-Z0-9_]*)+$/` + `v.brand('ErrorCode')`) for deserialization of external codes.

## ERRORS registry — `result.ts:478`

`_deepFreeze`'d hierarchical map of every error code in the monorepo. 19 domains × specific codes. Use `ERRORS.AUTH.INVALID_TOKEN` instead of string literals. `KnownErrorCode = FlattenErrors<typeof ERRORS>` derives the union at the type level.

Domains: `VALIDATION`, `CONFIG`, `AUTH`, `DB`, `IO`, `HTTP`, `NETWORK`, `WORKSPACE`, `RUNTIME`, `FUNCTION`, `LOCALE`, `TEMPLATE`, `RESOURCE`, `ENCODING`, `SCENE`, `PLUGIN`, `PROJECT`, `ASSET`, `INTERNAL`.

Each code in `ERROR_DEFAULTS` (result.ts:928) maps to default `severity` + `httpStatus` (e.g., `AUTH.UNAUTHORIZED` → `error`/401, `DB.CONNECTION` → `fatal`/503, `HTTP.NOT_FOUND` → `error`/404). Each code in `ERROR_MESSAGES` (result.ts:728-863) has a template function `(meta) => string` for default messages — used when `err()` is called without an explicit message.

## Constructors

```typescript
// Success — runtime-validated against the schema you provide
ok(NumSchema, 42)          // → { ok: true, data: 42, error: null }
ok(StrSchema, x)           // returns ERRORS.INTERNAL.OUTPUT_VALIDATION_FAILED if validation fails

// Success — UNVALIDATED (use only when no Valibot schema exists)
okUnchecked<Record<string, unknown>>({ key: 'value' })

// Error
err(ERRORS.AUTH.INVALID_TOKEN, 'Token has expired')
err(ERRORS.IO.READ_FAILED, { meta: { path: '/app/config.ts' } })  // shorthand: omit message → uses ERROR_MESSAGES template
err(ERRORS.HTTP.SERVER_ERROR, 'Service down', {
  retry: { retryable: true, retryAfterMs: 5000 },
  links: [{ description: 'Status page', url: 'https://...' }],
  tags: { service: 'user-api', region: 'us-east-1' },
  cause: prevResult.error,
})
```

`err()` auto-generates `id` (UUID v4), `timestamp` (ISO 8601), `stack` (captured via `Error.captureStackTrace` — V8-specific; falls back to `new Error().stack`). Object.freezes the result.

## Combinators (`@/utils/result/src/combinators.ts`)

- `andThen(result, fn)` — bind/flatMap (Ok → call fn, Err → pass through)
- `combine(...results)` / `combineWithAllErrors(...results)` — collect Oks or first/all Errs
- `map(result, fn)` / `mapErr(result, fn)` — transform Ok value / Err
- `match(result, { ok, err })` — pattern match
- `orElse(result, recoverFn)` — try recovery on Err
- `tap(result, fn)` / `tapErr(result, fn)` — side effects (returns original)
- `unwrapOr(result, default)` — extract Ok or fall back
- `fromThrowable(fn)` / `fromAsyncThrowable(asyncFn)` — wrap throwing fn → Result

## Introspection (`error-utils.ts`)

- `isAppError(v)`, `isResult(v)`
- `getRootCause(err)` — walks `cause.cause...` to the leaf
- `getCauseChain(err)` → AppError[]
- `findInCauseChain(err, predicate)`
- `hasCode(err, code)`, `hasAnyCode(err, codes)`
- `isInDomain(err, domain)`, `getDomain(err)`, `getSeverity(err)`
- `isRetryable(err)` — checks `retry.retryable`

## `fromUnknownError` (`safe.ts:184`)

Converts any thrown value to an `AppError`:
- If already an `AppError` (has `code`, `id`, `timestamp`, string `code`/`message`) → returns as-is (idempotent)
- If `Error` instance → uses `.message`/`.stack`, preserves constructor name in `meta.errorName`
- Otherwise → `String(thrown)` for message, fresh stack
- Always wraps in `ERRORS.INTERNAL.UNEXPECTED`. Object.freezes.

## CapturedError envelope (`packages/shared/schemas/result/src/captured-error.ts:273`)

Wire-format for errors at runtime boundaries (uncaught exceptions, unhandledrejection, signal handlers, beacon payloads). NOT part of `Result<T>` flow.

```typescript
type CapturedError = {
  type: CapturedErrorType;          // 'uncaughtException' | 'unhandledRejection' | 'signal' | ...
  id: string;                       // UUID v4
  error: AppError;                  // the converted AppError
  original: unknown;                // raw thrown value (preserved)
  environment: RuntimeKind;         // 'node-tty' | 'node-pipe' | 'worker' | 'browser' | 'web-worker' | 'shared-worker' | 'service-worker'
  timestamp: string;
  fatal: boolean;
  meta?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];       // ring buffer events (typed levels: 'fatal' | 'error' | 'warning' | 'info' | 'debug')
  user?: ErrorUserContext;
  contexts?: ErrorContexts;
  fingerprint?: ErrorFingerprint;   // for grouping/dedup
  tags?: ErrorTags;
  release?: string;                 // app version
  serverName?: string;              // env name
};
```

## RFC 9457 Problem Details (`@/utils/result/src/format.ts:266`)

```typescript
toRfc9457(error: AppError, baseUrl: Str): Result<ProblemDetails>
// Produces:
{
  type: `${baseUrl}/${error.code}`,
  title: error.code,
  status: error.httpStatus ?? 500,
  detail: error.message,
  instance: `urn:uuid:${error.id}`,
  code: error.code,
  correlationId: error.id,
  timestamp: error.timestamp,
  errors?: [{ field, message }]   // when validation issues present
}
```

`toHttpResponse(err)` builds a complete `Response` object suitable for fetch handlers / SvelteKit endpoints.

## Other formatters

- `formatErrorDisplay(err)` — `'CODE: message[. Tip: help]'` single-line user-facing
- `formatErrorDebug(err)` — multi-line dev output (every field + nested cause chain + stack)
- `formatErrorJson(err)` — structured JSON for logs
- `formatErrorSafe(err)` — sanitized (no PII; for telemetry beacons)

## End-to-end flow: client error → server log

1. Browser: window.onerror / unhandledrejection caught by `setupGlobalErrorHandling` (from `@/utils/core/signal`) → `createCapturedError` → user `onError` callback.
2. Client onError calls `beaconError(captured, '/api/errors')` from `@/utils/beacon` → `toBeaconPayload(err, ctx)` (`BeaconPayloadSchema` is **strict** — rejects PII fields like `user`, `contexts`, `meta`, `original`, `serverName`) → `navigator.sendBeacon('/api/errors', payload)`.
3. `/api/errors/+server.ts` (storylyne): `request.text()` parse (sendBeacon sends `text/plain`), max body 64KB, `safeParse(BeaconPayloadSchema, ...)`, `log.error('[client-beacon] CODE (id) fatal=...')`. Returns `204`. Workers Logs captures structured JSON automatically.

## Server-side error handling (`hooks.server.ts`)

The storylyne SvelteKit hook (`packages/products/storylyne/editor/src/hooks.server.ts`) demonstrates the canonical server pattern:

- `setupLogging({ service: 'editor-server', initFromEnv: true, format: 'json' })` (module-level)
- `setupGlobalErrorHandling({ release: __APP_VERSION__, serverName: __GIT_COMMIT__, tags: { branch, side: 'server' }, onError: logCapturedError })`
- `handleError: HandleServerError = ({ error, event, status, message })`:
  1. `fromUnknownError(error)` — preserves existing AppError (with code/validation/cause) OR wraps unknown → `INTERNAL.UNEXPECTED`.
  2. If wrapped, re-wraps with rich meta: `{ status, message, url, method, route, locale, userAgent, referer, searchParams, isDataRequest }`.
  3. `reportError(appError, false as Bool)` → fires the onError pipeline.
  4. `event.setHeaders({ 'x-error-id': appError.id })` (try/catch — fails on fatal mid-response).
  5. Returns `{ message: '${message} (Reference: ${id})', errorId: appError.id }` so the static `error.html` (which only has `%sveltekit.error.message%`) still surfaces the ID.

Test routes at `/test-error/{400,403,404,500,validation,validation-client,beacon,unexpected,catastrophic}` exercise every path. `validation/+page.server.ts` uses `throw result.error` (raw AppError) to verify `handleError` preserves it instead of re-wrapping.

## Project-wide rule

Every fallible function returns `Result<T>` — **NEVER throws**. The `@/lint` `result/*` and `typescript/no-throw` rules enforce this:
- `typescript/no-throw` — Forbids `throw` (including `throw result.error`) unless an `// integration boundary: <reason>` comment is on the line/block. Allowed integration-boundary forms: `throw result.error` (re-throw original), `throw new Error(...)` (wrap with descriptive message). Allowed inside `v.check()`/`v.transform()`/`v.rawCheck()` (Valibot pipeline stages catch throws as validation failures).
- `result/check-before-access` — must check `if (!r.ok)` before reading `r.data`.
- `result/no-ignore-result` — Result return values cannot be discarded.
- `result/require-ok-return` — successful exits must return Ok.
- `result/require-result-type` — function declarations must return `Result<...>`.
- `result/no-result-fallback` / `result/no-ternary-fallback` — must use `unwrapOr` or explicit branch, not `r.ok ? r.data : default`.

## Concrete `err()` / `ok()` chain examples

### From `@/utils/core/src/terminal.ts:835`
```typescript
export function startSpinner(message: Str): Result<Void> {
  const input: Result<Str> = safeParse(StrSchema, message);
  if (!input.ok) return input;     // bubble validation error
  // ... do work
  return ok(VoidSchema, undefined);
}
```

### From `@/locale/src/registry.ts` setActive
```typescript
setActive(code: Str): Result<Void> {
  const exists: Result<Bool> = registry.has(code);
  if (!exists.ok) return exists;
  if (!exists.data) {
    return err(ERRORS.LOCALE.INVALID_LOCALE, `Locale '${code}' not in registry`);
  }
  // ... mutate
  return ok(VoidSchema, undefined);
}
```

### From `@/lint/src/cli-helpers.ts` (sketch — pattern is universal)
- Each step: `if (!step.ok) return step;` to bubble through the chain.
- Top-level boundary (CLI entry, API handler, hook) handles the final error via `format.ts` formatters.
