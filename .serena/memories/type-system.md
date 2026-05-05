# Type System — cross-cutting

> Captured 2026-05-05. TypeScript ES2024 with `strict`/`noUncheckedIndexedAccess`/`isolatedModules`/`verbatimModuleSyntax`/`allowImportingTsExtensions`. Replaces stock `tsc` with `tsgo` (`@typescript/native-preview`). Types flow through Valibot schemas — `v.InferOutput<typeof FooSchema>` is the canonical source.

## tsconfig.json (root)

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "paths": { ... }   // 30+ path aliases (see below)
  },
  "exclude": ["node_modules", "dist", ".svelte-kit", "_INTEGRATE"]
}
```

Critical flags:
- **`isolatedModules: true`** — every file must be independently compilable (no namespace/declaration merging across files).
- **`verbatimModuleSyntax: true`** — `import type {...}` required for type-only imports; otherwise the import is preserved at runtime.
- **`noUncheckedIndexedAccess: true`** — `arr[i]` is `T | undefined`, `obj[key]` is `T | undefined`. Forces explicit handling.
- **`allowImportingTsExtensions: true` + `noEmit: true`** — `.ts` extensions allowed in imports; compilation is bundler-driven (Vite, esbuild). Lint rule `imports/no-js-extension` blocks `.js` extensions.
- **`exclude: ["_INTEGRATE"]`** — large external scratch dir excluded from typecheck.

## Path aliases (root tsconfig.json:22-58)

All `@/...` imports mapped to source paths (NOT compiled output). The ~30 mappings:

| Alias | Maps to |
|-------|---------|
| `@/schemas/common` | `./packages/shared/schemas/common/src/index.ts` |
| `@/schemas/result` | `./packages/shared/schemas/result/src/result.ts` |
| `@/schemas/result/*` | `./packages/shared/schemas/result/src/*.ts` |
| `@/schemas/function` | `./packages/shared/schemas/function/src/function.ts` |
| `@/schemas/function/*` | `./packages/shared/schemas/function/src/*.ts` |
| `@/schemas/generic/*` | `./packages/shared/schemas/generic/src/*.ts` |
| `@/schemas/template-literal/*` | `./packages/shared/schemas/template-literal/src/*.ts` |
| `@/schemas/core-config/*` | `./packages/shared/schemas/core-config/src/*.ts` |
| `@/utils/result/*` | `./packages/shared/utils/result/src/*.ts` |
| `@/utils/core` / `@/utils/core/*` | `./packages/shared/utils/core/src/[index|*].ts` |
| `@/utils/beacon/*` / `@/utils/web-vitals/*` / `@/utils/devtools/*` | each package's `src/*.ts` |
| `@/locale/*` / `@/locale/svelte` | `./packages/shared/locale/src/*.ts` (svelte → `svelte.svelte.ts`) |
| `@/config/*` / `@/config/core/*` | `./packages/shared/config/core/src/*.ts` |
| `@/config/tooling/{vite,svelte}` | factories |
| `@/config/tooling/vite/lazy-plugin` / `template-html` | individual plugin exports |
| `@/test-presets/*` / `@/test-presets/harness/*` | preset+harness |
| `@/ui` / `@/ui/*` | UI package (folder-based imports) |
| `@/secrets/infisical` / `@/secrets/infisical/*` | infisical wrapper |
| `@/products/*` | `./packages/products/*` (path-mapping shim) |
| `@/lint/*` | `./packages/shared/config/tooling/lint/src/*` |

Vitest mirrors these via `vite-tsconfig-paths` plus `sharedPathAliases` in `vitest.config.ts:17` (for Svelte test compile output). Lint rule `imports/no-relative-imports` blocks `../` imports — must use `@/` aliases (with rare blessed exceptions for adjacent files within a package).

## Primitive aliases (`@/schemas/common/src/index.ts`)

Every primitive has a Valibot schema **and** an inferred type:

| Type | Schema | Definition |
|------|--------|------------|
| `Str` | `StrSchema` | `v.string()` |
| `Bool` | `BoolSchema` | `v.boolean()` |
| `Num` | `NumSchema` | `v.number()` |
| `Void` | `VoidSchema` | `v.undefined()` |
| `Never` | `NeverSchema` | `v.never()` |
| `StrArray` | `StrArraySchema` | `v.array(StrSchema)` |
| `Path` | `PathSchema` | `v.pipe(v.string(), v.minLength(1), v.brand('Path'))` |
| `UrlString` | `UrlStringSchema` | `v.pipe(v.string(), v.url(), v.brand('UrlString'))` |
| `Filename` | `FilenameSchema` | `v.pipe(v.string(), v.minLength(1), v.regex(/^[^/\\]+$/), v.brand('Filename'))` |
| `Email` | `EmailSchema` | `v.pipe(v.string(), v.email(), v.brand('Email'))` |
| `Uuid` | `UuidSchema` | `v.pipe(v.string(), v.uuid(), v.brand('Uuid'))` |
| `IsoTimestamp` | `IsoTimestampSchema` | ISO 8601 |
| `Semver` | `SemverSchema` | regex |
| `GitBranch` / `GitCommitShort` / `GitCommitFull` | each branded |
| `NonNegativeInteger` | branded `v.integer() ≥ 0` |
| `PositiveInteger` | branded `v.integer() ≥ 1` |
| `NonNegativeNumber` | branded `≥ 0` (may be fractional) |
| `LocaleString` | non-empty branded string for i18n strings |

**Branded types** (via `v.brand(...)`) are nominally distinct: `Path`, `Email`, `UUID`, `Filename`, `Semver` are all string-shaped at runtime but cannot be implicitly assigned to one another. Lint rule `valibot/prefer-branded-types` encourages branding any string/number with semantic meaning.

## Nullable vs Optional families

For each primitive, `@/schemas/common` exports three versions:
- `XSchema` / `X` — base
- `NullableXSchema` / `NullableX` — `v.nullable(XSchema)` → `X | null`
- `OptionalXSchema` / `OptionalX` — `v.optional(XSchema)` → `X | undefined`

Examples: `NullableStr`/`OptionalStr`, `NullableBool`/`OptionalBool`, `NullableNum`/`OptionalNum`, `NullableStrArray`/`OptionalStrArray`.

**Convention**:
- `nullable` for "field exists but may be null" (e.g., `userAvatar: NullableStr`)
- `optional` for "field may be absent entirely" (e.g., `meta?: ErrorMeta`)

Lint rule `valibot/no-nested-optional` and `valibot/explicit-undefined` enforce consistent usage. Rule `typescript/no-union-null` discourages bare `T | null` types — use `NullableX` instead.

## DeepReadonly

Defined twice (intentionally — to avoid circular dependency):

**Canonical**: `packages/shared/utils/core/src/object.ts:44`
```typescript
export type DeepReadonly<T> =
  T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>>
  : T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>>
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
```

**Inlined leaf copy**: `packages/shared/schemas/result/src/result.ts:89`
- Adds `T extends (...args: never[]) => unknown ? T : ...` (preserves function types)
- Adds `T extends string | number | boolean | bigint | symbol ? T : ...` (preserves primitives)
- Inlined because `@/schemas/result` is a leaf package; importing from `@/utils/core` would create a cycle.

`Result<T>`'s `data` field is `DeepReadonly<T>` — `result.ok` Ok values are deep-frozen at construction (via `_deepFreeze`). Consumers must treat data as frozen. Lint rule `valibot/readonly-parse-result` blocks mutations.

`deepFreeze` and `deepMerge` (runtime helpers) live in `@/utils/core/object`.

## Schema-to-type pattern (universal)

```typescript
import * as v from 'valibot';

export const FooSchema = v.strictObject({
  name: v.pipe(v.string(), v.minLength(1)),
  count: v.optional(NumSchema, 0),
});

export type Foo = v.InferOutput<typeof FooSchema>;
```

- **Always derive types from schemas** — never write `type Foo = { name: string; count?: number }` manually. Lint rule `valibot/type-alias-from-schema` enforces this.
- **Naming**: `FooSchema` + `Foo`. Lint rules `valibot/require-schema-suffix` + `valibot/colocate-schema-type` + `valibot/schema-type-pair`.
- **Use `v.InferOutput`**, never `v.InferInput` for downstream types — `valibot/consistent-infer`. (Output types reflect post-transform values; Input is the raw shape.)
- **Schemas are exported alongside types** — `valibot/export-schema-and-type`.

## Function schemas (`@/schemas/function`)

Function signatures can be runtime-validated:
```typescript
const parseAndCount = v.pipe(
  functionSchema(),
  args(v.tuple([v.string()])),
  arity(1),
  returns(v.number()),
  implement((s) => s.length),
);
```

- `functionSchema<TArgs, TReturn>()` — runtime check `typeof val === 'function'`, rejects classes (via `val.toString().startsWith('class ')`).
- `args(...)` declares positional arg schemas; `arity(n)` fixes arity; `returns(...)` declares return-value schema.
- `implement(impl)` attaches a concrete implementation, automatically wrapped with input/output validation.
- `createWrapper(...)` builds the runtime-validating wrapper. `getWrapperMeta(wrappedFn)` retrieves args/returns schemas via `WRAPPER_SYMBOL`.
- `ErrorMode` controls behavior on validation failure (throw vs return Err Result).
- `_toBaseSchema(...)`, `_toFnType(...)` — internal type-erasure helpers.

Lint rule `typescript/require-function-schema` requires public exported functions to have a documented function-schema reference. Rule `valibot/validate-function-output` requires schema-validated outputs at function boundaries.

## Source-injected globals

Build tooling injects compile-time constants. Declared in `packages/shared/utils/core/src/build-globals.d.ts`:

```typescript
declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;
declare const __GIT_COMMIT_FULL__: string;
declare const __GIT_BRANCH__: string;
declare const __GIT_DIRTY__: string;
declare const __BUILD_TIMESTAMP__: string;

declare global {
  var __APP_VERSION__: string;
  // ... same six
}

export type BuildGlobalKey = '__APP_VERSION__' | '__GIT_COMMIT__' | '__GIT_COMMIT_FULL__'
  | '__GIT_BRANCH__' | '__GIT_DIRTY__' | '__BUILD_TIMESTAMP__';
```

Replaced at build time:
- **Vite**: `define` in `vite.config.ts` (via `@/config/tooling/vite`'s `jsonDefine` helper).
- **Vitest**: `define` in root `vitest.config.ts` — also provides test values to all 24 vitest projects.

Used by every consuming product/package (storylyne `hooks.client.ts` reads `__APP_VERSION__` for setupGlobalErrorHandling tags, `__GIT_BRANCH__` for source-map fetching, `__GIT_COMMIT__` for X-Git-Commit response header).

## How types flow between packages

1. **Schemas/types defined inline alongside usage** — schema-first, then `type X = v.InferOutput<typeof XSchema>`.
2. **Path aliases (`@/...`)** resolve to source `.ts` files (not compiled output) — possible because `allowImportingTsExtensions: true` and bundler-mode resolution.
3. **No barrel files except blessed entry points** — lint rule `imports/no-barrel-files` blocks `index.ts` re-exports (with explicit exceptions per `WORKSPACE_RULE_DOMAINS`).
4. **`verbatimModuleSyntax`** — every type-only import must use `import type` syntax.
5. **`isolatedModules`** — each `.ts` file compiles independently; no cross-file declaration merging.
6. **No re-exports** (`imports/no-reexport`) — re-exporting from non-entry-point files breaks tree-shaking and creates dependency confusion.

## Type-related lint rules

- `typescript/no-bare-as-cast` — `x as Foo` is forbidden; use `safeParse(FooSchema, x)` or branded constructors. Justified casts need `// cast safe: <reason>` comment (rule `typescript/require-const-comment`).
- `typescript/no-bare-data-types` — primitives like `string`/`number`/`boolean` should use `Str`/`Num`/`Bool` from `@/schemas/common`.
- `typescript/no-builtin-types` — same idea: use the project's branded primitives.
- `typescript/no-default-params` — default parameter values forbidden; pass an explicit schema-validated options object.
- `typescript/no-empty-catch` — empty catch blocks forbidden.
- `typescript/no-generic-function-type` — bare `Function` type forbidden; use `FnType<TArgs, TReturn>` or `functionSchema`.
- `typescript/no-module-side-effects` — top-level statements with side effects forbidden (except a few module-init test files marked with `*-init.test.ts`).
- `typescript/no-throw` — throws forbidden (must return `err()`); see error-handling memory.
- `typescript/no-union-null` — `T | null` discouraged in unions; use `NullableX` schemas.
- `typescript/no-union-params` — function parameters should be a single shape (use schema-validated options object).
- `typescript/require-const-comment` — `const X: Y = ...` casts need a justification.
- `typescript/require-non-negative-integer` — counters/indices/sizes must use `NonNegativeInteger`.
- `typescript/require-return-type` — explicit return type annotations required.
- `typescript/require-svelte-ts-extension` — `.svelte.ts` extension required for runes-using non-component modules.
- `typescript/require-type-annotation` — explicit type annotations required on declarations (no inference).

## tsgo (`@typescript/native-preview`)

Replaces stock `tsc` for typechecking. Faster (Go-native). Per-package `qa:checks` runs `pnpm --filter @/cli tool checks --cwd .` which delegates to `tsgo -p ./` (configured via `@/config/tooling/lint/src/tools/tsgo.ts`). Root `pnpm qa:lint` runs the `@/lint` CLI (which orchestrates tsgo, oxlint, biome, svelte-check, etc.).

Lint rule `package/no-tsc-dependency` forbids stock `typescript` as a runtime dep — devDep only via `tsgo`.
Lint rule `package/require-tsgo` requires every package's tsconfig to use tsgo via the shared config root.

## Why this layout

- **Schema-first prevents "drift"** — type and runtime validation can't diverge because the type is derived from the schema.
- **Branded primitives prevent semantic confusion** — `Path` vs `Email` vs `Filename` are nominally distinct strings.
- **`Result<T>` everywhere prevents the throw/catch antipattern** — signature transparency: every caller sees what can fail.
- **Path aliases instead of relative imports** — refactors don't break imports; package boundaries are explicit.
