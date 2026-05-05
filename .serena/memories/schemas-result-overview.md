# `@/schemas/result` — packages/shared/schemas/result

Result/AppError Valibot DEFINITIONS (the schemas). Runtime utilities live in `@/utils/result`.

## Package
- **Name**: `@/schemas/result` (private)
- **Vitest project**: `schemas-result`
- **Depends on**: `@/schemas/common`, `@/schemas/generic`

## File structure (`src/`)
```
result.ts            ← Result/Ok/Err + AppError + ERRORS taxonomy
result.test.ts
captured-error.ts    ← Captured-error / breadcrumb / context schemas
```
No `index.ts` barrel. No `captured-error.test.ts` listed (may be tested via integration).

## Public API

### `result.ts`
**Constructors**
- `ok(value)`, `okUnchecked(value)` — build an Ok variant
- `err(opts)` — build an Err variant

**Schemas**
- `OkSchema`, `ErrSchema`
- `Result` (union), `ErrResult`
- `AppError`, `AppErrorSchema`

**Error taxonomy types**
- `KnownErrorCode`, `ErrorCode`, `ErrorDomain`, `ErrorHelpLink`, `ErrorMeta`, `ErrorSeverity`, `ErrorSource`, `ErrorTags`
- `ErrOptions`, `FlattenErrors`, `ValidationDetail`, `RetryInfo`

**Constants**
- `ERRORS` — full error code → metadata table
- `ERROR_DEFAULTS`, `ERROR_MESSAGES`

**Utility types**
- `DeepReadonly<T>` — recursive readonly

**Internal helpers**
- `_captureCallerStack`, `_deepFreeze`, `_okResult`

### `captured-error.ts`
- `CapturedError`, `CapturedErrorType` — the wire-format error (with stack, breadcrumbs, context)
- `Breadcrumb`, `BreadcrumbLevel`
- `ErrorContexts`, `ErrorFingerprint`, `ErrorUserContext`
- `_RuntimeKindSchema`

## The Result pattern (project-wide convention)
This package (with `@/utils/result`) implements the project's mandatory Result-pattern. Every fallible function in the codebase returns `Result<T, AppError>` instead of throwing. `@/lint` enforces this via `result/*` and `typescript/no-throw` rules.

- `Ok` = `{ ok: true, value: T }`
- `Err` = `{ ok: false, error: AppError }` (frozen, with cause chain, breadcrumbs, captured stack)
- `AppError` is structured: code (`KnownErrorCode`), domain, severity, source, tags, message, cause chain, retry info

## Used by
- `@/utils/result` — runtime helpers (combinators, format, breadcrumbs)
- `@/utils/beacon` — error-beacon payloads (uses `CapturedError`)
- Every package that returns `Result<...>`
