# @/schemas/generic

Generic schema factories for Valibot. Define parameterized schemas that produce concrete types when instantiated — the Valibot equivalent of TypeScript's generic interfaces and type aliases.

## Quick Start

```typescript
import * as v from 'valibot';
import { generic } from '@/schemas/generic';

// Define a generic schema with one type parameter
const BoxSchema = generic(
  <T>(valueSchema: v.GenericSchema<T>) =>
    v.object({ value: valueSchema }),
);

// Instantiate with a concrete type
const StringBox = BoxSchema(v.string());
type StringBox = v.InferOutput<typeof StringBox>;
// { value: string }

const NumberBox = BoxSchema(v.number());
type NumberBox = v.InferOutput<typeof NumberBox>;
// { value: number }
```

## API Reference

| Export | Kind | Description |
|--------|------|-------------|
| `generic(factory)` | Function | Marks a schema factory as a generic schema |
| `isGenericSchema(value)` | Type guard | Detects generic schema factories |

### Types

| Export | Kind | Description |
|--------|------|-------------|
| `GenericSchemaFactory` | Type | A function from schemas to schemas |
| `GenericSchema<TFactory>` | Type | Factory with generic metadata attached |
| `GenericSchemaMeta` | Interface | Metadata shape (`__isGenericSchema: true`) |

## Detailed API

### `generic(factory)`

Creates a generic schema factory — a function that takes type parameter schemas and returns a concrete Valibot schema.

```typescript
const ResultSchema = generic(
  <T>(dataSchema: v.GenericSchema<T>) =>
    v.variant('ok', [
      v.strictObject({ ok: v.literal(true), data: dataSchema, error: v.null_() }),
      v.strictObject({ ok: v.literal(false), data: v.null_(), error: AppErrorSchema }),
    ]),
);

const StringResult = ResultSchema(v.string());
type StringResult = v.InferOutput<typeof StringResult>;
```

**Parameters:**
- `factory` — A function that takes `v.GenericSchema<T>` arguments and returns a concrete Valibot schema. The function's generic type parameters become the schema's type parameters.

**Returns:** The same function with `__isGenericSchema: true` metadata attached. Callable exactly like the original factory.

### `isGenericSchema(value)`

Type guard that checks whether a value is a generic schema factory created by `generic()`.

```typescript
const Box = generic(<T>(s: v.GenericSchema<T>) => v.object({ value: s }));

isGenericSchema(Box);            // true
isGenericSchema(v.string());     // false
isGenericSchema(() => v.string()); // false
```

## Patterns

### Single Type Parameter

```typescript
const ArrayOfSchema = generic(
  <T>(itemSchema: v.GenericSchema<T>) =>
    v.array(itemSchema),
);

const StringArray = ArrayOfSchema(v.string());
// v.ArraySchema<v.StringSchema<string>>
```

### Multiple Type Parameters

```typescript
const PairSchema = generic(
  <A, B>(
    firstSchema: v.GenericSchema<A>,
    secondSchema: v.GenericSchema<B>,
  ) =>
    v.tuple([firstSchema, secondSchema]),
);

const StringNumberPair = PairSchema(v.string(), v.number());
type StringNumberPair = v.InferOutput<typeof StringNumberPair>;
// [string, number]
```

### Constrained Type Parameters

Type parameter constraints are expressed through TypeScript's `extends`:

```typescript
const ContextSchema = generic(
  <TFlags extends Record<string, unknown>>(
    flagsSchema: v.GenericSchema<TFlags>,
  ) =>
    v.object({ flags: flagsSchema }),
);

// OK
ContextSchema(v.object({ verbose: v.boolean() }));

// TypeScript error — string doesn't extend Record<string, unknown>
ContextSchema(v.string()); // compile-time error
```

### Default Type Parameters

Use JavaScript default parameter values for optional type parameters:

```typescript
const TaskContextSchema = generic(
  <TFlags extends Record<string, unknown>, TStrings>(
    flagsSchema: v.GenericSchema<TFlags> = v.record(v.string(), v.unknown()) as any,
    stringsSchema: v.GenericSchema<TStrings> = v.unknown() as any,
  ) =>
    v.strictObject({
      flags: flagsSchema,
      locale: stringsSchema,
      options: TaskOptionsSchema,
    }),
);

// Use with defaults
const DefaultContext = TaskContextSchema();

// Use with specific types
const TypedContext = TaskContextSchema(MyFlagsSchema, MyStringsSchema);
```

### Nested Generics

Generic schemas compose with other generic schemas:

```typescript
const ResultSchema = generic(
  <T>(dataSchema: v.GenericSchema<T>) =>
    v.variant('ok', [
      v.strictObject({ ok: v.literal(true), data: dataSchema, error: v.null_() }),
      v.strictObject({ ok: v.literal(false), data: v.null_(), error: AppErrorSchema }),
    ]),
);

const PaginatedSchema = generic(
  <T>(itemSchema: v.GenericSchema<T>) =>
    v.object({
      items: v.array(itemSchema),
      total: v.number(),
      page: v.number(),
    }),
);

// Compose: paginated results
const PaginatedUsersSchema = PaginatedSchema(UserSchema);
const PaginatedResultSchema = ResultSchema(PaginatedSchema(UserSchema));
```

### Combining with Function Schemas

Generic schemas work with `@/schemas/function`:

```typescript
import { functionSchema, arity } from '@/schemas/function';

const HandlerSchema = generic(
  <TInput, TOutput>(
    inputSchema: v.GenericSchema<TInput>,
    outputSchema: v.GenericSchema<TOutput>,
  ) =>
    v.pipe(
      functionSchema<[TInput], TOutput>(),
      arity(1),
    ),
);

const StringToNumberHandler = HandlerSchema(v.string(), v.number());
```

### Generic Field in Object Schema

```typescript
const ApiResponseSchema = generic(
  <T>(dataSchema: v.GenericSchema<T>) =>
    v.strictObject({
      status: v.picklist(['success', 'error']),
      data: v.nullable(dataSchema),
      timestamp: v.number(),
    }),
);

const UserResponseSchema = ApiResponseSchema(UserSchema);
```

## Migration Guide

### Converting TypeScript Interfaces

**Before:**

```typescript
interface TaskContext<
  TToolFlags extends Record<string, unknown> = Record<string, unknown>,
  TStrings = unknown,
> {
  flags: TToolFlags;
  locale: TStrings;
  options: TaskOptions;
}
```

**After:**

```typescript
const TaskContextSchema = generic(
  <TToolFlags extends Record<string, unknown>, TStrings>(
    flagsSchema: v.GenericSchema<TToolFlags> = v.record(v.string(), v.unknown()) as any,
    stringsSchema: v.GenericSchema<TStrings> = v.unknown() as any,
  ) =>
    v.strictObject({
      flags: flagsSchema,
      locale: stringsSchema,
      options: TaskOptionsSchema,
    }),
);

// Equivalent to TaskContext<MyFlags, MyStrings>
const MyContextSchema = TaskContextSchema(MyFlagsSchema, MyStringsSchema);
type MyContext = v.InferOutput<typeof MyContextSchema>;
```

### Converting Generic Type Aliases

**Before:**

```typescript
type Result<T> =
  | { readonly ok: true; readonly data: T; readonly error: null }
  | { readonly ok: false; readonly data: null; readonly error: AppError };
```

**After:**

```typescript
const ResultSchema = generic(
  <T>(dataSchema: v.GenericSchema<T>) =>
    v.variant('ok', [
      v.strictObject({
        ok: v.literal(true),
        data: dataSchema,
        error: v.null_(),
      }),
      v.strictObject({
        ok: v.literal(false),
        data: v.null_(),
        error: AppErrorSchema,
      }),
    ]),
);

const StringResult = ResultSchema(v.string());
type StringResult = v.InferOutput<typeof StringResult>;
```

### Step-by-Step Migration

1. Identify the generic interface/type
2. List its type parameters and their constraints
3. Create a schema factory function with `v.GenericSchema<T>` parameters
4. Map default type parameters to JavaScript default parameter values
5. Replace the interface body with Valibot schema construction
6. Wrap with `generic()`
7. Update all usage sites to call the factory with concrete schemas

## Concepts

### How It Works

At runtime, `generic()` is a thin identity wrapper — it takes a schema factory function and returns it with metadata attached. The real value is at the TypeScript type level:

| Aspect | Detail |
|--------|--------|
| Runtime cost | Zero — `generic()` is an identity function with one `Object.defineProperty` |
| Type inference | TypeScript infers `T` from the schema argument at each call site |
| Output type | Standard `v.InferOutput` works on the instantiated schema |
| Constraints | Enforced by TypeScript at compile time, not by Valibot at runtime |

### Schema Factory vs Concrete Schema

```typescript
// This is a GENERIC schema (factory — not yet a schema)
const BoxSchema = generic(
  <T>(s: v.GenericSchema<T>) => v.object({ value: s }),
);

// This is a CONCRETE schema (instantiated — ready to parse)
const StringBoxSchema = BoxSchema(v.string());

// Parse with the concrete schema
const box = v.parse(StringBoxSchema, { value: 'hello' });
```

### Why `as any` for Defaults

TypeScript can't infer that a default parameter satisfies a generic constraint in all cases. The `as any` is safe here because:

1. The default is only used when no argument is passed
2. The factory still returns a valid Valibot schema
3. Type inference at call sites remains correct

```typescript
// The `as any` is on the default value only — callers get full type safety
const Schema = generic(
  <T extends Record<string, unknown>>(
    s: v.GenericSchema<T> = v.record(v.string(), v.unknown()) as any,
  ) => v.object({ data: s }),
);

Schema();                             // uses default — inferred as Record<string, unknown>
Schema(v.object({ x: v.number() })); // uses specific — inferred as { x: number }
```

## Limitations

| Limitation | Detail |
|------------|--------|
| No runtime generics | JavaScript has no `T` at runtime — factories produce concrete schemas |
| No runtime constraints | `extends` bounds are TypeScript-only; bypassing with `as any` skips them |
| No higher-kinded types | Can't pass a generic factory as a type parameter to another generic |
| No auto-migration | Each interface must be manually rewritten as a factory |
| No schema caching | Each factory call creates a new schema instance |

## Comparison

| Feature | TypeScript Interface | Valibot Generic Schema |
|---------|---------------------|----------------------|
| Type parameters | `interface Foo<T>` | `generic(<T>(s: v.GenericSchema<T>) => ...)` |
| Constraints | `T extends Bar` | `T extends Bar` on the factory param |
| Defaults | `T = DefaultType` | JavaScript default parameter value |
| Runtime validation | None | Full Valibot validation |
| Type inference | `v.InferOutput` | `v.InferOutput` on instantiated schema |
| Composability | Limited (extends) | Full (nest factories, combine with pipes) |

## Integration

This package integrates with:

- **`@/schemas/function`** — Generic function schemas via `functionSchema<[TInput], TOutput>()` inside generic factories
- **`@/schemas/result`** — Generic Result schemas as a primary use case
- **`@/schemas/common`** — Follows the same schema/type export conventions

## Tree-Shaking

The package is minimal — two functions and three types:

```typescript
// Only what you need
import { generic } from '@/schemas/generic';

// Type guard (optional)
import { generic, isGenericSchema } from '@/schemas/generic';

// Types only
import type { GenericSchema, GenericSchemaFactory } from '@/schemas/generic';
```
