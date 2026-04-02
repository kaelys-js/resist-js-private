# @/lint Phase 36 — DangerJS PR Rules Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/dangerjs-rules/`
**Goal**: Port 5 unique DangerJS PR rules to TypeScript workspace rules. 6 remaining files are duplicates of Phase 34/35 rules or empty stubs — marked as already covered. After this phase, all dangerjs-rules are ported.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`). PR rules read `process.env`. File-scanning rules use `ctx.allFiles()` + `ctx.readFile()`.

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
| Tests | 4407 pass / 0 fail |
| Type-check | Passes |
| dangerjs-rules files | 11 (5 unique, 3 duplicates, 2 empty, 1 stub) |

---

## Deduplication Notes

These dangerjs-rules are already covered by Phase 34/35 rules and will NOT be re-ported:

| File | Already Covered By |
|------|--------------------|
| `pr-assignee.ts` | `workspace/mr-assignee-required` + `workspace/mr-reviewer-required` (Phase 34) |
| `prLabel.ts` | `workspace/mr-label-enforcement` (Phase 34) |
| `prLarge.ts` | `workspace/mr-size-limit` (Phase 34) |
| `prMissingAssignee.ts` | Empty file (0 bytes) |
| `prMissingReviewer.ts` | Empty file (0 bytes) |
| `prConflicts.ts` | Empty TODO stub — no logic to port |

---

## TASK 1 — `workspace/pr-svg-optimized`

**Status**: [x]

**DangerJS origin**: `checkAddedImages.ts`
**What**: Changed SVG files must be optimized — detect unoptimized SVG patterns
**Branches**:
- SVG with unoptimized patterns (metadata, editor attrs, xmlns:xlink) → warning
- Clean SVG → pass
- Non-SVG files → skip
- `MR_CHANGED_FILES` not set → scan all SVGs
- File read fails → skip that file

**Files**:
- Create: `src/rules/workspace/pr-svg-optimized.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for unoptimized SVG

---

## TASK 2 — `workspace/pr-branch-commit-mismatch`

**Status**: [x]

**DangerJS origin**: `prBranchName.ts`
**What**: Branch name prefix must appear in commit messages
**Branches**:
- Commits missing branch prefix → error
- All commits contain prefix → pass
- Branch is main/master → skip
- `MR_SOURCE_BRANCH` not set → skip
- `MR_COMMITS` not set → skip

**Files**:
- Create: `src/rules/workspace/pr-branch-commit-mismatch.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for mismatched branch/commit

---

## TASK 3 — `workspace/pr-description-required`

**Status**: [x]

**DangerJS origin**: `prDescription.ts`
**What**: PR/MR description must be ≥10 characters
**Branches**:
- Description < 10 chars → error
- Description ≥ 10 chars → pass
- Empty description → error
- `MR_DESCRIPTION` not set → skip

**Files**:
- Create: `src/rules/workspace/pr-description-required.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for short description

---

## TASK 4 — `workspace/pr-no-merge-commits`

**Status**: [x]

**DangerJS origin**: `prRebase.ts`
**What**: PR must not contain merge commits
**Branches**:
- Commit starts with "Merge branch " → error
- Commit starts with "Merge remote-tracking" → error
- Clean commits → pass
- `MR_COMMITS` not set → skip

**Files**:
- Create: `src/rules/workspace/pr-no-merge-commits.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for merge commits

---

## TASK 5 — `workspace/pr-wip-warning`

**Status**: [x]

**DangerJS origin**: `prWip.ts`
**What**: Warn if PR title contains `[WIP]`
**Branches**:
- Title contains `[WIP]` → warning
- Title contains `[wip]` (case-insensitive) → warning
- Normal title → pass
- `MR_TITLE` not set → skip

**Files**:
- Create: `src/rules/workspace/pr-wip-warning.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for WIP title

---

## TASK 6 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add 5 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 1, 5: `"warn"`
- Rules 2, 3, 4: `"error"`

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All 5 rules in config

---

## TASK 7 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 8 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 5 rule files exist
- Verify all 5 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Commit with descriptive message

**Verification**:
- All 5 `.ts` files exist in `src/rules/workspace/`
- All 5 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
