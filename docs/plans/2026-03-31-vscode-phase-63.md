# @resist/vscode Phase 63 — Localization Gaps, Marketplace Icon & Brand Automation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Close 3 remaining localization gaps in code-actions.ts, add marketplace icon support, create brand validation script (integrated into qa:lint), and create manifest generation script (integrated into build).

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
| Tests | 306 passing |
| Type-check | Passes |
| Locale groups | 29 |
| Un-localized error messages | 3 (code-actions.ts) |
| Brand validation | Manual only |

---

## TASK 1 — Localize 3 remaining error messages in code-actions.ts

**Status**: [ ]

**Gap**: 3 template literals in code-actions.ts catch blocks bypass the locale system, passing hardcoded English strings to `logError()`.

**Plan**:
- Add `actionFailed`, `fixAllFailed`, `disableFailed` fields to `CodeActionStrings` interface in `schema.ts`
- Add corresponding English strings to `en.ts`
- Replace 3 template literals in `code-actions.ts` with `format()` calls
- Update `code-actions.test.ts` locale mock to include new strings

**Files**:
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/lint/code-actions.ts`
- Modify: `src/lint/code-actions.test.ts`

**Verification**: Tests pass, type-check passes, zero un-localized template literals in code-actions.ts

---

## TASK 2 — Add marketplace icon support

**Status**: [ ]

**Gap**: VS Code Marketplace requires an `icon` field and icon file. package.json also missing `galleryBanner`.

**Plan**:
- Create a simple 128x128 SVG icon file at `icon.png`
- Add `"icon": "icon.png"` to package.json
- Add `"galleryBanner"` object to package.json

**Files**:
- Create: `icon.png`
- Modify: `package.json`

**Verification**: `icon.png` exists, package.json has `icon` and `galleryBanner` fields

---

## TASK 3 — Brand validation script (integrated into qa:lint)

**Status**: [ ]

**Gap**: Command IDs and setting names in package.json must match brand.ts constants. Currently manual — drift risk.

**Plan**:
- Create `scripts/validate-brand.ts` that:
  - Reads brand.ts COMMANDS object values
  - Reads package.json `contributes.commands[].command` array
  - Verifies every COMMANDS value appears in package.json and vice versa
  - Verifies every `contributes.configuration.properties` key starts with CONFIG_SECTION
  - Exits non-zero on mismatch with clear error messages
- Integrate into `qa:lint` script so it runs automatically with lint

**Files**:
- Create: `scripts/validate-brand.ts`
- Modify: `package.json` (update `qa:lint` script)

**Verification**: Script catches intentional mismatch, exits 0 on valid state, integrated into qa:lint

---

## TASK 4 — Manifest generation script (integrated into build)

**Status**: [ ]

**Gap**: package.json `contributes.commands` must be manually kept in sync with brand.ts COMMANDS. Should be automated as part of build.

**Plan**:
- Create `scripts/generate-manifest.ts` that:
  - Reads brand.ts COMMANDS and package.json
  - Validates the `contributes.commands` array matches COMMANDS keys
  - Validates `contributes.configuration.properties` keys match CONFIG_SECTION prefix
  - Exits non-zero if package.json is out of sync (CI-friendly)
- Integrate into `build` script so it runs automatically before compilation

**Files**:
- Create: `scripts/generate-manifest.ts`
- Modify: `package.json` (prepend to `build` script)

**Verification**: Build script runs validation before compile, catches mismatch

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify all 3 new locale string keys registered in `schema.ts` interface
- Verify all 3 new locale string values registered in `en.ts`
- Verify `validate-brand.ts` script registered in `qa:lint`
- Verify `generate-manifest.ts` script registered in `build`
- Verify `icon` and `galleryBanner` registered in `package.json`

**Files**:
- Verify: `src/locale/schema.ts`
- Verify: `src/locale/en.ts`
- Verify: `package.json`

**Verification**: All new entries present in config files

---

## TASK 6 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm --filter @resist/vscode qa:lint`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm --filter @resist/vscode qa:test`
- Run: `pnpm --filter @resist/vscode qa:test:coverage`
- Verify test count >= 306

**Verification**: All commands exit 0

---

## TASK 7 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify zero un-localized template literals in source (excluding brand.ts, en.ts)
- Verify `icon` field exists in package.json
- Verify `scripts/validate-brand.ts` catches intentional mismatch
- Verify brand validation is part of qa:lint
- Verify manifest generation is part of build
- Verify all tests pass
- Commit with descriptive message

**Verification**:
- `grep -rn` for backtick template literals in code-actions.ts returns 0 un-localized
- `node scripts/validate-brand.ts` exits 0
- `pnpm --filter @resist/vscode qa:test` passes
- All 7 plan tasks marked [x]

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Localize code-actions.ts error messages | — |
| 2 | Marketplace icon support | — |
| 3 | Brand validation script (in qa:lint) | — |
| 4 | Manifest generation script (in build) | 3 |
| 5 | Register Rules + Config | 1-4 |
| 6 | Full QA + Coverage | 5 |
| 7 | Final verification + commit | 6 |
