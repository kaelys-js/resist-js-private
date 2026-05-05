# `@/schemas/function` — packages/shared/schemas/function

Function-as-schema framework. Lets you declare a function's signature and behavior as a Valibot-style schema, with runtime validation of args + return.

## Package
- **Name**: `@/schemas/function` (private)
- **Vitest project**: `schemas-function`
- **Depends on**: `@/schemas/common`, `@/schemas/result`

## File structure (`src/`)
```
function.ts           ← functionSchema, isAsyncFunction, _emptyAsync, AsyncFunction
function.test.ts
args.ts               ← args(...) combinator
arity.ts              ← arity(...) combinator
returns.ts            ← returns(...) combinator
implement.ts          ← implement(...) — binds an impl to a function schema
wrapper-utils.ts      ← createWrapper, getWrapperMeta, validate{Args,Return}, helpers
types.ts              ← ArityConstraint, CallTimeOptions, ErrorMode, FnType, WrapperMeta
```

## Public API

### `function.ts` — entry
- `functionSchema(opts)` — declares a function schema
- `isAsyncFunction(fn)` — runtime check
- `AsyncFunction` type
- `_emptyAsync` constant

### Combinators (chain with `functionSchema`)
- `args(...schemas)` — declares positional arg schemas
- `arity(n)` — fixes arity (e.g., `arity(2)` requires exactly 2 args)
- `returns(schema)` — declares return-value schema

### `implement.ts`
- `implement(fnSchema, impl)` — wraps a JS function as the validated implementation of a function schema

### `wrapper-utils.ts`
- `createWrapper(...)` — builds the actual runtime-validating wrapper
- `getWrapperMeta(wrappedFn)` — introspect a wrapped function
- `validateArgs(...)`, `validateReturn(...)` — validation helpers
- `WRAPPER_SYMBOL` — marker symbol on wrapped functions
- `_toBaseSchema(...)`, `_toFnType(...)` — internal conversions
- `isResult(v)` — check if a value is a Result (used to handle Result-returning functions specially)

### `types.ts`
- `ArityConstraint`, `CallTimeOptions`, `ErrorMode`, `FnType`, `WrapperMeta` (Valibot schemas)

## Patterns
- Combinator chain: `functionSchema().args(...).arity(...).returns(...).implement(impl)`
- All wrapped functions have `WRAPPER_SYMBOL` for runtime detection
- Result-aware: validates Result schemas specially via `isResult`
- `ErrorMode` controls behavior on validation failure (throw vs return Err)

## Used by
- `@/lint` rules (e.g., `require-function-schema`) and Result rules
- Anywhere in the monorepo that needs runtime-validated function signatures
