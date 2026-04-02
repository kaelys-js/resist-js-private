# @/lint Phase 18 — Port common.checks.sh Batch 6 (package.json Validation Rules)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-28
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 `check::*` functions related to `package.json` validation from `common.checks.sh` to TypeScript workspace rules. All rules validate `package.json` files by iterating `allFiles()`, reading JSON content via `readFile()` + `JSON.parse()`, checking specific fields/conditions, and reporting violations via `createResult()`.
**Architecture**: All 15 are WorkspaceRules with `scope: 'workspace'`. All iterate `allFiles()` to find `package.json` files (filtering `basename(filePath) === 'package.json'`), parse JSON, validate conditions. All `fixable: false`.

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
| Tests | 2949 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 105 files |
| Total rules in config | 170 |
| Coverage | statements 91.3%, branches 77.54%, functions 86.6%, lines 91.29% |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — `workspace/no-wildcard-versions`

**Status**: [x]

**Gap**: Shell function `check::disallow_latest_or_wildcard_versions` finds all `package.json` files and greps for dependency values matching `"latest"`, `"*"`, or empty `""`. No TypeScript equivalent exists.

**Plan**:
- Write 5 failing tests in `workspace-rules.test.ts` at line ~5309:
  1. Flags package.json with `"latest"` dep version — assert `results.length === 1`, `ruleId === 'workspace/no-wildcard-versions'`, `severity === 'error'`
  2. Flags package.json with `"*"` dep version — assert `results.length === 1`
  3. Flags package.json with `""` empty dep version — assert `results.length === 1`
  4. Passes package.json with valid `"^1.2.3"` dep versions — assert `results.length === 0`
  5. Ignores non-package.json files — assert `results.length === 0`
- Run tests, verify they fail (rule doesn't exist yet)
- Create `rules/workspace/no-wildcard-versions.ts`:
  - Import `basename`, `relative` from `node:path`
  - Import `createResult`, `WorkspaceRule` from `@/lint/framework/types.ts`
  - Import `WorkspaceContext` from `@/lint/framework/rule-context.ts`
  - Define `UNSAFE_VERSIONS: ReadonlySet<string> = new Set(['latest', '*', ''])`
  - Define `DEP_FIELDS: readonly string[] = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']`
  - Iterate `ctx.allFiles()`, filter `basename(filePath) === 'package.json'`
  - `readFile(filePath)` → `JSON.parse()` → for each DEP_FIELD, get `parsed[field]`, iterate entries
  - If dep value is in `UNSAFE_VERSIONS`, `createResult('workspace/no-wildcard-versions', filePath, 1, 1, 'error', ...)` with tip
- Add import at line ~116 in test file
- Run tests, verify pass
- Run QA: `pnpm -w run qa:lint --tools && pnpm -w run qa:test`

**Files**:
- Create: `rules/workspace/no-wildcard-versions.ts`
- Modify: `rules/workspace/workspace-rules.test.ts:116` — add import
- Test: `rules/workspace/workspace-rules.test.ts:~5309` — 5 new tests

**Verification**: Tests assert `results[0]!.ruleId === 'workspace/no-wildcard-versions'`, `results[0]!.severity === 'error'`, message contains the dep name and unsafe version

---

## TASK 2 — `workspace/no-tarball-deps`

**Status**: [x]

**Gap**: Shell function `check::disallow_tgz_tarball_dependencies` finds all `package.json` files and checks if any dependency value contains `.tgz`. No TypeScript equivalent exists.

**Plan**:
- Write 4 failing tests:
  1. Flags package.json with `.tgz` dep URL — assert `results.length === 1`, `severity === 'error'`
  2. Flags `.tgz` in devDependencies — assert `results.length === 1`
  3. Passes package.json with normal registry versions — assert `results.length === 0`
  4. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/no-tarball-deps.ts`:
  - Same pattern: iterate `allFiles()`, filter `package.json`, parse JSON
  - For each dep field, check if value string contains `.tgz`
  - Severity: `'error'`
- Run tests + QA

**Files**:
- Create: `rules/workspace/no-tarball-deps.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'error'`, message contains `.tgz` and dep name

---

## TASK 3 — `workspace/no-optional-dependencies`

**Status**: [x]

**Gap**: Shell function `check::disallow_optional_dependencies` checks if `optionalDependencies` key exists in any `package.json`. No TypeScript equivalent exists.

**Plan**:
- Write 3 failing tests:
  1. Flags package.json with `optionalDependencies` key — assert `results.length === 1`, `severity === 'error'`
  2. Passes package.json without `optionalDependencies` — assert `results.length === 0`
  3. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/no-optional-dependencies.ts`:
  - Iterate `allFiles()`, filter `package.json`, parse JSON
  - Check if `'optionalDependencies' in parsed` and the value is non-empty
  - Severity: `'error'`

**Files**:
- Create: `rules/workspace/no-optional-dependencies.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 3 tests

**Verification**: Tests assert `severity === 'error'`, message contains `optionalDependencies`

---

## TASK 4 — `workspace/validate-package-entrypoints`

**Status**: [x]

**Gap**: Shell function `check::validate_package_entrypoints` verifies `main`, `module` fields resolve to existing files, and `exports` paths resolve. No TypeScript equivalent exists.

**Plan**:
- Write 6 failing tests:
  1. Flags package.json with non-existent `main` file — assert `results.length === 1`, `severity === 'error'`
  2. Flags package.json with non-existent `module` file — assert `results.length === 1`
  3. Flags package.json with non-existent `exports` path — assert `results.length === 1`
  4. Passes package.json with existing `main` file — assert `results.length === 0` (mock `fileExists` to return `true`)
  5. Passes package.json with no entrypoints — assert `results.length === 0`
  6. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/validate-package-entrypoints.ts`:
  - Iterate `allFiles()`, filter `package.json`, parse JSON
  - For `main` and `module`: if field exists, join `dirname(filePath)` + value, check `ctx.fileExists()`
  - For `exports`: recursively walk the exports object, collect all string leaf values starting with `./`, check `ctx.fileExists()`
  - Severity: `'error'`
- **Important**: Tests need `vi.spyOn(ctx, 'fileExists').mockImplementation(...)` to control resolution

**Files**:
- Create: `rules/workspace/validate-package-entrypoints.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 6 tests

**Verification**: Tests assert `severity === 'error'`, message contains the missing entrypoint path

---

## TASK 5 — `workspace/require-package-description`

**Status**: [x]

**Gap**: Shell function `check::package_has_description` checks each `package.json` has a non-empty `description` field. No TypeScript equivalent exists.

**Plan**:
- Write 4 failing tests:
  1. Flags package.json with missing `description` — assert `results.length === 1`, `severity === 'error'`
  2. Flags package.json with empty `description: ""` — assert `results.length === 1`
  3. Passes package.json with non-empty `description` — assert `results.length === 0`
  4. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/require-package-description.ts`:
  - Iterate `allFiles()`, filter `package.json`, parse JSON
  - Check `typeof parsed.description === 'string' && parsed.description.trim().length > 0`
  - If not, report `'error'`

**Files**:
- Create: `rules/workspace/require-package-description.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'error'`, message contains `description`

---

## TASK 6 — `workspace/require-package-name-version`

**Status**: [x]

**Gap**: Shell function `check::package_manifest_name_and_version` checks all `package.json` files have non-empty `name` and `version` fields. No TypeScript equivalent exists.

**Plan**:
- Write 5 failing tests:
  1. Flags package.json with missing `name` — assert `results.length >= 1`, `severity === 'error'`
  2. Flags package.json with missing `version` — assert `results.length >= 1`
  3. Flags package.json with empty `name: ""` — assert `results.length >= 1`
  4. Passes package.json with both `name` and `version` — assert `results.length === 0`
  5. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/require-package-name-version.ts`:
  - Iterate `allFiles()`, filter `package.json`, parse JSON
  - Check `parsed.name` is non-empty string, check `parsed.version` is non-empty string
  - Report separately for each missing field

**Files**:
- Create: `rules/workspace/require-package-name-version.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests

**Verification**: Tests assert `severity === 'error'`, message contains `name` or `version`

---

## TASK 7 — `workspace/require-package-schema`

**Status**: [x]

**Gap**: Shell function `check::package_schema_reference` checks each `package.json` has `$schema` set to `https://json.schemastore.org/package.json`. No TypeScript equivalent exists.

**Plan**:
- Write 4 failing tests:
  1. Flags package.json with missing `$schema` — assert `results.length === 1`, `severity === 'error'`
  2. Flags package.json with wrong `$schema` value — assert `results.length === 1`
  3. Passes package.json with correct `$schema` — assert `results.length === 0`
  4. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/require-package-schema.ts`:
  - `EXPECTED_SCHEMA = 'https://json.schemastore.org/package.json'`
  - Iterate `allFiles()`, filter `package.json`, parse JSON
  - Check `parsed['$schema'] === EXPECTED_SCHEMA`
  - If missing or wrong, report `'error'` with different messages

**Files**:
- Create: `rules/workspace/require-package-schema.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'error'`, message contains `$schema`

---

## TASK 8 — `workspace/require-package-name-matches-path`

**Status**: [x]

**Gap**: Shell function `check::enforce_package_name_matches_path` ensures `name` field matches `@scope/dirname`. No TypeScript equivalent exists. The TS rule will derive the scope from the package name itself (check that basename of the directory matches the unscoped portion).

**Plan**:
- Write 5 failing tests:
  1. Flags package.json where dirname doesn't match unscoped name — e.g., file `/workspace/packages/foo/package.json` with `name: "@scope/bar"` — assert `results.length === 1`
  2. Passes package.json where dirname matches — e.g., `/workspace/packages/foo/package.json` with `name: "@scope/foo"` — assert `results.length === 0`
  3. Passes unscoped package name matching dirname — assert `results.length === 0`
  4. Ignores root package.json (path without `/packages/`) — assert `results.length === 0`
  5. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/require-package-name-matches-path.ts`:
  - Iterate `allFiles()`, filter `package.json`
  - Get `dirname(filePath)` → `basename(dir)` for directory name
  - Get `parsed.name` → strip scope (`name.replace(/^@[^/]+\//, '')`) for unscoped name
  - If unscoped name !== directory name, report `'error'`

**Files**:
- Create: `rules/workspace/require-package-name-matches-path.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests

**Verification**: Tests assert `severity === 'error'`, message contains actual name and expected name

---

## TASK 9 — `workspace/no-invalid-package-version`

**Status**: [x]

**Gap**: Shell function `check::package_version_consistency` validates version is valid semver or `workspace:*` (only if `private: true`). No TypeScript equivalent exists.

**Plan**:
- Write 6 failing tests:
  1. Flags missing `version` — assert `results.length === 1`, `severity === 'error'`
  2. Flags invalid version string `"abc"` — assert `results.length === 1`
  3. Flags `workspace:*` in non-private package — assert `results.length === 1`
  4. Passes valid semver `"1.2.3"` — assert `results.length === 0`
  5. Passes `workspace:*` in private package — assert `results.length === 0`
  6. Passes prerelease `"0.1.0-beta.1"` — assert `results.length === 0`
- Create `rules/workspace/no-invalid-package-version.ts`:
  - `SEMVER_REGEX = /^([0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?)$/`
  - Iterate `allFiles()`, filter `package.json`, parse JSON
  - If `version` is empty/missing, report error
  - If `version === 'workspace:*'` and `parsed.private !== true`, report error
  - If not `workspace:*` and doesn't match SEMVER_REGEX, report error

**Files**:
- Create: `rules/workspace/no-invalid-package-version.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 6 tests

**Verification**: Tests assert `severity === 'error'`, message contains version string

---

## TASK 10 — `workspace/require-package-metadata`

**Status**: [x]

**Gap**: Shell function `check::package_metadata_consistency` compares `author`, `homepage`, `repository`, `bugs` fields across all packages against root `package.json`. No TypeScript equivalent exists.

**Plan**:
- Write 5 failing tests:
  1. Flags package with different `author.name` than root — assert `results.length >= 1`, `severity === 'warning'`
  2. Flags package with missing `homepage` when root has it — assert `results.length >= 1`
  3. Passes package matching root metadata — assert `results.length === 0`
  4. Skips root package.json itself — assert `results.length === 0` when only root exists
  5. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/require-package-metadata.ts`:
  - Iterate `allFiles()`, filter `package.json`, collect all pkg files
  - Find root `package.json` (closest to `ctx.rootDir`)
  - Parse root, extract `author.name`, `homepage`, `repository.url`, `bugs.url`
  - For each other package.json, compare these fields
  - Severity: `'warning'` (per shell function using `log WARN` for this one and per approved changelog)

**Files**:
- Create: `rules/workspace/require-package-metadata.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests

**Verification**: Tests assert `severity === 'warning'`, message contains the inconsistent field name

---

## TASK 11 — `workspace/require-workspace-protocol`

**Status**: [x]

**Gap**: Shell function `check::workspace_dependency_versions` checks that internal scoped dependencies use `workspace:*`. No TypeScript equivalent exists.

**Plan**:
- Write 5 failing tests:
  1. Flags internal scoped dep with version `"^1.0.0"` instead of `"workspace:*"` — assert `results.length === 1`, `severity === 'error'`
  2. Flags internal dep in `devDependencies` — assert `results.length === 1`
  3. Passes internal dep with `"workspace:*"` — assert `results.length === 0`
  4. Passes external dep (different scope) — assert `results.length === 0`
  5. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/require-workspace-protocol.ts`:
  - Uses `ctx.getWorkspacePackages()` to get list of workspace package names
  - Iterate `allFiles()`, filter `package.json`, parse JSON
  - For each dep field (`dependencies`, `devDependencies`, `peerDependencies`), check if dep name is in workspace packages
  - If internal dep and version doesn't start with `workspace:`, report `'error'`

**Files**:
- Create: `rules/workspace/require-workspace-protocol.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests

**Verification**: Tests assert `severity === 'error'`, message contains dep name and current version

---

## TASK 12 — `workspace/no-script-conflicts`

**Status**: [x]

**Gap**: Shell function `check::package_script_conflicts` detects same-named scripts with different values across packages. No TypeScript equivalent exists.

**Plan**:
- Write 4 failing tests:
  1. Flags two packages with same script name but different values — assert `results.length >= 1`, `severity === 'warning'`
  2. Passes two packages with same script name and same value — assert `results.length === 0`
  3. Passes single package — assert `results.length === 0`
  4. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/no-script-conflicts.ts`:
  - First pass: iterate `allFiles()`, filter `package.json`, parse JSON, collect all scripts into `Map<string, { value: string; file: string }>`
  - Second pass: for each script key, if different values found across packages, report `'warning'`
  - Note: This rule needs a `finalize` approach — collect all scripts, then compare. Use two-pass inside `check()`.

**Files**:
- Create: `rules/workspace/no-script-conflicts.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'warning'`, message contains script name

---

## TASK 13 — `workspace/require-package-author`

**Status**: [x]

**Gap**: Shell function `check::validate_package_author` checks all packages declare an `author` field (string or object with `name`). No TypeScript equivalent exists.

**Plan**:
- Write 4 failing tests:
  1. Flags package.json with missing `author` — assert `results.length === 1`, `severity === 'error'`
  2. Flags package.json with `author: null` — assert `results.length === 1`
  3. Passes package.json with `author: "Some Author"` — assert `results.length === 0`
  4. Passes package.json with `author: { name: "Some Author" }` — assert `results.length === 0`
- Create `rules/workspace/require-package-author.ts`:
  - Iterate `allFiles()`, filter `package.json`, parse JSON
  - Check `parsed.author` — must be non-empty string OR object with non-empty `name` property
  - If missing or invalid, report `'error'`

**Files**:
- Create: `rules/workspace/require-package-author.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'error'`, message contains `author`

---

## TASK 14 — `workspace/no-duplicate-package-names`

**Status**: [x]

**Gap**: Shell function `check::disallow_duplicate_package_names` checks that no two `package.json` files have the same `name` field. No TypeScript equivalent exists.

**Plan**:
- Write 4 failing tests:
  1. Flags two package.json files with same `name` — assert `results.length >= 1`, `severity === 'error'`
  2. Passes two package.json files with different names — assert `results.length === 0`
  3. Skips package.json with no `name` field — assert `results.length === 0`
  4. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/no-duplicate-package-names.ts`:
  - First pass: iterate `allFiles()`, collect all `package.json` files, parse JSON, build `Map<string, string[]>` of name → file paths
  - Second pass: for each name with >1 file path, report `'error'`

**Files**:
- Create: `rules/workspace/no-duplicate-package-names.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 4 tests

**Verification**: Tests assert `severity === 'error'`, message contains duplicate package name and both file paths

---

## TASK 15 — `workspace/require-spdx-license`

**Status**: [x]

**Gap**: Shell function `check::validate_spdx_license_field` validates `license` field is a valid SPDX identifier. Shell version fetches from network; TS version uses hardcoded set. No TypeScript equivalent exists.

**Plan**:
- Write 5 failing tests:
  1. Flags package.json with missing `license` — assert `results.length === 1`, `severity === 'error'`
  2. Flags package.json with invalid `license: "INVALID"` — assert `results.length === 1`
  3. Passes package.json with `license: "MIT"` — assert `results.length === 0`
  4. Passes package.json with `license: "Apache-2.0"` — assert `results.length === 0`
  5. Ignores non-package.json files — assert `results.length === 0`
- Create `rules/workspace/require-spdx-license.ts`:
  - Define `VALID_SPDX_LICENSES: ReadonlySet<string>` containing the most common SPDX identifiers (MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, GPL-2.0-only, GPL-3.0-only, LGPL-2.1-only, LGPL-3.0-only, MPL-2.0, AGPL-3.0-only, Unlicense, 0BSD, CC0-1.0, CC-BY-4.0, CC-BY-SA-4.0, WTFPL, Zlib, Artistic-2.0, BSL-1.0, PostgreSQL, EPL-2.0, EUPL-1.2, CPAL-1.0, OSL-3.0)
  - Iterate `allFiles()`, filter `package.json`, parse JSON
  - Check `parsed.license` — must be a string and in `VALID_SPDX_LICENSES`
  - If missing or invalid, report `'error'`

**Files**:
- Create: `rules/workspace/require-spdx-license.ts`
- Modify: `rules/workspace/workspace-rules.test.ts` — add import + 5 tests

**Verification**: Tests assert `severity === 'error'`, message contains `license` or invalid value

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Gap**: All 15 new rules must be registered in `.resist-lint.jsonc` config file to be active.

**Plan**:
- Add 15 new rule entries to `.resist-lint.jsonc` in alphabetical order within the `"workspace/"` section:
  - `"workspace/no-duplicate-package-names": "error"`
  - `"workspace/no-invalid-package-version": "error"`
  - `"workspace/no-optional-dependencies": "error"`
  - `"workspace/no-script-conflicts": "warn"`
  - `"workspace/no-tarball-deps": "error"`
  - `"workspace/no-wildcard-versions": "error"`
  - `"workspace/require-package-author": "error"`
  - `"workspace/require-package-description": "error"`
  - `"workspace/require-package-metadata": "warn"`
  - `"workspace/require-package-name-matches-path": "error"`
  - `"workspace/require-package-name-version": "error"`
  - `"workspace/require-package-schema": "error"`
  - `"workspace/require-spdx-license": "error"`
  - `"workspace/require-workspace-protocol": "error"`
  - `"workspace/validate-package-entrypoints": "error"`
- Verify config total: 170 + 15 = 185 rules

**Files**:
- Modify: `.resist-lint.jsonc` — add 15 entries in alphabetical order

**Verification**: Count total rule entries, verify each new rule is present

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Gap**: After all 15 rules + registration, run full QA to confirm no regressions.

**Plan**:
- Run type-check: `pnpm -w run qa:lint --tools`
- Run all tests: `pnpm --filter @/lint qa:test`
- Run format check: `pnpm -w run qa:format:check`
- Run coverage: `pnpm --filter @/lint qa:test:coverage`
- Verify all thresholds met: statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%
- Verify total test count: should be at baseline + ~68 new tests

**Files**:
- None (verification only)

**Verification**: All QA commands pass, coverage above thresholds, test count increased

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Gap**: Ensure all 15 rules are implemented correctly, registered, and committed.

**Plan**:
- Verify each of the 15 rule files exists in `rules/workspace/`
- Verify each rule has correct `id`, `scope`, `categories`, `stages`, `fixable` properties
- Verify all 15 rules are registered in `.resist-lint.jsonc`
- Verify total workspace rule file count: 105 + 15 = 120
- Run final QA: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`
- Commit: `git add` specific files + `git commit`

**Files**:
- All 15 new rule files + test file + config file

**Verification**: All assertions from individual tasks hold, final QA passes, commit succeeds
