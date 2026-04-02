# @/lint Phase 19 — TSConfig + Package/Workspace Validation Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-29
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 shell check functions to TypeScript workspace rules — 7 tsconfig validation rules and 8 package/workspace rules.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`. Each iterates `ctx.allFiles()` to find relevant config files (tsconfig*.json or package.json), parses JSON, validates constraints, and reports via `createResult()`.

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
| Tests | 3018 pass / 0 fail |
| Type-check | Passes |
| Workspace rule files | 121 (120 rules + 1 test) |
| Test file lines | 6120 |
| Coverage | Statements 91.5% / Branches 77.88% / Functions 86.9% / Lines 91.48% |

---

## TASK 1 — `workspace/require-tsconfig-baseurl`

**Status**: [x] — Verified: Rule created, 5 tests pass, severity warning.

**Gap**: Shell function `check::tsconfig_baseurl` ensures `compilerOptions.baseUrl` is defined and is either `"."` or `"src"` in all tsconfig.json / tsconfig.base.json files. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-tsconfig-baseurl.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `tsconfig.json` and `tsconfig.base.json`
- Parse JSON, read `compilerOptions.baseUrl`
- If missing: report warning "compilerOptions.baseUrl not defined"
- If not `"."` or `"src"`: report warning "Invalid baseUrl — must be '.' or 'src'"
- Add tests: missing baseUrl → warning, invalid baseUrl → warning, valid "." → pass, valid "src" → pass, non-tsconfig file → skip
- Run QA: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

**Files**:
- Create: `rules/workspace/require-tsconfig-baseurl.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/require-tsconfig-baseurl')` with 5 tests

**Verification**: Tests assert `ruleId === 'workspace/require-tsconfig-baseurl'`, error messages contain "baseUrl", result count matches expected violations

---

## TASK 2 — `workspace/tsconfig-baseurl-resolves`

**Status**: [x] — Verified: Rule created, 4 tests pass, uses ctx.dirExists(), severity error.

**Gap**: Shell function `check::tsconfig_baseurl_directory` verifies that `compilerOptions.baseUrl` resolves to an actual directory on disk. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/tsconfig-baseurl-resolves.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `tsconfig.json` and `tsconfig.base.json`
- Parse JSON, read `compilerOptions.baseUrl`
- If baseUrl is non-empty, resolve path relative to tsconfig's directory via `join(dirname(filePath), baseUrl)`
- Use `ctx.dirExists()` to check if resolved path exists
- If not: report error "baseUrl does not resolve to a directory"
- Add tests: baseUrl resolves → pass, baseUrl doesn't resolve → error, no baseUrl → skip
- Run QA

**Files**:
- Create: `rules/workspace/tsconfig-baseurl-resolves.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/tsconfig-baseurl-resolves')` with 4 tests

**Verification**: Tests assert error message contains "does not resolve", `ctx.dirExists` is called with resolved path

---

## TASK 3 — `workspace/no-tsconfig-conflicting-types`

**Status**: [x] — Verified: Rule created, 5 tests pass, severity warning.

**Gap**: Shell function `check::tsconfig_conflicting_node_types` detects when `compilerOptions.types` includes both `"node"` and other type packages, which can cause global symbol conflicts. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-tsconfig-conflicting-types.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `tsconfig*.json` files (any file matching `tsconfig` in name)
- Parse JSON, read `compilerOptions.types` array
- If array includes `"node"` AND has other entries: report warning "Conflicting TypeScript types — includes 'node' and other global types"
- Add tests: types with only "node" → pass, types with "node" + "jest" → warning, no types → skip, types without "node" → pass
- Run QA

**Files**:
- Create: `rules/workspace/no-tsconfig-conflicting-types.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/no-tsconfig-conflicting-types')` with 5 tests

**Verification**: Tests assert `severity === 'warning'`, message contains "Conflicting", result count matches

---

## TASK 4 — `workspace/no-tsconfig-outdir-rootdir-overlap`

**Status**: [x] — Verified: Rule created, 5 tests pass, severity error.

**Gap**: Shell function `check::tsconfig_outdir_equals_rootdir` ensures `outDir` is not equal to `rootDir` and not `"."`. Prevents compiled output from overwriting source files. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-tsconfig-outdir-rootdir-overlap.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `tsconfig*.json` files
- Parse JSON, read `compilerOptions.outDir` and `compilerOptions.rootDir`
- If outDir is empty/missing: skip (no output configured)
- If outDir === rootDir OR outDir === ".": report error "outDir must not match rootDir"
- Add tests: outDir equals rootDir → error, outDir is "." → error, outDir is "dist" → pass, no outDir → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-tsconfig-outdir-rootdir-overlap.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/no-tsconfig-outdir-rootdir-overlap')` with 5 tests

**Verification**: Tests assert error message contains "outDir must not match rootDir", exact outDir/rootDir values in message

---

## TASK 5 — `workspace/require-tsconfig-types`

**Status**: [x] — Verified: Rule created, 4 tests pass, severity warning.

**Gap**: Shell function `check::tsconfig_typings` ensures all entries in `compilerOptions.typeRoots` and `compilerOptions.types` resolve to valid directories (either relative to tsconfig or under `node_modules/@types/`). No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-tsconfig-types.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `tsconfig.json` and `tsconfig.base.json`
- Parse JSON, collect entries from `compilerOptions.typeRoots` and `compilerOptions.types`
- For each entry, check `ctx.dirExists(join(dirname(filePath), entry))` OR `ctx.dirExists(join(dirname(filePath), 'node_modules/@types/', entry))`
- If neither exists: report warning "Unresolvable typeRoot or type"
- Add tests: resolvable type → pass, unresolvable type → warning, no types/typeRoots → skip
- Run QA

**Files**:
- Create: `rules/workspace/require-tsconfig-types.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/require-tsconfig-types')` with 4 tests

**Verification**: Tests assert warning message contains "Unresolvable", `ctx.dirExists` called correctly

---

## TASK 6 — `workspace/no-tsconfig-unused-paths`

**Status**: [x] — Verified: Rule created, 4 tests pass, two-pass approach, severity warning.

**Gap**: Shell function `check::tsconfig_unused_path_aliases` scans source files for `@/` alias usage, compares with `compilerOptions.paths` definitions, and warns on unused aliases. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-tsconfig-unused-paths.ts` as a `WorkspaceRule`
- Two-pass approach:
  1. First pass: collect all `compilerOptions.paths` keys from all tsconfig*.json files, strip trailing `/*`
  2. Second pass: scan all `.ts`/`.tsx`/`.js`/`.jsx` source files for path alias usage (regex `@/[a-zA-Z0-9_\-/]+`)
- Compare: any defined alias not found in source → report warning "Unused path alias"
- Add tests: used alias → pass, unused alias → warning, no paths → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-tsconfig-unused-paths.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/no-tsconfig-unused-paths')` with 4 tests

**Verification**: Tests assert warning message contains "Unused path alias", unused alias name in message

---

## TASK 7 — `workspace/no-multiple-tsconfig-base`

**Status**: [x] — Verified: Rule created, 4 tests pass, canonical path check, severity error.

**Gap**: Shell function `check::prevent_multiple_tsconfig_base` ensures `tsconfig.base.json` exists in exactly one canonical location (`packages/shared/config/typescript/tsconfig.base.json`) and no other locations. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-multiple-tsconfig-base.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, collect all files named `tsconfig.base.json`
- Check if canonical location exists (path ends with `packages/shared/config/typescript/tsconfig.base.json`)
- If canonical doesn't exist: report error "Missing canonical tsconfig.base.json"
- If any tsconfig.base.json found outside canonical: report error "Disallowed tsconfig.base.json outside canonical location"
- Add tests: only canonical → pass, extra base file → error, missing canonical → error
- Run QA

**Files**:
- Create: `rules/workspace/no-multiple-tsconfig-base.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/no-multiple-tsconfig-base')` with 4 tests

**Verification**: Tests assert error messages contain "canonical" or "Disallowed"

---

## TASK 8 — `workspace/require-pnpm-scripts`

**Status**: [x] — Verified: Rule created, 5 tests pass, npm/yarn regex, severity error.

**Gap**: Shell function `check::enforce_consistent_package_manager_scripts` ensures all `scripts` in package.json use `pnpm` — no `npm` or `yarn` commands. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-pnpm-scripts.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `package.json`
- Parse JSON, iterate `scripts` entries
- For each script value, check for `\bnpm\b` or `\byarn\b` regex match
- If found: report error "Disallowed package manager command in scripts"
- Add tests: script with "npm run" → error, script with "yarn add" → error, script with "pnpm" → pass, no scripts → skip
- Run QA

**Files**:
- Create: `rules/workspace/require-pnpm-scripts.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/require-pnpm-scripts')` with 5 tests

**Verification**: Tests assert error message contains "Disallowed package manager", script name in message

---

## TASK 9 — `workspace/require-private-internal-packages`

**Status**: [x] — Verified: Rule created, 4 tests pass, /packages/ path filter, severity error.

**Gap**: Shell function `check::enforce_private_internal_packages` ensures all packages under `packages/` have `"private": true`. Prevents accidental npm publish. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-private-internal-packages.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `package.json` files where path contains `/packages/`
- Parse JSON, check for `"private": true`
- If missing or not `true`: report error "Internal package is missing 'private': true"
- Add tests: private true → pass, private missing → error, root package.json (no /packages/) → skip
- Run QA

**Files**:
- Create: `rules/workspace/require-private-internal-packages.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/require-private-internal-packages')` with 4 tests

**Verification**: Tests assert error message contains "private", path filtering works correctly

---

## TASK 10 — `workspace/require-scoped-package-names`

**Status**: [x] — Verified: Rule created, 5 tests pass, scoped name regex, severity error.

**Gap**: Shell function `check::enforce_scoped_package_names` ensures all package.json files declare a scoped name (e.g., `@scope/foo`). No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-scoped-package-names.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `package.json`
- Parse JSON, read `name` field
- If missing: report error "Missing 'name' field"
- If present but doesn't match `^@[^/]+\/[^/]+$`: report error "Unscoped or invalid package name"
- Add tests: scoped name → pass, unscoped name → error, missing name → error, invalid scope format → error
- Run QA

**Files**:
- Create: `rules/workspace/require-scoped-package-names.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/require-scoped-package-names')` with 5 tests

**Verification**: Tests assert error messages contain "Unscoped" or "Missing 'name'", regex validation correct

---

## TASK 11 — `workspace/no-duplicate-deps`

**Status**: [x] — Verified: Rule created, 4 tests pass, multi-field detection, severity error.

**Gap**: Shell function `check::disallow_duplicate_dependency_fields` detects dependencies appearing in more than one section (dependencies, devDependencies, peerDependencies, optionalDependencies). No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-duplicate-deps.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `package.json`
- Parse JSON, collect dependency names from all 4 dep fields with their field name
- Build a `Map<string, string[]>` mapping dep name → list of fields it appears in
- If any dep appears in >1 field: report error "Duplicate dependency declarations"
- Add tests: dep in both deps and devDeps → error, dep in only one field → pass, no deps → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-duplicate-deps.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/no-duplicate-deps')` with 4 tests

**Verification**: Tests assert error message lists both field names, dep name in message

---

## TASK 12 — `workspace/no-custom-dependency-sources`

**Status**: [x] — Verified: Rule created, 4 tests pass, blocklist check, severity error.

**Gap**: Shell function `check::disallow_custom_dependencies` blocks usage of disallowed/banned dependency packages. Uses a configurable blocklist. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-custom-dependency-sources.ts` as a `WorkspaceRule`
- Hardcode a default blocklist: `['node-sass', 'request', 'left-pad']` (deprecated/banned packages)
- Iterate `ctx.allFiles()`, filter for `package.json`
- Parse JSON, check all 4 dep fields for any dependency name in the blocklist
- If found: report error "Disallowed dependency found"
- Add tests: banned dep → error, allowed dep → pass, no deps → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-custom-dependency-sources.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/no-custom-dependency-sources')` with 4 tests

**Verification**: Tests assert error message contains banned dep name and field name

---

## TASK 13 — `workspace/no-sideeffects-true`

**Status**: [x] — Verified: Rule created, 4 tests pass, boolean true check, severity warning.

**Gap**: Shell function `check::warn_on_sideeffects_true` warns when package.json sets `"sideEffects": true`, which disables tree-shaking. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-sideeffects-true.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `package.json`
- Parse JSON, check if `sideEffects === true` (literal boolean `true`, not array)
- If true: report warning "Tree-shaking is disabled"
- Add tests: sideEffects true → warning, sideEffects false → pass, sideEffects array → pass, no sideEffects → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-sideeffects-true.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/no-sideeffects-true')` with 4 tests

**Verification**: Tests assert `severity === 'warning'`, message contains "Tree-shaking"

---

## TASK 14 — `workspace/no-large-dependencies`

**Status**: [x] — Verified: Rule created, 4 tests pass, heavy libs set, severity warning.

**Gap**: Shell function `check::warn_large_dependency_usage` warns on usage of known large/heavy libraries (moment, lodash, firebase, etc.) in package.json dependencies. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-large-dependencies.ts` as a `WorkspaceRule`
- Hardcode heavy libs list: `moment`, `lodash`, `firebase`, `rxjs`, `chart.js`, `d3`, `three`, `aws-sdk`, `jquery`, `highcharts`, `echarts`, `protobufjs`
- Iterate `ctx.allFiles()`, filter for `package.json`
- Parse JSON, check `dependencies` and `devDependencies` keys against heavy libs set
- If found: report warning "Large dependency detected"
- Add tests: heavy dep → warning, normal dep → pass, no deps → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-large-dependencies.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/no-large-dependencies')` with 4 tests

**Verification**: Tests assert `severity === 'warning'`, message contains dep name

---

## TASK 15 — `workspace/no-npmrc`

**Status**: [x] — Verified: Rule created, 3 tests pass, .npmrc detection, severity error.

**Gap**: Shell function `check::disallow_npmrc_file` ensures no `.npmrc` files exist anywhere in the repository. They can conflict with pnpm/Volta config. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-npmrc.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for files named `.npmrc`
- If found: report error ".npmrc file found — this project uses pnpm only"
- Add tests: .npmrc exists → error, no .npmrc → pass
- Run QA

**Files**:
- Create: `rules/workspace/no-npmrc.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — add `describe('workspace/no-npmrc')` with 3 tests

**Verification**: Tests assert error message contains ".npmrc", file path in message

---

## TASK 16 — Register Rules + Config

**Status**: [x] — Verified: All 15 rules registered in .resist-lint.jsonc in alphabetical order.

**Plan**: Register all 15 rules in `.resist-lint.jsonc` with severity levels:
- `workspace/no-custom-dependency-sources`: `"error"`
- `workspace/no-duplicate-deps`: `"error"`
- `workspace/no-large-dependencies`: `"warn"`
- `workspace/no-multiple-tsconfig-base`: `"error"`
- `workspace/no-npmrc`: `"error"`
- `workspace/no-sideeffects-true`: `"warn"`
- `workspace/no-tsconfig-conflicting-types`: `"warn"`
- `workspace/no-tsconfig-outdir-rootdir-overlap`: `"error"`
- `workspace/no-tsconfig-unused-paths`: `"warn"`
- `workspace/require-pnpm-scripts`: `"error"`
- `workspace/require-private-internal-packages`: `"error"`
- `workspace/require-scoped-package-names`: `"error"`
- `workspace/require-tsconfig-baseurl`: `"warn"`
- `workspace/require-tsconfig-types`: `"warn"`
- `workspace/tsconfig-baseurl-resolves`: `"error"`

**Files**:
- Edit: `.resist-lint.jsonc`

**Verification**: Config valid, all rules load, `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 17 — Full QA + Coverage

**Status**: [x] — Verified: type-check passes, 3097 tests pass (79 above 3018 baseline), format clean, coverage: statements 91.7%, branches 78.25%, functions 87.15%, lines 91.69%.

**Plan**:
- Run `pnpm -w run qa:lint --tools`
- Run `pnpm -w run qa:format`
- Run `pnpm --filter @/lint qa:test`
- Run `pnpm --filter @/lint qa:test:coverage`
- Verify all coverage thresholds pass (statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%)
- Verify test count above baseline (3018)

**Verification**: All QA green, coverage above thresholds

---

## TASK 18 — Final Verification + Commit

**Status**: [x] — Verified: All 15 rules implemented, tested, registered. 14 shell functions renamed (disallow_npmrc_file not in shell file). Committed.

**Plan**:
- Verify all 15 rules implemented against approved changelog
- Verify each rule file exists at `rules/workspace/<rule-name>.ts` and matches its plan
- Verify each rule has tests in `rules/workspace/workspace-rules.test.ts`
- Verify all 15 rules registered in `.resist-lint.jsonc`
- Rename 15 shell functions from `check::` to `ported::` in `common.checks.sh`
- Run final QA pass
- Commit all changes

**Verification**: All tasks `[x]`, all rules verified, shell functions renamed, commit clean

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | require-tsconfig-baseurl | — |
| 2 | tsconfig-baseurl-resolves | — |
| 3 | no-tsconfig-conflicting-types | — |
| 4 | no-tsconfig-outdir-rootdir-overlap | — |
| 5 | require-tsconfig-types | — |
| 6 | no-tsconfig-unused-paths | — |
| 7 | no-multiple-tsconfig-base | — |
| 8 | require-pnpm-scripts | — |
| 9 | require-private-internal-packages | — |
| 10 | require-scoped-package-names | — |
| 11 | no-duplicate-deps | — |
| 12 | no-custom-dependency-sources | — |
| 13 | no-sideeffects-true | — |
| 14 | no-large-dependencies | — |
| 15 | no-npmrc | — |
| 16 | Register rules in config | 1–15 |
| 17 | Full QA + Coverage | 16 |
| 18 | Final verification + commit | 17 |
