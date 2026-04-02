# @/lint Phase 27 — Port Shell Check Functions to TypeScript Workspace Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`
**Goal**: Port 8 git-focused shell check functions to TypeScript workspace rules, remove all Astro checks from source file

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
| Tests | 3644 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | ~239 |

---

## TASK 1 — `workspace/no-detached-head`

**Status**: [ ]

**Shell origin**: `check::detached_head_state` (line 66)
**What**: Warns if git HEAD is in detached state
**Branches**:
- `git symbolic-ref --short HEAD` succeeds → on a branch → pass
- `git symbolic-ref --short HEAD` throws (exit code 128) → detached HEAD → emit warning
- git not available / other error → graceful empty return (try/catch)

**Plan**:
- Write tests in `workspace-rules.test.ts`: metadata, detached HEAD emits warning, normal branch passes, git failure graceful empty
- Run test, verify fails (module not found)
- Create `rules/workspace/no-detached-head.ts`
- Run test, verify passes
- Run QA

**Files**:
- Create: `rules/workspace/no-detached-head.ts`
- Modify: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert `severity: 'warning'`, ruleId `workspace/no-detached-head`, message contains 'detached'

---

## TASK 2 — `workspace/enforce-branch-naming`

**Status**: [ ]

**Shell origin**: `check::enforce_branch_naming_convention` (line 664)
**What**: Requires branch names to match `^(feature|fix|hotfix|chore|release|test|docs)/.+$`
**Branches**:
- `git rev-parse --abbrev-ref HEAD` → empty or "HEAD" → skip (detached)
- Branch is "main" or "master" → exempt
- Matches `^(feature|fix|hotfix|chore|release|test|docs)/.+$` → pass
- No match → error

**Plan**:
- Write tests: metadata, valid branch passes, invalid branch errors, main/master exempt, detached skips
- Create `rules/workspace/enforce-branch-naming.ts`
- Run QA

**Files**:
- Create: `rules/workspace/enforce-branch-naming.ts`
- Modify: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert `severity: 'error'`, ruleId, message contains branch name

---

## TASK 3 — `workspace/enforce-conventional-commits`

**Status**: [ ]

**Shell origin**: `check::validate_conventional_commits` (line 721)
**What**: Validates last 30 commits follow `type(scope): description`
**Branches**:
- `git log --pretty=format:'%h %s' -30` → for each commit:
  - Message matches `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9._-]+\))?: .+` → pass
  - No match → error with hash and message
- git log fails (no repo, shallow clone) → graceful empty return
- <30 commits → reads what's available, no error

**Plan**:
- Write tests: metadata, valid commits pass, invalid commit errors, git failure graceful, mixed valid/invalid
- Create `rules/workspace/enforce-conventional-commits.ts`
- Run QA

**Files**:
- Create: `rules/workspace/enforce-conventional-commits.ts`
- Modify: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error per invalid commit, correct hash in message

---

## TASK 4 — `workspace/no-merge-commits-on-main`

**Status**: [ ]

**Shell origin**: `check::disallow_merge_commits_on_main` (line 616) + `check::disallow_non_fast_forward_on_main` (line 569)
**What**: Prevents merge commits on main branch (enforces linear history)
**Branches**:
- `git rev-parse --abbrev-ref HEAD` → not "main" → skip (return empty)
- On main: `git log --merges --pretty=format:'%h %s' origin/main..HEAD` → for each merge commit → error
- No merge commits → pass
- git log fails → graceful empty return

**Plan**:
- Write tests: metadata, not on main skips, main with merge commits errors, main clean passes, git failure
- Create `rules/workspace/no-merge-commits-on-main.ts`
- Run QA

**Files**:
- Create: `rules/workspace/no-merge-commits-on-main.ts`
- Modify: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error per merge commit found, skip when not on main

---

## TASK 5 — `workspace/no-rebase-in-progress`

**Status**: [ ]

**Shell origin**: `check::git_rebase_in_progress` (line 1325)
**What**: Detects `.git/rebase-merge` or `.git/rebase-apply` directories
**Branches**:
- `.git/rebase-merge` exists → error "rebase-merge detected"
- `.git/rebase-apply` exists → error "rebase-apply detected"
- Both exist → two errors
- Neither exists → pass

**Plan**:
- Write tests: metadata, rebase-merge detected, rebase-apply detected, both detected, clean passes
- Create `rules/workspace/no-rebase-in-progress.ts`
- Run QA

**Files**:
- Create: `rules/workspace/no-rebase-in-progress.ts`
- Modify: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error count and message content for each combination

---

## TASK 6 — `workspace/no-stale-index-lock`

**Status**: [ ]

**Shell origin**: `check::git_index_lock_orphans` (line 1837)
**What**: Detects orphaned `.git/index.lock` files
**Branches**:
- `.git/index.lock` exists → error
- Does not exist → pass

**Plan**:
- Write tests: metadata, lock file detected errors, no lock file passes
- Create `rules/workspace/no-stale-index-lock.ts`
- Run QA

**Files**:
- Create: `rules/workspace/no-stale-index-lock.ts`
- Modify: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert single error with message containing 'index.lock'

---

## TASK 7 — `workspace/enforce-git-config`

**Status**: [ ]

**Shell origin**: `check::git_config_enforced` (line 1427)
**What**: Enforces `core.autocrlf=input`, `pull.rebase=false`, `push.default=simple`
**Branches**:
- For each key-value pair:
  - `git config --get <key>` returns expected value → pass
  - Returns wrong value → error (reports key, actual, expected)
  - Throws (unset) → error (reports key as `<unset>`, expected)
- Multiple mismatches → multiple errors

**Plan**:
- Write tests: metadata, all correct passes, one wrong errors, unset errors, multiple mismatches
- Create `rules/workspace/enforce-git-config.ts`
- Run QA

**Files**:
- Create: `rules/workspace/enforce-git-config.ts`
- Modify: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error per misconfigured key, message contains key name and expected value

---

## TASK 8 — `workspace/no-sparse-checkout`

**Status**: [ ]

**Shell origin**: `check::git_sparse_checkout_consistency` (line 1359)
**What**: Fails if sparse-checkout is enabled unexpectedly
**Branches**:
- `git config core.sparseCheckout` → "true" → error
- Returns "false" → pass
- Throws (unset) → pass (not enabled)

**Plan**:
- Write tests: metadata, sparse enabled errors, sparse disabled passes, unset passes
- Create `rules/workspace/no-sparse-checkout.ts`
- Run QA

**Files**:
- Create: `rules/workspace/no-sparse-checkout.ts`
- Modify: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error when "true", pass otherwise

---

## TASK 9 — Remove Astro checks from common.checks.sh

**Status**: [ ]

**What**: Remove all `check::astro_*` functions (lines 8023-11852, ~76 functions)
**Plan**: Delete all lines containing astro check functions and their docblocks

---

## TASK 10 — Register Rules + Config

**Status**: [ ]

**Plan**: Register all 8 new rules in `.resist-lint.jsonc` with appropriate severity:
- `workspace/no-detached-head`: `"warn"` (warning — detached HEAD is unusual but not always wrong)
- `workspace/enforce-branch-naming`: `"error"`
- `workspace/enforce-conventional-commits`: `"error"`
- `workspace/no-merge-commits-on-main`: `"error"`
- `workspace/no-rebase-in-progress`: `"error"`
- `workspace/no-stale-index-lock`: `"error"`
- `workspace/enforce-git-config`: `"error"`
- `workspace/no-sparse-checkout`: `"error"`

**Files**:
- Edit: `.resist-lint.jsonc`

**Verification**: Config valid, all rules load

---

## TASK 11 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run `pnpm -w run qa:lint --tools`
- Run `pnpm -w run qa:test`
- Run `pnpm -w run qa:format:check`
- Run `pnpm --filter @/lint qa:test:coverage`
- Verify all coverage thresholds pass

**Verification**: All QA green, coverage above thresholds

---

## TASK 12 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 8 rules implemented match approved changelog exactly
- Verify all Astro checks removed from common.checks.sh
- Verify all 8 rules registered in `.resist-lint.jsonc` with correct severity
- Verify every branch from shell originals is traced and tested
- Commit all changes

**Verification**:
- All 8 rule files exist and export correct rule IDs
- All tests pass with zero failures
- Astro functions confirmed removed from common.checks.sh
- All tasks marked [x], commit clean
