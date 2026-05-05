# `@/schemas/generic` — packages/shared/schemas/generic

Generic-typed Valibot schema factory. Lets you define schemas with type parameters that propagate through Valibot's type system.

## Package
- **Name**: `@/schemas/generic` (private)
- **Vitest project**: `schemas-generic`
- **No internal deps in package.json** (uses Valibot directly via workspace)

## File structure (`src/`)
```
generic.ts          ← generic(...) factory + helpers
generic.test.ts
types.ts            ← GenericSchema, GenericSchemaFactory, GenericSchemaMeta types
```

## Public API

### `generic.ts`
- `generic(...)` — factory for a schema parameterized by a type variable
- `_toGenericSchema(...)` — internal: converts a schema to its generic form
- `isGenericSchema(v)` — runtime check

### `types.ts`
- `GenericSchema<T>` — the result type
- `GenericSchemaFactory` — factory signature
- `GenericSchemaMeta` — metadata attached to generic schemas (for introspection)

## Patterns
- Tiny package — just the generic-schema combinator
- Used to build reusable schema templates (e.g. `Result<T, E>`-style generics)
- Integrates with `@/schemas/result` (which uses generics for Result/Ok/Err)

## When to use
When you need a schema that takes a type parameter — like a list-of-T schema where the element type is supplied later.
