# @/lint Phase 25 — Config Integrity, Contributor Validation & Script Safety

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 shell `check::` functions to TypeScript workspace rules — CI folder validation, VSCode settings, contributor config, CODEOWNERS, shebang portability, tsconfig paths, script descriptions, wrangler tail consumers, shell script references, env file integrity, wrangler config, DB name safety, monorepo schema, and workspace deps.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, async `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`, `fileExists()`, `dirExists()`, `getWorkspacePackages()`).

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
| Tests | 3453 total (3451 pass / 2 pre-existing fail) |
| Type-check | Passes |
| Shell check:: remaining | 338 |
| Shell ported:: count | 61 |

---

## TASK 1 — workspace/validate-ci-folder-structure

**Status**: [x]

**Gap**: `check::gitlab_folder_structure` enforces `.gitlab/` only contains `.yml`, `.yaml`, `.schema.json`, `.json`. Port to TypeScript, generalize to also check `.github/`.

**Plan**:
- Write rule that scans `.github/` and `.gitlab/` directories
- Flag files not matching valid CI config extensions (`.yml`, `.yaml`, `.json`, `.jsonc`)
- Write tests: clean dir passes, invalid file type errors, missing dir skips
- Run QA

**Files**:
- Create: `src/rules/workspace/validate-ci-folder-structure.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — workspace/require-vscode-settings

**Status**: [x]

**Gap**: `check::vscode_settings_present` requires `.vscode/settings.json` to exist. Port to TypeScript using `fileExists()`.

**Plan**:
- Write rule that checks `fileExists('.vscode/settings.json')`
- Write tests: file exists passes, missing errors
- Run QA

**Files**:
- Create: `src/rules/workspace/require-vscode-settings.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — workspace/no-empty-vscode-settings

**Status**: [x]

**Gap**: `check::vscode_settings_not_empty` ensures `.vscode/settings.json` is not a zero-byte file.

**Plan**:
- Write rule that reads `.vscode/settings.json` and checks content is non-empty
- Write tests: non-empty passes, empty errors, missing file skips
- Run QA

**Files**:
- Create: `src/rules/workspace/no-empty-vscode-settings.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — workspace/validate-all-contributorsrc

**Status**: [x]

**Gap**: `check::validate_all_contributorsrc` validates `.all-contributorsrc` JSON: required fields (`$schema`, `projectName`), `contributors` array with valid `login` and `contributions`.

**Plan**:
- Write rule that reads/parses `.all-contributorsrc` JSON
- Check: `$schema` present, `projectName` present, `contributors` is array, each contributor has `login` (string) and `contributions` (non-empty array)
- Write tests: valid passes, missing fields error, invalid contributors error, missing file skips
- Run QA

**Files**:
- Create: `src/rules/workspace/validate-all-contributorsrc.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — workspace/validate-codeowners

**Status**: [x]

**Gap**: `check::validate_gitlab_codeowners` validates CODEOWNERS: exists, not empty, each entry has path + owner.

**Plan**:
- Write rule that reads `CODEOWNERS` or `.github/CODEOWNERS` or `.gitlab/CODEOWNERS`
- Check: file not empty, each non-comment non-blank line has path and at least one owner
- Write tests: valid passes, missing owner errors, empty file errors, comments skipped
- Run QA

**Files**:
- Create: `src/rules/workspace/validate-codeowners.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — workspace/prefer-env-bash-shebang

**Status**: [x]

**Gap**: `check::warn_bash_shebang_on_portable_scripts` warns when `.sh` files use `#!/bin/bash` instead of `#!/usr/bin/env bash`. Different from existing `no-missing-shebang` which checks for presence.

**Plan**:
- Write rule scanning `.sh` files for `#!/bin/bash` shebang
- Warn (not error) — suggest `#!/usr/bin/env bash` for portability
- Write tests: env bash passes, /bin/bash warns, no shebang skips (handled by other rule)
- Run QA

**Files**:
- Create: `src/rules/workspace/prefer-env-bash-shebang.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 7 — workspace/validate-tsconfig-path-aliases

**Status**: [x]

**Gap**: `check::validate_tsconfig_paths` validates tsconfig `paths` aliases resolve to existing files/dirs.

**Plan**:
- Write rule that reads `tsconfig.json` files, extracts `compilerOptions.paths`
- Check each alias target resolves to existing path relative to tsconfig dir
- Write tests: valid paths pass, broken paths error, no paths section skips
- Run QA

**Files**:
- Create: `src/rules/workspace/validate-tsconfig-path-aliases.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 8 — workspace/require-script-descriptions

**Status**: [x]

**Gap**: `check::enforce_script_descriptions` requires every package.json script to have a description in `meta.scripts.description`.

**Plan**:
- Write rule that reads package.json files, checks each script name has a matching entry in `meta.scripts.description`
- Write tests: all described passes, missing description errors, no scripts skips
- Run QA

**Files**:
- Create: `src/rules/workspace/require-script-descriptions.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 9 — workspace/wrangler-tail-consumers-unique

**Status**: [x]

**Gap**: `check::wrangler_tail_consumer_services_unique` ensures `tail_consumers[].service` names are globally unique across all wrangler.json files and environments.

**Plan**:
- Write rule that reads all wrangler.json files, extracts tail_consumers from top-level and env-level
- Track service names globally, flag duplicates
- Write tests: unique passes, duplicates error, no tail_consumers skips
- Run QA

**Files**:
- Create: `src/rules/workspace/wrangler-tail-consumers-unique.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 10 — workspace/no-unreferenced-shell-scripts

**Status**: [x]

**Gap**: `check::detect_unreferenced_shell_scripts` warns if scripts/*.sh files aren't referenced in package.json, CI files, or docs.

**Plan**:
- Write rule that finds `scripts/*.sh` files, then searches all workspace files for references to each script basename
- Warn (not error) on unreferenced scripts
- Write tests: referenced passes, unreferenced warns, no scripts dir skips
- Run QA

**Files**:
- Create: `src/rules/workspace/no-unreferenced-shell-scripts.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 11 — workspace/validate-env-file-integrity

**Status**: [x]

**Gap**: `check::env_file_integrity` validates .env files: no duplicate keys, no tabs, no unclosed quotes, no merge markers.

**Plan**:
- Write rule that reads `.env` files and checks line-by-line syntax
- Check: duplicate keys, tabs in values, unclosed quotes, unresolved merge conflict markers
- Write tests: valid passes, duplicate keys error, tabs error, unclosed quotes error, merge markers error
- Run QA

**Files**:
- Create: `src/rules/workspace/validate-env-file-integrity.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 12 — workspace/validate-wrangler-config

**Status**: [x]

**Gap**: `check::wrangler_config_integrity` validates wrangler.json binding integrity: DO bindings need name+class_name, no placeholder class names, no duplicate binding names across KV/R2/DO.

**Plan**:
- Write rule that reads wrangler.json, validates DO bindings have `name` and `class_name` (no "Example" placeholder), checks for duplicate binding names across KV/R2/DO
- Write tests: valid passes, missing class_name errors, placeholder errors, duplicate names error
- Run QA

**Files**:
- Create: `src/rules/workspace/validate-wrangler-config.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 13 — workspace/validate-db-name-safety

**Status**: [x]

**Gap**: `check::db_name_safety` ensures D1 database names in wrangler.json are shell-safe.

**Plan**:
- Write rule that reads wrangler.json, extracts `d1_databases[].database_name`, validates against `^[a-zA-Z][a-zA-Z0-9_-]*$`
- Write tests: valid names pass, invalid names error, no d1_databases skips
- Run QA

**Files**:
- Create: `src/rules/workspace/validate-db-name-safety.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 14 — workspace/validate-monorepo-schema-example

**Status**: [x]

**Gap**: `check::monorepo_layout_example_schema_valid` validates that monorepo layout example YAML exists and matches the canonical schema.

**Plan**:
- Write rule that checks for monorepo layout schema and example files, validates both are valid YAML-parseable, and compares structure
- Write tests: matching passes, mismatched errors, missing files skip
- Run QA

**Files**:
- Create: `src/rules/workspace/validate-monorepo-schema-example.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 15 — workspace/no-unlinked-workspace-deps

**Status**: [x]

**Gap**: `check::detect_unlinked_workspace_dependencies` warns if `workspace:*` deps don't match actual workspace packages.

**Plan**:
- Write rule using `getWorkspacePackages()` to get actual packages, then scan all package.json deps for `workspace:*` references that don't match a real package name
- Write tests: linked passes, unlinked errors, no workspace deps skips
- Run QA

**Files**:
- Create: `src/rules/workspace/no-unlinked-workspace-deps.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add all 15 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 1-5, 7-9, 11-15: `"error"`
- Rule 6 (prefer-env-bash-shebang): `"warn"`
- Rule 10 (no-unreferenced-shell-scripts): `"warn"`

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All rules appear in config

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm --filter @/lint qa:test:coverage`
- Verify coverage thresholds: statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%

**Verification**: All commands exit 0, all thresholds met

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 15 rule files exist
- Verify all 15 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Verify shell function rename count (338→323 check::, 61→76 ported::)
- Commit with descriptive message

**Verification**:
- All 15 `.ts` files exist in `src/rules/workspace/`
- All 15 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^ported::' common.checks.sh` returns 76
- `grep -c '^check::' common.checks.sh` returns 323

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | validate-ci-folder-structure | — |
| 2 | require-vscode-settings | — |
| 3 | no-empty-vscode-settings | — |
| 4 | validate-all-contributorsrc | — |
| 5 | validate-codeowners | — |
| 6 | prefer-env-bash-shebang | — |
| 7 | validate-tsconfig-path-aliases | — |
| 8 | require-script-descriptions | — |
| 9 | wrangler-tail-consumers-unique | — |
| 10 | no-unreferenced-shell-scripts | — |
| 11 | validate-env-file-integrity | — |
| 12 | validate-wrangler-config | — |
| 13 | validate-db-name-safety | — |
| 14 | validate-monorepo-schema-example | — |
| 15 | no-unlinked-workspace-deps | — |
| 16 | Register rules in config | 1-15 |
| 17 | Full QA + Coverage | 16 |
| 18 | Final verification + commit | 17 |
