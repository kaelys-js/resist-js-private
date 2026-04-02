# @resist/vscode Phase 64 — Eliminate All Remaining Hardcoded Brand References

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Replace all hardcoded "resist"/"resist-lint" references in en.ts locale strings, package.json, README.md, and CHANGELOG.md with brand constants. Ensure DISABLE_PATTERN regex is derived from prefix constants. Auto-generate static files from brand.ts during build.

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
| Hardcoded "resist" in en.ts | 22 |
| Hardcoded "resist" in package.json | ~40 |
| Hardcoded "resist" in README.md | 35+ |
| Hardcoded "resist" in CHANGELOG.md | 1 |

---

## TASK 1 — Parameterize en.ts locale strings with brand constants

**Status**: [ ]

**Gap**: 22 hardcoded "Resist" and "resist-lint" strings in en.ts bypass brand.ts constants.

**Plan**:
- Import BRAND_NAME and BINARY_NAME from brand.ts into en.ts
- Replace all hardcoded "Resist" with `${BRAND_NAME}` template literals
- Replace all hardcoded "resist-lint" with `${BINARY_NAME}` template literals
- Update schema.ts readonly types if needed (template literals are still strings)
- Update all test mocks that reference these locale strings

**Files**:
- Modify: `src/locale/en.ts`
- Modify: test files with locale mocks referencing "Resist" or "resist-lint"

**Verification**: Tests pass, type-check passes, zero hardcoded "Resist"/"resist-lint" in en.ts

---

## TASK 2 — Derive DISABLE_PATTERN from prefix constants

**Status**: [ ]

**Gap**: DISABLE_PATTERN regex in brand.ts hardcodes "resist-lint-disable" literal instead of using DISABLE_FILE_PREFIX.

**Plan**:
- Construct DISABLE_PATTERN from DISABLE_FILE_PREFIX using RegExp constructor
- Verify inline-overrides.ts and code-actions.ts still work with derived pattern

**Files**:
- Modify: `src/shared/brand.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — Auto-generate package.json brand references via build script

**Status**: [ ]

**Gap**: package.json has ~40 hardcoded "Resist"/"resist-lint" references in displayName, description, category, and setting descriptions.

**Plan**:
- Enhance generate-manifest.ts to also update:
  - `displayName` using BRAND_NAME
  - `description` using BRAND_NAME
  - All `category` fields using BRAND_NAME
  - Setting descriptions referencing brand/binary names
  - `configuration.title` using BRAND_NAME
- Run with --fix to update package.json
- Validate mode catches drift

**Files**:
- Modify: `scripts/generate-manifest.ts`
- Modify: `package.json` (via script --fix)

**Verification**: Script exits 0, package.json updated

---

## TASK 4 — Auto-generate README.md and CHANGELOG.md from brand constants

**Status**: [ ]

**Gap**: README.md has 35+ hardcoded "Resist" references, CHANGELOG.md has 1.

**Plan**:
- Enhance generate-manifest.ts to validate/fix README.md and CHANGELOG.md
- Replace hardcoded brand name with value from brand.ts
- Replace hardcoded binary name with value from brand.ts

**Files**:
- Modify: `scripts/generate-manifest.ts`
- Modify: `README.md` (via script --fix)
- Modify: `CHANGELOG.md` (via script --fix)

**Verification**: Zero hardcoded "Resist" outside brand.ts-derived values

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify en.ts imports brand constants correctly
- Verify DISABLE_PATTERN derived from DISABLE_FILE_PREFIX
- Verify generate-manifest.ts handles all package.json brand fields
- Verify generate-manifest.ts handles README.md and CHANGELOG.md
- Verify all test mocks updated

**Files**:
- Verify: `src/locale/en.ts`
- Verify: `src/shared/brand.ts`
- Verify: `scripts/generate-manifest.ts`
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
- Verify zero hardcoded "Resist"/"resist-lint" in en.ts (only ${BRAND_NAME}/${BINARY_NAME})
- Verify DISABLE_PATTERN uses RegExp constructor
- Verify generate-manifest.ts --fix updates package.json, README.md, CHANGELOG.md
- Verify all tests pass
- Commit with descriptive message

**Verification**:
- `grep -c "'Resist'" src/locale/en.ts` returns 0
- `grep -c "'resist-lint'" src/locale/en.ts` returns 0
- `npx tsx scripts/generate-manifest.ts` exits 0
- `pnpm --filter @resist/vscode qa:test` passes
- All 7 plan tasks marked [x]

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Parameterize en.ts locale strings | — |
| 2 | Derive DISABLE_PATTERN from prefix | — |
| 3 | Auto-generate package.json brand refs | — |
| 4 | Auto-generate README.md/CHANGELOG.md | 3 |
| 5 | Register Rules + Config | 1-4 |
| 6 | Full QA + Coverage | 5 |
| 7 | Final verification + commit | 6 |
