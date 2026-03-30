# @/lint Phase 34 — Merge Request Validation Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`
**Goal**: Port 16 MR validation check functions to TypeScript workspace rules. All rules read MR metadata from `process.env`. One rule uses `execSync` for `git merge-base`. One rule reads CODEOWNERS via `ctx.readFile`.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, async `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`). MR rules read `process.env` for CI environment variables.

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
| Tests | 4234 pass / 0 fail |
| Type-check | Passes |
| check:: remaining | 130 |
| ported:: count | 0 |

---

## TASK 1 — `workspace/mr-label-enforcement`

**Status**: [x]

**Shell origin**: `check::mr_label_enforcement` (line 24)
**What**: MR must include at least one approved domain/scope label from a defined list
**Branches**:
- No matching label found → error
- At least one matching label → pass
- `CI_MERGE_REQUEST_LABELS` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-label-enforcement.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing labels

---

## TASK 2 — `workspace/mr-target-branch-protected`

**Status**: [x]

**Shell origin**: `check::mr_target_branch_protected` (line 99)
**What**: MR must not target `main`, `production`, or `prod` branches
**Branches**:
- Target is protected branch → error
- Target is non-protected branch → pass
- `CI_MERGE_REQUEST_TARGET_BRANCH_NAME` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-target-branch-protected.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for protected target branch

---

## TASK 3 — `workspace/mr-draft-block`

**Status**: [x]

**Shell origin**: `check::mr_draft_block` (line 138)
**What**: MR title must not start with `Draft:`
**Branches**:
- Title starts with `Draft:` or `draft:` → error
- Title does not start with Draft → pass
- `CI_MERGE_REQUEST_TITLE` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-draft-block.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for draft MRs

---

## TASK 4 — `workspace/mr-conflicting-labels`

**Status**: [x]

**Shell origin**: `check::mr_conflicting_labels` (line 172)
**What**: MR must not have conflicting label pairs (hotfix+refactor, breaking-change+patch, feature+remove)
**Branches**:
- Conflicting pair found → error
- No conflicting pairs → pass
- `CI_MERGE_REQUEST_LABELS` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-conflicting-labels.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for each conflicting pair

---

## TASK 5 — `workspace/mr-size-limit`

**Status**: [x]

**Shell origin**: `check::mr_size_limit` (line 219)
**What**: MR must not exceed 800 total lines changed or 20 files changed
**Branches**:
- Lines > 800 → warning
- Files > 20 → warning
- Within limits → pass
- Env vars not set → skip

**Files**:
- Create: `src/rules/workspace/mr-size-limit.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for oversized MR

---

## TASK 6 — `workspace/mr-assignee-required`

**Status**: [x]

**Shell origin**: `check::mr_assignee_required` (line 260)
**What**: MR must have an assignee
**Branches**:
- `MR_ASSIGNEE` empty → error
- `MR_ASSIGNEE` set → pass
- `MR_ASSIGNEE` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-assignee-required.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing assignee

---

## TASK 7 — `workspace/mr-reviewer-required`

**Status**: [x]

**Shell origin**: `check::mr_reviewer_required` (line 291)
**What**: MR must have at least one reviewer
**Branches**:
- `MR_REVIEWERS` empty → error
- `MR_REVIEWERS` set → pass
- `MR_REVIEWERS` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-reviewer-required.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing reviewers

---

## TASK 8 — `workspace/mr-blocking-discussions`

**Status**: [x]

**Shell origin**: `check::mr_blocking_discussions` (line 322)
**What**: MR must not have unresolved discussions (count > 0)
**Branches**:
- Count > 0 → error
- Count = 0 → pass
- `MR_BLOCKING_DISCUSSIONS_COUNT` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-blocking-discussions.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for unresolved discussions

---

## TASK 9 — `workspace/mr-wip-commit-check`

**Status**: [x]

**Shell origin**: `check::mr_wip_commit_check` (line 353)
**What**: MR commits must not contain WIP/tmp/debug/fixme messages
**Branches**:
- Commit message contains wip/tmp/debug/fixme → error
- Clean commit messages → pass
- `MR_COMMITS` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-wip-commit-check.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for WIP commits

---

## TASK 10 — `workspace/mr-approval-required`

**Status**: [x]

**Shell origin**: `check::mr_approval_required` (line 386)
**What**: MR must have sufficient approvals (≥ MR_APPROVAL_MIN_REQUIRED, default 1)
**Branches**:
- Approvals < required → error
- Approvals ≥ required → pass
- `MR_APPROVAL_COUNT` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-approval-required.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for insufficient approvals

---

## TASK 11 — `workspace/mr-branch-source-rules`

**Status**: [x]

**Shell origin**: `check::mr_branch_source_rules` (line 425)
**What**: MR source branch must match `type/name` pattern (feature/, fix/, chore/, etc.)
**Branches**:
- Branch doesn't match pattern → error
- Branch matches pattern → pass
- `MR_SOURCE_BRANCH` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-branch-source-rules.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for invalid branch name

---

## TASK 12 — `workspace/mr-codeowners-approval`

**Status**: [x]

**Shell origin**: `check::mr_codeowners_approval` (line 462)
**What**: CODEOWNERS file must exist at expected path
**Branches**:
- CODEOWNERS file missing → error
- CODEOWNERS file exists → pass

**Files**:
- Create: `src/rules/workspace/mr-codeowners-approval.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing CODEOWNERS

---

## TASK 13 — `workspace/mr-labels-required-per-scope`

**Status**: [x]

**Shell origin**: `check::mr_labels_required_per_scope` (line 502)
**What**: MR labels must match scoped paths (packages/api → `api`, .gitlab/ → `ci`)
**Branches**:
- Modified path missing corresponding label → error
- All paths have matching labels → pass
- `MODIFIED_PATHS` not set → skip
- `MR_LABELS` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-labels-required-per-scope.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing scope labels

---

## TASK 14 — `workspace/mr-dependency-changes-reviewed`

**Status**: [x]

**Shell origin**: `check::mr_dependency_changes_reviewed` (line 551)
**What**: Dependency file changes require `deps-reviewed` label
**Branches**:
- package.json/lockfile changed without label → error
- Dependency changes with label → pass
- No dependency changes → pass
- `MODIFIED_PATHS` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-dependency-changes-reviewed.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for unreviewed dependency changes

---

## TASK 15 — `workspace/mr-ci-pipeline-passed`

**Status**: [x]

**Shell origin**: `check::mr_ci_pipeline_passed` (line 586)
**What**: CI pipeline must be `success` status
**Branches**:
- Status != "success" → error
- Status == "success" → pass
- `CI_PIPELINE_STATUS` not set → skip

**Files**:
- Create: `src/rules/workspace/mr-ci-pipeline-passed.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for failed pipeline

---

## TASK 16 — `workspace/mr-up-to-date-with-target`

**Status**: [x]

**Shell origin**: `check::mr_up_to_date_with_target` (line 618)
**What**: MR source branch must not be behind target — uses `execSync` for `git merge-base --is-ancestor`
**Branches**:
- Source behind target (merge-base fails) → error
- Source up-to-date → pass
- Env vars not set → skip
- execSync throws → skip

**Files**:
- Create: `src/rules/workspace/mr-up-to-date-with-target.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error when branch is behind

---

## TASK 17 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add 16 rules to `.resist-lint.jsonc` with appropriate severities
- Rule 5: `"warn"`
- All others: `"error"`
- Rename all 16 `check::` → `ported::` in `common.checks.sh`

**Files**:
- Modify: `.resist-lint.jsonc`
- Modify: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`

**Verification**: All 16 rules in config, 16 functions renamed

---

## TASK 18 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 19 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 16 rule files exist
- Verify all 16 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Verify shell function rename count (16 renamed)
- Commit with descriptive message

**Verification**:
- All 16 `.ts` files exist in `src/rules/workspace/`
- All 16 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^ported::' common.checks.sh` = 16
- `grep -c '^check::' common.checks.sh` = 114
