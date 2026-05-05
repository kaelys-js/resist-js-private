# Code Conventions — what the 632 lint rules constrain

> Captured 2026-05-05. The custom `@/lint` runner (`resist-lint`, oxc-parser-based) enforces 632 rules across 18 categories. This memory distills the rules-that-constrain-new-code so a future session knows what to write WITHOUT reading every rule file.

The full rule directory inventory is in the `lint-system` memory. This memory captures the *behavioral constraints*.

## TIER 1 — Result pattern (mandatory project-wide)

### Errors flow through `Result<T>`, not exceptions
- `typescript/no-throw` — Forbids `throw` statements. Use `return err(ERRORS.X.Y, message)` instead.
  - Exception: line/block annotated with `// integration boundary: <reason>` comment allows `throw result.error` (re-throw preserving original) and `throw new Error(...)` (wrap with descriptive message). No other forms.
  - Exception: throws inside `v.check()`/`v.transform()`/`v.rawCheck()` callbacks are allowed (Valibot pipeline catches them as validation failures).
- `typescript/no-empty-catch` — Empty catch blocks forbidden. Empty handlers hide errors. (Use `Result` instead.)
- `result/check-before-access` — Must check `if (!r.ok) return r;` before reading `r.data`.
- `result/no-ignore-result` — Result return values cannot be discarded (must be returned, awaited, or destructured).
- `result/no-redundant-ok-guard` — `if (r.ok)` check followed by ignored content.
- `result/no-result-fallback` / `result/no-ternary-fallback` — `r.ok ? r.data : default` is forbidden; use `unwrapOr(r, default)` or explicit narrowing branch.
- `result/require-ok-return` — Successful exits must return `ok(...)` or `okUnchecked(...)`.
- `result/require-result-type` — Function declarations that may fail must return `Result<...>`.
- `result/validate-function-input` — Function args must be validated (typically via `safeParse` or schema-validated parameters).

### Don't bypass schemas with bare `as` casts
- `typescript/no-bare-as-cast` — `x as Foo` is forbidden. Use `safeParse(FooSchema, x)`. Justified casts need `// cast safe: <reason>` comment (`typescript/require-const-comment`).

## TIER 2 — Files, names, structure

### File naming
- `naming/ts-file-kebab-case` — TypeScript files: `kebab-case.ts` / `kebab-case.test.ts` / `kebab-case.svelte.ts`.
- `naming/svelte-file-pascal-case` — Svelte components: `PascalCase.svelte`. Sub-components inside compound dirs use kebab (`dialog-content.svelte`).
- `typescript/require-svelte-ts-extension` — Pure-TS modules using runes need `.svelte.ts` extension.

### Identifier naming
- `naming/camel-case-vars` — Variables and functions: `camelCase`.
- `naming/pascal-case-types` — Types, interfaces, classes, components: `PascalCase`.
- `naming/constant-screaming-case` — `export const X = ...` constants: `SCREAMING_SNAKE_CASE` (frozen registries, defaults, magic numbers).

### Imports — strict layering
- `imports/no-default-exports` (or its equivalent — see lint catalog) — forbidden. Use named exports.
- `imports/no-relative-imports` — `../foo` blocked. Must use `@/` aliases (with rare blessed exceptions for adjacent files within a package).
- `imports/no-js-extension` — Import paths must NOT end in `.js` (we have `allowImportingTsExtensions: true`; use `.ts` or omit).
- `imports/no-barrel-files` — `index.ts` cannot re-export. Exception: blessed entry points only (e.g. `@/ui/index.ts`, `@/utils/core/index.ts` — see `WORKSPACE_RULE_DOMAINS` in cli-helpers.ts).
- `imports/no-reexport` — re-exporting from non-entry-point files breaks tree-shaking; forbidden outside the blessed barrels.
- `imports/no-raw-json` — JSON imports must go through validated loaders, not `import data from './foo.json'`.
- `imports/no-raw-node-imports` — `import 'node:fs'` etc. must go through `@/utils/core/node-imports` (which lazy-loads + Result-wraps).
- `imports/require-import-groups` — Import statements grouped/sorted (external → `@/` → `$lib` → relative).

## TIER 3 — TypeScript primitives

### Use the project's branded primitives, not built-ins
- `typescript/no-bare-data-types` — primitives (`string`/`number`/`boolean`) should be `Str`/`Num`/`Bool` from `@/schemas/common`.
- `typescript/no-builtin-types` — same idea, broader: bare `Function`, `Object`, etc. forbidden.
- `typescript/no-generic-function-type` — bare `Function` type forbidden; use `FnType<TArgs, TReturn>` or `functionSchema<...>()`.
- `typescript/no-union-null` — `T | null` discouraged in unions; use `NullableX` schemas (e.g., `NullableStr` instead of `string | null`).
- `typescript/no-union-params` — function parameters should be a single shape (use schema-validated options object instead of `(a: A | B) => ...`).
- `typescript/require-non-negative-integer` — counters/indices/sizes must use `NonNegativeInteger` (branded `v.integer() ≥ 0`).

### Type annotations and returns
- `typescript/require-return-type` — explicit return type annotations required on every function.
- `typescript/require-type-annotation` — explicit type annotations required on declarations (no inference for public surfaces).

### Function parameters
- `typescript/no-default-params` — default parameter values forbidden. Pass an explicit options object whose schema declares defaults via `v.optional(s, defaultValue)`.

### Module-level side effects
- `typescript/no-module-side-effects` — top-level statements with side effects forbidden. Exception: `*-init.test.ts` test files explicitly verify init-time behavior.
- `typescript/lint-embedded-strings` — embedded strings (e.g. inside arrays/objects) must conform to template-literal schemas where applicable.
- `typescript/require-function-schema` — public exported functions need a documented function-schema reference (`@/schemas/function`).

## TIER 4 — Valibot conventions (~67 rules)

See `valibot-patterns` memory for full catalog. Highlights:

- `valibot/require-strict-object` — `v.strictObject(...)`, never `v.object()`.
- `valibot/colocate-schema-type` + `valibot/schema-type-pair` + `valibot/require-schema-suffix` — `FooSchema` and `Foo` live together, with that exact naming.
- `valibot/consistent-infer` — use `v.InferOutput`, never `v.InferInput` externally.
- `valibot/namespace-import` — `import * as v from 'valibot'`.
- `valibot/import-type-only` — type-only imports use `import type {...}`.
- `valibot/prefer-branded-types` — encourage `v.brand(...)` for semantic primitives.
- `valibot/prefer-picklist` — use `v.picklist([...])` over `v.union([v.literal(x), ...])`.
- `valibot/prefer-pipe` — chain transforms via `v.pipe(...)` rather than nested wrappers.
- `valibot/prefer-template-literal` — use `templateLiteral([...])` for `${T}-${U}` formats.
- `valibot/require-description` / `valibot/require-field-docs` — schemas need JSDoc; every `v.strictObject` field needs JSDoc.
- `valibot/no-zod` / `valibot/no-yup` / `valibot/no-joi` / `valibot/no-io-ts` / `valibot/no-class-validator` — alternative validators forbidden.
- `valibot/no-direct-safeparse` / `valibot/no-parse` — must go through `safeParse` from `@/utils/result/safe`.
- `valibot/no-recursive-without-lazy` — recursive schemas need `v.lazy(() => ...)`.
- `valibot/one-schema-per-file` — single primary schema per file (with exceptions for compositions).
- `valibot/no-mutate-after-parse` / `valibot/readonly-parse-result` — `Result.data` is frozen; treat as readonly.
- `valibot/type-alias-from-schema` — `type Foo = v.InferOutput<typeof FooSchema>` only — no manual `type Foo = {...}` for shapes that have a schema.

## TIER 5 — Svelte 5 (~18 rules)

See `svelte-conventions` memory for full pattern. Constraint highlights:

- `svelte5/no-create-event-dispatcher` — use callback props, not events.
- `svelte5/no-legacy-event-handlers` — `onclick={...}` (NOT `on:click={...}`).
- `svelte5/no-legacy-props` — `$props()` (NOT `export let`).
- `svelte5/no-legacy-reactive-statements` — `$derived` (NOT `$:`).
- `svelte5/no-legacy-slots` — snippets `{#snippet}` (NOT `<slot>`).
- `svelte5/no-effect-mutation` — never mutate `$state` from inside `$effect`.
- `svelte5/no-state-in-module-context` — `$state` in `<script module>` blocks forbidden (would leak across instances).
- `svelte5/prefer-derived-by` / `svelte5/prefer-derived-over-effect` — derive don't effect.
- `svelte5/require-bindable-for-bind` — props consumed via `bind:` must be declared `$bindable()`.
- `svelte5/require-each-key` — `{#each items as item (key)}` keys required.
- `svelte5/require-snippet-typing` — explicit `Snippet<...>` types in `$props`.
- `svelte5/component-naming` — component file matches PascalCase identifier.

## TIER 6 — Workspace + package hygiene

### `package/*` rules
- `package/names-valid` — `@/*` for shared (private), `@<scope>/<name>` for products.
- `package/require-readme` — every package has README.md.
- `package/require-scope` — packages need a scope (no bare `name`).
- `package/require-shared-config` — packages must use shared tooling configs.
- `package/no-tsc-dependency` — stock `typescript` not a runtime dep; use `tsgo` (`@typescript/native-preview`).
- `package/require-tsgo` — packages use tsgo via shared config root.
- `package/no-git-deps` / `package/no-tarball-deps` / `package/no-workspace-dep` — only registry deps + `workspace:*` for internal.
- `package/require-standard-scripts` — standard `dev`/`build`/`qa:test` etc. scripts present.
- `package/no-vitest-config` — packages use root `vitest.config.ts` projects (with `@/cli` exception).
- `package/no-ts-node` — ts-node forbidden; use `tsx` via `node --import`.
- `package/sort-package-json` — package.json fields sorted.
- `package/no-raw-json` — package.json edits via tooling.

### `workspace/*` rules (largest category)
Hundreds of rules. Highlights:
- `workspace/no-debug-statements` — `console.log`/`console.debug`/`debugger` forbidden in source.
- `workspace/no-skipped-tests` — `.skip`/`.todo`/`xit` test markers forbidden.
- `workspace/no-todo-comments` — `TODO`/`FIXME` in code forbidden (use issue tracker).
- `workspace/no-cross-product-imports` — `@/products/<a>` cannot import from `@/products/<b>`.
- `workspace/no-cross-layer-imports` — UI cannot import server code, etc.
- `workspace/no-deep-relative-shared-imports` — must use `@/` aliases for shared package access.
- `workspace/no-hardcoded-localhost-ports` / `workspace/no-hardcoded-urls` / `workspace/no-hardcoded-ips` — config-driven URLs.
- `workspace/sync-tsconfig-paths` / `workspace/sync-pnpm-workspace` / `workspace/sync-turbo-tasks` / `workspace/sync-onboarding-steps` — keep auto-generated config in sync with source of truth.
- `workspace/sync-filter-patterns` — `qa:test` filter list at root must match package set.
- `workspace/validate-tsconfig-path-aliases` / `workspace/tsconfig-paths-resolve` — every alias resolves to a real file.
- `workspace/validate-monorepo-layout` — `packages/{shared,products,products-template}/...` layout enforced.
- `workspace/no-orphaned-ts-files` — every `.ts` source has a sibling test or is referenced.

### `comments/*` rules
- `comments/no-lint-disable` — `// oxlint-disable` / `// biome-ignore` / `// eslint-disable` forbidden in source. Use `.oxlintrc.json` overrides instead (which require explicit per-edit approval — see `.claude/hooks/pre-edit-lint-config-deny.sh`).
- `comments/require-blank-line-groups` — JSDoc blocks separated by blank lines.
- `comments/require-section-marker-style` / `comments/require-section-order` — file-level section comments use specific ASCII art format.

### `directives/*` rules
- `directives/max-suppressions-per-file` — enforces a cap on lint-disable directive density.
- `directives/no-biome-ignore` — biome ignore directives forbidden.

### `hygiene/*` rules
- `hygiene/no-bare-catch` — `catch (e)` should be `catch (e: unknown)` (or use Result).
- `hygiene/no-dead-locale-keys` — every key in a locale schema must be used somewhere.
- `hygiene/no-orphaned-exports` — every export must be imported elsewhere (knip-driven).
- `hygiene/no-duplicate-function-signatures` — no overload conflicts.

### `jsdoc/*` rules
- `jsdoc/require-jsdoc` — every public function/type/constant has JSDoc.
- `jsdoc/require-module` — every file has `@module` JSDoc tag.
- `jsdoc/require-param` — every parameter documented.
- `jsdoc/require-returns` — return values documented.
- `jsdoc/require-example` — public APIs include `@example` blocks.
- `jsdoc/param-type-match` — JSDoc types match TS types.
- `jsdoc/require-schema-link` — types derived from schemas must `@see {@link FooSchema}`.

## TIER 7 — Primitives (math, dates, strings)

The `primitives/*` category catches subtle correctness bugs:
- `primitives/division-by-zero`, `primitives/no-modulo-negative` — math safety
- `primitives/no-float-equality` — `===` on floats is unreliable
- `primitives/no-infinity-arithmetic`, `primitives/no-unsafe-integer`, `primitives/no-bigint-number-mix`
- `primitives/no-array-hole`, `primitives/no-array-length-mutation`, `primitives/no-array-index-string`
- `primitives/no-date-arithmetic`, `primitives/no-date-mutation`, `primitives/no-new-date-string-parse` — Date is treacherous
- `primitives/no-string-index-unicode`, `primitives/no-string-length-unicode` — Unicode gotchas
- `primitives/no-json-bigint`, `primitives/no-json-circular`, `primitives/no-json-nan-infinity`, `primitives/no-json-undefined` — JSON safety
- `primitives/no-math-random-crypto` — `Math.random()` not for crypto; use `crypto.randomUUID()` etc.
- `primitives/no-regex-on-untrusted` — regex DoS prevention
- `primitives/use-number-is-finite` / `use-number-is-integer` — prefer specific `Number.isX` over global.

## TIER 8 — Testing

- `testing/require-colocated-tests` — `foo.ts` + `foo.test.ts` in same directory.
- `testing/require-test-suffix` — test files end in `.test.ts` (or `.spec.ts`).
- `testing/require-e2e-location` — Playwright suites under `e2e/`.
- `testing/require-integration-location` — `*.integration.test.ts` for cross-module tests.
- `testing/multi-export-fixture` / `testing/named-export-fixture` — fixture export patterns.

## TIER 9 — Plans / VSCode / Locale-specific rules

- `plans/files-exist`, `plans/no-empty-plan-sections`, `plans/no-incomplete-tasks` — for `docs/plans/*.md` markdown discipline.
- `vscode/no-hardcoded-brand` — `'resist'`/`'@resist/vscode'` strings centralized in `BINARY_NAME`/`COMMANDS` constants from `shared/brand.ts`.
- `vscode/no-unlocalized-strings` — VS Code extension strings localized via `format(en.x.y, {values})`.

## What this means for new code

A senior engineer writing new code in this repo should:

1. **Never throw.** Return `Result<T>`. Bubble errors with `if (!r.ok) return r;`.
2. **Define a schema first**, then derive the type via `v.InferOutput<typeof Schema>`.
3. **Brand semantically distinct primitives** — paths, IDs, versions, etc.
4. **No bare casts.** `as Foo` requires `// cast safe: <reason>`. Prefer `safeParse(FooSchema, x)`.
5. **Use `@/...` path aliases.** Never relative imports across packages.
6. **No barrel files** except blessed entry points.
7. **Svelte 5 runes only.** `$state`, `$derived`, `$effect`, `$props()`, `$bindable()`. No `export let`, `on:click`, `<slot>`, `$:`.
8. **Stores in `.svelte.ts` files.** `createX/initX/useX` singleton trio.
9. **Two scripts in components:** `<script module>` for re-exports, `<script>` for instance logic.
10. **JSDoc everything public.** `@module`, `@param`, `@returns`, `@example`, `@see {@link Schema}`.
11. **Tests colocated** as `foo.test.ts` next to `foo.ts`.
12. **No `console.log`/`debugger`.** Use the structured logger.

## Lint enforcement infrastructure

- Runner: `pnpm qa:lint` → `@/lint` CLI under `node --import register-aliases.mjs`.
- Cache: `LintCache` in `framework/cache.ts` (file-fingerprint based).
- Workers: `WorkerPool` parallel rule execution.
- IDE: `@resist/vscode` extension surfaces diagnostics live with code actions.
- Config: `.resist-lint.jsonc` (JSON Schema generated from `LintConfigSchema`).
- Approval gates: rule-disable changes need `.claude/approved-lint-disable` marker (consumed once per edit). See `.claude/hooks/pre-edit-lint-config-deny.sh`.
