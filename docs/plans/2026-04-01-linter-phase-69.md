# Linter Phase 69 — hygiene/no-dead-locale-keys rule

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-01
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Add a workspace rule that detects locale keys with zero non-test references.
**Architecture**: WorkspaceRule with regex-based locale key parsing and cross-file reference search.

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
| Tests | Existing hygiene tests pass |
| Type-check | Passes |
| Hygiene rules | 1 (no-bare-catch) |

---

## TASK 1 — Create no-dead-locale-keys rule

**Status**: [~]

**Gap**: No lint rule detects dead locale keys that are defined but never referenced in production code.

**Plan**:
- Create WorkspaceRule that parses locale files for dot-path keys
- Search non-test, non-schema, non-locale .ts files for references
- Report unreferenced keys as warnings

**Files**:
- Create: `src/rules/hygiene/no-dead-locale-keys.ts`
- Test: `src/rules/hygiene/hygiene-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — Add tests for no-dead-locale-keys

**Status**: [~]

**Gap**: No tests exist for the new rule.

**Plan**:
- Add describe block to hygiene-rules.test.ts
- Test: reports dead keys, skips referenced keys, ignores test-file-only references

**Files**:
- Test: `src/rules/hygiene/hygiene-rules.test.ts`

**Verification**: Tests pass

---

## TASK 3 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Register the new rule in config files if needed
- Add exports to barrel files / entry points
- Verify no orphaned code (rule is registered and reachable)

**Files**:
- Edit: `src/index.ts` (or relevant entry point) if needed

**Verification**: All new features appear in config, all exports reachable

---

## TASK 4 — Integration Verification

**Status**: [ ]

**Plan**:
- Verify all declared commands have matching registerCommand calls
- Verify all config settings are read via config.get somewhere in code
- Verify all feature classes are instantiated in the entry point
- Verify no unused exports or dead code (created but never imported)
- Grep audit: count rules registered vs declared
- Fix any gaps found before proceeding

**Verification**:
- All config settings have corresponding config.get calls
- All feature classes instantiated (grep entry point for class names)
- No orphaned exports (every export is imported somewhere)

---

## TASK 5 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm qa:test --filter @/lint -- --reporter verbose hygiene-rules`
- Verify test count increased from baseline

**Verification**: All pnpm commands exit 0

---

## TASK 6 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all implementation files exist
- Verify all features registered in config
- Verify all integration checks pass (from Integration Verification task)
- Verify test count >= baseline + new tests
- Commit with descriptive message

**Verification**:
- All implementation `.ts` files exist
- All entries in config / entry point
- Test count >= baseline + new tests
- Integration audit shows zero gaps

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Create no-dead-locale-keys rule | -- |
| 2 | Add tests | 1 |
| 3 | Register rules + config | 1-2 |
| 4 | Integration verification | 3 |
| 5 | Full QA + Coverage | 4 |
| 6 | Final verification + commit | 5 |
