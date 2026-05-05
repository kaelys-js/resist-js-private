# `@/schemas/template-literal` — packages/shared/schemas/template-literal

Template-literal schema combinator: declare schemas like `${string}-${number}` with type-level inference + runtime validation + auto-derived regex.

## Package
- **Name**: `@/schemas/template-literal` (private)
- **Vitest project**: `schemas-template-literal`
- **Has `qa:checks` script**
- **Depends on**: `@/schemas/common`

## File structure (`src/`)
```
template-literal.ts     ← templateLiteral(...) main combinator
template-literal.test.ts
types.ts                ← TemplateLiteralPart, TemplateLiteralSchema, TemplateLiteralIssue, templateLiteralReference
regex.ts                ← schemaToRegex + pre-built common patterns
infer.ts                ← Type-level inference helpers
```

## Public API

### `template-literal.ts`
- `templateLiteral(parts)` — main factory; takes literal/schema parts, returns a TL schema

### `types.ts`
- `TemplateLiteralPart` — one segment (literal string OR child schema)
- `TemplateLiteralSchema` — the result schema type
- `TemplateLiteralIssue` — issue type (for validation errors)
- `templateLiteralReference` — type marker

### `regex.ts` — regex compilation
- `schemaToRegex(schema)` — convert a Valibot primitive to its matching regex
- `buildRegex(parts)` — assemble TL parts into one regex
- `buildExpects(parts)` — build human-readable "expected" string for error messages
- `escapeRegex(str)`
- `_introspectPipe(...)` — internal: traverse Valibot pipe stages
- **Pre-built primitive patterns** (regex constants):
  `BIGINT`, `BOOLEAN`, `CUID2`, `DECIMAL`, `HEXADECIMAL`, `INTEGER`, `IPV4`, `NANOID`, `NUMBER`, `OCTAL`, `SLUG`, `STRING`, `ULID`, `UUID`

### `infer.ts` — type-level only
- `InferTemplateLiteralParts<T>` — infer the resulting string template type from parts array
- `SchemaToTemplateLiteralString<T>` — convert a Valibot schema to its template literal type representation

## Patterns
- Pure-data: parts are an array of literals + schemas
- Regex compilation is automatic (`schemaToRegex` understands Valibot's pipe stages)
- Pre-built common patterns saves redefining regexes for UUIDs, ULIDs, etc.
- Type-level inference produces the correct template literal type for IDE autocomplete

## When to use
For string formats that are union-of-fixed-shapes — e.g. `"user_${UUID}"`, `"v${Semver}"`, `"${KebabCase}-${Int}"`. The schema validates AND the type inferred is the literal template type.
