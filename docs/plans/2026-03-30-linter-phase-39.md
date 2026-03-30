# @/lint Phase 39 — Directive Suppression Lint Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/directives.md`
**Goal**: Implement 12 directive suppression lint rules detecting banned suppression comments, missing explanations, type assertion abuse, and suppression density. Uses `Program` and `TSAsExpression` AST visitors.
**Architecture**: 10 rules use `Program` visitor for comment scanning, 2 rules use `TSAsExpression` visitor for type assertion checking.

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
| Tests | 4610 pass / 0 fail |
| Type-check | Passes |
| AstVisitor node types | 41 |

---

## TASK 1 — `directives/no-ts-ignore`

**Status**: [x]

**What**: Detect `@ts-ignore` comments
**Visitor**: `Program`
**Branches**: Line with @ts-ignore → error, line without → skip

---

## TASK 2 — `directives/no-ts-nocheck`

**Status**: [x]

**What**: Detect `@ts-nocheck` comments
**Visitor**: `Program`
**Branches**: Line with @ts-nocheck → error, line without → skip

---

## TASK 3 — `directives/require-ts-expect-error-reason`

**Status**: [x]

**What**: Detect `@ts-expect-error` without ` - ` + 10+ char explanation
**Visitor**: `Program`
**Branches**: @ts-expect-error without reason → error, with valid reason → pass, no directive → skip

---

## TASK 4 — `directives/no-ts-expect-error-on-any`

**Status**: [x]

**What**: Detect `@ts-expect-error` where next line contains `: any`
**Visitor**: `Program`
**Branches**: @ts-expect-error + next line has `: any` → warn, next line clean → pass

---

## TASK 5 — `directives/no-eslint-disable`

**Status**: [x]

**What**: Detect all ESLint directives (eslint-disable, eslint-disable-next-line, eslint-disable-line, eslint-enable)
**Visitor**: `Program`
**Branches**: Line with eslint directive → error, clean line → skip

---

## TASK 6 — `directives/no-prettier-ignore`

**Status**: [x]

**What**: Detect all Prettier directives (prettier-ignore, prettier-ignore-start, prettier-ignore-end)
**Visitor**: `Program`
**Branches**: Line with prettier directive → error, clean line → skip

---

## TASK 7 — `directives/no-biome-ignore`

**Status**: [x]

**What**: Detect `biome-ignore` comments
**Visitor**: `Program`
**Branches**: Line with biome-ignore → error, clean line → skip

---

## TASK 8 — `directives/no-oxlint-ignore`

**Status**: [x]

**What**: Detect all Oxlint directives (oxlint-ignore, oxlint-disable, oxlint-disable-next-line, oxlint-enable)
**Visitor**: `Program`
**Branches**: Line with oxlint directive → error, clean line → skip

---

## TASK 9 — `directives/no-type-assertion-chain`

**Status**: [x]

**What**: Detect `as unknown as` or `as any as` double assertion patterns
**Visitor**: `TSAsExpression`
**Branches**: Double assertion → error, single assertion → pass

---

## TASK 10 — `directives/max-suppressions-per-file`

**Status**: [x]

**What**: Detect files with >3 `@ts-expect-error` directives
**Visitor**: `Program`
**Branches**: Count > 3 → warn, count ≤ 3 → pass, count 0 → skip

---

## TASK 11 — `directives/no-suppression-in-new-code`

**Status**: [x]

**What**: Advisory warning when `@ts-expect-error` is found — new code should be properly typed
**Visitor**: `Program`
**Branches**: @ts-expect-error found → warn, none → skip

---

## TASK 12 — `directives/no-generic-any-assertion`

**Status**: [x]

**What**: Detect `as any` type assertions
**Visitor**: `TSAsExpression`
**Branches**: `as any` → error, `as OtherType` → pass

---

## TASK 13 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add 12 rules to `.resist-lint.jsonc` with severities from source doc

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All 12 rules in config

---

## TASK 14 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 15 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 12 rule files exist
- Verify all 12 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Commit with descriptive message

**Verification**:
- All files exist in `src/rules/directives/`
- Test count ≥ baseline + new tests
