# [Package] Phase N — [Title]

<!-- TEMPLATE: Copy this file when creating a new plan. Delete all <!-- comments --> after copying.
     All sections marked REQUIRED will be validated by the pre-plan-file-validate.sh hook.
     The hook will BLOCK plan file creation if any required section is missing.
-->

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: YYYY-MM-DD
**Package**: `@/package-name` (`packages/path/to/src/`)
**Goal**: One-sentence description of what this phase accomplishes.
**Architecture**: Key architectural decisions or patterns used.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

<!-- REQUIRED: Status Legend section. Hook checks for "Status Legend" text. -->
## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

<!-- REQUIRED: Baseline section. Hook checks for "Baseline" text.
     Record metrics BEFORE any changes so progress can be measured. -->
## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | N total (N pass) |
| Type-check | Passes |
| [domain-specific metric] | [value] |

---

<!-- IMPLEMENTATION TASKS: Each task must have:
     - **Status**: [ ] / [x] / [~]
     - **Gap**: What's wrong / missing (one sentence)
     - **Plan**: Bullet list of steps
     - **Files**: List of files to create/modify (REQUIRED for non-tail tasks)
     - **Verification**: How to verify this task is done (REQUIRED for ALL tasks)
-->

## TASK 1 — [descriptive-name]

**Status**: [ ]

**Gap**: What is missing or broken. One sentence.

**Plan**:
- Step 1
- Step 2
- Step 3

**Files**:
- Create: `src/path/to/new-file.ts`
- Edit: `src/path/to/existing-file.ts`
- Test: `src/path/to/file.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — [descriptive-name]

**Status**: [ ]

**Gap**: What is missing or broken.

**Plan**:
- Step 1
- Step 2

**Files**:
- Create: `src/path/to/file.ts`
- Test: `src/path/to/file.test.ts`

**Verification**: Tests pass, type-check passes

---

<!-- ================================================================
     TAIL TASKS — Required at the end of every plan.
     The hook validates ALL FOUR of these exist.
     ================================================================ -->

<!-- REQUIRED: Register Rules + Config task.
     Hook checks for "Register.*Rules.*Config" or "Register.*Config" text.
     This task ensures everything created in implementation tasks is
     registered/configured in the appropriate entry points. -->

## TASK 3 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Register all new rules/features in config files
- Add all new exports to barrel files / entry points
- Verify no orphaned code (created but not registered)

**Files**:
- Edit: `src/index.ts` (or relevant entry point)
- Edit: config files as needed

**Verification**: All new features appear in config, all exports reachable

---

<!-- REQUIRED: Integration Verification task.
     Hook checks for "Integration Verification" text.
     Hook ALSO checks this section contains ALL of:
       - Command registration check (registerCommand, command.*register)
       - Config settings read check (config.*read, setting.*read, config.get)
       - Class instantiation check (class.*instantiat, feature.*wired, instantiated)
       - Dead code / unused export check (export.*import, unused.*export, dead.*code, orphan)

     THIS IS THE KEY TASK THAT PREVENTS PHASE-66-STYLE FAILURES.
     It forces you to grep the codebase and prove that every feature
     you built is actually wired into the application. -->

## TASK 4 — Integration Verification

**Status**: [ ]

**Plan**:
- Verify all declared commands have matching registerCommand calls
- Verify all config settings are read via config.get somewhere in code
- Verify all feature classes are instantiated in the entry point
- Verify no unused exports or dead code (created but never imported)
- Grep audit: count commands registered vs declared, settings read vs declared
- Fix any gaps found before proceeding

**Verification**:
- `grep -c 'registerCommand' src/entry-point.ts` matches declared command count
- All config settings have corresponding config.get calls
- All feature classes instantiated (grep entry point for class names)
- No orphaned exports (every export is imported somewhere)

---

<!-- REQUIRED: Full QA + Coverage task.
     Hook checks for "Full QA" or "QA.*Coverage" text.
     Hook ALSO checks this section contains "pnpm" (must list pnpm commands). -->

## TASK 5 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm qa:test` (or project-specific test command)
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

<!-- REQUIRED: Final Verification + Commit task.
     Hook checks for "Final Verification.*Commit" text.
     Hook ALSO checks this section contains at least 3 "verify" bullets. -->

## TASK 6 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all N implementation files exist
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

<!-- REQUIRED: Execution Order table.
     Hook checks for "Execution Order" text.
     Makes task dependencies explicit so implementation order is unambiguous. -->

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | [descriptive-name] | -- |
| 2 | [descriptive-name] | -- |
| 3 | Register rules + config | 1-2 |
| 4 | Integration verification | 3 |
| 5 | Full QA + Coverage | 4 |
| 6 | Final verification + commit | 5 |
