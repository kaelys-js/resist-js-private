# `@/schemas/common` — packages/shared/schemas/common

The root primitives library. Single-file Valibot schema collection (3,766 lines in `src/index.ts`) — every other schemas package builds on this.

## Package
- **Name**: `@/schemas/common` (private)
- **Vitest project**: `schemas-common`
- **Single file in `src/`**: `index.ts` + `index.test.ts` — no submodules

## File structure
```
src/
  index.ts        ← THE schema barrel (3766 lines, hundreds of exports)
  index.test.ts
```

## Exported categories (sample — full list is enormous)

### Path / file
- `Path`, `AbsolutePath`, `RelativePath`
- `MimeType`, `FileExtension`
- `RegexPattern`, `GlobPattern`

### Network
- `Email`, `UUID`, `JWT`, `Hostname`, `Port`, `IPv4`
- `HttpMethod`, `HttpStatusCode`
- `OpenGraphType`, `RobotsDirective`

### Color
- `HexColor`, `HslColor`

### i18n / locale
- `BCP47Tag`, `LanguageCode`, `CountryCode`, `CurrencyCode`

### Versioning / git
- `Semver`, `GitBranch`, `GitCommitShort`, `GitCommitFull`, `NpmPackageName`

### Casing / strings
- `KebabCase`, `CamelCase`, `Slug`
- Constants: `KEBAB_CASE_REGEX`, `SEMVER_REGEX`

### Hashes
- `HashMd5`, `HashSha256`, `HashSha512`

### Agent / provider (CI / runtime detection)
- `AgentDefinition`, `AgentInfo`, `AgentKind`
- `ProviderDefinition`, `ProviderInfo`, `ProviderKind`, `ProviderEnvCheck`, `ProviderPRCheck`
- `RuntimeInfo`, `RuntimeKind`

### Environment
- `EnvRecord` (variants: nullable/optional)

### Logging
- `LogContext`, `LogEntry`, `LogLevel`, `LogMessage`

### Product metadata
- `ProductName`, `Description`, `Title`, `Comment`, `Summary`, `Content`, `Tag`
- `FeatureFlag`

### Number variants
- `NumSchema`, `Int`, `NonNegative`, `Positive`, `UnitInterval`

### Generic primitive families (each has nullable/optional variants)
- `Bool`, `Str`, `Path`, `StrArray` (with `Nullable` and `Optional` suffixes)

### JSON
- `JsonString`, `JsonData`

### CLI / output
- `OutputFormat`, `PrintStream`, `StdioOption`

### Errors (cross-cutting)
- `ErrorCode`, `ErrorMeta`

### Process lifecycle
- `FatalExit`, `Cleanup`, `Interrupt`, `Teardown` handler schemas

### CLI defaults
- `DEFAULT_*` constants for CLI flag defaults

## Patterns
- **Everything in one file** — single barrel deliberately (avoids fragile cross-imports)
- Variant explosion: every base schema has Nullable/Optional/Array variants exported as separate names
- Constants (regexes, defaults) co-located with the schemas that use them
- All other `@/schemas/*` packages depend on this one

## How to find a schema
This is the FIRST place to look for any primitive. Use:
```
mcp__serena__find_symbol name_path_pattern="<SchemaName>" relative_path="packages/shared/schemas/common/src/index.ts"
```

## Why no submodules
Splitting would force consumers to know which submodule a primitive lives in. Keeping it flat means `import { X } from '@/schemas/common'` always works.
