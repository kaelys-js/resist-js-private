# @/lint Phase 37 — O(n) Complexity Rules + AST Visitor Extension

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/complexity.md`
**Goal**: Extend the AST visitor framework with 5 loop node types, then implement 16 complexity/performance lint rules using proper AST visitors. Rules detect O(n²) patterns, expensive operations inside loops, and other performance anti-patterns.
**Architecture**: All rules are `TypeScriptRule` with AST visitors (`ForStatement`, `ForOfStatement`, `WhileStatement`, `CallExpression`, `Program`, `FunctionDeclaration`). Loop-body rules use a shared `walkBody()` helper to recursively search subtrees for expensive operations.

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
| Tests | 4445 pass / 0 fail |
| Type-check | Passes |
| AstVisitor node types | 29 |

---

## TASK 0 — Extend AST Visitor Framework + Shared Helpers

**Status**: [x]

**Plan**:
- Add 5 loop node types to `AstVisitorSchema` in `framework/types.ts`: `ForStatement`, `ForInStatement`, `ForOfStatement`, `WhileStatement`, `DoWhileStatement`
- Create `src/rules/complexity/_utils.ts` with shared helpers: `walkBody()`, `isCallTo()`, `isLoopNode()`
- Create `src/rules/complexity/` directory

**Files**:
- Modify: `src/framework/types.ts`
- Create: `src/rules/complexity/_utils.ts`

**Verification**: Type-check passes, no test regressions

---

## TASK 1 — `complexity/no-nested-array-iteration`

**Status**: [x]

**What**: Detect nested for/for-of loops over arrays — O(n²)
**Visitor**: `ForStatement`, `ForOfStatement`
**Branches**: Nested loop in body → warn, single loop → pass, non-loop code → skip

---

## TASK 2 — `complexity/no-array-method-in-loop`

**Status**: [x]

**What**: No .find()/.filter()/.includes()/.some()/.every() inside loop body
**Visitor**: `ForStatement`, `ForOfStatement`, `WhileStatement`
**Branches**: Array method in loop → warn, array method outside loop → pass

---

## TASK 3 — `complexity/prefer-map-for-lookup`

**Status**: [x]

**What**: Multiple .find() calls on same array → suggest Map
**Visitor**: `Program`
**Branches**: Multiple .find() on same var → warn, single .find() → pass

---

## TASK 4 — `complexity/prefer-set-for-existence`

**Status**: [x]

**What**: .includes() inside loop → suggest Set
**Visitor**: `ForStatement`, `ForOfStatement`, `WhileStatement`
**Branches**: .includes() in loop → warn, .includes() outside → pass

---

## TASK 5 — `complexity/no-repeated-traversal`

**Status**: [x]

**What**: Multiple .filter() + .map() passes on same array identifier
**Visitor**: `Program`
**Branches**: Same array filtered+mapped separately → warn, different arrays → pass

---

## TASK 6 — `complexity/no-index-of-in-loop`

**Status**: [x]

**What**: No .indexOf() inside loop body
**Visitor**: `ForStatement`, `ForOfStatement`, `WhileStatement`
**Branches**: .indexOf() in loop → warn, outside → pass

---

## TASK 7 — `complexity/no-spread-in-reduce`

**Status**: [x]

**What**: No {...acc} or [...acc] inside .reduce() callback
**Visitor**: `CallExpression`
**Branches**: Spread in reduce → warn, no spread → pass, non-reduce call → skip

---

## TASK 8 — `complexity/no-concat-in-loop`

**Status**: [x]

**What**: No string += or .concat() inside loop body
**Visitor**: `ForStatement`, `ForOfStatement`, `WhileStatement`
**Branches**: += or .concat() in loop → warn, outside → pass

---

## TASK 9 — `complexity/no-dom-query-in-loop`

**Status**: [x]

**What**: Cache DOM queries outside loops
**Visitor**: `ForStatement`, `ForOfStatement`, `WhileStatement`
**Branches**: querySelector/getElementById in loop → warn, outside → pass

---

## TASK 10 — `complexity/no-regex-in-loop`

**Status**: [x]

**What**: Compile regex outside loops (new RegExp())
**Visitor**: `ForStatement`, `ForOfStatement`, `WhileStatement`
**Branches**: new RegExp() in loop → warn, outside → pass

---

## TASK 11 — `complexity/no-sort-in-loop`

**Status**: [x]

**What**: No .sort() inside loop body
**Visitor**: `ForStatement`, `ForOfStatement`, `WhileStatement`
**Branches**: .sort() in loop → warn, outside → pass

---

## TASK 12 — `complexity/no-json-parse-in-loop`

**Status**: [x]

**What**: No JSON.parse()/JSON.stringify() inside loop body
**Visitor**: `ForStatement`, `ForOfStatement`, `WhileStatement`
**Branches**: JSON.parse/stringify in loop → warn, outside → pass

---

## TASK 13 — `complexity/no-await-in-loop`

**Status**: [x]

**What**: Suggest Promise.all() for parallel async
**Visitor**: `ForStatement`, `ForOfStatement`, `WhileStatement`
**Branches**: await in loop → warn, outside → pass

---

## TASK 14 — `complexity/no-filter-map-chain`

**Status**: [x]

**What**: .filter().map() chain → suggest single-pass .reduce()
**Visitor**: `CallExpression`
**Branches**: .filter().map() → warn, .filter() alone → pass, .map() alone → pass

---

## TASK 15 — `complexity/array-size-warning`

**Status**: [x]

**What**: Warn on .push() in while(true) without bound
**Visitor**: `WhileStatement`
**Branches**: .push() in while(true) → warn, bounded while → pass

---

## TASK 16 — `complexity/recursive-depth`

**Status**: [x]

**What**: Recursive function without depth/limit parameter
**Visitor**: `FunctionDeclaration`
**Branches**: Self-call without depth param → warn, with depth param → pass, non-recursive → skip

---

## TASK 17 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add 16 rules to `.resist-lint.jsonc` all as `"warn"`

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All 16 rules in config

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
- Verify all 16 rule files + _utils.ts exist
- Verify AstVisitorSchema has 5 new node types
- Verify all 16 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Commit with descriptive message

**Verification**:
- All files exist in `src/rules/complexity/`
- Test count ≥ baseline + new tests
