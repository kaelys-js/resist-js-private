# `@/utils/result` — packages/shared/utils/result

Runtime helpers for the Result pattern. Pairs with `@/schemas/result` (which holds the Valibot definitions).

## Package
- **Name**: `@/utils/result` (private)
- **Vitest project**: `utils-result`
- **Internal deps**: `@/schemas/result`

## File structure (`src/`)
```
safe.ts             ← safeParse, fromUnknownError, _okResult, _deepFreeze
safe.test.ts
combinators.ts      ← Result-monad combinators
combinators.test.ts
error-utils.ts      ← AppError introspection helpers
error-utils.test.ts
breadcrumbs.ts      ← breadcrumb buffer
breadcrumbs.test.ts
format.ts           ← error formatters (debug/display/json/safe/http/RFC9457)
format.test.ts
```
No `index.ts` barrel — consumers import paths directly.

## Public API per file

### `safe.ts` — Result construction from unsafe sources
- `safeParse(schema, input)` → `Result<T, AppError>` — Valibot wrapper
- `fromUnknownError(unknownErr)` → `Result.err` — convert any thrown value to AppError
- `_okResult` — internal Ok singleton helper
- `_deepFreeze(...)` — freezes nested Result values

### `combinators.ts` — Result monad operations
- `andThen(result, fn)` — bind/flatMap
- `combine(...results)` — Ok if all Ok; first Err otherwise
- `combineWithAllErrors(...results)` — Ok if all Ok; aggregate Errs otherwise
- `fromAsyncThrowable(asyncFn)` — wrap a throwing async fn → Result
- `fromThrowable(fn)` — wrap a throwing sync fn → Result
- `map(result, fn)` — transform Ok value
- `mapErr(result, fn)` — transform Err value
- `match(result, { ok, err })` — pattern match
- `orElse(result, recoverFn)` — try recovery on Err
- `tap(result, fn)` — side-effect on Ok (returns original)
- `tapErr(result, fn)` — side-effect on Err
- `unwrapOr(result, default)` — extract Ok or fall back

### `error-utils.ts` — AppError introspection
- `findInCauseChain(err, predicate)`
- `getCauseChain(err)` → array
- `getDomain(err)`, `getRootCause(err)`, `getSeverity(err)`
- `hasAnyCode(err, codes)`, `hasCode(err, code)`
- `isAppError(v)`, `isResult(v)`, `isInDomain(err, domain)`
- `isRetryable(err)`

### `breadcrumbs.ts`
- `addBreadcrumb(b)`, `clearBreadcrumbs()`
- `getBreadcrumbs()`, `drainBreadcrumbs()` (consume + clear)
- `MAX_BREADCRUMBS` constant — buffer cap (drops oldest on overflow)

### `format.ts` — error formatters
- `formatErrorDebug(err)` — full debug output
- `formatErrorDisplay(err)` — user-facing pretty
- `formatErrorJson(err)` — structured JSON
- `formatErrorSafe(err)` — sanitized (no PII)
- `toHttpResponse(err)` — `{status, body}` for HTTP responses
- `toRfc9457(err)` — RFC 9457 Problem Details
- `ProblemDetails` type

## Patterns
- Result pattern is **mandatory** project-wide (enforced by `@/lint` rules: `result/*`, `typescript/no-throw`)
- Combinators are pure functions (Result is immutable / deep-frozen)
- Breadcrumbs are a process-singleton ring buffer
- Format helpers are the canonical way to surface errors (don't `console.log(err.message)`)

## Used by
Every package that returns `Result<...>` (i.e., basically all of them).
