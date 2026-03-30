# @/lint Phase 28 — Git Safety & Workflow Rules (Batch 2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`
**Goal**: Port remaining 16 git safety/workflow shell check functions to TypeScript workspace rules, rename ported functions in source file.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, async `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`, `fileExists()`, `dirExists()`). Git commands via `execSync` with try/catch. Filesystem checks via `existsSync`/`readFileSync`.

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
| Tests | 3681 pass / 0 fail |
| Type-check | Passes |
| check:: remaining | 222 |
| ported:: count | 9 |

---

## TASK 1 — `workspace/no-unsafe-main-push`

**Status**: [x]

**Shell origin**: `check::git_protect_main_branch` (line 511)
**What**: On main/master, blocks unsafe `push.default` (force/matching) and fixup!/squash! last commit
**Branches**:
- Not on main/master → pass
- On main: push.default is "force" or "matching" → error
- On main: last commit starts with "fixup!" or "squash!" → error
- git commands fail → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-unsafe-main-push.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for both push.default and fixup/squash conditions

---

## TASK 2 — `workspace/no-protected-branch-push`

**Status**: [x]

**Shell origin**: `check::git_protected_branch_push` (line 1028)
**What**: Prevents direct push to protected branches (main, master, production, release, prod)
**Branches**:
- Branch matches protected list → error
- Branch not protected → pass
- git rev-parse fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-protected-branch-push.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on each protected branch name, pass on feature/

---

## TASK 3 — `workspace/no-oversized-commit-body`

**Status**: [x]

**Shell origin**: `check::commit_body_size` (line 1193)
**What**: Flags commits with body >20 lines or >1000 characters
**Branches**:
- For each of last 20 commits: body within limits → pass
- Body exceeds 20 lines → error with hash
- Body exceeds 1000 chars → error with hash
- git log fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-oversized-commit-body.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error per oversized commit

---

## TASK 4 — `workspace/no-dirty-working-tree`

**Status**: [x]

**Shell origin**: `check::git_repo_clean` (line 1393)
**What**: Errors if working directory or index has uncommitted changes
**Branches**:
- `git diff --quiet && git diff --cached --quiet` both succeed → pass
- Either fails (exit code 1) → error
- git not available → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-dirty-working-tree.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on dirty tree, pass on clean

---

## TASK 5 — `workspace/no-broken-git-refs`

**Status**: [x]

**Shell origin**: `check::git_ref_integrity` (line 1476)
**What**: Validates HEAD resolves and `git fsck` passes
**Branches**:
- HEAD resolves (symbolic-ref or rev-parse) AND fsck clean → pass
- HEAD unresolvable → error
- fsck reports issues → error
- git commands fail → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-broken-git-refs.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for broken HEAD and fsck failures

---

## TASK 6 — `workspace/no-broken-git-head`

**Status**: [x]

**Shell origin**: `check::git_head_consistency` (line 1517)
**What**: Validates .git/HEAD file exists and points to valid ref or commit
**Branches**:
- .git/HEAD missing → error
- Contains `ref: refs/heads/...` and ref file exists → pass
- Contains `ref: refs/heads/...` and ref file missing → error
- Contains raw commit hash and commit valid → pass
- Contains raw commit hash and commit invalid → error
- Filesystem access fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-broken-git-head.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests for each branch (missing HEAD, valid ref, broken ref, valid detached, broken detached)

---

## TASK 7 — `workspace/no-unsafe-global-gitconfig`

**Status**: [x]

**Shell origin**: `check::git_config_global_blacklist` (line 1575)
**What**: Warns on dangerous global git settings
**Branches**:
- For each blacklisted key/value pair: `git config --global --get <key>` matches → warning
- No match → pass
- git config fails → pass (value not set)

**Files**:
- Create: `src/rules/workspace/no-unsafe-global-gitconfig.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for matching blacklisted values

---

## TASK 8 — `workspace/no-orphaned-git-refs`

**Status**: [x]

**Shell origin**: `check::git_alternate_refs` (line 1620)
**What**: Detects broken refs in .git/refs that don't resolve to valid commits
**Branches**:
- All refs resolve → pass
- Any ref points to invalid object → error
- .git/refs scan fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-orphaned-git-refs.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for broken ref, pass for valid refs

---

## TASK 9 — `workspace/no-git-object-reuse`

**Status**: [x]

**Shell origin**: `check::git_object_reuse_disabled` (line 1769)
**What**: Blocks .git/objects/info/alternates file existence
**Branches**:
- File exists → error
- File doesn't exist → pass

**Files**:
- Create: `src/rules/workspace/no-git-object-reuse.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error when alternates exists

---

## TASK 10 — `workspace/no-git-alternate-objects`

**Status**: [x]

**Shell origin**: `check::git_alternate_object_dir_blocked` (line 1803)
**What**: Blocks GIT_ALTERNATE_OBJECT_DIRECTORIES environment variable
**Branches**:
- Env var set → error
- Env var not set → pass

**Files**:
- Create: `src/rules/workspace/no-git-alternate-objects.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error when env var is set

---

## TASK 11 — `workspace/no-empty-commit-diff`

**Status**: [x]

**Shell origin**: `check::git_commit_message_nodiff` (line 1871)
**What**: Flags commits with a message but no actual diff content
**Branches**:
- Last commit has diff → pass
- Last commit has no diff (empty commit) → error
- git commands fail → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-empty-commit-diff.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on empty diff commit

---

## TASK 12 — `workspace/no-inconsistent-worktrees`

**Status**: [x]

**Shell origin**: `check::git_worktree_consistency` (line 1905)
**What**: Validates `git worktree list` entries are all valid
**Branches**:
- All worktree paths exist → pass
- Any worktree path missing → error
- git worktree list fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-inconsistent-worktrees.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for broken worktree entries

---

## TASK 13 — `workspace/no-fsmonitor-in-ci`

**Status**: [x]

**Shell origin**: `check::git_fsmonitor_safety` (line 1941)
**What**: Warns if fsmonitor (core.fsmonitor) is enabled in CI
**Branches**:
- `git config core.fsmonitor` returns value → warning
- Unset/empty → pass
- git config fails → pass

**Files**:
- Create: `src/rules/workspace/no-fsmonitor-in-ci.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning when fsmonitor is set

---

## TASK 14 — `workspace/no-oversized-repo`

**Status**: [x]

**Shell origin**: `check::git_repo_size_budget` (line 1975)
**What**: Warns if .git directory exceeds size budget (500MB default)
**Branches**:
- .git size ≤ 500MB → pass
- .git size > 500MB → warning
- du command fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-oversized-repo.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for oversized repo

---

## TASK 15 — `workspace/no-bloated-commits`

**Status**: [x]

**Shell origin**: `check::git_commit_bloat` (line 2012)
**What**: Flags individual commits that touch >100 files
**Branches**:
- For each of last 20 commits: ≤100 files → pass
- >100 files → warning with hash
- git log fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-bloated-commits.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning per bloated commit

---

## TASK 16 — `workspace/no-commit-date-skew`

**Status**: [x]

**Shell origin**: `check::git_commit_date_skew` (line 2152)
**What**: Detects mismatch between author date and committer date
**Branches**:
- For each of last 20 commits: dates within 1 hour → pass
- Dates differ by >1 hour → warning with hash
- git log fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-commit-date-skew.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for skewed dates

---

## TASK 17 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add all 16 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 1-6, 8-9: `"error"`
- Rule 7 (no-unsafe-global-gitconfig): `"warn"`
- Rule 10 (no-git-alternate-objects): `"error"`
- Rule 11 (no-empty-commit-diff): `"error"`
- Rule 12 (no-inconsistent-worktrees): `"error"`
- Rules 13-16 (fsmonitor, oversized, bloated, date-skew): `"warn"`

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All rules appear in config

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
- Verify shell function rename count
- Commit with descriptive message

**Verification**:
- All 16 `.ts` files exist in `src/rules/workspace/`
- All 16 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^ported::' common.checks.sh` increased by 16
- `grep -c '^check::' common.checks.sh` decreased by 16
