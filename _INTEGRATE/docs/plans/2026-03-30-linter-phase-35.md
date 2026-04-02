# @/lint Phase 35 — MR Metadata Rules + Infra Separation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`
**Goal**: Port 15 remaining check functions to TypeScript workspace rules and move 87 infra/notification functions to `infra.checks.sh`. After this phase, `common.checks.sh` has 0 check:: functions remaining.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`). MR rules read `process.env`. File-scanning rules use `ctx.allFiles()` + `ctx.readFile()`.

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
| Tests | 4322 pass / 0 fail |
| Type-check | Passes |
| check:: remaining | 102 |
| ported:: count | 0 |

---

## TASK 0 — Move infra/notification functions to infra.checks.sh

**Status**: [x]

**Plan**:
- Extract 87 functions (31 remind_* + 56 infra/CF) from common.checks.sh to new infra.checks.sh
- Lines 826–end of common.checks.sh → infra.checks.sh
- common.checks.sh retains only first 15 check:: functions (lines 25–825)

**Files**:
- Create: `_INTEGRATE/linter/_linter-test-to-convert/infra.checks.sh`
- Modify: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`

**Verification**: common.checks.sh has 15 check::, infra.checks.sh has 87 check::

---

## TASK 1 — `workspace/mr-cherry-pick-label`

**Status**: [x]

**Shell origin**: `check::mr_cherry_pick_label` (line 25)
**What**: Cherry-pick/backport MR title must have matching label
**Branches**:
- Title contains cherry-pick/backport AND missing label → error
- Title contains cherry-pick/backport AND has label → pass
- Title doesn't contain cherry-pick/backport → pass
- `MR_TITLE` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-cherry-pick-label.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for unlabeled cherry-pick MR

---

## TASK 2 — `workspace/mr-test-coverage-diff`

**Status**: [x]

**Shell origin**: `check::mr_test_coverage_diff` (line 62)
**What**: Warn if test coverage decreased
**Branches**:
- COVERAGE_AFTER < COVERAGE_BEFORE → warning
- COVERAGE_AFTER ≥ COVERAGE_BEFORE → pass
- Env vars not set → skip

**Files**:
- Create: `src/rules/workspace/mr-test-coverage-diff.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for coverage regression

---

## TASK 3 — `workspace/mr-label-format`

**Status**: [x]

**Shell origin**: `check::mr_label_format` (line 93)
**What**: MR labels must be lowercase kebab-case
**Branches**:
- Label with uppercase or invalid format → error
- All labels valid → pass
- `MR_LABELS` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-label-format.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for invalid label format

---

## TASK 4 — `workspace/mr-release-label-required`

**Status**: [x]

**Shell origin**: `check::mr_release_label_required` (line 129)
**What**: MR targeting release/* must include 'release' label
**Branches**:
- Target is release/* AND missing label → error
- Target is release/* AND has label → pass
- Target is not release/* → pass
- Env vars not set → skip

**Files**:
- Create: `src/rules/workspace/mr-release-label-required.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for release branch without label

---

## TASK 5 — `workspace/mr-no-force-push-after-review`

**Status**: [x]

**Shell origin**: `check::mr_no_force_push_after_review` (line 168)
**What**: Block force-push after approval
**Branches**:
- Both timestamps set AND force-push after approval → error
- Both timestamps set AND force-push before approval → pass
- Either timestamp missing → skip

**Files**:
- Create: `src/rules/workspace/mr-no-force-push-after-review.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for post-review force-push

---

## TASK 6 — `workspace/mr-license-change-reviewed`

**Status**: [x]

**Shell origin**: `check::mr_license_change_reviewed` (line 205)
**What**: LICENSE/NOTICE/COPYRIGHT/LEGAL file changes need `legal-approved` label
**Branches**:
- License file changed AND missing label → error
- License file changed AND has label → pass
- No license files changed → pass
- `MR_CHANGED_FILES` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-license-change-reviewed.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for unreviewed license change

---

## TASK 7 — `workspace/mr-config-changes-approved`

**Status**: [x]

**Shell origin**: `check::mr_config_changes_approved` (line 237)
**What**: Config/infra file changes need `config-approved` label
**Branches**:
- Config file changed AND missing label → error
- Config file changed AND has label → pass
- No config files changed → pass
- `MR_CHANGED_FILES` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-config-changes-approved.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for unapproved config change

---

## TASK 8 — `workspace/mr-open-too-long`

**Status**: [x]

**Shell origin**: `check::mr_open_too_long` (line 273)
**What**: Warn if MR has been open ≥10 days
**Branches**:
- Days open ≥ 10 → warning
- Days open < 10 → pass
- Env vars not set → skip

**Files**:
- Create: `src/rules/workspace/mr-open-too-long.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for stale MR

---

## TASK 9 — `workspace/mr-automerge-not-enabled-by-default`

**Status**: [x]

**Shell origin**: `check::mr_automerge_not_enabled_by_default` (line 313)
**What**: Automerge requires CI success + approval
**Branches**:
- Automerge enabled AND pipeline not success → error
- Automerge enabled AND not approved → error
- Automerge enabled AND pipeline success AND approved → pass
- Automerge not enabled → pass
- `MR_AUTOMERGE_ENABLED` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-automerge-not-enabled-by-default.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for premature automerge

---

## TASK 10 — `workspace/mr-label-conflict-matrix`

**Status**: [x]

**Shell origin**: `check::mr_label_conflict_matrix` (line 356)
**What**: Prevent conflicting label combos (breaking-change+patch, hotfix+chore, feature+revert)
**Branches**:
- Conflicting pair found → error (per pair)
- No conflicts → pass
- `MR_LABELS` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-label-conflict-matrix.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for each conflicting pair

---

## TASK 11 — `workspace/mr-sensitive-path-changes`

**Status**: [x]

**Shell origin**: `check::mr_sensitive_path_changes` (line 404)
**What**: Sensitive file changes (scripts/, .gitlab/, .env, infra/, Makefile, wrangler.json) require approval
**Branches**:
- Sensitive file changed AND not approved → error
- Sensitive file changed AND approved → pass
- No sensitive files → pass
- `MR_CHANGED_FILES` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-sensitive-path-changes.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for unapproved sensitive changes

---

## TASK 12 — `workspace/mr-test-or-benchmark-regressions`

**Status**: [x]

**Shell origin**: `check::mr_test_or_benchmark_regressions` (line 458)
**What**: Block merge on coverage regression (< -0.5%) or benchmark regression (> 5.0%)
**Branches**:
- Coverage diff < -0.5 → error
- Benchmark diff > 5.0 → error
- Both within limits → pass
- Env vars not set → skip

**Files**:
- Create: `src/rules/workspace/mr-test-or-benchmark-regressions.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for regressions

---

## TASK 13 — `workspace/valibot-consistency`

**Status**: [x]

**Shell origin**: `check::valibot_consistency` (line 505)
**What**: 6-check Valibot usage validation via file scanning
**Checks**:
1. Unused schemas (defined but never used in parse/safeParse)
2. Raw JSON.parse without validation
3. Unused safeParse results
4. Inline anonymous v.object schemas
5. Schemas declared inside functions
6. Missing type inference from schema
**Branches**: Each sub-check: match found → warning, no match → pass

**Files**:
- Create: `src/rules/workspace/valibot-consistency.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for each sub-check

---

## TASK 14 — `workspace/vitest-config-and-coverage`

**Status**: [x]

**Shell origin**: `check::vitest_config_and_coverage` (line 610)
**What**: Vitest config validation, coverage thresholds, naming, skipped tests, snap files
**Checks**:
1. Shared vitest.config must exist
2. No rogue vitest.config files outside shared
3. Test files must use .test.ts or .spec.ts suffix
4. No .skip/.only/.todo in tests
5. No committed .snap files
**Branches**: Each sub-check: violation found → error, clean → pass

**Files**:
- Create: `src/rules/workspace/vitest-config-and-coverage.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for each sub-check

---

## TASK 15 — `workspace/vitest-config-and-usage`

**Status**: [x]

**Shell origin**: `check::vitest_config_and_usage` (line 735)
**What**: Vitest config consistency — defineConfig, isolate, coverage, exports
**Checks**:
1. vitest.config.ts must use defineConfig
2. Must include isolate: true
3. Must include coverage config
4. No shared exports of vitest utilities
**Branches**: Each sub-check: violation found → error, clean → pass

**Files**:
- Create: `src/rules/workspace/vitest-config-and-usage.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for each sub-check

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add 15 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 2, 8, 13: `"warn"`
- All others: `"error"`
- Rename all 15 `check::` → `ported::` in `common.checks.sh`
- Remove ported:: blocks (0 check:: remain)

**Files**:
- Modify: `.resist-lint.jsonc`
- Modify: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`

**Verification**: All 15 rules in config, 0 check:: remain in common.checks.sh

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
- Verify common.checks.sh has 0 check::
- Verify infra.checks.sh has 87 check::
- Commit with descriptive message

**Verification**:
- All 15 `.ts` files exist in `src/rules/workspace/`
- All 15 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^check::' common.checks.sh` = 0
- `grep -c '^check::' infra.checks.sh` = 87
