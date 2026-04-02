# @/lint Phase 50 — Svelte Template AST Completeness + Error Reporting

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Complete Svelte template AST visitor coverage (add all 20 missing node types) and replace silent error swallowing in the Svelte parser with descriptive diagnostics. Every parse failure must produce a visible lint result — no silent skips.
**Architecture**: Extends `AstVisitorSchema` with all Svelte 5 modern AST node types, adds structured error return from `parseSvelteTemplate`, and wires diagnostic emission in `oxc-runner.ts` when template parsing fails.

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
| Tests | 4935 total |
| Svelte template visitor types | 17 |
| Parse error behavior | Silent null return, no diagnostic |

---

## TASK 1 — Add 20 missing Svelte AST node types to AstVisitorSchema

**Status**: [x]

**Gap**: `AstVisitorSchema` in `types.ts` registers only 17 of 37 Svelte template AST node types. Rules cannot register visitors for the other 20 because `v.strictObject()` rejects unknown keys.

**Plan**:
- Add all 20 missing types to the Svelte Template AST Visitors section in `AstVisitorSchema`
- Types to add (grouped by category):
  - Structure: `Text`, `Comment`
  - Tags: `ConstTag`, `DebugTag`, `AttachTag`
  - Directives: `AnimateDirective`, `LetDirective`, `TransitionDirective`, `UseDirective`
  - Attributes: `SpreadAttribute`
  - Elements: `TitleElement`, `SvelteBody`, `SvelteComponent`, `SvelteDocument`, `SvelteElement`, `SvelteFragment`, `SvelteBoundary`, `SvelteHead`, `SvelteSelf`, `SvelteWindow`

**Files**:
- Modify: `src/framework/types.ts`

**Verification**: Type-check passes, existing 4935 tests pass, total visitor types = 37

---

## TASK 2 — Replace silent error swallowing in parseSvelteTemplate

**Status**: [x]

**Gap**: `parseSvelteTemplate` in `svelte-template.ts` has two bare `catch {}` blocks that silently eat errors — one for compiler import, one for parse failures. A `.svelte` file with a syntax error silently loses ALL template rules with zero feedback.

**Plan**:
- Change `parseSvelteTemplate` return type from `AstNode | null` to `{ ast: AstNode } | { error: string }` (a Result-like discriminated union)
- On `import('svelte/compiler')` failure: return `{ error: 'svelte/compiler not available — install svelte to enable template linting' }`
- On `svelteParse()` throw: capture the error message and return `{ error: 'Svelte template parse error: ${message}' }` with the actual compiler error (line/column if available)
- Export a type alias `SvelteParseResult` for the return type

**Files**:
- Modify: `src/framework/svelte-template.ts`

**Verification**: Existing tests pass, function returns structured results

---

## TASK 3 — Wire diagnostic emission in oxc-runner.ts for parse failures

**Status**: [x]

**Gap**: `oxc-runner.ts` checks `if (parsed)` after calling `parseSvelteTemplate` — when null, silently sets `templateAst = undefined`. No diagnostic is emitted, so the user has no idea template rules were skipped.

**Plan**:
- Update `oxc-runner.ts` to handle the new `SvelteParseResult` return type
- On `{ error }` result: emit a lint warning with the descriptive error message, file path, line 1, column 1
- Warning ruleId: `svelte5/template-parse-error` (internal, not a registered rule)
- Warning message: the `error` string from the parse result
- On `{ ast }` result: proceed as before (patch loc, set templateAst)

**Files**:
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Existing tests pass, parse errors produce visible diagnostics

---

## TASK 4 — Add tests for error reporting and completeness

**Status**: [x]

**Plan**:
- Test: invalid Svelte syntax produces a warning diagnostic with descriptive message
- Test: valid Svelte file produces no parse error diagnostic
- Test: all 37 Svelte visitor types are registered in AstVisitorSchema
- Test: walker visits all node types in a complex Svelte template (each, if, snippet, render, bind, on, style, class, transition, use, animate, const, debug, html, slot, svelte:element, svelte:boundary, etc.)

**Files**:
- Modify: `src/rules/svelte5/svelte5-rules.test.ts`

**Verification**: All new tests pass, total test count increased from baseline

---

## TASK 5 — Register Rules + Config

**Status**: [x]

**Plan**:
- No new rules to register — this phase modifies framework internals only
- Verify `.resist-lint.jsonc` schema regenerated correctly (auto-generated from rule loader)
- Verify existing 18 svelte5 rules still load and function with the expanded AstVisitorSchema

**Files**:
- Verify: `.resist-lint.jsonc` (no changes expected)
- Verify: `.resist-lint.schema.json` (no changes expected)

**Verification**: All 18 existing svelte5 rules still registered and functional

---

## TASK 6 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run `pnpm qa:test`
- Run `pnpm qa:lint`
- Run `pnpm qa:format`
- Verify test count increased from baseline 4935

**Verification**: All commands green, no regressions

---

## TASK 7 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify AstVisitorSchema has all 37 Svelte template node types
- Verify parseSvelteTemplate returns structured error results (not null)
- Verify oxc-runner.ts emits diagnostic on parse failure
- Verify all new tests pass
- Verify test count ≥ 4935 + new tests
- Commit with descriptive message

**Verification**:
- AstVisitorSchema contains all 37 Svelte visitor type entries
- `SvelteParseResult` type exported from `svelte-template.ts`
- Parse failure emits `svelte5/template-parse-error` diagnostic
- All tests pass
- Commit clean

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Add 20 missing node types | — |
| 2 | Replace silent error swallowing | — |
| 3 | Wire diagnostic emission | 2 |
| 4 | Add tests | 1, 2, 3 |
| 5 | Register rules + config verification | 1, 2, 3 |
| 6 | Full QA + Coverage | 4, 5 |
| 7 | Final verification + commit | 6 |
