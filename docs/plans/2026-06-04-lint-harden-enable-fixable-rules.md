# @/lint — Harden + Enable the 7 Fixable `comments/*` & `complexity/*` Rules (Phased)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use Workflows for the manual-resolution grind.

**Date**: 2026-06-04
**Package**: `@/lint` (`packages/shared/config/tooling/lint/`)
**Goal**: Harden the autofixes of the fixable `comments/*` + `complexity/*` rules to provably-safe subsets (removing today's code-corrupting fixes), enable the 7 fixable currently-`off` rules to `error`, and resolve all 1,048 of their workspace violations (autofix safe subset + manual tail) so `pnpm -w run qa:lint` is clean.
**Architecture**: Fixes use `framework/types.ts` channels — `result.fix` (`{range,text}` LintFix; sentinel `NO_OP_FIX` when unfixable) and `result.fileOp`. `createFixableResult` requires a real fix; `createResult` defaults to `NO_OP_FIX`. The `--fix` applier (`cli-helpers.ts`) applies any non-NO_OP fix, skips rules with explicit `fixable:false`, and has **no overlap detection** — so every rule MUST `NO_OP_FIX` any case it cannot transform behavior-preservingly. Enablement flips `off`→`error` in `.resist-lint.jsonc:21-31`. The two detect-only rules (`no-await-in-loop`, `no-nested-array-iteration`) stay `off`.

## Context (why this change)

The user asked for working `fix` support across 13 `comments/*`/`complexity/*` rules, then enablement to `error` with a clean lint. A 13-agent fixability investigation + a definitive workspace violation count established:

- **3 rules are genuinely detect-only** — no behavior-preserving syntactic autofix exists: `complexity/array-size-warning` (can't invent a bound), `complexity/no-await-in-loop` (Promise.all flips error/ordering semantics), `complexity/no-nested-array-iteration` (Map/Set rewrite needs semantic analysis).
- **7 rules ship autofixes that corrupt code today** (verified by direct read of two): the `'FunctionBody'`-vs-`'BlockStatement'` bug emits non-parsing `if ({ return … })`; others cause redeclarations, identifier-corruption, and TDZ reorders. They must be hardened to provably-safe subsets _before_ enablement.
- Enabling all 9 `off` rules surfaces **1,949** violations — **901** in the 2 detect-only rules, flagging frequently-legitimate patterns (sequential awaits, genuine O(n²) algorithms, test setup).

The user chose a **PHASED** scope: land the 7 fixable rules now (1,048 violations); defer the 2 detect-only rules. This plan implements that scope.

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

## Baseline (before any changes)

| Metric                                       | Value                                                                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm -w run qa:lint` exit code              | 0 (7 target rules `off`)                                                                                                                                                                                      |
| `@/lint` test count (must not regress)       | at least 5,701 (re-capture exact via `pnpm --filter '@/lint' run qa:test` at TASK 1)                                                                                                                          |
| Violations once the 7 are enabled            | **1,048** — `require-section-marker-style` 553, `require-section-order` 235, `no-json-parse-in-loop` 91, `no-index-of-in-loop` 56, `no-concat-in-loop` 55, `no-filter-map-chain` 54, `no-dom-query-in-loop` 4 |
| Deferred (remain `off`)                      | `complexity/no-await-in-loop` 344, `complexity/no-nested-array-iteration` 557                                                                                                                                 |
| Count-mechanism positive control             | `typescript/no-bare-as-cast` = 16,622 (proves off-rules executed under the probe config)                                                                                                                      |
| Rules shipping unsafe/broken autofixes today | `no-lint-disable`, `require-section-order`, `no-array-method-in-loop`, `no-concat-in-loop`, `no-dom-query-in-loop`, `no-filter-map-chain`, `no-json-parse-in-loop`                                            |
| `--fix` applier overlap detection            | none (`cli-helpers.ts` `applyFixes`) — each rule must NO_OP non-transformable cases                                                                                                                           |

---

## TASK 1 — Harden the `comments/*` rule autofixes to safe subsets

**Status**: [ ]

**Gap**: `no-lint-disable` deletes the whole line (destroying trailing code → syntax errors); `require-blank-line-groups` inserts one `\n` where a blank line needs two (non-idempotent — re-lint still fails); `require-section-order` reorders unconditionally (use-before-declaration / TDZ, drags unrecognized sections), and is auto-applied in the vscode subtree.

**Plan**:

- `no-lint-disable`: replace the unconditional full-line delete with — SAFE full-line delete only when the comment is alone on its line AND single-line; SAFE trailing strip `{start: lineStart + before.trimEnd().length, end: comment.end}` for `Line` comments with code before them; `NO_OP_FIX` (via `createResult`) for inline block comments and any multi-line block comment. Keep `fixable: true`.
- `require-blank-line-groups`: replace `text:'\n'` with count-aware `'\n'.repeat(Math.max(1, 2 - newlinesBetween))` anchored at `current.end`; route through `createFixableResult`. Idempotent and correctly indented for both already-multiline and same-line pairs.
- `require-section-order`: gate the region-reorder fix — emit it ONLY when every `// ===` header in the region is a recognized section (no `orderIndex -1` header absorbed) AND no moved block declares a top-level `const`/`let`/`var` whose identifier appears as a free identifier in another moved block (syntactic identifier-set check). Else `NO_OP_FIX`. The "no markers" diagnostic stays `NO_OP_FIX`.
- `require-section-marker-style`: already fully-fixable + correct; OPTIONAL hardening — add the existing `isTopLevel` guard to the block-comment branch so indented block dividers are left untouched (avoid silent de-indentation). No behavioral fix required.

**Files**:

- Edit: `src/rules/comments/{no-lint-disable,require-blank-line-groups,require-section-order,require-section-marker-style}.ts`
- Test: `src/rules/comments/comments-rules.test.ts` (add fix-output tests asserting applied result parses; assert NO_OP for the unsafe subsets)

**Verification**: `pnpm --filter '@/lint' run qa:test` passes; new tests assert `no-lint-disable` never deletes code on a trailing-comment line; `require-blank-line-groups` fix is idempotent (two newlines on same-line input); `require-section-order` NO_OPs when a moved block references another's binding.

---

## TASK 2 — Harden the `complexity/*` rule autofixes to safe subsets

**Status**: [ ]

**Gap**: `no-array-method-in-loop` (already `error`), `no-concat-in-loop`, `no-dom-query-in-loop`, `no-filter-map-chain`, `no-json-parse-in-loop` all emit broken/unsafe fixes (non-parsing `if ({ return … })` from the `'FunctionBody'` bug, redeclarations, identifier-corruption, stale hoists, overlapping ranges); `no-index-of-in-loop` is mostly-safe but over-fires; `array-size-warning` advertises `fixable:true` yet is detect-only.

**Plan** (each rule: emit a real `LintFix` ONLY for its provably-safe sliver, `NO_OP_FIX` for everything else):

- `no-array-method-in-loop`: fix the body-type guard to `bodyNode.type !== 'BlockStatement'`; collect identifiers bound in the enclosing loop and NO_OP if the callback/receiver references any; require the call's parent to be `VariableDeclarator.init` or `ExpressionStatement.expression`; only then hoist. Else NO_OP.
- `no-concat-in-loop`: emit the array+`join` rewrite only for `acc += <expr>` where `acc` is a `let acc = ''` declared immediately before the loop, unread elsewhere in the loop, single `+=`, direct body statement; uniquify the temp name. NO_OP numeric `+=`, `.concat`, compound LHS, nested/conditional, multiple `+=`.
- `no-dom-query-in-loop`: hoist only a single loop-invariant `document.<m>('literal')` that is a direct child of the loop body (not nested loop/function, not conditional), with a unique hoist name; encode as a single range `[loopStart, callEnd]`. NO_OP nested/multi-method/conditional/dynamic-selector.
- `no-filter-map-chain`: fix the block-body guard to the arrow's `expression === false`; require both callbacks be expression-body single-`Identifier`-param arrows with the SAME param; rewrite to `arr.flatMap((p) => (filterBody) ? [mapBody] : [])`. Drop the `replaceAll` substitution and `Array<unknown>`. NO_OP otherwise.
- `no-index-of-in-loop`: keep the membership→`Set.has` rewrite but require a simple-`Identifier` receiver, no in-loop mutation of that identifier, exactly one `indexOf` arg, and a recognized comparison; NO_OP otherwise.
- `no-json-parse-in-loop`: hoist only when the first arg is a string `Literal` or a no-substitution `TemplateLiteral`, the call is the loop's own body (not nested), with a unique hoist name. NO_OP all non-literal args.
- `array-size-warning`: set `fixable: false`; keep `createResult`/NO_OP (correctly detect-only).

**Files**:

- Edit: `src/rules/complexity/{no-array-method-in-loop,no-concat-in-loop,no-dom-query-in-loop,no-filter-map-chain,no-index-of-in-loop,no-json-parse-in-loop,array-size-warning}.ts`
- Test: `src/rules/complexity/complexity-rules.test.ts` (fix-output tests: applied result parses; NO_OP for unsafe subsets; `array-size-warning.fixable === false`)

**Verification**: `pnpm --filter '@/lint' run qa:test` passes; a dedicated assertion confirms no complexity rule ever emits a fix whose `text` contains `if ({ return` or produces a duplicate `const`.

---

## TASK 3 — Enable the 7 fixable rules + autofix the safe subset

**Status**: [ ]

**Gap**: The 7 rules are `off`; their safe-subset fixes (after Tasks 1-2) are not yet applied to the workspace.

**Plan**:

- Edit `.resist-lint.jsonc:21-31`: flip the 7 rules `off`→`error` — `comments/require-section-marker-style`, `comments/require-section-order`, `complexity/no-concat-in-loop`, `complexity/no-dom-query-in-loop`, `complexity/no-filter-map-chain`, `complexity/no-index-of-in-loop`, `complexity/no-json-parse-in-loop`. Leave `complexity/no-await-in-loop` + `complexity/no-nested-array-iteration` as `off` (deferred). (This edit adds no `"off"` rule, so it passes `pre-edit-lint-config-deny.sh`.)
- Run `pnpm -w run qa:lint` once to capture the exact post-config violation set, then `node …/cli.ts --fix packages` to apply the hardened safe-subset fixes workspace-wide (e.g. all 553 `require-section-marker-style` canonicalizations).
- Run `pnpm -w run qa:format` to normalize the autofixed output.

**Files**:

- Edit: `.resist-lint.jsonc`

**Verification**: `git diff .resist-lint.jsonc` shows exactly 7 `off`→`error` flips and no change to the two deferred rules; the fully-fixable rule (`require-section-marker-style`) reports 0 remaining; the partial rules report only their NO_OP remainder.

---

## TASK 4 — Manually resolve the NO_OP remainder

**Status**: [ ]

**Gap**: The partial rules leave a NO_OP remainder (`require-section-order` no-markers + unsafe reorders; the complexity rules' non-trivial cases) that `--fix` cannot resolve; these must be fixed in source.

**Plan**:

- Re-run `pnpm -w run qa:lint` to enumerate remaining diagnostics per rule. Drive resolution with a **Workflow** (one agent per file-or-cluster) applying the canonical manual fix per rule:
  - `require-section-order`: add `// === <Section>` headers in canonical order (Types/Schemas → Constants → Helpers → Exported/API) or hand-reorder where the gate NO_OP'd.
  - `no-concat-in-loop`: array `push` + `join` after the loop.
  - `no-dom-query-in-loop`: hoist the constant query to a `const` before the loop.
  - `no-filter-map-chain`: single-pass `flatMap`/`reduce`/`for…of`.
  - `no-index-of-in-loop`: pre-build a `Set`/`Map` before the loop, use `.has`/`.get`.
  - `no-json-parse-in-loop`: hoist the loop-invariant parse to a `const`.
- Where a diagnostic flags genuinely-correct code that the hardened rule still over-reports, **fix the rule** (tighten detection) rather than contort the code — never add a suppression.
- Run that package's `qa:test` after each cluster to catch regressions.

**Files**:

- Edit: source files across `packages/**` (per-site; pattern described above — representative high-density areas surface from the TASK 3 lint run)

**Verification**: `pnpm -w run qa:lint` reports 0 violations for each of the 7 rules; no `eslint-disable`/`oxlint-disable`/suppression directives were added (would itself trip `comments/no-lint-disable`).

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:

- Confirm every edited rule still `export default rule` (auto-loader discovers by default export — no manual registration).
- Confirm `fixable` flags are accurate: `true` for the hardened fixable rules; `false` for `array-size-warning` (and unchanged for the deferred detect-only rules).
- Confirm `.resist-lint.jsonc` has the 7 rules at `error` and the 2 deferred rules still `off`.

**Files**:

- Edit: none beyond Tasks 1-4 (verification task).

**Verification**:

- `git diff HEAD -- .resist-lint.jsonc` shows exactly the 7 flips.
- `git diff --name-only --diff-filter=A HEAD -- packages/shared/config/tooling/lint/src/rules/` is empty (no new rule files).
- Each edited rule file still ends with `export default rule;`.

---

## TASK 6 — Integration Verification

**Status**: [ ]

**Plan**:

- Command registration check: this package declares no VS Code commands; confirm none added.
- Config settings read check: confirm the `fixable` flag and the new severities are read downstream (`--list-rules` + the applier).
- Class instantiation check: no new classes; the hardened fixers are reached through the existing visitor dispatch.
- Dead code / unused export check: every added helper is imported and used within its file; no orphaned exports.

**Verification**:

- `git diff HEAD -- packages/shared/config/tooling/lint/src | grep -cE '^\+.*registerCommand'` returns 0 — no commands added.
- `grep -c 'fixable' packages/shared/config/tooling/lint/src/cli-helpers.ts` returns at least 1 — the applier reads `fixable`.
- `git diff HEAD -- packages/shared/config/tooling/lint/src/rules | grep -cE '^\+export (function|const)'` equals the count of new helpers actually imported (no orphans).
- `git diff HEAD -- .resist-lint.jsonc | grep -cE '^\-.*"off"'` returns 7 — exactly seven rules left the `off` state.

---

## TASK 7 — Full QA + Coverage

**Status**: [ ]

**Plan**:

- Run: `pnpm -w run qa:lint`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter '@/lint' run qa:test` (and `pnpm qa:test` for packages touched in TASK 4)
- Verify the `@/lint` test count increased from baseline by the new fix-output cases.

**Verification**:

- `pnpm -w run qa:lint` exits 0 (zero diagnostics across the workspace, the 7 rules now `error`).
- `pnpm -w run qa:format` exits 0 (or already-formatted).
- `pnpm --filter '@/lint' run qa:test` shows at least 5,701 + new cases, all passing.

---

## TASK 8 — Final Verification + Commit

**Status**: [ ]

**Plan**:

- Verify all hardened rule files emit a real fix only for their safe subset and `NO_OP_FIX` elsewhere.
- Verify the 7 rules are `error` and the 2 detect-only rules remain `off`.
- Verify the full QA gate is green and the tree is clean, then commit.

**Verification**:

- `pnpm -w run qa:lint` exits 0.
- `pnpm --filter '@/lint' run qa:test` shows at least baseline + new cases, all passing.
- The corrupting-fix assertions (Tasks 1-2) pass for every hardened rule.
- `git status --short` is empty after committing with message `feat(lint): harden + enable 7 fixable comments/complexity rules`.

---

## Execution Order

| Task | Description                                                          | Depends On |
| ---- | -------------------------------------------------------------------- | ---------- |
| 1    | Harden `comments/*` autofixes                                        | --         |
| 2    | Harden `complexity/*` autofixes + `array-size-warning` fixable:false | --         |
| 3    | Enable 7 rules + `--fix` safe subset                                 | 1, 2       |
| 4    | Manually resolve NO_OP remainder (Workflow)                          | 3          |
| 5    | Register Rules + Config                                              | 4          |
| 6    | Integration Verification                                             | 5          |
| 7    | Full QA + Coverage                                                   | 6          |
| 8    | Final Verification + Commit                                          | 7          |
