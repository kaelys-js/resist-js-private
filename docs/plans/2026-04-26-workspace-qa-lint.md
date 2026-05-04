# Workspace `qa:lint` Cleanup — Archive Historical Plans

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-26
**Package**: workspace-wide (`docs/plans/` documentation)
**Goal**: Make `pnpm -w run qa:lint` (no path arg) exit 0 by archiving 12 completed plan files into the existing `docs/plans-archive/` directory, where the `plans/*` workspace rules do not apply.
**Architecture**: `discoverPlanFiles` in `packages/shared/config/tooling/lint/src/rules/plans/plan-parser.ts:360` filters `f.includes('/docs/plans/')`. The substring `/docs/plans/` does not match files under `docs/plans-archive/`, so `git mv`-ing a file from one to the other automatically removes it from the rule's input set. The rule scope itself is correct — only the plan files' location needs to change.

Each task is atomic: implement → verify (`qa:lint`) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `pnpm -w run qa:lint` exit code | 1 |
| Total errors | 183 |
| Files with diagnostics | 12 |
| Production code touched | 0 (all diagnostics are in `docs/plans/*.md`) |

| Rule | Count |
|------|------:|
| `plans/require-concrete-verification` | 96 |
| `plans/no-empty-plan-sections` | 80 |
| `plans/require-plan-structure` | 5 |
| `plans/no-template-placeholders` | 2 |

---

## TASK 1 — Move historical plans to `docs/plans-archive/`

**Status**: [x]

**Gap**: Twelve plan files in `docs/plans/` document already-completed cleanup work but trip 183 diagnostics under the current `plans/*` workspace rules. The historical record should be preserved verbatim (no post-hoc edits to bullets/verifications) but moved out of the rule's scope.

**Plan**:
- Run `git mv docs/plans/<file>.md docs/plans-archive/<file>.md` for each of the 12 historical plan files listed in the **Files** section.
- Confirm `docs/plans-archive/` already exists with prior archived plans (`docs/plans-archive/2026-04-02-*.md` etc.) — no new directory creation needed.
- Confirm the `discoverPlanFiles` filter at `packages/shared/config/tooling/lint/src/rules/plans/plan-parser.ts:360` already scopes to `/docs/plans/` and therefore excludes `/docs/plans-archive/` automatically — no rule code change needed.

**Files** (move; do NOT edit content):
- Edit: `docs/plans/2026-04-24-config-test-lint-fix.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-24-secrets-lint-fix.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-25-beacon-qa-lint-cleanup.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-25-devtools-qa-lint-cleanup.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-25-result-qa-lint-cleanup.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-25-schemas-qa-lint-cleanup.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-25-web-vitals-qa-lint-cleanup.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-25-workspace-rule-cache-migration.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-26-lint-qa-cleanup.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-26-products-qa-lint-cleanup.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-26-shared-ui-qa-lint.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-26-utils-code-qa-lint-cleanup.md` → `docs/plans-archive/`
- Edit: `docs/plans/2026-04-26-vscode-qa-lint-cleanup.md` → `docs/plans-archive/`

**Verification**:
- `ls docs/plans/` — only `TEMPLATE.md` and the active plan (`2026-04-26-workspace-qa-lint.md`) remain.
- `pnpm -w run qa:lint 2>&1 | grep -cE '^  ✗ plans/'` — outputs `0`.
- `pnpm -w run qa:lint` — exit code `0`.

---

## TASK 2 — Register Rules + Config

**Status**: [x]

**Plan**:
- No rule code changes — `discoverPlanFiles` filter at `plan-parser.ts:360` already scopes correctly.
- No config changes — `.oxlintrc.json` is unchanged.
- Confirm no orphaned moves via `git status --short` — should list 12 renames (`R  docs/plans/X → docs/plans-archive/X`) plus the new active plan file.

**Files**:
- No `.ts` source edits.
- No `.json` config edits.
- 12 file renames in `docs/plans/` → `docs/plans-archive/` (TASK 1).
- 1 new plan file created: `docs/plans/2026-04-26-workspace-qa-lint.md` (this file).

**Verification**:
- `git diff --name-only --diff-filter=R HEAD` shows 12 renamed `.md` files all moving from `docs/plans/` to `docs/plans-archive/`.
- `git diff --name-only --diff-filter=A HEAD` shows the new active plan file.
- `git diff --name-only --diff-filter=M HEAD` is empty (no modifications to existing files).

---

## TASK 3 — Integration Verification

**Status**: [x]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/config/tooling/lint/src` is unchanged from baseline (no runtime code touched).
- Config settings read check: `grep -rc 'config\.get(' packages/shared/config/tooling/lint/src` is unchanged from baseline.
- Class instantiation check: no new classes introduced (this is a documentation-archival commit; verify with `git diff --stat -- packages/`).
- Dead code / unused export check: no source files touched, so no orphaned exports possible; verify `git diff --name-only HEAD -- packages/` is empty.

**Verification**:
- `git diff --name-only HEAD -- packages/` — empty output (no production code touched).
- `git diff --name-only HEAD -- '*.json'` — empty output (no config touched).
- All four checks above produce identical pre/post counts.

---

## TASK 4 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format` (formats any whitespace adjustments from rename).
- Run: `pnpm -w run qa:lint` (no path arg, workspace-wide). Must exit `0`.
- Run: `pnpm --filter '@/lint' run qa:test` to confirm the plan-rule tests still pass — they reference fixture paths like `/mock/docs/plans/2026-04-01-test.md`, not real archived plans, so behaviour is unchanged.

**Verification**:
- `pnpm -w run qa:lint` exit code is `0` (was `1`).
- `pnpm -w run qa:lint 2>&1 | grep -cE '^  ✗ '` outputs `0` (was `183`).
- `pnpm --filter '@/lint' run qa:test` final summary line shows `Test Files  46 passed (46)` and `Tests  5315 passed (5315)` (matches baseline from prior session).

---

## TASK 5 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify `git status --short` lists exactly: 12 `R` (renames into plans-archive) + 1 `A` (new active plan file). No other entries.
- Verify `pnpm -w run qa:lint` exits `0` from a fresh shell.
- Verify `@/lint` test count is `5315` (baseline) — no regression in workspace-rule test suite.
- Verify `ls docs/plans/` shows only `TEMPLATE.md` and `2026-04-26-workspace-qa-lint.md`.
- Commit with message: `chore(plans): archive 12 completed cleanup plans` and a body listing each filename and the diagnostic-count delta (183 → 0).

**Verification**:
- `pnpm -w run qa:lint` exit `0`.
- `git log -1 --format=%s` matches `chore(plans): archive 12 completed cleanup plans`.
- `git show --stat HEAD | tail -1` shows ~13 files changed (12 renames + 1 add).
- `ls docs/plans/ | wc -l` outputs `2` (TEMPLATE.md + active plan).
- `ls docs/plans-archive/ | wc -l` is baseline + 12.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Move 12 historical plans to `docs/plans-archive/` | -- |
| 2 | Register Rules + Config audit | 1 |
| 3 | Integration Verification | 2 |
| 4 | Full QA + Coverage | 3 |
| 5 | Final verification + commit | 4 |
