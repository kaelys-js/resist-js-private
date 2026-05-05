# Valibot Patterns — cross-cutting

> Captured 2026-05-05. Valibot is **the** validation library. Every type in the codebase has a paired Valibot schema. Branded primitives, schema-first definitions, and project-wide conventions enforced by 67+ `valibot/*` lint rules.

## Schema-first convention (universal)

```typescript
import * as v from 'valibot';

export const FooSchema = v.strictObject({...});
export type Foo = v.InferOutput<typeof FooSchema>;
```

Hard rules (enforced by `@/lint` `valibot/*` rules):
- **`v.strictObject()` always**, never `v.object()` (unless you specifically want `looseObject` for an open record like `features` in `ProductConfig`).
- **Schema name suffix `Schema`**, type name without it (`FooSchema` + `Foo`).
- **Pair them** — `valibot/schema-type-pair` requires both `FooSchema` and `Foo`. `valibot/colocate-schema-type` requires they live in the same file.
- **Use `v.InferOutput`** (not `v.InferInput`) for type inference when consumed downstream — `valibot/consistent-infer`.
- **`import * as v from 'valibot'`** is the project-wide convention — `valibot/namespace-import`.
- **Type-only imports** when you only need types — `valibot/import-type-only`.
- **Document fields** — `valibot/require-field-docs` requires JSDoc on every field of `v.strictObject` entries.
- **One schema per file** — `valibot/one-schema-per-file` (with exceptions for compositions).

## Pipe + brand pattern (canonical primitives)

Branded types prevent accidental cross-pollination of primitives. Examples from `packages/shared/schemas/common/src/index.ts`:

```typescript
PathSchema = v.pipe(v.string(), v.minLength(1), v.brand('Path'));
EmailSchema = v.pipe(v.string(), v.email(), v.brand('Email'));
UuidSchema = v.pipe(v.string(), v.uuid(), v.brand('Uuid'));
IsoTimestampSchema = v.pipe(v.string(), v.isoTimestamp(), v.brand('IsoTimestamp'));
GitCommitShortSchema = v.pipe(v.string(), v.length(7), v.brand('GitCommitShort'));
GitCommitFullSchema = v.pipe(v.string(), v.length(40), v.brand('GitCommitFull'));
GitBranchSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(255), v.brand('GitBranch'));
SemverSchema = v.pipe(v.string(), v.regex(SEMVER_REGEX, 'Must be a valid semver'), v.brand('Semver'));
NonNegativeIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.brand('NonNegativeInteger'));
PositiveIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(1), v.brand('PositiveInteger'));
LocaleStringSchema = v.pipe(v.string(), v.minLength(1), v.brand('LocaleString'));
UrlStringSchema = v.pipe(v.string(), v.url(), v.brand('UrlString'));
FilenameSchema = v.pipe(v.string(), v.minLength(1), v.regex(/^[^/\\]+$/, '...'), v.brand('Filename'));
```

The `v.brand()` is the LAST step in every pipe. Lint rule `valibot/prefer-branded-types` encourages branding any string/number with semantic meaning (path, ID, version) so e.g. `Path` is not assignable to `Email`. The non-branded primitives `Str`/`Bool`/`Num`/`StrArray` are NOT branded — they're the lowest-level building blocks.

## Validation entry point: `safeParse`

Every consumer goes through `safeParse(Schema, input)` from `@/utils/result/safe`:

```typescript
const result: Result<Foo> = safeParse(FooSchema, input);
if (!result.ok) return result;          // bubble error
const foo: DeepReadonly<Foo> = result.data;
```

`safeParse` wraps Valibot's `v.safeParse` and converts `{ success: false, issues }` into `err(ERRORS.VALIDATION.SCHEMA_FAILED, { validation: { issues, flattened: v.flatten(issues) } })`. **Never** call `v.parse` (throws) directly — `valibot/no-parse` blocks it. **Never** call `v.safeParse` directly except inside `safeParse` itself — `valibot/no-direct-safeparse`.

## Constructor-side validation: `ok(schema, data)`

```typescript
return ok(FooSchema, foo);     // runtime-validates against schema
return ok(NumSchema, 42);
return ok(VoidSchema, undefined);  // for void returns
```

If validation fails, `ok()` returns `err(ERRORS.INTERNAL.OUTPUT_VALIDATION_FAILED, { validation })` instead of an Ok. No codepath skips schema validation. Use `okUnchecked<T>(data)` ONLY when no Valibot schema exists for `T` (e.g., generic `Record<string, unknown>` or external library types).

## Schema kinds in use

### `v.strictObject` — most schemas
```typescript
const RetryInfoSchema = v.strictObject({
  retryable: v.boolean(),
  retryAfterMs: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  maxRetries: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});
```

### `v.picklist` — enums
```typescript
const ErrorSeveritySchema = v.picklist(['fatal', 'error', 'warning', 'info', 'advice']);
const ErrorDomainSchema = v.picklist(['VALIDATION', 'CONFIG', 'AUTH', ...]);
```
Lint rule `valibot/prefer-picklist` rejects `v.union([v.literal(...), v.literal(...)])`.

### `v.literal` — single-value
```typescript
ok: v.literal(true),
ok: v.literal(false),
```

### `v.lazy` for recursive schemas
```typescript
cause: v.optional(v.lazy(() => AppErrorSchema as unknown as v.GenericSchema<AppError>)),
related: v.optional(v.array(v.lazy(() => AppErrorSchema as unknown as v.GenericSchema<AppError>))),
```
Lint rule `valibot/no-recursive-without-lazy` enforces `v.lazy` when self-referencing.

### `v.record` — open key/value maps
```typescript
const ErrorMetaSchema = v.record(v.string(), v.unknown());
const ErrorTagsSchema = v.record(v.string(), v.string());
```

### `v.optional`, `v.nullable` (note the asymmetry):
- `v.optional(s)` → `T | undefined` — convention for "field may be absent"
- `v.nullable(s)` → `T | null` — convention for "field exists but may be null"
- `v.optional(s, defaultValue)` — provides default at parse time

Project naming: `OptionalStrSchema`/`OptionalStr` for `v.optional(StrSchema)`, `NullableStrSchema`/`NullableStr` for `v.nullable(StrSchema)`. Common-package primitives have all three variants (Str/OptionalStr/NullableStr; Bool/OptionalBool/NullableBool; etc.). Rule `valibot/consistent-nullability` enforces consistent nullable/optional usage.

### `v.check` — runtime predicates
```typescript
const ErrorSourceSchema = v.pipe(
  v.strictObject({ pointer: v.optional(v.string()), parameter: v.optional(v.string()), header: v.optional(v.string()) }),
  v.check(
    (obj): boolean => Boolean(obj.pointer || obj.parameter || obj.header),
    'At least one source field (pointer, parameter, or header) must be present',
  ),
);
```
Used for cross-field validation that a single field-level schema can't express.

### `v.regex` (with description)
```typescript
v.regex(/^[A-Z][A-Z0-9]*(?:\.[A-Z][A-Z0-9_]*)+$/, 'Error code must be DOT.SEPARATED.SCREAMING_SNAKE')
```
Always pass a human-readable error message as the second arg — the rule `valibot/no-inline-error-message` discourages inline strings without explanation.

## Function-as-schema (`@/schemas/function`)

The combinator chain validates function signatures at runtime:

```typescript
const trimmedLength = v.pipe(
  functionSchema(),                            // validates `typeof val === 'function'`, rejects classes
  args(v.tuple([v.string()])),                 // arg validation
  arity(1),                                    // exact arity
  returns(v.number()),                         // return validation
  implement((input) => input.trim().length),   // attach implementation
);

// Parse with undefined — implementation is the output
const result = safeParse(trimmedLength, undefined);
if (result.ok) {
  result.data('sandwich');   // 8
  result.data(42 as any);    // throws ValiError (arg validation)
}
```

Wrappers carry `WRAPPER_SYMBOL` so `getWrapperMeta(wrappedFn)` retrieves the args/returns schemas for introspection. `_toFnType` and `_toBaseSchema` handle the type erasure dance.

`functionSchema()` rejects class constructors by checking `val.toString().startsWith('class ')` (only plain functions and arrows pass).

`ErrorMode` controls behavior on validation failure (throw vs return Err Result — see `wrapper-utils.ts`).

Lint rule `typescript/require-function-schema` requires public exported functions to have a documented function-schema reference. Rule `valibot/validate-function-output` requires schema-validated outputs at function boundaries.

## Generic schemas (`@/schemas/generic`)

```typescript
generic<T>(SchemaFactory)  // returns GenericSchema<T> — for parameterized types
isGenericSchema(v)         // runtime check
```

Used by `@/schemas/result` for `OkSchema(DataSchema)`:
```typescript
function OkSchema<T extends v.BaseSchema<...>>(DataSchema: T) {
  return v.strictObject({
    ok: v.literal(true),
    data: DataSchema,
    error: v.null(),
  });
}
```

## Template literal schemas (`@/schemas/template-literal`)

For string formats with embedded primitive shapes (e.g. `"user_${UUID}"`, `"v${Semver}"`).

```typescript
import { templateLiteral } from '@/schemas/template-literal/template-literal';
const UserIdSchema = templateLiteral(['user_', UuidSchema]);
type UserId = v.InferOutput<typeof UserIdSchema>;  // `user_${string}` literal type
```

`schemaToRegex(schema)` (`regex.ts`) introspects Valibot pipes and returns the matching regex (combining `STRING_PATTERN`, `INTEGER_PATTERN`, `UUID_PATTERN`, `ULID_PATTERN`, etc.). Pre-built regex patterns: `BIGINT`, `BOOLEAN`, `CUID2`, `DECIMAL`, `HEXADECIMAL`, `INTEGER`, `IPV4`, `NANOID`, `NUMBER`, `OCTAL`, `SLUG`, `STRING`, `ULID`, `UUID`. `_introspectPipe` walks the Valibot pipe stages.

`InferTemplateLiteralParts<T>` and `SchemaToTemplateLiteralString<T>` are pure type-level helpers for IDE autocomplete on the resulting template literal type.

Used internally by some lint rules for embedded-string validation (`typescript/lint-embedded-strings`).

## Result-as-schema integration

`@/schemas/result` defines schemas for the Result type:
- `OkSchema(DataSchema)` — generic `{ ok: true, data, error: null }` schema parameterized by data schema
- `ErrSchema` — `{ ok: false, data: null, error: AppError }` schema (constant — error has fixed shape)
- `AppErrorSchema` — strict object schema for the error envelope (uses `v.lazy` for recursive `cause` chain)
- `ErrOptionsSchema` — schema for the second arg of `err()`

For DESERIALIZATION of Result objects from external sources (IPC messages, HTTP wire format), validate against `OkSchema(MyDataSchema)` or `ErrSchema`. For CONSTRUCTION, use `ok()` and `err()` directly — they apply schema validation internally.

The `Result<T>` TS type is irreducible (function-typed `data: DeepReadonly<T>`) so it has no Valibot schema — only its variants (Ok, Err) do.

## Locale schema integration (`@/locale/template.ts`)

Locale strings use a custom Valibot wrapper `messageTemplate({ params? })` that:
1. Validates raw template strings at schema-build time (placeholders must match declared params).
2. `buildLocale(schema, raw)` transforms raw `Record<key, templateString>` into `Record<key, (params) => Result<Str>>` — so consumers call locale strings as functions.

Pattern (from storylyne `EditorLocaleSchema`):
```typescript
export const EditorLocaleSchema = v.strictObject({
  meta: v.strictObject({
    tagline: messageTemplate(),                                // () => Result<Str>
    description: messageTemplate({ appName: v.string() }),     // ({appName}) => Result<Str>
  }),
});
```

## Lint enforcement (highlights of `valibot/*` ruleset, ~67 rules)

- `valibot/await-async-parse` — async schemas must be awaited
- `valibot/colocate-schema-type` — `Foo` and `FooSchema` must be in same file
- `valibot/consistent-infer` — use `v.InferOutput` (not `InferInput`) externally
- `valibot/discriminated-unions` — prefer `v.variant` for tagged unions
- `valibot/no-any-schema` / `valibot/no-class-validator` / `valibot/no-zod` / `valibot/no-yup` / `valibot/no-joi` / `valibot/no-io-ts` — forbid alternative validators
- `valibot/no-direct-safeparse` / `valibot/no-parse` — must go through `safeParse` from `@/utils/result/safe`
- `valibot/no-mutate-after-parse` — Result.data is frozen; treat as readonly
- `valibot/no-passthrough` — `passthrough` allows extra keys silently; use strict
- `valibot/no-recursive-without-lazy` — recursive schemas need `v.lazy`
- `valibot/one-schema-per-file` — single primary schema per file
- `valibot/prefer-branded-types` — encourage `v.brand` for semantic primitives
- `valibot/prefer-picklist` — use `v.picklist` over `v.union(literals)`
- `valibot/prefer-pipe` — chain transforms via `v.pipe`
- `valibot/prefer-template-literal` — use `templateLiteral` for `${T}-${U}` formats
- `valibot/readonly-parse-result` — never mutate validated data
- `valibot/require-description` — schemas need JSDoc
- `valibot/require-strict-object` — no `v.object` (use `v.strictObject` or `v.looseObject`)
- `valibot/schema-file-location` — schemas live in dedicated `schema.ts` files
- `valibot/type-alias-from-schema` — `type Foo = v.InferOutput<typeof FooSchema>` only — no manual `type Foo = {...}`

## Where schemas live

| Tier | Package | Contains |
|------|---------|----------|
| Foundation | `@/schemas/common` | Single `index.ts` (~3,800 lines) — Path/Email/UUID/Bool/Num/Str/* + nullable/optional variants, hashes, network, git, locale codes, log levels, JSON, regexes, defaults |
| Foundation | `@/schemas/result` | `result.ts` + `captured-error.ts` — Result/AppError/ERRORS |
| Combinator | `@/schemas/function` | `functionSchema`, `args`, `arity`, `returns`, `implement`, `createWrapper` |
| Combinator | `@/schemas/generic` | `generic(...)`, `_toGenericSchema`, `isGenericSchema` |
| Combinator | `@/schemas/template-literal` | `templateLiteral`, `schemaToRegex`, regex patterns |
| Workspace | `@/schemas/core-config` | `config.ts`/`tooling.ts`/`secret-schemas.ts`/etc. — workspace + product config schemas |
| Per-package | (each package) | Schemas inline in the file that uses them, exported alongside the type |

## How to find a schema

1. For primitives: `mcp__serena__find_symbol "<NameSchema>" relative_path="packages/shared/schemas/common/src/index.ts"`
2. For Result/AppError: `relative_path="packages/shared/schemas/result/src/result.ts"`
3. For workspace config: `packages/shared/schemas/core-config/src/<topic>.ts`
4. For per-package: open the file alongside the type that uses it.
