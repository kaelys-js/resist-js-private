# @resist/vscode Phase 62 — White-Labelling, Build Cleanup & Marketplace Readiness

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Extract all hardcoded "resist" references into brand constants for white-labelling, localize remaining string literals, rename output directory `out` → `dist`, extend workspace tsconfig, clean up .gitignore, and add all marketplace publishing requirements (.vscodeignore, README, LICENSE, CHANGELOG, package.json fields).

Each task is atomic: implement → verify (QA + tests) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 306 passing |
| Type-check | Passes |
| Source files | 36 |
| Test files | 32 |
| Locale groups | 29 |
| Hardcoded "resist" refs | 171+ |

---

## TASK 1 — Brand Constants Module

**Status**: [ ]

**Gap**: 171+ hardcoded "resist" strings across all source files prevent white-labelling.

**Plan**:
- Create `src/shared/brand.ts` with all brand-related constants
- Constants: BINARY_NAME, CONFIG_SECTION, DIAGNOSTIC_SOURCE, DIAGNOSTIC_COLLECTION_NAME, COMMAND_PREFIX, CONFIG_FILE_PATTERNS, DISABLE_COMMENT_PREFIX, PREVIEW_SCHEME, BRAND_NAME
- Pure constants, no vscode imports needed

**Files**:
- Create: `src/shared/brand.ts`

**Verification**: Type-check passes

---

## TASK 2 — Update All Source Files to Use Brand Constants

**Status**: [ ]

**Gap**: All source files reference hardcoded "resist" strings.

**Plan**:
- Replace all hardcoded brand strings in source files with imports from brand.ts
- Update: extension.ts, provider.ts, commands.ts, code-actions.ts, code-lens.ts, diagnostic-filter.ts, diff-preview.ts, inline-overrides.ts, import-sorting.ts, per-folder.ts, stage-indicator.ts, watcher.ts, status-bar.ts, diagnostics.ts, config.ts

**Files**:
- Modify: 15+ source files

**Verification**: Type-check passes, tests pass

---

## TASK 3 — Localize All Remaining String Literals

**Status**: [ ]

**Gap**: 14+ un-localized template strings in provider.ts, runner.ts, profiling.ts, errors.ts, diagnostics.ts.

**Plan**:
- Add locale strings to schema.ts and en.ts for all missing templates
- Update source files to use format(en.*, {}) instead of template literals

**Files**:
- Modify: schema.ts, en.ts, provider.ts, runner.ts, profiling.ts, errors.ts, diagnostics.ts

**Verification**: Type-check passes, tests pass

---

## TASK 4 — Output Directory "out" → "dist"

**Status**: [ ]

**Gap**: Extension uses `out/` while workspace convention is `dist/`.

**Plan**:
- Update tsconfig.json outDir, package.json main, .gitignore, clean script, exclude list

**Files**:
- Modify: tsconfig.json, package.json, .gitignore

**Verification**: Build succeeds

---

## TASK 5 — tsconfig.json Extends Workspace Root

**Status**: [ ]

**Gap**: Standalone tsconfig duplicates workspace strict settings.

**Plan**:
- Add extends to workspace root tsconfig
- Keep only CommonJS-specific overrides

**Files**:
- Modify: tsconfig.json

**Verification**: Type-check passes

---

## TASK 6 — .gitignore Cleanup

**Status**: [ ]

**Gap**: Extension .gitignore duplicates root entries.

**Plan**:
- Remove node_modules/ (in root), keep dist/ and *.vsix

**Files**:
- Modify: .gitignore

**Verification**: git status clean

---

## TASK 7 — .vscodeignore for Marketplace

**Status**: [ ]

**Gap**: No .vscodeignore — VSIX includes unnecessary files.

**Plan**:
- Create .vscodeignore excluding src/, tests, config files, etc.

**Files**:
- Create: .vscodeignore

**Verification**: File exists

---

## TASK 8 — README.md for Marketplace

**Status**: [ ]

**Gap**: No README. Required for marketplace.

**Plan**:
- Create README with features, commands, settings

**Files**:
- Create: README.md

**Verification**: File exists

---

## TASK 9 — LICENSE File

**Status**: [ ]

**Gap**: MIT declared but no file.

**Plan**:
- Create MIT LICENSE file

**Files**:
- Create: LICENSE

**Verification**: File exists

---

## TASK 10 — CHANGELOG.md

**Status**: [ ]

**Gap**: No changelog.

**Plan**:
- Create CHANGELOG with v0.0.1 notes

**Files**:
- Create: CHANGELOG.md

**Verification**: File exists

---

## TASK 11 — package.json Marketplace Fields

**Status**: [ ]

**Gap**: Missing marketplace fields.

**Plan**:
- Add homepage, bugs fields
- Update main to dist/extension.js

**Files**:
- Modify: package.json

**Verification**: JSON valid

---

## TASK 12 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Update all test files to import brand constants where they reference brand-specific values
- Verify all source files exist and use brand constants
- Verify all tests exist and reference brand constants
- Verify config (package.json commands/settings) registered correctly

**Files**:
- Modify: test files referencing brand strings

**Verification**: All rule files exist, tests exist, config registered

---

## TASK 13 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm qa:test`
- Run: `pnpm qa:test:coverage`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 14 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all rule files exist in `src/shared/` and `src/lint/`
- Verify all tests exist
- Verify config registered in package.json
- Verify brand constants used everywhere (no hardcoded "resist" in source)
- Commit with descriptive message

**Verification**:
- All `.ts` files exist in `src/shared/` and `src/lint/`
- All test files exist
- All entries in `package.json` contributes
- Test count >= baseline + new tests
- Zero hardcoded brand strings in source (excluding brand.ts and en.ts)

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Brand constants module | — |
| 2 | Update source files for brand constants | 1 |
| 3 | Localize remaining strings | 2 |
| 4 | Output dir out → dist | — |
| 5 | tsconfig extends workspace root | 4 |
| 6 | .gitignore cleanup | 4 |
| 7 | .vscodeignore | — |
| 8 | README.md | — |
| 9 | LICENSE | — |
| 10 | CHANGELOG.md | — |
| 11 | package.json marketplace fields | 4 |
| 12 | Register rules + config (tests) | 2 |
| 13 | Full QA + Coverage | 1-12 |
| 14 | Final verification + commit | 13 |
