# @/lint Phase 22 — Package Config, Script Validation, Security & Dev Tooling

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 shell `check::` functions to TypeScript workspace rules — package config validation, script enforcement, security checks, and dev tooling alignment.
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
| Tests | 3232 pass / 0 fail |
| Type-check | Passes |
| Coverage (stmt/branch/func/line) | 91.99% / 78.82% / 87.68% / 91.98% |
| Shell check:: remaining | 384 |
| Shell ported:: count | 15 |

---

## TASK 1 — workspace/no-react-native-artifacts

**Status**: [x]

**Gap**: Shell `check::disallow_react_native_configs` (line 1780) blocks React Native artifacts: `metro.config.js`, `app.json`, `/android/`, `/ios/`. No TS equivalent.

**Plan**:
- Create `no-react-native-artifacts.ts` blocking `metro.config.js`, `metro.config.ts`, and paths containing `/android/` or `/ios/` directories
- Add tests: positive detection + clean pass
- Run QA

**Files**:
- Create: `rules/workspace/no-react-native-artifacts.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on `metro.config.js`, `/android/` paths; clean on normal files.

---

## TASK 2 — workspace/no-docker-compose-v1

**Status**: [x]

**Gap**: Shell `check::disallow_docker_compose_v1` (line 1663) rejects `docker-compose.yml` with `version: "1"` or `version: "2"`. No TS equivalent.

**Plan**:
- Create `no-docker-compose-v1.ts` — finds `docker-compose.yml`/`docker-compose.yaml`, reads content, regex matches `version:` with v1/v2 values
- Add tests: v1 detected, v2 detected, v3 clean, no compose file clean
- Run QA

**Files**:
- Create: `rules/workspace/no-docker-compose-v1.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on version "1"/"2", clean on version "3.9".

---

## TASK 3 — workspace/detect-undeclared-dependencies

**Status**: [x]

**Gap**: Shell `check::detect_undeclared_dependencies` (line 2355) extracts imports from source files, checks against package.json deps. No TS equivalent.

**Plan**:
- Create `detect-undeclared-dependencies.ts` — for each package, reads package.json deps + devDeps, scans source files for imports, skips relative/alias/Node builtins, extracts root package name (scoped aware), checks declaration
- Add tests: undeclared import detected, Node builtin ignored, relative import ignored, scoped package correct extraction, all declared clean
- Run QA

**Files**:
- Create: `rules/workspace/detect-undeclared-dependencies.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on undeclared import, clean when all imports declared.

---

## TASK 4 — workspace/warn-vscode-settings-conflicts

**Status**: [x]

**Gap**: Shell `check::warn_vscode_settings_conflicts` (line 2516) compares .vscode/settings.json against .editorconfig and biome/oxlint configs. No TS equivalent.

**Plan**:
- Create `warn-vscode-settings-conflicts.ts` — reads `.vscode/settings.json` for tabSize/insertSpaces, compares against `.editorconfig` indent_size/indent_style and `biome.json` indentWidth
- Severity: warning
- Add tests: tabSize mismatch detected, insertSpaces mismatch detected, aligned settings clean, missing vscode settings clean
- Run QA

**Files**:
- Create: `rules/workspace/warn-vscode-settings-conflicts.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning on mismatched tabSize, clean when aligned.

---

## TASK 5 — workspace/validate-vscode-extensions

**Status**: [x]

**Gap**: Shell `check::validate_vscode_extensions` (line 3226) validates .vscode/extensions.json against approved list. No TS equivalent.

**Plan**:
- Create `validate-vscode-extensions.ts` — checks `.vscode/extensions.json` exists, is valid JSON, recommendations match approved list
- Add tests: missing file, invalid JSON, extra extension, missing extension, exact match clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-vscode-extensions.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on missing/mismatched extensions, clean on exact match.

---

## TASK 6 — workspace/enforce-peer-dependency-consistency

**Status**: [x]

**Gap**: Shell `check::peer_dependency_consistency` (line 6193) detects inconsistent peerDep versions and peer/dep overlap. No TS equivalent.

**Plan**:
- Create `enforce-peer-dependency-consistency.ts` — uses `getWorkspacePackages()`, builds peerDep version map, detects version mismatches and peer/dep overlap
- Add tests: version mismatch across packages, peer+dep overlap, consistent versions clean
- Run QA

**Files**:
- Create: `rules/workspace/enforce-peer-dependency-consistency.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on version mismatch and overlap, clean on consistent deps.

---

## TASK 7 — workspace/no-sensitive-public-files

**Status**: [x]

**Gap**: Shell `check::disallow_sensitive_public_files` (line 4584) blocks .env/.sql/.bak in public/ dirs. No TS equivalent.

**Plan**:
- Create `no-sensitive-public-files.ts` — checks paths containing `/public/` for `.env`, `.sql`, `.bak` extensions
- Add tests: .env in public detected, .sql in public detected, normal file in public clean, .env outside public clean
- Run QA

**Files**:
- Create: `rules/workspace/no-sensitive-public-files.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on sensitive files in public/, clean on normal files.

---

## TASK 8 — workspace/validate-root-package-config

**Status**: [x]

**Gap**: Shell `check::validate_root_package_config` (line 4634) validates root package.json tooling config. No TS equivalent.

**Plan**:
- Create `validate-root-package-config.ts` — reads root package.json, checks required devDeps, lint-staged config, packageManager format + version, engines.node target
- Add tests: missing devDep, missing lint-staged, bad packageManager format, low pnpm version, missing engines.node, valid config clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-root-package-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors on each missing/invalid config, clean on valid config.

---

## TASK 9 — workspace/validate-script-descriptions

**Status**: [x]

**Gap**: Shell `check::validate_script_descriptions` (line 4759) requires meta.scripts.description for all scripts. No TS equivalent.

**Plan**:
- Create `validate-script-descriptions.ts` — for each package.json with scripts, checks meta.scripts.description block exists and every script has a non-empty description
- Add tests: missing meta block, missing description for script, empty description, all described clean, no scripts clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-script-descriptions.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on missing descriptions, clean when all scripts documented.

---

## TASK 10 — workspace/validate-root-scripts-consistency

**Status**: [x]

**Gap**: Shell `check::validate_root_scripts_consistency` (line 4821) enforces root script set, format, and descriptions. No TS equivalent.

**Plan**:
- Create `validate-root-scripts-consistency.ts` — checks root package.json has expected scripts, non-lifecycle use `pnpm -r run <name>`, each has description, no unexpected extras
- Add tests: missing expected script, wrong format, missing description, unexpected script, valid root clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-root-scripts-consistency.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors on each violation, clean on valid root config.

---

## TASK 11 — workspace/validate-product-scripts

**Status**: [x]

**Gap**: Shell `check::validate_product_scripts` (line 4908) ensures product packages have required scripts. No TS equivalent.

**Plan**:
- Create `validate-product-scripts.ts` — uses `getWorkspacePackages()` to find product packages, checks required scripts exist
- Add tests: missing required script, all scripts present clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-product-scripts.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on missing product scripts, clean when all present.

---

## TASK 12 — workspace/no-deploy-scripts

**Status**: [x]

**Gap**: Shell `check::disallow_deploy_scripts` (line 4974) blocks deploy:* scripts. No TS equivalent.

**Plan**:
- Create `no-deploy-scripts.ts` — scans all package.json files for scripts starting with `deploy:`
- Add tests: deploy:prod detected, deploy:staging detected, build:prod clean, no scripts clean
- Run QA

**Files**:
- Create: `rules/workspace/no-deploy-scripts.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on deploy:* scripts, clean on non-deploy scripts.

---

## TASK 13 — workspace/no-lint-ignore-directives

**Status**: [x]

**Gap**: Shell `check::lint_ignore_directives` (line 6266) detects lint suppress directives. No TS equivalent.

**Plan**:
- Create `no-lint-ignore-directives.ts` — scans source files (.ts/.tsx/.js/.jsx/.css/.md/.sh/.yml) for known ignore patterns
- Severity: warning
- Add tests: eslint-disable detected, @ts-ignore detected, biome-ignore detected, clean file passes
- Run QA

**Files**:
- Create: `rules/workspace/no-lint-ignore-directives.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning on each pattern type, clean on normal code.

---

## TASK 14 — workspace/validate-package-tags

**Status**: [x]

**Gap**: Shell `check::validate_package_tags` (line 6117) enforces valid tags in package.json. No TS equivalent.

**Plan**:
- Create `validate-package-tags.ts` — checks package.json in /packages/ for valid `tags` array with approved values
- Add tests: missing tags, empty tags, invalid format tag, unapproved tag, valid tags clean
- Run QA

**Files**:
- Create: `rules/workspace/validate-package-tags.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on missing/invalid/unapproved tags, clean on valid tags.

---

## TASK 15 — workspace/no-env-or-globals-in-shared-libs

**Status**: [x]

**Gap**: Shell `check::shared_libs_no_direct_env_or_globals` (line 6725) blocks env/global access in shared libs. No TS equivalent.

**Plan**:
- Create `no-env-or-globals-in-shared-libs.ts` — scans .ts/.js files in packages/shared/ for process.env., globalThis., global. patterns, excludes test/mock files
- Add tests: process.env detected, globalThis detected, test file excluded, non-shared file excluded, clean shared lib passes
- Run QA

**Files**:
- Create: `rules/workspace/no-env-or-globals-in-shared-libs.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on env/global access in shared libs, clean on proper code.

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
- Run `pnpm -w run qa:lint --tools`
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
- Verify all tests pass (expected: ~3307+ tests)
- Verify shell file has 15 new `ported::` renames (total: 30 ported::)
- Commit with descriptive message

**Files**: All Phase 22 files

**Verification**:
- `ls` confirms all 15 rule files exist in `rules/workspace/`
- `grep -c 'ported::' common.checks.sh` shows 30
- `pnpm --filter @/lint qa:test` shows all tests pass
- `git diff --stat` shows expected file count
