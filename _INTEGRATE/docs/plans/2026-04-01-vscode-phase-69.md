# VSCode Phase 69 — Consolidate Lint Setup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-01
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Replace standalone validate-brand.ts script and per-package lint config with a proper @/lint rule and workspace-level configuration.
**Architecture**: WorkspaceRule pattern with self-scoping (auto-discovers VS Code extension packages via contributes.commands in package.json).

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
| @resist/vscode tests | 331 pass |
| @/lint tests | 4967 pass |
| Format | Clean |
| validate-brand.ts | Standalone script in vscode/scripts/ |
| .resist-lint.jsonc | Per-package config in vscode/ |
| qa:lint | tsgo + validate-brand.ts |
| qa:lint:resist | Per-package resist-lint invocation |

---

## TASK 1 — Create workspace/vscode-brand-sync lint rule

**Status**: [x]

**Gap**: Brand validation is a standalone script, not a proper lint rule.

**Plan**:
- Create WorkspaceRule that discovers VS Code extension packages via contributes.commands
- For each VS Code extension, validate brand.ts COMMANDS <-> package.json commands (bidirectional)
- Validate all package.json settings are prefixed with CONFIG_SECTION
- Self-scoping: only fires on packages with contributes.commands

**Files**:
- Create: `packages/shared/config/tooling/lint/src/rules/workspace/vscode-brand-sync.ts`

**Verification**: Rule created, follows WorkspaceRule pattern

---

## TASK 2 — Add tests for vscode-brand-sync rule

**Status**: [x]

**Gap**: New rule needs test coverage.

**Plan**:
- Test passing case (brand.ts and package.json in sync)
- Test command in brand.ts missing from package.json
- Test command in package.json missing from brand.ts
- Test setting without correct CONFIG_SECTION prefix
- Test missing brand.ts file
- Test non-VS-Code packages are skipped
- Test template literal commands

**Files**:
- Create: `packages/shared/config/tooling/lint/src/rules/workspace/vscode-brand-sync.test.ts`

**Verification**: `pnpm -w exec vitest run --project lint` passes with 7 new tests

---

## TASK 3 — Remove redundant vscode lint infrastructure

**Status**: [x]

**Gap**: validate-brand.ts, .resist-lint.jsonc, qa:lint, and qa:lint:resist are redundant with workspace-level resist-lint.

**Plan**:
- Delete `packages/shared/config/tooling/vscode/scripts/validate-brand.ts`
- Delete `packages/shared/config/tooling/vscode/.resist-lint.jsonc`
- Remove `qa:lint` and `qa:lint:resist` scripts from vscode package.json

**Files**:
- Delete: `packages/shared/config/tooling/vscode/scripts/validate-brand.ts`
- Delete: `packages/shared/config/tooling/vscode/.resist-lint.jsonc`
- Edit: `packages/shared/config/tooling/vscode/package.json`

**Verification**: Files deleted, scripts removed, vscode tests still pass

---

## TASK 4 — Add rules to workspace .resist-lint.jsonc

**Status**: [x]

**Gap**: New rules need to be explicitly listed in workspace config for clarity.

**Plan**:
- Add `workspace/vscode-brand-sync` to workspace rules
- Add 4 hygiene rules from Phase 68 (no-bare-catch, no-dead-locale-keys, no-duplicate-function-signatures, no-orphaned-exports)
- Add `__mocks__` to workspace exclude list

**Files**:
- Edit: `.resist-lint.jsonc`

**Verification**: Rules listed, exclude updated

---

## TASK 5 — Register Rules + Config

**Status**: [x]

**Plan**:
- Workspace rules auto-register via rule-loader.ts file discovery
- Verify new rule is in `src/rules/workspace/` directory (auto-loaded)
- Verify workspace config lists the rule explicitly
- No barrel files or manual registration needed

**Files**:
- No additional files needed (auto-discovery)

**Verification**: All new features appear in config, rule auto-loads from rules/workspace/

---

## TASK 6 — Integration Verification

**Status**: [x]

**Plan**:
- Verify all declared commands have matching registerCommand calls
- Verify all config settings are read via config.get somewhere in code
- Verify all feature classes are instantiated in the entry point
- Verify no unused exports or dead code (created but never imported)
- Verify workspace/vscode-brand-sync rule is discovered by rule-loader
- Verify validate-brand.ts is fully deleted (not referenced anywhere)
- Verify .resist-lint.jsonc is fully deleted
- Verify qa:lint and qa:lint:resist scripts are removed

**Verification**:
- grep for validate-brand references shows zero hits
- grep for .resist-lint.jsonc in vscode dir shows zero hits
- grep for qa:lint in vscode package.json shows zero hits
- workspace/vscode-brand-sync.ts exists in rules/workspace/
- All config settings have corresponding config.get calls
- No orphaned exports (every export is imported somewhere)

---

## TASK 7 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w exec vitest run --project config-tooling-vscode`
- Run: `pnpm -w exec vitest run --project lint`
- Verify test count increased from baseline

**Verification**: All commands exit 0, tests: 331 vscode + 4974 lint (7 new)

---

## TASK 8 — Final Verification + Commit

**Status**: [~]

**Plan**:
- Verify validate-brand.ts deleted
- Verify .resist-lint.jsonc deleted from vscode dir
- Verify qa:lint removed from vscode package.json
- Verify workspace/vscode-brand-sync.ts exists
- Verify workspace .resist-lint.jsonc has new rules
- Verify test count >= baseline + new tests
- Commit with descriptive message

**Verification**:
- All deleted files confirmed absent
- All new files confirmed present
- All entries in workspace config
- Test count >= baseline + 7 new tests
- Integration audit shows zero gaps

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Create workspace/vscode-brand-sync rule | -- |
| 2 | Add tests for vscode-brand-sync | 1 |
| 3 | Remove redundant vscode lint infrastructure | 1 |
| 4 | Add rules to workspace .resist-lint.jsonc | 1 |
| 5 | Register rules + config | 1-4 |
| 6 | Integration verification | 5 |
| 7 | Full QA + Coverage | 6 |
| 8 | Final verification + commit | 7 |
