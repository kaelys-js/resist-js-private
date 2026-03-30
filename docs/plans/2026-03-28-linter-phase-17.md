# @/lint Phase 17 — Port common.checks.sh Batch 5 (tsconfig Validation Rules)

**Date**: 2026-03-28
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 `check::tsconfig_*` functions from `common.checks.sh` to TypeScript workspace rules. All rules validate `tsconfig*.json` files by iterating `allFiles()`, reading JSON content via `readFile()` + `JSON.parse()`, checking specific fields/conditions, and reporting violations via `createResult()`.
**Architecture**: All 15 are WorkspaceRules with `scope: 'workspace'`. All iterate `allFiles()` to find `tsconfig*.json` files, parse JSON, validate conditions. All `fixable: false`.

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
| Tests | 2886 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 87 |
| Total rules in config | 155 |
| Coverage | statements 91.12%, branches 77.1%, functions 86.34%, lines 91.1% |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — `workspace/require-tsconfig-strict`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_strict_mode` finds all `tsconfig*.json` files and verifies `compilerOptions.strict === true`. No TypeScript equivalent exists.

**Plan**:
- Write 4 failing tests in `workspace-rules.test.ts` at line ~4572:
  1. Flags tsconfig with `strict: false` — assert `results.length === 1`, `ruleId === 'workspace/require-tsconfig-strict'`, message contains `strict`
  2. Flags tsconfig with no `strict` field — assert `results.length === 1`
  3. Passes tsconfig with `strict: true` — assert `results.length === 0`
  4. Ignores non-tsconfig JSON files — assert `results.length === 0`
- Run tests, verify they fail (rule doesn't exist yet)
- Create `rules/workspace/require-tsconfig-strict.ts`:
  - Import `basename`, `relative` from `node:path`
  - Import `createResult`, `WorkspaceRule` from `@/lint/framework/types.ts`
  - Import `WorkspaceContext` from `@/lint/framework/rule-context.ts`
  - Iterate `ctx.allFiles()`, filter files where `basename(filePath).startsWith('tsconfig') && basename(filePath).endsWith('.json')`
  - `readFile(filePath)` → `JSON.parse()` → check `parsed.compilerOptions?.strict === true`
  - If not, `createResult('workspace/require-tsconfig-strict', filePath, 1, 1, 'error', ...)` with tip
- Add import at line ~101 in test file
- Run tests, verify pass
- Run QA: `pnpm --filter @/lint qa:type-check && pnpm -w run qa:test`

**Files**:
- Create: `rules/workspace/require-tsconfig-strict.ts`
- Modify: `rules/workspace/workspace-rules.test.ts:101` — add import
- Test: `rules/workspace/workspace-rules.test.ts:~4572` — 4 new tests

**Verification**: Tests assert `results[0]!.ruleId === 'workspace/require-tsconfig-strict'`, `results[0]!.severity === 'error'`, message contains `strict`

---

## TASK 2 — `workspace/require-tsconfig-target`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_target_level` validates `compilerOptions.target` is `ES2022` or `ESNext`. No TypeScript equivalent.

**Plan**:
- Write 5 failing tests:
  1. Flags tsconfig with `target: "ES2015"` — assert `results.length === 1`, message contains `ES2015`
  2. Flags tsconfig with no `target` field — assert `results.length === 1`
  3. Passes tsconfig with `target: "ES2022"` — assert `results.length === 0`
  4. Passes tsconfig with `target: "ESNext"` — assert `results.length === 0`
  5. Ignores non-tsconfig files — assert `results.length === 0`
- Create `rules/workspace/require-tsconfig-target.ts`:
  - Same pattern: iterate `allFiles()`, filter `tsconfig*.json`, parse JSON
  - Check `parsed.compilerOptions?.target` against `ALLOWED_TARGETS` Set: `'ES2022'`, `'ESNext'`
  - Severity: `'warning'` (per shell function using `log WARN`)
- Run tests + QA

**Files**:
- Create: `rules/workspace/require-tsconfig-target.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests
- Test: 5 new tests

**Verification**: Tests assert `severity === 'warning'`, message contains the invalid target value

---

## TASK 3 — `workspace/require-tsconfig-extends-base`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_extends_base` ensures all `tsconfig.json` files extend a shared base config (scoped package or `tsconfig.base.json`). No TypeScript equivalent.

**Plan**:
- Write 5 failing tests:
  1. Flags tsconfig.json with no `extends` — assert `results.length === 1`
  2. Flags tsconfig.json with `extends: "./some-random.json"` — assert `results.length === 1`
  3. Passes tsconfig.json with `extends: "@scope/tsconfig/base"` — assert `results.length === 0`
  4. Passes tsconfig.json with `extends: "../../tsconfig.base.json"` — assert `results.length === 0`
  5. Ignores `tsconfig.base.json` itself (base configs don't need to extend) — assert `results.length === 0`
- Create `rules/workspace/require-tsconfig-extends-base.ts`:
  - Filter only `tsconfig.json` (not `tsconfig.base.json` or `tsconfig.build.json`)
  - Check `parsed.extends` matches either scoped package pattern `/@[^/]+\/[^/]+/` or relative `tsconfig.base.json` path
  - Severity: `'error'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/require-tsconfig-extends-base.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests

**Verification**: Tests assert `ruleId === 'workspace/require-tsconfig-extends-base'`, `severity === 'error'`

---

## TASK 4 — `workspace/tsconfig-extends-resolves`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_extends_target_exists` verifies the `extends` target resolves to an actual file. Skips scoped packages. No TypeScript equivalent.

**Plan**:
- Write 5 failing tests:
  1. Flags tsconfig with `extends: "./missing.json"` where file doesn't exist — assert `results.length === 1`
  2. Passes tsconfig with `extends: "./base.json"` where `base.json` exists in files map — assert `results.length === 0`
  3. Skips scoped packages `extends: "@scope/tsconfig/base"` — assert `results.length === 0`
  4. Skips tsconfig with no `extends` — assert `results.length === 0`
  5. Handles `extends` without `.json` suffix (appends `.json` for resolution) — assert correct behavior
- Create `rules/workspace/tsconfig-extends-resolves.ts`:
  - Parse `extends` field, skip scoped packages (starts with `@`)
  - Resolve relative path using `dirname(filePath)` + `join()` + `ctx.fileExists()`
  - If not found, try appending `.json`
  - Severity: `'error'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/tsconfig-extends-resolves.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests

**Verification**: Tests assert `severity === 'error'`, message contains the missing path

---

## TASK 5 — `workspace/no-tsconfig-circular-extends`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_circular_extends` detects circular `extends` chains (A→B→A). No TypeScript equivalent.

**Plan**:
- Write 4 failing tests:
  1. Flags circular extends: A extends B, B extends A — assert `results.length >= 1`, message contains `circular`
  2. Passes linear extends: A extends B, B has no extends — assert `results.length === 0`
  3. Passes single tsconfig with no extends — assert `results.length === 0`
  4. Flags self-referencing tsconfig (extends itself) — assert `results.length >= 1`
- Create `rules/workspace/no-tsconfig-circular-extends.ts`:
  - Collect all tsconfig files and their `extends` targets
  - For each tsconfig, follow the `extends` chain tracking visited files
  - If a file is visited twice, report circular extends
  - Skip scoped package extends (can't resolve)
  - Severity: `'error'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/no-tsconfig-circular-extends.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'error'`, message contains `circular` or `cycle`

---

## TASK 6 — `workspace/no-tsconfig-deprecated-options`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_deprecated_keys` flags deprecated/obscure compilerOptions: `diagnostics`, `extendedDiagnostics`, `listFiles`, `suppressOutput`, `charset`. No TypeScript equivalent.

**Plan**:
- Write 4 failing tests:
  1. Flags tsconfig with `diagnostics: true` — assert `results.length === 1`, message contains `diagnostics`
  2. Flags tsconfig with multiple deprecated keys (`charset`, `listFiles`) — assert `results.length === 2`
  3. Passes tsconfig with no deprecated keys — assert `results.length === 0`
  4. Ignores non-tsconfig files — assert `results.length === 0`
- Create `rules/workspace/no-tsconfig-deprecated-options.ts`:
  - `DEPRECATED_KEYS` Set: `'diagnostics'`, `'extendedDiagnostics'`, `'listFiles'`, `'suppressOutput'`, `'charset'`
  - Check each key against `parsed.compilerOptions`
  - Severity: `'warning'` (per shell function using `log WARN`)
- Run tests + QA

**Files**:
- Create: `rules/workspace/no-tsconfig-deprecated-options.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'warning'`, message contains the deprecated key name

---

## TASK 7 — `workspace/require-tsconfig-module-resolution`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_module_resolution` enforces that ESNext module requires `moduleResolution: "bundler"`. No TypeScript equivalent.

**Plan**:
- Write 4 failing tests:
  1. Flags tsconfig with `module: "ESNext"` but `moduleResolution: "node"` — assert `results.length === 1`
  2. Flags tsconfig with `module: "ESNext"` and no `moduleResolution` — assert `results.length === 1`
  3. Passes tsconfig with `module: "ESNext"` and `moduleResolution: "bundler"` — assert `results.length === 0`
  4. Passes tsconfig with `module: "CommonJS"` regardless of `moduleResolution` — assert `results.length === 0`
- Create `rules/workspace/require-tsconfig-module-resolution.ts`:
  - Check if `parsed.compilerOptions?.module === 'ESNext'`
  - If so, verify `parsed.compilerOptions?.moduleResolution === 'bundler'`
  - Severity: `'warning'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/require-tsconfig-module-resolution.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'warning'`, message references `moduleResolution` and `bundler`

---

## TASK 8 — `workspace/no-tsconfig-include-exclude-overlap`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_include_exclude_duplicates` detects duplicate globs present in both `include[]` and `exclude[]`. No TypeScript equivalent.

**Plan**:
- Write 4 failing tests:
  1. Flags tsconfig with `"src"` in both include and exclude — assert `results.length === 1`, message contains `src`
  2. Flags tsconfig with multiple overlapping entries — assert `results.length === 2`
  3. Passes tsconfig with no overlap — assert `results.length === 0`
  4. Passes tsconfig with only include, no exclude — assert `results.length === 0`
- Create `rules/workspace/no-tsconfig-include-exclude-overlap.ts`:
  - Extract `include[]` and `exclude[]` arrays
  - Find intersection (entries in both arrays)
  - Report each overlapping entry
  - Severity: `'error'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/no-tsconfig-include-exclude-overlap.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'error'`, message contains the overlapping glob

---

## TASK 9 — `workspace/require-tsconfig-exclude-defaults`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_missing_exclude_defaults` checks that `exclude` includes: `dist`, `build`, `coverage`, `tmp`, `node_modules`. No TypeScript equivalent.

**Plan**:
- Write 4 failing tests:
  1. Flags tsconfig with empty exclude — assert `results.length >= 1` (missing all defaults)
  2. Flags tsconfig with partial exclude `["dist"]` — assert `results.length >= 1` (missing `build`, `coverage`, etc.)
  3. Passes tsconfig with all defaults present — assert `results.length === 0`
  4. Passes tsconfig with defaults plus extras — assert `results.length === 0`
- Create `rules/workspace/require-tsconfig-exclude-defaults.ts`:
  - `REQUIRED_EXCLUDES`: `['dist', 'build', 'coverage', 'tmp', 'node_modules']`
  - Check each required entry against `parsed.exclude[]`
  - Report each missing entry individually
  - Severity: `'warning'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/require-tsconfig-exclude-defaults.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'warning'`, each result message contains the missing exclude entry

---

## TASK 10 — `workspace/tsconfig-paths-resolve`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_path_aliases_resolve` verifies each `compilerOptions.paths` value resolves to an existing file/directory. No TypeScript equivalent.

**Plan**:
- Write 5 failing tests:
  1. Flags path alias `"@/utils/*": ["src/utils/*"]` where `src/utils` dir doesn't exist — assert `results.length === 1`
  2. Passes path alias where target directory exists — assert `results.length === 0`
  3. Passes tsconfig with no `paths` — assert `results.length === 0`
  4. Flags multiple broken aliases — assert `results.length >= 2`
  5. Handles wildcard stripping correctly — strips `*` suffix before checking existence
- Create `rules/workspace/tsconfig-paths-resolve.ts`:
  - Extract `parsed.compilerOptions?.paths` object
  - For each alias key, iterate values array
  - Strip trailing `*` and `/` from each value
  - Resolve relative to tsconfig's directory: `join(dirname(filePath), stripped)`
  - Check `ctx.fileExists()` or `ctx.dirExists()`
  - Severity: `'error'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/tsconfig-paths-resolve.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests

**Verification**: Tests assert `severity === 'error'`, message contains the unresolvable alias path

---

## TASK 11 — `workspace/no-tsconfig-path-shadowing`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_path_shadowing` warns when path aliases shadow well-known node_modules packages (`react`, `vite`, `@types/*`). No TypeScript equivalent.

**Plan**:
- Write 4 failing tests:
  1. Flags path alias key `"react"` — assert `results.length === 1`, message contains `shadow`
  2. Flags path alias key `"vite"` — assert `results.length === 1`
  3. Flags path alias key `"@types/*"` — assert `results.length === 1`
  4. Passes path alias key `"@/utils/*"` — assert `results.length === 0`
- Create `rules/workspace/no-tsconfig-path-shadowing.ts`:
  - `SHADOWED_PACKAGES` Set: `'react'`, `'vite'`, `'next'`, `'vue'`, `'svelte'`, `'express'`
  - Also check pattern `@types/*`
  - For each path alias key, check if it matches
  - Severity: `'warning'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/no-tsconfig-path-shadowing.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'warning'`, message contains `shadow` and the package name

---

## TASK 12 — `workspace/require-tsconfig-schema`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_schema_declaration` requires all `tsconfig*.json` to have `"$schema": "https://json.schemastore.org/tsconfig"`. No TypeScript equivalent.

**Plan**:
- Write 4 failing tests:
  1. Flags tsconfig with no `$schema` — assert `results.length === 1`, message contains `$schema`
  2. Flags tsconfig with wrong `$schema` URL — assert `results.length === 1`
  3. Passes tsconfig with correct `$schema` — assert `results.length === 0`
  4. Ignores non-tsconfig JSON files — assert `results.length === 0`
- Create `rules/workspace/require-tsconfig-schema.ts`:
  - `REQUIRED_SCHEMA`: `'https://json.schemastore.org/tsconfig'`
  - Check `parsed.$schema === REQUIRED_SCHEMA`
  - Severity: `'error'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/require-tsconfig-schema.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'error'`, message contains `$schema` and the required URL

---

## TASK 13 — `workspace/no-tsconfig-types-duplicates`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_types_duplicates` detects duplicate entries in `compilerOptions.types[]`. No TypeScript equivalent.

**Plan**:
- Write 4 failing tests:
  1. Flags tsconfig with `types: ["vitest", "vitest"]` — assert `results.length === 1`, message contains `vitest`
  2. Flags tsconfig with multiple duplicates — assert `results.length === 2`
  3. Passes tsconfig with unique types — assert `results.length === 0`
  4. Passes tsconfig with no types array — assert `results.length === 0`
- Create `rules/workspace/no-tsconfig-types-duplicates.ts`:
  - Extract `parsed.compilerOptions?.types` array
  - Track seen entries with a `Set<string>`
  - Report each duplicate
  - Severity: `'warning'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/no-tsconfig-types-duplicates.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'warning'`, message contains the duplicate type name

---

## TASK 14 — `workspace/tsconfig-references-resolve`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_project_references` verifies all `references[].path` entries resolve to existing tsconfig files. No TypeScript equivalent.

**Plan**:
- Write 5 failing tests:
  1. Flags reference path `"../missing"` where no tsconfig exists — assert `results.length === 1`
  2. Passes reference path where target tsconfig.json exists — assert `results.length === 0`
  3. Passes tsconfig with no references — assert `results.length === 0`
  4. Flags multiple broken references — assert `results.length >= 2`
  5. Handles reference to file directly (not directory) — e.g., `"path": "./tsconfig.build.json"`
- Create `rules/workspace/tsconfig-references-resolve.ts`:
  - Extract `parsed.references` array
  - For each `ref.path`, resolve relative to tsconfig's directory
  - Check if `join(dir, refPath, 'tsconfig.json')` exists via `ctx.fileExists()`
  - Also check if `refPath` itself is a file (e.g., `tsconfig.build.json`)
  - Severity: `'error'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/tsconfig-references-resolve.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests

**Verification**: Tests assert `severity === 'error'`, message contains the unresolvable reference path

---

## TASK 15 — `workspace/no-tsconfig-import-inconsistency`

**Status**: [x]

**Gap**: Shell function `check::tsconfig_import_inconsistency` flags `allowSyntheticDefaultImports: true` without `esModuleInterop: true`. No TypeScript equivalent.

**Plan**:
- Write 4 failing tests:
  1. Flags `allowSyntheticDefaultImports: true` with `esModuleInterop: false` — assert `results.length === 1`
  2. Flags `allowSyntheticDefaultImports: true` with no `esModuleInterop` — assert `results.length === 1`
  3. Passes when both are `true` — assert `results.length === 0`
  4. Passes when `allowSyntheticDefaultImports` is not set — assert `results.length === 0`
- Create `rules/workspace/no-tsconfig-import-inconsistency.ts`:
  - Check `parsed.compilerOptions?.allowSyntheticDefaultImports === true`
  - If so, check `parsed.compilerOptions?.esModuleInterop === true`
  - If not, report inconsistency
  - Severity: `'warning'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/no-tsconfig-import-inconsistency.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'warning'`, message contains `allowSyntheticDefaultImports` and `esModuleInterop`

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add 15 new entries to `.resist-lint.jsonc` under `"rules"` in alphabetical order within `workspace/` section:
  ```jsonc
  "workspace/no-tsconfig-circular-extends": "error",
  "workspace/no-tsconfig-deprecated-options": "warn",
  "workspace/no-tsconfig-import-inconsistency": "warn",
  "workspace/no-tsconfig-include-exclude-overlap": "error",
  "workspace/no-tsconfig-path-shadowing": "warn",
  "workspace/no-tsconfig-types-duplicates": "warn",
  "workspace/require-tsconfig-exclude-defaults": "warn",
  "workspace/require-tsconfig-extends-base": "error",
  "workspace/require-tsconfig-module-resolution": "warn",
  "workspace/require-tsconfig-schema": "error",
  "workspace/require-tsconfig-strict": "error",
  "workspace/require-tsconfig-target": "warn",
  "workspace/tsconfig-extends-resolves": "error",
  "workspace/tsconfig-paths-resolve": "error",
  "workspace/tsconfig-references-resolve": "error",
  ```
- Run: `pnpm --filter @/lint qa:type-check && pnpm -w run qa:test`
- Verify no regressions

**Files**:
- Modify: `.resist-lint.jsonc` — 15 new rule entries

**Verification**: `pnpm -w run qa:test` shows 0 failures, all new rules visible in config

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check` — must exit 0
- Run: `pnpm -w run qa:format` — auto-fix formatting
- Run: `pnpm -w run qa:test` — must show 0 failures
- Run: `pnpm --filter @/lint qa:test:coverage` — must meet thresholds:
  - statements ≥80%
  - branches ≥75%
  - functions ≥80%
  - lines ≥80%
- Test count must be ≥ 2886 (baseline) + ~63 (new tests) = ≥2949
- Fix any failures before proceeding

**Verification**: All QA commands exit 0, coverage thresholds met, test count ≥2949

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify each of the 15 rule files exists in `rules/workspace/`
- Verify each rule has correct `id`, `scope: 'workspace'`, `fixable: false`
- Verify each rule is registered in `.resist-lint.jsonc` with correct severity
- Verify each rule has tests in `workspace-rules.test.ts`
- Verify test count is at or above expected (≥2949)
- Verify coverage thresholds are met
- Verify no duplicate rule entries in config
- Run final: `pnpm --filter @/lint qa:type-check && pnpm -w run qa:test`
- Commit all changes

**Verification**:
- ✅ 15 new rule files created and exported
- ✅ 15 new rule entries in `.resist-lint.jsonc`
- ✅ ~63 new tests added to `workspace-rules.test.ts`
- ✅ All QA passes (type-check, format, tests, coverage)
- ✅ Test count ≥2949 (2886 baseline + ~63 new)
- ✅ Coverage thresholds met (≥80%/≥75%/≥80%/≥80%)

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | require-tsconfig-strict | — |
| 2 | require-tsconfig-target | — |
| 3 | require-tsconfig-extends-base | — |
| 4 | tsconfig-extends-resolves | — |
| 5 | no-tsconfig-circular-extends | — |
| 6 | no-tsconfig-deprecated-options | — |
| 7 | require-tsconfig-module-resolution | — |
| 8 | no-tsconfig-include-exclude-overlap | — |
| 9 | require-tsconfig-exclude-defaults | — |
| 10 | tsconfig-paths-resolve | — |
| 11 | no-tsconfig-path-shadowing | — |
| 12 | require-tsconfig-schema | — |
| 13 | no-tsconfig-types-duplicates | — |
| 14 | tsconfig-references-resolve | — |
| 15 | no-tsconfig-import-inconsistency | — |
| 16 | Register rules in config | 1–15 |
| 17 | Full QA + Coverage | 16 |
| 18 | Final Verification + Commit | 17 |
