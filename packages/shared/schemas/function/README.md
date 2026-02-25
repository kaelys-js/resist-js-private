# @/schemas/function

Pipe-based function schemas for Valibot. Validates function shapes, input parameters, return types, and arity — following Valibot's compositional model where schemas define the base type and actions refine within `v.pipe()`.

## Quick Start

```typescript
import * as v from 'valibot';
import { functionSchema, args, returns, arity } from '@/schemas/function';

const MyFnSchema = v.pipe(
  functionSchema(),
  args(v.tuple([v.string(), v.number()])),
  returns(v.boolean()),
  arity(2),
);

type MyFn = v.InferOutput<typeof MyFnSchema>;
// (arg0: string, arg1: number) => boolean
```

## API Reference

| Export | Kind | Description |
|--------|------|-------------|
| `functionSchema()` | Schema | Base schema — validates `typeof val === 'function'` |
| `args(schema)` | Action | Wraps function with per-call parameter validation |
| `returns(schema)` | Action | Wraps function with per-call return value validation |
| `arity(constraint)` | Action | Validates `fn.length` at parse time (no wrapping) |
| `implement(fn)` | Action | Attaches a concrete implementation to the schema |

## Detailed API

### `functionSchema<TArgs, TReturn>()`

Creates a base function schema that validates a value is callable. Rejects class constructors.

```typescript
// Untyped — any function passes
const AnyFn = functionSchema();

// Typed — type-only, no runtime param/return validation
const TypedFn = functionSchema<[string, number], boolean>();
```

**Type parameters:**
- `TArgs` — Tuple of parameter types (default: `unknown[]`)
- `TReturn` — Return type (default: `unknown`)

### `args(schema, options?)`

Pipe action that validates function parameters at call time. Transforms the function into a wrapper that calls `v.safeParse()` on the arguments tuple before each invocation.

```typescript
const Schema = v.pipe(
  functionSchema(),
  args(v.tuple([v.string(), v.number()])),
);

const fn = v.parse(Schema, (name: string, age: number) => `${name} is ${age}`);
fn('Alice', 30);  // OK
fn(42, 'bad');     // throws — parameter validation failed
```

**Parameters:**
- `schema` — Tuple schema for positional params. Use `v.tuple([...])` or `v.tupleWithRest([...], rest)`.
- `options.onError` — `'throw'` (default) or `'result'` for Result-returning functions.

### `returns(schema, options?)`

Pipe action that validates return values at call time. Result-aware and async-aware.

```typescript
const Schema = v.pipe(
  functionSchema(),
  args(v.tuple([v.string()])),
  returns(v.number()),
);

v.parse(Schema, (s: string) => s.length);         // OK
v.parse(Schema, (s: string) => s.toUpperCase());   // Fails at call time
```

**Result-aware:** For functions returning `Result<T>`, validates `.data` inside ok Results. Error Results pass through.

**Async-aware:** For functions returning Promises, awaits and validates the resolved value.

**Parameters:**
- `schema` — Schema for the return value (or `Result.data` for Result-returning functions).
- `options.onError` — `'throw'` (default) or `'result'`.

### `arity(constraint)`

Pipe action that validates `fn.length` at parse time. This is a validation action (not a transformation) — zero runtime overhead after the initial check.

```typescript
// Exact
const BinaryFn = v.pipe(functionSchema(), arity(2));

// Range
const FlexFn = v.pipe(functionSchema(), arity({ min: 1, max: 3 }));
```

**Parameters:**
- `constraint` — Exact number, or `{ min?, max? }` range.

**Important:** `fn.length` only counts parameters before the first default value or rest parameter. Use `{ min }` for functions with defaults.

### `implement(fn)`

Pipe action that attaches a concrete implementation. The Valibot equivalent of Zod's `.implement()`.

```typescript
const trimmedLength = v.pipe(
  functionSchema(),
  args(v.tuple([v.string()])),
  returns(v.number()),
  implement((input) => input.trim().length),
);

const fn = v.parse(trimmedLength, undefined);
fn('sandwich');  // 8
fn(42);          // throws — parameter validation failed
```

## Concepts

### Registration-Time vs Call-Time Validation

JavaScript cannot inspect a function's parameter or return types without calling it. This package provides two validation phases:

| Phase | What's checked | When | Overhead |
|-------|---------------|------|----------|
| Registration-time | `typeof`, `fn.length`, `fn.constructor` | At `v.parse()` / `v.safeParse()` | Zero after check |
| Call-time | Argument types, return types | Every function call | `v.safeParse()` per param + return |

- `functionSchema()` + `arity()` = registration-time only
- `args()` + `returns()` = call-time via wrapper

### `fn.length` Limitation

`fn.length` only counts formal parameters before the first default/rest:

```typescript
((a, b) => {}).length;        // 2
((a, b = 0) => {}).length;    // 1 (stops at default)
((...args) => {}).length;     // 0 (rest parameter)
```

Use `arity({ min: n })` instead of `arity(n)` for functions with defaults or rest params.

### Result-Aware Return Validation

The `returns()` action detects Result objects and validates `.data` inside them:

```typescript
// If function returns { ok: true, data: 42 }:
//   → validates 42 against the returns schema
// If function returns { ok: false, error: ... }:
//   → passes through without validation (error Results are already structured)
```

Configure with `{ onError: 'result' }` to have the wrapper return `err(...)` instead of throwing.

### Async Function Handling

The wrapper auto-detects Promise returns and chains validation:

```typescript
const Schema = v.pipe(
  functionSchema(),
  args(v.tuple([v.string()])),
  returns(v.number()),
);

// Works with both sync and async functions
v.parse(Schema, (s: string) => s.length);              // sync — OK
v.parse(Schema, async (s: string) => s.length);        // async — validates resolved value
```

### Error Modes

| Mode | Behavior | Use for |
|------|----------|---------|
| `'throw'` (default) | Throws `Error` with descriptive message | Non-Result functions (transforms, predicates) |
| `'result'` | Returns `err(ERRORS.FUNCTION.*)` | Result-returning functions (handlers, hooks) |

```typescript
// For Result-returning functions:
args(schema, { onError: 'result' })
returns(schema, { onError: 'result' })
```

## Recipes

### Type-Only Schema (No Call-Time Overhead)

```typescript
const HandleSchema = v.pipe(
  functionSchema<[Config], Result<Output | null>>(),
  arity(1),
);
```

### Optional Callback Schema

```typescript
const Schema = v.strictObject({
  onComplete: v.optional(v.pipe(
    functionSchema<[Results], void>(),
    arity(1),
  )),
});
```

### Full Input/Output Validation (Plugin Boundaries)

```typescript
const PluginHandlerSchema = v.pipe(
  functionSchema(),
  args(v.tuple([ConfigSchema])),
  returns(v.nullable(OutputSchema)),
  arity(1),
);
```

### Inline Implementation

```typescript
const myFn = v.pipe(
  functionSchema(),
  args(v.tuple([v.string()])),
  returns(v.number()),
  implement((input) => input.trim().length),
);

const fn = v.parse(myFn, undefined);
```

### Function Field in Object Schema

```typescript
const FormatterSchema = v.strictObject({
  tool: v.picklist(['biome', 'prettier', 'external']),
  transform: v.optional(v.pipe(
    functionSchema<[string], string>(),
    arity(1),
  )),
});
```

## Integration

This package integrates with:

- **`@/schemas/result`** — Result-aware return validation; FUNCTION error codes in ERRORS registry
- **`@/schemas/common`** — Follows the same schema/type export conventions
- **CLI schemas** — Replaces `v.custom<Fn>(typeof === 'function')` with typed `functionSchema()` + `arity()`

## Edge Cases

| Case | Handling |
|------|----------|
| Arrow functions | Work normally |
| Class constructors | Rejected by `functionSchema()` |
| Generator functions | Not validated — future `v.generator()` |
| Default params | `arity()` uses `fn.length` — use `{ min }` |
| Rest params | Use `v.tupleWithRest()` in `args()` |
| Overloaded behavior | Use `arity({ min, max })` range |
| Generic functions | Schema captures the concrete instantiation |
| Minified code | `fn.name` unreliable — wrapper uses original name |
| Double-wrapping | Prevented — `args()` and `returns()` share a single wrapper |

## Tree-Shaking

Each action is a separate module:

```typescript
// Registration-time only — no wrapper code bundled
import { functionSchema, arity } from '@/schemas/function';

// Full call-time validation — includes wrapper
import { functionSchema, args, returns } from '@/schemas/function';
```
