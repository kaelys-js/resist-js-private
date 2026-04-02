# @/lint Phase 24 — Monorepo Layout, Wrangler Routes, File Integrity & Validation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 shell `check::` functions to TypeScript workspace rules — monorepo layout validation, wrangler route/env/binding checks, file integrity, and script/migration validation.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, async `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`, `fileExists()`, `getWorkspacePackages()`).

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
| Tests | 3388 pass / 0 fail |
| Type-check | Passes |
| Coverage (stmt/branch/func/line) | 92.09% / 79.12% / 87.91% / 92.08% |
| Shell check:: remaining | 353 |
| Shell ported:: count | 46 |

---

## TASK 1 — workspace/no-oversized-commits

**Status**: [x]

**Gap**: Shell `check::commit_too_large` (line 24) warns when >50 files are modified. No TS equivalent.

**Plan**:
- Create `no-oversized-commits.ts` — counts all files yielded by allFiles(), warns if total exceeds a high threshold (adapted from commit-level to workspace-level file count awareness)
- Add tests: large file count warned, normal count clean
- Run QA

**Files**:
- Create: `rules/workspace/no-oversized-commits.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning on >50 files, clean on ≤50.

---

## TASK 2 — workspace/enforce-docs-location

**Status**: [x]

**Gap**: Shell `check::markdown_docs_location` (line 149) enforces Markdown files at root or docs/. No TS equivalent.

**Plan**:
- Create `enforce-docs-location.ts` — checks .md files are at repo root or under docs/ directory
- Add tests: .md in packages/app/ flagged, .md at root clean, .md in docs/ clean, README.md in package clean
- Run QA

**Files**:
- Create: `rules/workspace/enforce-docs-location.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on misplaced .md, clean on root/docs/.

---

## TASK 3 — workspace/validate-monorepo-layout

**Status**: [x]

**Gap**: Shell `check::monorepo_layout_schema` (line 718) validates directory structure matches schema. No TS equivalent.

**Plan**:
- Create `validate-monorepo-layout.ts` — verifies expected top-level dirs exist (packages/, docs/) using dirExists()
- Add tests: missing packages/ flagged, all present clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-monorepo-layout.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on missing dirs, clean on valid layout.

---

## TASK 4 — workspace/validate-yaml-schema-directives

**Status**: [x]

**Gap**: Shell `check::validate_yaml_language_server_schemas` (line 858) checks yaml-language-server schema directives. No TS equivalent.

**Plan**:
- Create `validate-yaml-schema-directives.ts` — finds .yml/.yaml files, checks `# yaml-language-server: $schema=` directives have well-formed URLs
- Add tests: malformed URL flagged, valid URL clean, no directive clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-yaml-schema-directives.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on malformed schema URLs, clean on valid.

---

## TASK 5 — workspace/validate-json-schema-fields

**Status**: [x]

**Gap**: Shell `check::validate_json_schemas` (line 994) checks $schema fields in JSON. No TS equivalent.

**Plan**:
- Create `validate-json-schema-fields.ts` — finds JSON files with `"$schema"`, validates URL is well-formed
- Add tests: invalid $schema flagged, valid $schema clean, no $schema clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-json-schema-fields.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on invalid $schema, clean on valid.

---

## TASK 6 — workspace/validate-makefiles

**Status**: [x]

**Gap**: Shell `check::validate_makefiles` (line 1198) checks Makefile syntax. No TS equivalent.

**Plan**:
- Create `validate-makefiles.ts` — checks Makefiles for CRLF line endings and spaces-instead-of-tabs in recipe lines
- Add tests: CRLF detected, spaces in recipe flagged, tabs clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-makefiles.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on CRLF/spaces, clean on proper Makefiles.

---

## TASK 7 — workspace/no-world-writable-files

**Status**: [x]

**Gap**: Shell `check::disallow_world_writable_files` (line 3324) blocks overly permissive file permissions. No TS equivalent.

**Plan**:
- Create `no-world-writable-files.ts` — scans shell scripts and config files for `chmod 777`, `chmod 666`, `chmod a+w` patterns
- Add tests: chmod 777 detected, chmod 755 clean, no chmod clean
- Run QA

**Files**:
- Create: `rules/workspace/no-world-writable-files.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on world-writable patterns, clean on safe perms.

---

## TASK 8 — workspace/no-wrangler-route-collisions

**Status**: [x]

**Gap**: Shell `check::wrangler_route_collisions` (line 3986) detects duplicate routes across wrangler.json. No TS equivalent.

**Plan**:
- Create `no-wrangler-route-collisions.ts` — collects routes from all wrangler.json files (top-level and env), detects duplicates
- Add tests: duplicate route flagged, unique routes clean, env-level routes checked
- Run QA

**Files**:
- Create: `rules/workspace/no-wrangler-route-collisions.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on duplicate routes, clean on unique.

---

## TASK 9 — workspace/wrangler-bindings-consistent-envs

**Status**: [x]

**Gap**: Shell `check::wrangler_bindings_consistent_across_envs` (line 4073) checks binding consistency. No TS equivalent.

**Plan**:
- Create `wrangler-bindings-consistent-envs.ts` — compares top-level bindings against env-level bindings within each wrangler.json
- Add tests: missing env binding flagged, consistent bindings clean
- Run QA

**Files**:
- Create: `rules/workspace/wrangler-bindings-consistent-envs.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on mismatched bindings, clean on consistent.

---

## TASK 10 — workspace/wrangler-binding-naming-conventions

**Status**: [x]

**Gap**: Shell `check::wrangler_binding_naming_conventions` (line 4259) validates binding name format. No TS equivalent.

**Plan**:
- Create `wrangler-binding-naming-conventions.ts` — enforces `^[a-zA-Z][a-zA-Z0-9_-]{0,62}$` on all binding names
- Add tests: invalid name flagged, valid name clean, empty name flagged
- Run QA

**Files**:
- Create: `rules/workspace/wrangler-binding-naming-conventions.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on invalid names, clean on valid format.

---

## TASK 11 — workspace/validate-wrangler-environments

**Status**: [x]

**Gap**: Shell `check::wrangler_environments_valid` (line 4353) restricts env names. No TS equivalent.

**Plan**:
- Create `validate-wrangler-environments.ts` — allows only `production` and `preview` as env names
- Add tests: staging flagged, custom env flagged, production/preview clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-wrangler-environments.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on invalid envs, clean on prod/preview.

---

## TASK 12 — workspace/no-hardcoded-service-urls

**Status**: [x]

**Gap**: Shell `check::warn_on_hardcoded_service_urls` (line 4483) warns on service URLs. No TS equivalent.

**Plan**:
- Create `no-hardcoded-service-urls.ts` — detects hardcoded private IPs (10.x, 172.16-31.x, 192.168.x) and api.cloudflare.com in source files
- Severity: warning
- Add tests: private IP flagged, api.cloudflare.com flagged, env var usage clean
- Run QA

**Files**:
- Create: `rules/workspace/no-hardcoded-service-urls.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning on hardcoded service URLs, clean on proper code.

---

## TASK 13 — workspace/no-multiple-env-files

**Status**: [x]

**Gap**: Shell `check::multiple_env_files` (line 5273) detects extra .env files. No TS equivalent.

**Plan**:
- Create `no-multiple-env-files.ts` — detects .env.* files at root beyond .env.example
- Add tests: .env.local flagged, .env.example clean, nested .env clean
- Run QA

**Files**:
- Create: `rules/workspace/no-multiple-env-files.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning on extra .env files, clean on .env.example.

---

## TASK 14 — workspace/validate-sql-migrations

**Status**: [x]

**Gap**: Shell `check::sql_integrity` (line 5379) validates migration files. No TS equivalent.

**Plan**:
- Create `validate-sql-migrations.ts` — checks migrations/ for non-.sql files, duplicate names, BOM markers
- Add tests: .txt in migrations flagged, duplicate name flagged, BOM flagged, valid .sql clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-sql-migrations.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on invalid migration files, clean on proper .sql.

---

## TASK 15 — workspace/validate-shell-scripts

**Status**: [x]

**Gap**: Shell `check::shell_scripts_integrity` (line 5528) validates .sh files. No TS equivalent.

**Plan**:
- Create `validate-shell-scripts.ts` — checks .sh files for `set -euo pipefail` strict mode presence
- Add tests: missing strict mode flagged, with strict mode clean, non-.sh clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-shell-scripts.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on missing strict mode, clean on proper scripts.

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Gap**: 15 new rules need registration in `.resist-lint.jsonc`.

**Plan**:
- Add all 15 rule IDs to `.resist-lint.jsonc` rules section with appropriate severity
- Run `pnpm -w run qa:lint --tools` to verify config is valid
- Run `pnpm --filter @/lint qa:test` to verify rules load

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All 15 rules appear in config. Type-check and tests pass.

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Gap**: Need to verify all tests pass and coverage thresholds met after adding 15 rules.

**Plan**:
- Run `pnpm -w run qa:lint --tools`
- Run `pnpm -w run qa:lint`
- Run `pnpm -w run qa:format:check`
- Run `pnpm --filter @/lint qa:test`
- Run `pnpm --filter @/lint qa:test:coverage`
- Verify: statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%

**Files**: None

**Verification**: All QA commands pass. Coverage meets thresholds. Test count ≥3458.

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Gap**: Need final verification before commit.

**Plan**:
- Verify all 15 rule files exist and are correctly structured
- Verify all 15 rules are registered in `.resist-lint.jsonc`
- Verify all tests pass (expected: ~3458+ tests)
- Verify shell file has 15 new `ported::` renames (total: 61 ported::)
- Commit with descriptive message

**Files**: All Phase 24 files

**Verification**:
- `ls` confirms all 15 rule files exist in `rules/workspace/`
- `grep -c 'ported::'` shows 61 in common.checks.sh
- `pnpm --filter @/lint qa:test` shows all tests pass with count ≥3458
- `git diff --stat` shows expected file count (15 new + 3 modified)
- All 15 rules registered in `.resist-lint.jsonc` with correct severity
