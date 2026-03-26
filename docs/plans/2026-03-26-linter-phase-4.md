# @/lint Phase 4 — Rule Expansion, Oxlint Unification, Config Linting

**Date**: 2026-03-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Reference**: `_INTEGRATE/linter/linter-test/scripts/rules/` (checks/ + typescript/valibot/)

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 1478 pass / 0 fail |
| Test files | 22 |
| Custom rules | 77 (across 10 categories) |
| External tools | 112 (in tools/registry.ts) |
| Reference checks rules | 5 total, 3 already ported |
| Reference valibot rules | 67 total, ~10 already ported/equivalent |
| Type-check | Passes |
| Format | Clean |
| Oxlint in @/lint | 0 errors |
| qa:lint | Runs oxlint + resist-lint separately |

---

## TASK E — Verify Tool Test Coverage

**Status**: [x] — Verified: 112 tools in registry, 111 have both good-output and bad-output transform tests. Only `vbTool` lacks a true bad-output test — it's an intentional placeholder (`isAvailable: () => false`, transform always returns `[]`). No gaps to fill.

**Gap**: Need to confirm all 112 tools in `tools/registry.ts` have matching tests in `tools/tools.test.ts` with both good-output (clean → empty) and bad-output (errors → non-empty) coverage.

**Plan**:
- Cross-reference every tool name in `ALL_TOOLS` array against test file `describe()` blocks
- Verify each has a good-output test and a bad-output test
- Fill any gaps found

**Files**: `tools/registry.ts` (read), `tools/tools.test.ts` (read, possibly modify)

**Verification**: All 112 tools confirmed tested

---

## TASK A — Port Reference Checks Rules (2 new rules)

**Status**: [x] — Both rules created, tested (17 tests), registered in `.resist-lint.jsonc`. QA clean. 1495 tests pass.

**Gap**: The reference linter at `_INTEGRATE/linter/linter-test/scripts/rules/checks/` has 5 check rules. Three are already ported:
- `safety/no-merge-conflicts` → `workspace/no-merge-conflicts` ✅
- `safety/no-crlf` → `workspace/no-crlf` ✅
- `hygiene/no-empty-files` → `workspace/no-empty-files` ✅

Two are missing:
- `package/names-valid` — validates package.json `name` fields across workspace
- `pnpm/workspace-valid` — validates pnpm-workspace.yaml structure

**Plan**:

### A.1: Create `rules/package/names-valid.ts`
- WorkspaceRule (needs cross-package duplicate detection)
- Uses `ctx.getWorkspacePackages()` to iterate all packages
- Checks: name exists, is string, is non-empty, matches npm naming pattern (`^(@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*$`), no duplicates
- Diagnoses specific issues: uppercase, leading dots/underscores, spaces, invalid chars
- Error severity for all violations

### A.2: Create `rules/workspace/workspace-valid.ts`
- WorkspaceRule checking `pnpm-workspace.yaml` at workspace root
- Checks: file exists, valid YAML, `packages` field present, is non-empty array, each entry is a string
- Error severity for structural issues

### A.3: Add tests
- `package-rules.test.ts`: tests for names-valid (missing name, non-string, empty, invalid pattern, duplicates, valid name)
- `workspace/workspace-rules.test.ts`: new test file for workspace-valid (missing file, missing packages, empty array, valid workspace)

### A.4: Register & configure
- Rules auto-loaded by `rule-loader.ts` (no manual registry needed)
- Add `"package/names-valid": "error"` and `"workspace/workspace-valid": "error"` to `.resist-lint.jsonc`

**Files**: `rules/package/names-valid.ts` (new), `rules/workspace/workspace-valid.ts` (new), `rules/package/package-rules.test.ts` (modify), `rules/workspace/workspace-rules.test.ts` (new), `.resist-lint.jsonc` (modify)

**Verification**: `pnpm -r --filter @/lint run qa:type-check && pnpm -w exec vitest run --project lint && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## TASK B — Port Reference Valibot Rules (56 new rules)

**Gap**: The reference linter at `_INTEGRATE/linter/linter-test/scripts/rules/typescript/valibot/` has 67 rule files. ~10 have equivalents in resist-lint already:

| Reference Rule | Existing Equivalent |
|----------------|-------------------|
| `namespace-import` | `valibot/namespace-import` |
| `require-min-length` | `valibot/require-min-length` |
| `no-unsafe-parse` | `valibot/no-parse` |
| `schema-naming` | `valibot/require-schema-suffix` |
| `strict-objects` | `valibot/require-strict-object` |
| `handle-parse-errors` | `result/check-before-access` |
| `handle-result` | `result/check-before-access` |
| `no-ignore-result` | `result/no-ignore-result` |
| `require-result-type` | `result/require-result-type` |
| `validate-function-input` | `result/validate-function-input` |

Plus `valibot-types.ts` is a helper file, not a rule. That leaves **56 new rules** to port.

All new rules are TypeScriptRules with AST visitors. They go in `rules/valibot/`. Tests go in `rules/valibot/valibot-rules.test.ts`.

---

### TASK B1 — Schema Structure & Naming (8 rules)

**Status**: [x] — 8 rules created, 40 tests added (1535 total). QA clean.

**Rules**:
1. `valibot/colocate-schema-type` — Schema and its `v.InferOutput` type alias must be in the same file. Visitor: `Program` — collects schema definitions and type aliases, flags types referencing schemas in other files.
2. `valibot/export-schema-and-type` — If a schema is exported, its type must also be exported. Visitor: `Program` — checks exported schemas have matching exported types.
3. `valibot/no-orphan-schemas` — Every exported schema must have a corresponding exported type alias. Visitor: `Program` — finds schemas without matching `type X = v.InferOutput<typeof XSchema>`.
4. `valibot/no-orphan-types` — Type aliases should have corresponding Valibot schemas for runtime validation. Visitor: `TSTypeAliasDeclaration` — flags types without schemas.
5. `valibot/one-schema-per-file` — Files with >3 schema definitions should be split. Visitor: `Program` — counts schema definitions.
6. `valibot/schema-file-location` — Schemas should live in `schemas/` directories or `*.schema.ts` files. Visitor: `Program` — checks file path pattern.
7. `valibot/schema-type-pair` — Every `XxxSchema` must have `type Xxx = v.InferOutput<typeof XxxSchema>`. Visitor: `Program` — strict naming convention check.
8. `valibot/type-alias-from-schema` — Type aliases must be derived via `v.InferOutput`/`v.InferInput`. Visitor: `TSTypeAliasDeclaration` — bans hand-written type literals.

**Files**: 8 new files in `rules/valibot/`, tests in `valibot-rules.test.ts`

**Verification**: QA pass (type-check, test, lint, format)

---

### TASK B2 — Import & Export Hygiene (6 rules)

**Status**: [x] — 6 rules created, tests added. QA clean.

**Rules**:
1. `valibot/consistent-infer` — Use `v.InferOutput` consistently; `v.InferInput` only when intentional. Visitor: `TSTypeAliasDeclaration`.
2. `valibot/import-type-only` — Use `import type` for type-only Valibot imports. Visitor: `ImportDeclaration`.
3. `valibot/no-inline-infer` — Don't use `v.InferOutput<>` inline in signatures — declare a type alias. Visitor: `VariableDeclaration`, `FunctionDeclaration`.
4. `valibot/no-omit-pick-infer` — Don't use `Omit`/`Pick` on inferred types — use schema composition. Visitor: `TSTypeAliasDeclaration`.
5. `valibot/no-partial-infer` — Don't use `Partial<v.InferOutput<...>>` — use `v.partial()`. Visitor: `TSTypeAliasDeclaration`.
6. `valibot/no-reexport-infer` — Don't re-export `v.InferOutput` — export concrete types. Visitor: `ExportNamedDeclaration`.

**Files**: 6 new files in `rules/valibot/`, tests in `valibot-rules.test.ts`

**Verification**: QA pass

---

### TASK B3 — Ban Competing Libraries (5 rules)

**Status**: [x] — 5 rules created, tests added. QA clean.

**Rules**:
1. `valibot/no-class-validator` — Bans `class-validator`/`class-transformer` imports. Visitor: `ImportDeclaration`.
2. `valibot/no-io-ts` — Bans `io-ts` imports. Visitor: `ImportDeclaration`.
3. `valibot/no-joi` — Bans `joi` imports. Visitor: `ImportDeclaration`.
4. `valibot/no-yup` — Bans `yup` imports. Visitor: `ImportDeclaration`.
5. `valibot/no-zod` — Bans `zod` imports. Visitor: `ImportDeclaration`.

**Files**: 5 new files in `rules/valibot/`, tests in `valibot-rules.test.ts`

**Verification**: QA pass

---

### TASK B4 — Schema Definition Anti-Patterns (12 rules)

**Status**: [ ]

**Rules**:
1. `valibot/no-any-schema` — Bans `v.any()` and `v.unknown()`. Visitor: `CallExpression`.
2. `valibot/no-duplicate-keys` — Detects duplicate property keys in object schemas. Visitor: `CallExpression`.
3. `valibot/no-empty-object` — Bans empty `v.object({})` / `v.strictObject({})`. Visitor: `CallExpression`.
4. `valibot/no-loose-tuples` — Enforces `v.strictTuple()` over `v.tuple()`. Visitor: `CallExpression`.
5. `valibot/no-manual-types` — Bans hand-written `TSTypeLiteral` for data shapes. Visitor: `TSTypeAliasDeclaration`.
6. `valibot/no-nested-optional` — Bans nested optional/nullable wrappers. Visitor: `CallExpression`.
7. `valibot/no-passthrough` — Bans `v.passthrough()`. Visitor: `CallExpression`.
8. `valibot/no-recursive-without-lazy` — Recursive schemas must use `v.lazy()`. Visitor: `VariableDeclaration`.
9. `valibot/consistent-nullability` — Enforces consistent optional/nullable within an object. Visitor: `CallExpression`.
10. `valibot/explicit-undefined` — Optional fields should provide defaults. Visitor: `CallExpression`.
11. `valibot/no-optional-heavy-object` — Warns when >70% of fields are optional. Visitor: `CallExpression`.
12. `valibot/no-schema-in-component` — Bans schema definitions in `.svelte` files. Visitor: `Program`.

**Files**: 12 new files in `rules/valibot/`, tests in `valibot-rules.test.ts`

**Verification**: QA pass

---

### TASK B5 — Validation & Parse Safety (11 rules)

**Status**: [ ]

**Rules**:
1. `valibot/await-async-parse` — `v.parseAsync()`/`v.safeParseAsync()` must be awaited. Visitor: `CallExpression`.
2. `valibot/no-fallback-required` — Bans `v.fallback()` on required schemas. Visitor: `CallExpression`.
3. `valibot/no-ignore-issues` — `safeParse` `.issues` must be used. Visitor: `VariableDeclaration`.
4. `valibot/no-type-cast-after-parse` — Bans `as` casts on parse results. Visitor: `TSAsExpression`.
5. `valibot/no-unsafe-coerce` — Bans `v.coerce()`. Visitor: `CallExpression`.
6. `valibot/readonly-parse-result` — Parse results should be treated as readonly. Visitor: `VariableDeclaration`.
7. `valibot/no-mutate-after-parse` — Bans assignment to parsed data. Visitor: `Program`.
8. `valibot/revalidate-on-change` — Re-validate after modifying parsed data. Visitor: `Program`.
9. `valibot/no-schema-in-loop` — Bans schema creation inside loops. Visitor: `CallExpression`.
10. `valibot/no-inline-error-message` — Bans inline string error messages. Visitor: `CallExpression`.
11. `valibot/validate-function-output` — Exported functions should validate return values. Visitor: `FunctionDeclaration`, `ExportNamedDeclaration`.

**Files**: 11 new files in `rules/valibot/`, tests in `valibot-rules.test.ts`

**Verification**: QA pass

---

### TASK B6 — Performance (3 rules)

**Status**: [ ]

**Rules**:
1. `valibot/discriminated-unions` — Use `v.variant()` for discriminated unions. Visitor: `CallExpression`.
2. `valibot/limit-union-size` — Warns when `v.union()` has >10 variants. Visitor: `CallExpression`.
3. `valibot/no-expensive-regex` — Warns about ReDoS-prone regex in `v.regex()`. Visitor: `CallExpression`.

**Files**: 3 new files in `rules/valibot/`, tests in `valibot-rules.test.ts`

**Verification**: QA pass

---

### TASK B7 — Prefer Idiomatic Valibot (4 rules)

**Status**: [ ]

**Rules**:
1. `valibot/prefer-branded-types` — Use `v.brand()` for ID/nominal types. Visitor: `VariableDeclaration`.
2. `valibot/prefer-methods` — Use built-in Valibot methods instead of custom transforms. Visitor: `CallExpression`.
3. `valibot/prefer-picklist` — Use `v.picklist()` instead of `v.union([v.literal(...)])`. Visitor: `CallExpression`.
4. `valibot/prefer-pipe` — Use `v.pipe()` for chained validations. Visitor: `CallExpression`.

**Files**: 4 new files in `rules/valibot/`, tests in `valibot-rules.test.ts`

**Verification**: QA pass

---

### TASK B8 — Error Handling & i18n (3 rules)

**Status**: [ ]

**Rules**:
1. `valibot/error-map-all-locales` — Error maps must include all supported locales. Visitor: `VariableDeclaration`.
2. `valibot/error-map-complete` — Error maps must cover all schema fields. Visitor: `Program`.
3. `valibot/require-error-map` — Schema files must have `*.errors.ts` companion. Visitor: `Program`.

**Files**: 3 new files in `rules/valibot/`, tests in `valibot-rules.test.ts`

**Verification**: QA pass

---

### TASK B9 — Documentation & Quality (4 rules)

**Status**: [ ]

**Rules**:
1. `valibot/require-description` — Schemas should have `v.description()` in pipe. Visitor: `VariableDeclaration`.
2. `valibot/require-error-mapping` — Use `mapIssues()` after safeParse failures. Visitor: `MemberExpression`.
3. `valibot/no-transform-side-effects` — `v.transform()` must be pure. Visitor: `CallExpression`.
4. `valibot/validate-boundaries` — Validate data at module boundaries. Visitor: `FunctionDeclaration`, `ExportNamedDeclaration`.

**Files**: 4 new files in `rules/valibot/`, tests in `valibot-rules.test.ts`

**Verification**: QA pass

---

### TASK B-Final — Register & Configure All 56 Rules

**Status**: [ ]

**Plan**:
- Rules are auto-loaded by `rule-loader.ts` from the `rules/` directory — no manual registry needed
- Add all 56 rule IDs to `.resist-lint.jsonc` with `"error"` severity
- Add lint tooling override in `.resist-lint.jsonc` to turn off new valibot rules for lint source code (same as existing valibot overrides)
- Add locale strings to `locale/locales/en.ts` and `locale/schema.ts` for any new rule messages
- Full QA pass

**Files**: `.resist-lint.jsonc` (modify), `locale/locales/en.ts` (modify), `locale/schema.ts` (modify)

**Verification**: Full QA pass — `pnpm -r --filter @/lint run qa:type-check && pnpm -w exec vitest run --project lint && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## TASK C — Integrate Oxlint as ExternalTool

**Status**: [ ]

**Gap**: Currently `qa:lint` in `package.json` runs two separate commands:
```
oxlint [paths] && npx tsx [...]/cli.ts --warn-only [paths]
```
This means two tools, two configs, two outputs. Goal: bring oxlint into resist-lint's tool orchestrator so `qa:lint` runs a single `resist-lint --tools` command.

**Plan**:

### C.1: Create `tools/oxlint.ts`
- ExternalTool wrapping `oxlint` with `--format=json` for parseable output
- Transform JSON output into LintResult diagnostics
- File patterns: `['**/*.ts', '**/*.js', '**/*.mjs', '**/*.jsx', '**/*.tsx']`
- Uses `--config .oxlintrc.json` to respect existing config
- `isAvailable()` checks for `oxlint` binary

### C.2: Add tests
- Good output test (empty JSON → empty results)
- Bad output test (JSON with errors → LintResult array)
- Tool definition test (name, command, args, patterns)

### C.3: Register
- Add to `tools/registry.ts` imports and `ALL_TOOLS` array

### C.4: Update `package.json`
- Change `qa:lint` to: `npx tsx packages/shared/config/tooling/lint/src/cli.ts --tools [paths]`
- Remove `qa:lint:custom` script (redundant — it's now just `qa:lint`)

**Files**: `tools/oxlint.ts` (new), `tools/tools.test.ts` (modify), `tools/registry.ts` (modify), root `package.json` (modify)

**Verification**: `pnpm -w run qa:lint` runs successfully with unified output

---

## TASK D — Config File Linting

**Status**: [ ]

**Gap**: Config files (`.editorconfig`, `.*ignore`, `.npmrc`, `.nvmrc`, `pnpm-workspace.yaml`, `.oxlintrc.json`, `biome.jsonc`) should be covered by existing external tools. Need to verify tool `filePatterns` match these files and that `.resist-lint.jsonc` includes them.

**Plan**:

### D.1: Verify tool coverage
| Config File | Existing Tool | File Pattern | Covered? |
|-------------|--------------|-------------|----------|
| `.editorconfig` | `editorconfig` tool | `**/.editorconfig` | Verify |
| `.*ignore` files | `ignore-files` tool | `**/*ignore*` | Verify |
| `.npmrc` | `npmrc` tool | `**/.npmrc` | Verify |
| `.nvmrc` | `nvmrc` tool | `**/.nvmrc` | Verify |
| `pnpm-workspace.yaml` | `workspace/workspace-valid` rule (Task A) | N/A | Covered by Task A |
| `.prettierrc.json` | N/A (we use biome) | N/A | Not applicable |
| `.oxlintrc.json` | `jsonlint` tool | `**/*.json` | Verify |
| `biome.jsonc` | `jsonlint` tool | `**/*.jsonc` | Verify |

### D.2: Update `.resist-lint.jsonc`
- Add extensions if needed (e.g., if `.jsonc` not in extensions list for tools mode)
- Document config file → tool mapping in comments

**Files**: `.resist-lint.jsonc` (modify if needed), tool files (read-only verification)

**Verification**: QA pass

---

## Final Verification

**Status**: [ ]

**Plan**:
- Cross-reference EVERY item in the approved changelog against implementation
- Verify all new rule files exist and are auto-loaded by `rule-loader.ts`
- Run full test suite — all tests must pass
- Run full QA — type-check, lint, format all clean
- Count total rules (should be 77 + 2 + 56 = 135)
- Count total tools (should be 112 + 1 = 113 with oxlint)
- Final commit

**Verification**: `pnpm -r --filter @/lint run qa:type-check && pnpm -w exec vitest run --project lint && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Execution Order

| Order | Task | Description | New Rules/Tools |
|-------|------|-------------|----------------|
| 1 | E | Verify tool test coverage | 0 (read-only) |
| 2 | A | Port checks rules | 2 rules |
| 3 | B1 | Schema structure & naming rules | 8 rules |
| 4 | B2 | Import & export hygiene rules | 6 rules |
| 5 | B3 | Ban competing libraries rules | 5 rules |
| 6 | B4 | Schema anti-pattern rules | 12 rules |
| 7 | B5 | Validation & parse safety rules | 11 rules |
| 8 | B6 | Performance rules | 3 rules |
| 9 | B7 | Prefer idiomatic Valibot rules | 4 rules |
| 10 | B8 | Error handling & i18n rules | 3 rules |
| 11 | B9 | Documentation & quality rules | 4 rules |
| 12 | B-F | Register & configure all B rules | 0 (config) |
| 13 | C | Integrate oxlint as tool | 1 tool |
| 14 | D | Config file linting | 0 (config) |
| 15 | V | Final verification | 0 (verify) |
