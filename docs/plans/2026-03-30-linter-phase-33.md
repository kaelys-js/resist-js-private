# @/lint Phase 33 — GitLab CI, Shell Docblocks, Workspace & MR Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`
**Goal**: Port 16 CI/shell/workspace/MR check functions (14 new TS rules + 2 duplicates) covering GitLab CI config validation, shell function docblocks, wrangler auth, CLI tool checks, spelling, and MR metadata enforcement. CI YAML rules parse raw file content with regex. External tool rules use `execSync`. MR rules read `process.env`.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, async `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`). External tool rules use `execSync` from `node:child_process`. MR rules read `process.env` for CI environment variables.

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
| Tests | 4158 pass / 0 fail |
| Type-check | Passes |
| check:: remaining | 146 |
| ported:: count | 12 |

---

## TASK 1 — `workspace/gitlab-ci-file-required`

**Status**: [x]

**Shell origin**: `check::gitlab_ci_file_exists` (line 25)
**What**: `.gitlab-ci.yml` must exist at the project root
**Branches**:
- `.gitlab-ci.yml` missing from root → error
- `.gitlab-ci.yml` exists → pass

**Files**:
- Create: `src/rules/workspace/gitlab-ci-file-required.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error when file is missing

---

## TASK 2 — `workspace/gitlab-ci-schema-header`

**Status**: [x]

**Shell origin**: `check::gitlab_ci_yaml_schema_headers` (line 63)
**What**: All GitLab CI YAML files must include `# yaml-language-server: $schema=https://gitlab.com/...` as the first line
**Branches**:
- CI YAML file missing schema header → error
- CI YAML file with correct header → pass
- Non-CI YAML files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/gitlab-ci-schema-header.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing schema header

---

## TASK 3 — `workspace/gitlab-ci-yaml-syntax`

**Status**: [x]

**Shell origin**: `check::gitlab_ci_yaml_valid_syntax` (line 120)
**What**: GitLab CI YAML files must be parseable YAML (basic structural validation — balanced colons, no tabs for indentation, no duplicate top-level keys)
**Branches**:
- CI YAML with invalid structure → error
- CI YAML with valid structure → pass
- Non-CI YAML files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/gitlab-ci-yaml-syntax.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for invalid YAML

---

## TASK 4 — `workspace/gitlab-ci-stages-declared`

**Status**: [x]

**Shell origin**: `check::gitlab_ci_stages_defined` (line 174)
**What**: Root `.gitlab-ci.yml` must contain a top-level `stages:` key
**Branches**:
- `.gitlab-ci.yml` missing `stages:` → error
- `.gitlab-ci.yml` with `stages:` → pass
- `.gitlab-ci.yml` not found → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/gitlab-ci-stages-declared.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing stages declaration

---

## TASK 5 — `workspace/gitlab-ci-includes-valid`

**Status**: [x]

**Shell origin**: `check::gitlab_ci_includes_exist` (line 218)
**What**: All `- local:` include paths in `.gitlab-ci.yml` must resolve to existing files
**Branches**:
- Include path does not exist → error
- All include paths exist → pass
- No includes → pass
- `.gitlab-ci.yml` not found → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/gitlab-ci-includes-valid.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for broken include paths

---

## TASK 6 — `workspace/shell-function-docblocks`

**Status**: [x]

**Shell origin**: `check::check_function_docblocks` (line 261)
**What**: All `check::*` functions in `.sh` files must have: `# ✅ Check:` comment, `# Category:` comment, `# Stages:` comment, no raw `echo`/`printf`, `return 1` (not `exit 1`) after `log FATAL`
**Branches**:
- Missing `# ✅ Check:` inline comment → error
- Missing `# Category:` inline comment → error
- Missing `# Stages:` inline comment → error
- Contains raw echo/printf → error
- Uses `exit 1` instead of `return 1` → error
- Has `log FATAL` but no `return 1` → error
- Properly formatted function → pass
- Non-.sh files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/shell-function-docblocks.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for each violation type

---

## TASK 7 — `workspace/gitlab-ci-jobs-have-script`

**Status**: [x]

**Shell origin**: `check::validate_gitlab_ci_jobs_have_script` (line 363)
**What**: Every CI job key (excluding `stages`, `include`, `default`, `workflow`, `variables`, `before_script`, `after_script`) must have a `script:` entry
**Branches**:
- CI job missing `script:` → error
- CI job with `script:` → pass
- Non-job keys (stages/include/etc) → skip
- Non-CI YAML files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/gitlab-ci-jobs-have-script.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for jobs without script

---

## TASK 8 — `workspace/gitlab-ci-standard-naming`

**Status**: [x]

**Shell origin**: `check::enforce_standard_gitlab_job_naming` (line 434)
**What**: CI job names must use approved prefixes (`setup`, `install`, `lint`, `test`, `build`, `deploy`, `release`, `publish`, `docs`, `preview`). Stage values must be from approved list (`setup`, `lint`, `test`, `build`, `deploy`, `release`).
**Branches**:
- Job name not in approved list → warning
- Stage value not in approved list → warning
- Valid job name and stage → pass
- No CI YAML files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/gitlab-ci-standard-naming.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for invalid naming

---

## TASK 9 — Duplicate Rename (no new TS rule)

**Status**: [x]

`check::validate_gitlab_ci_includes` (line 504) is a duplicate of `check::gitlab_ci_includes_exist` (line 218) — both validate local include paths exist.

**Plan**: Rename to `ported::` in `common.checks.sh`

---

## TASK 10 — `workspace/wrangler-authenticated`

**Status**: [x]

**Shell origin**: `check::wrangler_authenticated` (line 557)
**What**: `wrangler whoami` must succeed — wrangler CLI must be installed and authenticated
**Branches**:
- `wrangler whoami` fails → warning
- `wrangler whoami` succeeds → pass
- `wrangler` not found (execSync throws) → warning
- execSync throws → skip

**Files**:
- Create: `src/rules/workspace/wrangler-authenticated.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for unauthenticated wrangler

---

## TASK 11 — `workspace/gitlab-ci-stages-standard`

**Status**: [x]

**Shell origin**: `check::gitlab_ci_stages_defined` (line 604)
**What**: CI files must declare all required stages (`setup`, `check`, `lint`, `test`, `build`, `migrate`, `deploy`, `integration`, `docs`) in correct order. No unapproved stages allowed.
**Branches**:
- Missing required stage → error
- Unapproved stage present → error
- Incorrect stage order → error
- All stages correct → pass
- No CI YAML files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/gitlab-ci-stages-standard.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing/unapproved/misordered stages

---

## TASK 12 — Duplicate Rename (no new TS rule)

**Status**: [x]

`check::test_and_benchmark_file_naming` (line 689) is already covered by existing rules `enforce-test-file-naming` + `enforce-benchmark-file-naming`.

**Plan**: Rename to `ported::` in `common.checks.sh`

---

## TASK 13 — `workspace/cli-tools-help-version`

**Status**: [x]

**Shell origin**: `check::cli_tools_help_and_version` (line 747)
**What**: All executable CLI files in `/bin`, `/scripts` must support `--help` and `--version` flags (exit 0, output recognizable content)
**Branches**:
- CLI tool fails `--help` → warning
- CLI tool fails `--version` → warning
- CLI tool `--help` output lacks recognizable content → warning
- CLI tool passes both → pass
- No CLI files found → pass
- execSync throws → skip

**Files**:
- Create: `src/rules/workspace/cli-tools-help-version.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for missing help/version support

---

## TASK 14 — `workspace/workspace-spelling`

**Status**: [x]

**Shell origin**: `check::workspace_spelling` (line 809)
**What**: Run `cspell` with inline config across workspace. Spelling errors → warning.
**Branches**:
- cspell finds errors → warning
- cspell passes → pass
- cspell not installed (execSync throws) → skip
- execSync throws → skip

**Files**:
- Create: `src/rules/workspace/workspace-spelling.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for spelling errors

---

## TASK 15 — `workspace/mr-title-format`

**Status**: [x]

**Shell origin**: `check::mr_title_format` (line 889)
**What**: MR title (from `process.env.CI_MERGE_REQUEST_TITLE`) must match Conventional Commits pattern: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9-]+\))?: .+`
**Branches**:
- Title does not match pattern → error
- Title matches pattern → pass
- `CI_MERGE_REQUEST_TITLE` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-title-format.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for invalid MR title

---

## TASK 16 — `workspace/mr-description-required`

**Status**: [x]

**Shell origin**: `check::mr_description_required` (line 925)
**What**: MR description (from `process.env.CI_MERGE_REQUEST_DESCRIPTION`) must not be empty or "null"
**Branches**:
- Description empty or "null" → error
- Description present → pass
- `CI_MERGE_REQUEST_DESCRIPTION` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-description-required.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for empty MR description

---

## TASK 17 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add 14 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 1, 2, 3, 4, 5, 6, 7, 10, 11, 15, 16: `"error"`
- Rules 8, 9, 12, 13, 14: `"warn"`
- Rename all 16 `check::` → `ported::` in `common.checks.sh` (14 ported + 2 duplicates)

**Files**:
- Modify: `.resist-lint.jsonc`
- Modify: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`

**Verification**: All 14 rules in config, 16 functions renamed

---

## TASK 18 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 19 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 14 rule files exist
- Verify all 14 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Verify shell function rename count (16 renamed)
- Commit with descriptive message

**Verification**:
- All 14 `.ts` files exist in `src/rules/workspace/`
- All 14 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^ported::' common.checks.sh` increased by 16
- `grep -c '^check::' common.checks.sh` decreased by 16
