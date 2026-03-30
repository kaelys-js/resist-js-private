# @/lint Phase 23 — TSConfig, Wrangler, Infrastructure & Store Safety

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 shell `check::` functions to TypeScript workspace rules — tsconfig validation, Wrangler/Cloudflare checks, infrastructure rules, config consistency, and store safety.
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
| Tests | 3300 pass / 0 fail |
| Type-check | Passes |
| Coverage (stmt/branch/func/line) | 92.09% / 79.12% / 87.91% / 92.08% |
| Shell check:: remaining | 369 |
| Shell ported:: count | 30 |

---

## TASK 1 — workspace/no-tsconfig-duplicate-extends

**Status**: [x]

**Gap**: Shell `check::disallow_tsconfig_duplicate_extends_chain` (line 2446) follows extends chains in tsconfig.json, detects duplicate/circular base inheritance. No TS equivalent.

**Plan**:
- Create `no-tsconfig-duplicate-extends.ts` — finds all tsconfig*.json files, follows extends chains, detects when two tsconfigs extend the same base or form circular chains
- Add tests: duplicate extends detected, circular extends detected, clean chain passes, no extends clean
- Run QA

**Files**:
- Create: `rules/workspace/no-tsconfig-duplicate-extends.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on duplicate/circular extends chains, clean on valid configs.

---

## TASK 2 — workspace/validate-tsconfig-rootdir-layout

**Status**: [x]

**Gap**: Shell `check::tsconfig_rootdir_layout` (line 5071) warns when rootDir is outside src/, packages/, or apps/. No TS equivalent.

**Plan**:
- Create `validate-tsconfig-rootdir-layout.ts` — reads tsconfig.json files, checks compilerOptions.rootDir against standard layout directories
- Severity: warning
- Add tests: rootDir outside standard warned, rootDir at src/ clean, no rootDir clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-tsconfig-rootdir-layout.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning on non-standard rootDir, clean when aligned or absent.

---

## TASK 3 — workspace/no-tsconfig-outdir-rootdir-files

**Status**: [x]

**Gap**: Shell `check::tsconfig_outdir_rootdir_files` (line 5116) warns when monorepo tsconfigs use outDir, rootDir, or files instead of include/exclude. No TS equivalent.

**Plan**:
- Create `no-tsconfig-outdir-rootdir-files.ts` — checks tsconfigs inside packages/ for outDir, rootDir, or files fields
- Severity: warning
- Add tests: outDir in monorepo warned, rootDir warned, files warned, root tsconfig excluded, clean tsconfig passes
- Run QA

**Files**:
- Create: `rules/workspace/no-tsconfig-outdir-rootdir-files.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning on outDir/rootDir/files in monorepo tsconfigs, clean otherwise.

---

## TASK 4 — workspace/validate-tsconfig-include-patterns

**Status**: [x]

**Gap**: Shell `check::tsconfig_include_exclude_patterns` (line 5167) checks that include/exclude globs are syntactically valid. No TS equivalent.

**Plan**:
- Create `validate-tsconfig-include-patterns.ts` — validates include/exclude arrays in tsconfigs for empty strings, absolute paths
- Add tests: empty include pattern detected, absolute path in exclude detected, valid patterns clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-tsconfig-include-patterns.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on empty/absolute patterns, clean on valid globs.

---

## TASK 5 — workspace/validate-wrangler-cron-syntax

**Status**: [x]

**Gap**: Shell `check::validate_wrangler_cron_syntax` (line 3706) validates 5-field cron expressions in wrangler.json. No TS equivalent.

**Plan**:
- Create `validate-wrangler-cron-syntax.ts` — finds wrangler.json files, reads triggers.cron arrays (and env-level), validates 5-field cron format with range checks
- Add tests: valid cron clean, invalid field count, out-of-range values, no wrangler file clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-wrangler-cron-syntax.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on invalid cron syntax, clean on valid expressions.

---

## TASK 6 — workspace/wrangler-name-matches-package

**Status**: [x]

**Gap**: Shell `check::wrangler_name_matches_package` (line 3775) ensures wrangler.json name matches package.json name. No TS equivalent.

**Plan**:
- Create `wrangler-name-matches-package.ts` — finds wrangler.json, reads sibling package.json, compares names (stripping @scope/)
- Add tests: matching names clean, mismatched names error, missing wrangler clean
- Run QA

**Files**:
- Create: `rules/workspace/wrangler-name-matches-package.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on name mismatch, clean when matching.

---

## TASK 7 — workspace/wrangler-main-entrypoint-exists

**Status**: [x]

**Gap**: Shell `check::wrangler_main_entrypoint_exists` (line 3846) checks wrangler.json main field points to existing file. No TS equivalent.

**Plan**:
- Create `wrangler-main-entrypoint-exists.ts` — reads wrangler.json, checks main field, verifies file exists via fileExists()
- Add tests: existing main clean, missing main error, no main field clean
- Run QA

**Files**:
- Create: `rules/workspace/wrangler-main-entrypoint-exists.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on missing entrypoint, clean when file exists.

---

## TASK 8 — workspace/wrangler-binding-names-unique

**Status**: [x]

**Gap**: Shell `check::wrangler_binding_names_unique` (line 3913) detects duplicate binding names across wrangler.json files. No TS equivalent.

**Plan**:
- Create `wrangler-binding-names-unique.ts` — extracts binding names from kv_namespaces, r2_buckets, d1_databases, durable_objects.bindings across all wrangler.json files
- Add tests: duplicate KV binding detected, unique bindings clean, multiple binding types clean
- Run QA

**Files**:
- Create: `rules/workspace/wrangler-binding-names-unique.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on duplicate bindings, clean on unique names.

---

## TASK 9 — workspace/no-forbidden-node-imports-in-workers

**Status**: [x]

**Gap**: Shell `check::cloudflare_workers_node_compat` (line 6919) blocks forbidden Node.js module imports in Worker code. No TS equivalent.

**Plan**:
- Create `no-forbidden-node-imports-in-workers.ts` — identifies Worker packages (containing wrangler.json), scans source files for forbidden Node imports (fs, path, os, net, child_process, etc.)
- Add tests: fs import in worker detected, path import detected, non-worker file excluded, clean worker passes
- Run QA

**Files**:
- Create: `rules/workspace/no-forbidden-node-imports-in-workers.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on forbidden Node imports in workers, clean otherwise.

---

## TASK 10 — workspace/no-hardcoded-localhost-ports

**Status**: [x]

**Gap**: Shell `check::no_hardcoded_localhost_ports` (line 6612) rejects hardcoded localhost:3000/5000/8000 and 127.0.0.1 URLs. No TS equivalent.

**Plan**:
- Create `no-hardcoded-localhost-ports.ts` — scans source files for localhost:PORT and 127.0.0.1 patterns, excludes test/config files
- Add tests: localhost:3000 detected, 127.0.0.1 detected, test file excluded, clean source passes
- Run QA

**Files**:
- Create: `rules/workspace/no-hardcoded-localhost-ports.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on hardcoded localhost URLs, clean on proper code.

---

## TASK 11 — workspace/no-migration-tempfiles

**Status**: [x]

**Gap**: Shell `check::migrations_no_tempfiles` (line 5317) rejects *.bak, *.tmp, *.swp, *~ in migrations/. No TS equivalent.

**Plan**:
- Create `no-migration-tempfiles.ts` — checks paths containing /migrations/ for temp file extensions
- Add tests: .bak in migrations detected, .tmp detected, normal .sql clean, tempfile outside migrations clean
- Run QA

**Files**:
- Create: `rules/workspace/no-migration-tempfiles.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on temp files in migrations/, clean on normal files.

---

## TASK 12 — workspace/no-nonpreferred-image-formats

**Status**: [x]

**Gap**: Shell `check::disallow_nonpreferred_image_formats` (line 7286) blocks .png/.jpg/.jpeg/.gif/.tiff/.bmp. No TS equivalent.

**Plan**:
- Create `no-nonpreferred-image-formats.ts` — checks for blocked image extensions, allows .webp/.svg/.ico
- Add tests: .png detected, .jpg detected, .webp clean, .svg clean, .ico clean
- Run QA

**Files**:
- Create: `rules/workspace/no-nonpreferred-image-formats.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on blocked formats, clean on preferred formats.

---

## TASK 13 — workspace/validate-formatting-config-consistency

**Status**: [x]

**Gap**: Shell `check::formatting_config_consistency` (line 7050) ensures .editorconfig/biome/vscode agree on formatting. No TS equivalent.

**Plan**:
- Create `validate-formatting-config-consistency.ts` — reads .editorconfig, biome.base.json/biome.json, .vscode/settings.json, compares indent style/size/line endings
- Add tests: indent size mismatch detected, indent style mismatch detected, all aligned clean, missing files clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-formatting-config-consistency.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on mismatched formatting config, clean when aligned.

---

## TASK 14 — workspace/validate-nanostores-safety

**Status**: [x]

**Gap**: Shell `check::nanostores_safety` (line 9660) validates nanostores usage patterns. No TS equivalent.

**Plan**:
- Create `validate-nanostores-safety.ts` — detects .set() on atom() stores, process.env access in store files, side effects (localStorage/fetch), validates persistentAtom key format
- Add tests: atom+set mutation detected, process.env in store detected, side effects warned, valid store clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-nanostores-safety.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error/warning on unsafe patterns, clean on proper stores.

---

## TASK 15 — workspace/validate-tsconfig-paths-resolution

**Status**: [x]

**Gap**: Shell `check::tsconfig_paths_resolution` (line 5217) verifies compilerOptions.paths entries are syntactically valid. No TS equivalent.

**Plan**:
- Create `validate-tsconfig-paths-resolution.ts` — checks paths entries for empty arrays, empty strings
- Add tests: empty paths array detected, empty path string detected, valid paths clean, no paths field clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-tsconfig-paths-resolution.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on invalid paths entries, clean on valid paths.

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Gap**: 15 new rules need registration in `.resist-lint.jsonc`.

**Plan**:
- Add all 15 rule IDs to `.resist-lint.jsonc` rules section
- Run QA to verify config is valid

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All 15 rules appear in config. QA passes.

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Gap**: Need to verify all tests pass and coverage thresholds met after adding 15 rules.

**Plan**:
- Run `pnpm --filter @/lint qa:type-check`
- Run `pnpm -w run qa:lint`
- Run `pnpm -w run qa:format:check`
- Run `pnpm --filter @/lint qa:test`
- Run `pnpm --filter @/lint qa:test:coverage`
- Verify: statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%

**Files**: None

**Verification**: All QA commands pass. Coverage meets thresholds.

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Gap**: Need final verification before commit.

**Plan**:
- Verify all 15 rule files exist and are correctly structured
- Verify all 15 rules are registered in `.resist-lint.jsonc`
- Verify all tests pass (expected: ~3370+ tests)
- Verify shell file has 15 new `ported::` renames (total: 45 ported::)
- Commit with descriptive message

**Files**: All Phase 23 files

**Verification**:
- `ls` confirms all 15 rule files exist in `rules/workspace/`
- `grep -c 'ported::' common.checks.sh` shows 45
- `pnpm --filter @/lint qa:test` shows all tests pass
- `git diff --stat` shows expected file count
