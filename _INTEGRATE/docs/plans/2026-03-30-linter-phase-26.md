# @/lint Phase 26 — CI Configuration, Docs Frontmatter & Worker Safety

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 shell `check::` functions to TypeScript workspace rules — CI YAML validation, docs frontmatter, CODEOWNERS coverage, Makefile help targets, orphaned TS files, CF worker headers, docker-compose schema, locale keys, and image optimization.
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
| Tests | 3536 total (3534 pass / 2 pre-existing fail) |
| Type-check | Passes |
| Shell check:: remaining | 322 |
| Shell ported:: count | 77 |

---

## TASK 1 — workspace/no-inline-ci-scripts

**Status**: [x]

**Gap**: `check::disallow_inline_gitlab_scripts` enforces CI jobs call external `.sh` files. Port to TypeScript, generalize to GitHub Actions + GitLab CI.

**Plan**:
- Write rule scanning CI YAML files for inline script commands
- Flag script entries that don't reference `./scripts/*.sh` or external files
- Write tests: external script passes, inline command errors, non-CI files skip

**Files**:
- Create: `src/rules/workspace/no-inline-ci-scripts.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — workspace/warn-unused-gitignore-patterns

**Status**: [x]

**Gap**: `check::warn_unused_gitignore_patterns` detects stale .gitignore entries. Port with severity warning.

**Plan**:
- Write rule reading `.gitignore`, checking each non-comment non-blank pattern against allFiles()
- Warn on patterns that match no files
- Write tests: matching patterns pass, stale patterns warn, comments skip

**Files**:
- Create: `src/rules/workspace/warn-unused-gitignore-patterns.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — workspace/no-ci-recursive-triggers

**Status**: [x]

**Gap**: `check::detect_gitlab_ci_infinite_loops` blocks CI patterns that cause recursive triggers. Port to TypeScript.

**Plan**:
- Write rule scanning CI YAML files for dangerous patterns: `git push`, `git commit`, `git rebase`, `CI_JOB_TOKEN`, `trigger:`
- Write tests: clean CI passes, recursive pattern errors

**Files**:
- Create: `src/rules/workspace/no-ci-recursive-triggers.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — workspace/require-ci-job-conditions

**Status**: [x]

**Gap**: `check::enforce_gitlab_ci_trigger_conditions` ensures CI jobs have trigger conditions. Port to TypeScript.

**Plan**:
- Write rule parsing CI YAML for job blocks, checking each has `rules:`, `only:`, `except:`, `if:`, or `on:` conditions
- Write tests: conditioned jobs pass, unconditional jobs error

**Files**:
- Create: `src/rules/workspace/require-ci-job-conditions.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — workspace/no-duplicate-ci-job-names

**Status**: [x]

**Gap**: `check::detect_duplicate_gitlab_ci_job_names` finds duplicate job names across CI files. Port to TypeScript.

**Plan**:
- Write rule collecting top-level YAML keys from all CI files, track in global map, flag duplicates
- Write tests: unique names pass, duplicates error

**Files**:
- Create: `src/rules/workspace/no-duplicate-ci-job-names.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — workspace/require-ci-job-timeouts

**Status**: [x]

**Gap**: `check::enforce_gitlab_ci_timeouts` ensures CI jobs have timeouts. Port to TypeScript.

**Plan**:
- Write rule checking CI YAML jobs for `timeout-minutes` or `timeout` fields
- Flag missing timeouts and excessive values (> 60 minutes)
- Write tests: timeout present passes, missing errors, excessive errors

**Files**:
- Create: `src/rules/workspace/require-ci-job-timeouts.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 7 — workspace/no-unused-ci-stages

**Status**: [x]

**Gap**: `check::gitlab_ci_unused_stages` detects declared but unused stages. Port to TypeScript.

**Plan**:
- Write rule extracting `stages:` array and all `stage:` references from CI YAML
- Flag stages declared but never referenced
- Write tests: all stages used passes, unused stage errors

**Files**:
- Create: `src/rules/workspace/no-unused-ci-stages.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 8 — workspace/require-codeowners-coverage

**Status**: [x]

**Gap**: `check::verify_gitlab_codeowners_coverage` ensures critical dirs are in CODEOWNERS. Port to TypeScript.

**Plan**:
- Write rule reading CODEOWNERS, checking it covers critical paths: `packages/`, `scripts/`, `.github/`, `.vscode/`
- Flag missing critical paths
- Write tests: all paths covered passes, missing path errors

**Files**:
- Create: `src/rules/workspace/require-codeowners-coverage.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 9 — workspace/validate-docs-frontmatter

**Status**: [x]

**Gap**: `check::docs_markdown_frontmatter_strict` validates frontmatter in docs. Port to TypeScript.

**Plan**:
- Write rule scanning `docs/**/*.md` files for YAML frontmatter
- Required fields: `title`, `description`, `slug`, `category`, `updated`
- Validate: description >= 10 chars, slug = kebab-case, updated = YYYY-MM-DD
- Write tests: valid frontmatter passes, missing fields error, invalid formats error

**Files**:
- Create: `src/rules/workspace/validate-docs-frontmatter.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 10 — workspace/require-makefile-help-target

**Status**: [x]

**Gap**: `check::makefile_has_help` requires Makefiles to have a `help:` target. Port to TypeScript.

**Plan**:
- Write rule scanning files named `Makefile` for `help:` target pattern
- Flag Makefiles missing the target
- Write tests: help target present passes, missing errors

**Files**:
- Create: `src/rules/workspace/require-makefile-help-target.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 11 — workspace/no-orphaned-ts-files

**Status**: [x]

**Gap**: `check::tsconfig_orphaned_ts_files` detects TS files not in any tsconfig. Port to TypeScript.

**Plan**:
- Write rule collecting all `.ts` files and all `tsconfig*.json` include patterns
- Flag `.ts` files not covered by any tsconfig include glob
- Write tests: covered files pass, orphaned files error

**Files**:
- Create: `src/rules/workspace/no-orphaned-ts-files.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 12 — workspace/no-disallowed-worker-headers

**Status**: [x]

**Gap**: `check::cloudflare_worker_disallowed_headers` prevents unsupported headers in CF Worker code. Port to TypeScript.

**Plan**:
- Write rule scanning worker files for disallowed header patterns (Transfer-Encoding, Connection, Keep-Alive, etc.)
- Flag usage in `.append()`, `.set()`, `.get()`, `new Headers()` calls
- Write tests: clean code passes, disallowed headers error

**Files**:
- Create: `src/rules/workspace/no-disallowed-worker-headers.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 13 — workspace/require-docker-compose-schema

**Status**: [x]

**Gap**: `check::docker_compose_schema_annotation` requires schema comment on docker-compose files. Port to TypeScript.

**Plan**:
- Write rule checking `docker-compose.yml`/`docker-compose.yaml` first line for schema comment
- Flag missing or incorrect schema annotation
- Write tests: schema present passes, missing errors

**Files**:
- Create: `src/rules/workspace/require-docker-compose-schema.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 14 — workspace/validate-locale-key-consistency

**Status**: [x]

**Gap**: `check::locale_key_consistency` ensures i18n keys match across locales. Port to TypeScript.

**Plan**:
- Write rule finding locale JSON files, using first locale as reference
- Compare keys across all locale files, flag missing/extra keys
- Write tests: consistent keys pass, missing keys error, extra keys error

**Files**:
- Create: `src/rules/workspace/validate-locale-key-consistency.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 15 — workspace/validate-image-optimization

**Status**: [x]

**Gap**: `check::image_optimization` warns on large/unoptimized images. Port to TypeScript with warning severity.

**Plan**:
- Write rule scanning `.webp` and `.svg` files
- Warn on `.webp` > 300KB (check content length), `.svg` > 100KB or containing whitespace patterns indicating unminified
- Write tests: small files pass, large files warn, unminified SVG warns

**Files**:
- Create: `src/rules/workspace/validate-image-optimization.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add all 15 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 1, 3-8, 10-14: `"error"`
- Rule 2 (warn-unused-gitignore-patterns): `"warn"`
- Rule 9 (validate-docs-frontmatter): `"error"`
- Rule 15 (validate-image-optimization): `"warn"`

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All rules appear in config

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 15 rule files exist
- Verify all 15 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Verify shell function rename count (322→307 check::, 77→92 ported::)
- Commit with descriptive message

**Verification**:
- All 15 `.ts` files exist in `src/rules/workspace/`
- All 15 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^ported::' common.checks.sh` returns 92
- `grep -c '^check::' common.checks.sh` returns 307

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | no-inline-ci-scripts | — |
| 2 | warn-unused-gitignore-patterns | — |
| 3 | no-ci-recursive-triggers | — |
| 4 | require-ci-job-conditions | — |
| 5 | no-duplicate-ci-job-names | — |
| 6 | require-ci-job-timeouts | — |
| 7 | no-unused-ci-stages | — |
| 8 | require-codeowners-coverage | — |
| 9 | validate-docs-frontmatter | — |
| 10 | require-makefile-help-target | — |
| 11 | no-orphaned-ts-files | — |
| 12 | no-disallowed-worker-headers | — |
| 13 | require-docker-compose-schema | — |
| 14 | validate-locale-key-consistency | — |
| 15 | validate-image-optimization | — |
| 16 | Register rules in config | 1-15 |
| 17 | Full QA + Coverage | 16 |
| 18 | Final verification + commit | 17 |
