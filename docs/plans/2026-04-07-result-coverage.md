# Result Schemas — Push Coverage Past All Thresholds

## Context

`qa:test:coverage` for `@/schemas/result` fails all 4 thresholds. Baseline: S:31.49% (need 80%), B:9.09% (need 75%), F:7.5% (need 80%), L:31.49% (need 80%). The package has 2 source files (`result.ts` — 1527 lines, `captured-error.ts` — 309 lines) but only 5 existing tests covering basic `ok()`, `okUnchecked()`, and `err()` happy paths. Massive gaps: 127 statements, 286 branches (mostly from ERROR_MESSAGES template ternaries), 80 functions. This plan adds comprehensive tests covering all schema definitions, constructor branches, template functions, and captured-error schemas.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/schemas/result` (`packages/shared/schemas/result/src/`)
**Goal**: Raise all coverage metrics past thresholds (S:80%, B:75%, F:80%, L:80%) with test-only changes. Currently S:31.49%, B:9.09%, F:7.5%, L:31.49%.
**Architecture**: Vitest + v8 coverage; Valibot schemas (`v.strictObject`, `v.pipe`, `v.check`, `v.lazy`, `v.brand`, `v.picklist`, `v.record`, `v.array`, `v.optional`); Result pattern (`ok()`/`err()`/`okUnchecked()`); `_deepFreeze()` for immutability; ERROR_MESSAGES template registry with ~52 functions containing ~99 conditional branches; recursive `AppErrorSchema` via `v.lazy`.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric     | Value                         |
| ---------- | ----------------------------- |
| Tests      | 5 total (5 pass, 1 test file) |
| Statements | 31.49% (40/127) — need 80%    |
| Branches   | 9.09% (26/286) — need 75%     |
| Functions  | 7.5% (6/80) — need 80%        |
| Lines      | 31.49% (40/127) — need 80%    |
| Thresholds | S:80% B:75% F:80% L:80%       |

### Per-file uncovered code

| File              | Key Gaps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| result.ts         | Schema definitions (ErrorMetaSchema, ErrorSeveritySchema, HttpStatusCodeSchema, ErrorTagsSchema, RetryInfoSchema, ErrorHelpLinkSchema, ErrorCodeSchema, ErrorSourceSchema with v.check, ValidationDetailSchema, ErrorDomainSchema), ERRORS registry (frozen, 19 domains), ERROR_MESSAGES (~52 templates with ~99 conditional branches), ERROR_DEFAULTS, AppErrorSchema (recursive), OkSchema(), ErrSchema, ErrOptionsSchema, `_deepFreeze()` branches, `_okResult()` ternary, `_captureCallerStack()`, `err()` constructor (8+ branch points, 11 optional field spreads), `ok()` validation failure path |
| captured-error.ts | ALL schemas untested: `_RuntimeKindSchema`, `BreadcrumbLevelSchema`, `BreadcrumbSchema`, `ErrorUserContextSchema`, `ErrorContextsSchema`, `ErrorFingerprintSchema`, `CapturedErrorTypeSchema`, `CapturedErrorSchema`                                                                                                                                                                                                                                                                                                                                                                                     |

---

## TASK 1 — Simple Schema Definitions: Cover ErrorMeta through ErrorDomain

**Status**: [x]

**Gap**: Schema definitions in `result.ts` contribute to statement/line/function coverage. None are directly tested via `v.safeParse` except implicitly through `ok()`/`err()`.

**Plan**:

Tests in `src/result.test.ts` (extend existing file), new `describe('Schema definitions')`:

- **ErrorSeveritySchema**: accept each of 5 levels ('fatal', 'error', 'warning', 'info', 'advice'), reject 'invalid'
- **HttpStatusCodeSchema**: accept 200, 404, 599; reject 99, 600, 3.14
- **ErrorTagsSchema**: accept `{ key: 'value' }`, reject `{ key: 123 }` (values must be strings)
- **RetryInfoSchema**: accept `{ retryable: true, retryAfterMs: 5000, maxRetries: 3 }`, reject missing required fields, reject extra fields (strictObject)
- **ErrorHelpLinkSchema**: accept `{ description: 'docs', url: 'https://example.com' }`, reject empty description (minLength 1), reject invalid URL
- **ErrorCodeSchema**: accept `'AUTH.INVALID_TOKEN'`, accept `'DB.NOT_FOUND'`, reject `'lowercase'`, reject `'NO_DOT'`
- **ErrorDomainSchema**: accept all 19 domains, reject 'INVALID'
- **ValidationDetailSchema**: accept `{ issues: [], flattened: {} }`, reject missing fields

**Files**:

- Edit: `src/result.test.ts`

**Verification**: `pnpm --filter @/schemas/result run qa:test` — new tests pass

---

## TASK 2 — ErrorSourceSchema: Cover v.check Callback (All Branches)

**Status**: [x]

**Gap**: `ErrorSourceSchema` has a `v.check` callback requiring at least one of `pointer`, `parameter`, or `header` to be defined. This is 1 of only 2 functions in the coverage gap.

**Plan**:

Tests in `src/result.test.ts`, new `describe('ErrorSourceSchema')`:

- Accept `{ pointer: '/data/name' }` — only pointer
- Accept `{ parameter: 'id' }` — only parameter
- Accept `{ header: 'Authorization' }` — only header
- Accept all three fields together
- Reject `{}` — empty object fails v.check (at least one field required)
- Reject `{ pointer: undefined, parameter: undefined, header: undefined }` — all undefined fails v.check

**Files**:

- Edit: `src/result.test.ts`

**Verification**: `pnpm --filter @/schemas/result run qa:test` — new tests pass, ErrorSourceSchema v.check callback covered

---

## TASK 3 — AppErrorSchema, OkSchema, ErrSchema, ErrOptionsSchema: Complex Schema Validation

**Status**: [x]

**Gap**: These schemas are entirely untested via `v.safeParse`. `AppErrorSchema` is recursive (via `v.lazy`), `OkSchema()` is a factory function, `ErrSchema` and `ErrOptionsSchema` are strictObjects. Covers ~10 functions, ~20+ statements.

**Plan**:

Tests in `src/result.test.ts`:

**AppErrorSchema**:

- Accept minimal valid AppError: `{ code: 'AUTH.EXPIRED', message: 'expired', id: UUID, timestamp: isoTimestamp, stack: 'Error...' }`
- Accept with all optional fields: validation, source, cause (nested AppError), meta, severity, httpStatus, help, links, tags, retry, related
- Reject missing required fields (no code, no message, no id)
- Reject invalid code format
- Reject invalid UUID
- Reject invalid timestamp
- Reject extra fields (strictObject)

**OkSchema()**:

- `OkSchema(v.number())` accepts `{ ok: true, data: 42, error: null }`
- Rejects `{ ok: false, data: null, error: ... }`
- Rejects `{ ok: true, data: 'string', error: null }` (data type mismatch)

**ErrSchema**:

- Accept `{ ok: false, data: null, error: validAppError }`
- Reject `{ ok: true, ... }`

**ErrOptionsSchema**:

- Accept `{}` (all optional)
- Accept with all fields populated
- Reject extra fields (strictObject)

**Files**:

- Edit: `src/result.test.ts`

**Verification**: `pnpm --filter @/schemas/result run qa:test` — new tests pass

---

## TASK 4 — \_deepFreeze, \_okResult, ok(), okUnchecked(): Constructor Coverage

**Status**: [x]

**Gap**: `_deepFreeze()` branches (value && typeof === 'object' && !isFrozen), `_okResult()` ternary (typeof === 'object' && data !== null), `ok()` validation failure path, `okUnchecked()` with object vs primitive data.

**Plan**:

Tests in `src/result.test.ts`:

**\_deepFreeze (tested via ok/err return immutability)**:

- `ok()` result is frozen — `Object.isFrozen(result)` is true
- `ok()` with object data — nested object is deep-frozen
- `ok()` with primitive data — primitive is returned as-is (no freeze needed)
- `err()` result is frozen — `Object.isFrozen(result)` is true
- `err()` error object is frozen — `Object.isFrozen(result.error)` is true

**\_okResult ternary (object vs primitive)**:

- `ok(NumberSchema, 42)` — primitive data, `_okResult` skips deepFreeze
- `ok(ObjectSchema, { key: 'val' })` — object data, `_okResult` calls deepFreeze
- `okUnchecked(null)` — null is not an object, skips deepFreeze
- `okUnchecked({ nested: { deep: true } })` — object, deepFreeze applied

**ok() validation failure**:

- `ok(v.number(), 'not-a-number')` — returns `err(ERRORS.INTERNAL.OUTPUT_VALIDATION_FAILED)` with validation details
- Verify returned result has `ok: false`, error code is `INTERNAL.OUTPUT_VALIDATION_FAILED`
- Verify error has `validation` field with `issues` and `flattened`

**Files**:

- Edit: `src/result.test.ts`

**Verification**: `pnpm --filter @/schemas/result run qa:test` — new tests pass

---

## TASK 5 — err() Constructor: All Branches

**Status**: [x]

**Gap**: `err()` has 8+ branch decision points: message string vs options shorthand, ERROR_MESSAGES lookup, ERROR_DEFAULTS application, 11 optional field spreads. Currently only basic `err(code, message)` tested.

**Plan**:

Tests in `src/result.test.ts`, new `describe('err() constructor branches')`:

**Message resolution**:

- `err(code, 'explicit message')` — string message used directly
- `err(code)` — no message, uses ERROR_MESSAGES template (falls back to code string if no template)
- `err(code, { meta: { path: '/app' } })` — options as second arg, message from template with meta
- `err(ERRORS.INTERNAL.UNEXPECTED)` — uses template that returns fixed string

**ERROR_DEFAULTS application**:

- `err(ERRORS.AUTH.UNAUTHORIZED)` — verify severity defaults to 'error', httpStatus to 401
- `err(ERRORS.AUTH.EXPIRED)` — verify severity defaults to 'warning', httpStatus to 401
- `err(ERRORS.DB.CONNECTION)` — verify severity defaults to 'fatal', httpStatus to 503

**Options override defaults**:

- `err(ERRORS.AUTH.UNAUTHORIZED, 'msg', { severity: 'fatal' })` — severity overrides default
- `err(ERRORS.AUTH.UNAUTHORIZED, 'msg', { httpStatus: 500 })` — httpStatus overrides default

**All optional fields**:

- `err(code, 'msg', { validation: { issues: [], flattened: {} } })` — validation field
- `err(code, 'msg', { source: { pointer: '/data' } })` — source field
- `err(code, 'msg', { cause: anotherAppError })` — cause field (error chaining)
- `err(code, 'msg', { meta: { key: 'value' } })` — meta field
- `err(code, 'msg', { help: 'Try refreshing' })` — help field
- `err(code, 'msg', { links: [{ description: 'docs', url: 'https://example.com' }] })` — links field
- `err(code, 'msg', { tags: { service: 'api' } })` — tags field
- `err(code, 'msg', { retry: { retryable: true, retryAfterMs: 1000, maxRetries: 3 } })` — retry field
- `err(code, 'msg', { related: [] })` — related field

**Auto-generated fields**:

- Verify `id` is a valid UUID
- Verify `timestamp` is a valid ISO timestamp
- Verify `stack` is a non-empty string

**Files**:

- Edit: `src/result.test.ts`

**Verification**: `pnpm --filter @/schemas/result run qa:test` — new tests pass

---

## TASK 6 — ERROR_MESSAGES Templates: Cover All Conditional Branches

**Status**: [x]

**Gap**: ~52 template functions with ~99 conditional branches. These are the largest contributor to the 286-branch total. Each template has ternary/conditional expressions on `meta?.field`, `meta?.reason`, etc. Need both truthy and falsy paths.

**Plan**:

Tests in `src/result.test.ts`, new `describe('ERROR_MESSAGES templates')`:

For each error code with a template, test TWO cases:

1. `err(CODE)` — no meta, all conditionals falsy, base message
2. `err(CODE, { meta: { ...allRelevantFields } })` — all conditionals truthy, full message

Group by domain for readability. Key templates requiring special attention:

**VALIDATION domain** (5 templates, ~14 branches):

- SCHEMA_FAILED: with/without `{ errors: ['e1'], flag: 'f', reason: 'r' }` — has Array.isArray branch
- MISSING_FIELD: with/without `{ field: 'f', locale: 'l', location: 'loc' }`
- REQUIRED_FIELD: with/without `{ field: 'f', hint: 'h' }`
- INVALID_FORMAT: with/without `{ field: 'f', reason: 'r', template: 't', missingVariables: ['v1'] }` — has Array.isArray
- INVALID_TYPE: with/without `{ field: 'f', expected: 'string', received: 'number' }`

**CONFIG domain** (3 templates, ~4 branches):

- LOAD_FAILED, NOT_FOUND, INVALID — each with/without meta

**AUTH domain** (5 templates, ~5 branches):

- INVALID_TOKEN, EXPIRED (no meta params), UNAUTHORIZED, FORBIDDEN, DUPLICATE — each with/without meta

**DB domain** (3 templates, ~2 branches):

- NOT_FOUND, CONSTRAINT, CONNECTION — each with/without meta

**IO domain** (5 templates, ~8 branches):

- READ_FAILED, WRITE_FAILED, TIMEOUT, STAT_FAILED, FETCH_FAILED — each with/without meta

**HTTP domain** (3 templates, ~1 branch):

- TIMEOUT, NOT_FOUND, SERVER_ERROR — each with/without meta

**RUNTIME + FUNCTION domains** (6 templates, ~6 branches):

- UNSUPPORTED (has `??` fallback), NOT_CALLABLE, INVALID_ARITY, NOT_ASYNC, PARAM_VALIDATION_FAILED, RETURN_VALIDATION_FAILED

**LOCALE domain** (9 templates, ~22 branches):

- LOAD_FAILED, VALIDATION_FAILED, BUILD_FAILED, REGISTRY_MISMATCH, MISSING_FLAG_DESCRIPTION, INVALID_LOCALE, INVALID_FALLBACK, REMOVE_DENIED, FORMAT_FAILED — each with/without meta

**TEMPLATE domain** (2 templates, ~3 branches):

- UNDEFINED_VARIABLES (has Array.isArray), PARAM_VALIDATION_FAILED

**SCENE domain** (3 templates, ~6 branches):

- LOAD_FAILED, RENDER_FAILED, ASSET_MISSING

**PLUGIN domain** (4 templates, ~8 branches):

- LOAD_FAILED, INIT_FAILED, API_MISMATCH, SANDBOX_VIOLATION

**PROJECT domain** (4 templates, ~8 branches):

- LOAD_FAILED, SAVE_FAILED, CORRUPT, VERSION_MISMATCH

**ASSET domain** (3 templates, ~7 branches):

- IMPORT_FAILED, FORMAT_UNSUPPORTED, TOO_LARGE

**RESOURCE domain** (5 templates, ~8 branches):

- ALREADY_EXISTS, PRECONDITION_FAILED, GONE, CONFLICT, QUOTA_EXCEEDED

**ENCODING domain** (3 templates, ~3 branches):

- JSON_FAILED (has `??`), BASE64_FAILED, URL_FAILED

**INTERNAL domain** (4 templates, ~2 branches):

- UNEXPECTED, OUTPUT_VALIDATION_FAILED, SAFE_PARSE_THREW (no meta), INVARIANT_VIOLATED

**Files**:

- Edit: `src/result.test.ts`

**Verification**: `pnpm --filter @/schemas/result run qa:test` — new tests pass

---

## TASK 7 — captured-error.ts: Cover All Schemas

**Status**: [x]

**Gap**: Entire file untested — 8 schemas, multiple statements/functions/branches from picklist/strictObject definitions.

**Plan**:

Tests in `src/result.test.ts`, new `describe('captured-error schemas')`:

- **BreadcrumbLevelSchema**: accept all 5 levels ('fatal', 'error', 'warning', 'info', 'debug'), reject 'invalid'
- **BreadcrumbSchema**: accept valid breadcrumb with all fields, accept minimal (required only), reject missing required fields, reject extra fields
- **ErrorUserContextSchema**: accept valid user context (id, email, username, ipAddress), accept empty `{}`, reject invalid email format
- **ErrorContextsSchema**: accept `{ key: { nested: 'value' } }`, accept empty `{}`
- **ErrorFingerprintSchema**: accept `['hash1', 'hash2']`, reject `[123]` (not strings)
- **CapturedErrorTypeSchema**: accept all 7 types, reject 'invalid'
- **CapturedErrorSchema**: accept valid captured error with all fields, accept minimal, reject missing required type, reject invalid UUID for id

**Files**:

- Edit: `src/result.test.ts`

**Verification**: `pnpm --filter @/schemas/result run qa:test` — new tests pass

---

## TASK 8 — Register Rules + Config

**Status**: [x]

**Plan**:

- No new rules or commands to register — test-only changes
- Verify test file matches vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/schemas/result run qa:test` discovers test file, no orphaned tests

---

## TASK 9 — Integration Verification

**Status**: [x]

**Plan**:

- No commands registered — test-only changes, no registerCommand calls needed
- Config settings read check: N/A — no new config settings
- Class instantiation check: N/A — no new classes added (test-only changes)
- Unused exports / dead code check: No new exports introduced, verify export count unchanged from baseline

**Verification**:

- `git diff --name-only` returns no production `.ts` files (only `.test.ts`)
- Export count unchanged from baseline

---

## TASK 10 — Full QA + Coverage

**Status**: [x]

**Plan**:

- Run: `pnpm -w run qa:format:check`
- Run: `pnpm --filter @/schemas/result run qa:test:coverage`
- Verify all 4 coverage thresholds pass (S >= 80%, B >= 75%, F >= 80%, L >= 80%)
- If any threshold still fails, identify remaining uncovered lines and add targeted tests

**Verification**: All pnpm commands exit 0, coverage passes all thresholds

---

## TASK 11 — Final Verification + Commit

**Status**: [x]

**Plan**:

- Verify all test files exist and pass
- Verify coverage meets all thresholds (S >= 80%, B >= 75%, F >= 80%, L >= 80%)
- Verify no production source files modified (only .test.ts files)
- Verify no regressions — existing 5 tests still pass
- Commit with descriptive message

**Verification**:

- Test count >= 80 (baseline 5 + ~75 new)
- All coverage metrics pass thresholds
- `pnpm --filter @/schemas/result run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description                                               | Depends On |
| ---- | --------------------------------------------------------- | ---------- |
| 1    | Simple schema definitions — ErrorMeta through ErrorDomain | --         |
| 2    | ErrorSourceSchema — v.check callback branches             | --         |
| 3    | AppErrorSchema, OkSchema, ErrSchema, ErrOptionsSchema     | --         |
| 4    | \_deepFreeze, \_okResult, ok(), okUnchecked() branches    | --         |
| 5    | err() constructor — all branches                          | --         |
| 6    | ERROR_MESSAGES templates — all conditional branches       | 5          |
| 7    | captured-error.ts — all schemas                           | --         |
| 8    | Register rules + config                                   | 1-7        |
| 9    | Integration verification                                  | 8          |
| 10   | Full QA + Coverage                                        | 9          |
| 11   | Final verification + commit                               | 10         |
