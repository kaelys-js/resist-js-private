# @/lint — Correct & Honestly Declare `fix` Support for plans/_ + directives/_ Rules; Fix bits-ui Teardown

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use Workflows for any parallelizable grind.

**Date**: 2026-06-04
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`) + `@storylyne/editor` (`packages/products/storylyne/editor/`)
**Goal**: Make every `plans/*` + `directives/*` rule's autofix safe, convergent, and honestly declared (`fixable:false` where no behavior-preserving fix exists), and fix the flaky bits-ui scroll-lock teardown that makes `@storylyne/editor` `qa:test` exit 1 — with zero current workspace violations, so this is a fix-correctness + bug pass, not a violation cleanup.
**Architecture**: Rules emit `LintResult.fix` (a `LintFix {range,text}`); the sentinel `NO_OP_FIX` means "no fix"; `createResult` defaults to NO_OP, `createFixableResult` requires a real fix; a rule declares `fixable:true|false`. The `--fix` applier (`cli-helpers.ts applyFixes`) applies any non-NO_OP fix, skips `fixable:false` rules, and has NO overlap detection — so every fixable rule MUST `NO_OP_FIX` any case it cannot transform behavior-preservingly. Comment-directive rules should detect via `context.comments` (NOT raw line text) and delete via the shared `deleteCommentLineFix` (whole-line iff the comment is alone on its line, else comment-span only) — the proven pattern in `no-eslint-disable.ts` / `no-oxlint-ignore.ts`.

## Context (why this change)

The 19 listed rules are already enabled at `error` in `.resist-lint.jsonc` (directives lines 39-50, plans 55-62; `directives/no-type-assertion-chain` stays `off`), and `pnpm -w run qa:lint` is already GREEN — the workspace has zero violations of them. So "enable + autofix + clean lint" is already satisfied; what remains is the user's core ask — each rule "MUST support the ability for fix." A 20-agent read-only investigation (per-rule, maximum-effort, NO_FIX as last resort) found fix support in three states:

- **6 rules already have a correct, safe autofix** -> no change.
- **6 rules are fixable but their fix is DEFECTIVE** -> destructive line-text detection (`no-biome-ignore`, `no-prettier-ignore`), a non-converging em-dash separator (`no-ts-ignore`, `require-ts-expect-error-reason`), a cross-rule overlap (`no-generic-any-assertion`), plus an optional multi-occurrence gap (`no-template-placeholders`).
- **7 rules are genuinely detect-only** -> no behavior-preserving syntactic fix exists (they would have to synthesize prose / types / human judgement) — yet all 7 are mis-declared `fixable:true`, and 2 of them (`no-suppression-in-new-code`, `no-ts-nocheck`) actively emit UNSAFE fixes that DELETE load-bearing compiler directives (`@ts-expect-error` / `@ts-nocheck`), silently re-exposing real type errors.

Separately, `@storylyne/editor` `qa:test` shows all 1498 tests passing but exits 1 from one unhandled async error: bits-ui's `BodyScrollLock` schedules a real 24ms `setTimeout` on destroy that fires after the jsdom env is torn down (`document is not defined`). Root cause: the editor vitest project sets `globals:true`, which makes `svelteTesting()`'s auto-`cleanup()` bail (`@testing-library/svelte/src/vite.js:74`), so components never unmount until teardown.

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

## Baseline (before any changes)

| Metric                        | Value                                                           |
| ----------------------------- | --------------------------------------------------------------- |
| `pnpm -w run qa:lint --tools` | exit 0 (GREEN — 0 violations of all 19 rules)                   |
| `@/lint` tests                | 5764 pass (`pnpm --filter @/lint run qa:test`)                  |
| `@storylyne/editor` tests     | 1498 pass, but vitest exits 1 (1 unhandled bits-ui async error) |
| 19-rule config                | already `error`; `directives/no-type-assertion-chain` `off`     |
| Fixability (investigation)    | 12 fixable / 7 detect-only                                      |

## Per-Rule Changelog (all 19 rules)

| Rule                                      | Verdict     | Fix state today                                                                                                                | Action                                                                                |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| plans/files-exist                         | fixable     | correct (`[x]`->`[ ]` status revert)                                                                                           | none                                                                                  |
| plans/require-plan-structure              | fixable     | correct (insert canonical Status Legend; NO_OP others)                                                                         | none                                                                                  |
| plans/require-test-files                  | fixable     | correct (insert `- Test:` entries)                                                                                             | none                                                                                  |
| plans/status-dependency-order             | fixable     | correct (`[x]`->`[ ]` revert)                                                                                                  | none                                                                                  |
| plans/no-template-placeholders            | fixable     | correct (fills the ISO date token only; NO_OP others)                                                                          | (optional) fix all date occurrences per line                                          |
| plans/no-empty-plan-sections              | detect-only | mis-declared `fixable:true`, emits NO_OP                                                                                       | set `fixable:false`                                                                   |
| plans/no-incomplete-tasks                 | detect-only | mis-declared `fixable:true`, emits NO_OP                                                                                       | set `fixable:false`                                                                   |
| plans/require-concrete-verification       | detect-only | mis-declared `fixable:true`, emits NO_OP                                                                                       | set `fixable:false`                                                                   |
| directives/no-eslint-disable              | fixable     | correct (comment-based `deleteCommentLineFix`)                                                                                 | none                                                                                  |
| directives/no-oxlint-ignore               | fixable     | correct (comment-based `deleteCommentLineFix`)                                                                                 | none                                                                                  |
| directives/no-ts-ignore                   | fixable     | converts `@ts-ignore`->`@ts-expect-error` but inserts em-dash, so the fixed comment re-trips require-reason                    | change separator em-dash -> ASCII hyphen                                              |
| directives/require-ts-expect-error-reason | fixable     | appends reason with em-dash while its own validity regex needs ASCII hyphen -> non-idempotent (stacks each pass)               | change separator em-dash -> ASCII hyphen                                              |
| directives/no-generic-any-assertion       | fixable     | correct standalone (`as any`->`as unknown`) but overlaps no-type-assertion-chain on `x as any as T`                            | add NO_OP guard when the `as any` is the inner link of a chain                        |
| directives/no-biome-ignore                | fixable     | DESTRUCTIVE: line-text detection deletes whole lines incl. inline code, false-positives in strings, corrupts multi-line blocks | redesign to comment-based detection + `deleteCommentLineFix`; NO_OP multi-line blocks |
| directives/no-prettier-ignore             | fixable     | DESTRUCTIVE: same line-text detection flaw                                                                                     | redesign to comment-based detection + `deleteCommentLineFix`; NO_OP multi-line blocks |
| directives/max-suppressions-per-file      | detect-only | mis-declared `fixable:true`, emits NO_OP                                                                                       | set `fixable:false`                                                                   |
| directives/no-ts-expect-error-on-any      | detect-only | mis-declared `fixable:true`, emits NO_OP                                                                                       | set `fixable:false`                                                                   |
| directives/no-suppression-in-new-code     | detect-only | UNSAFE: deletes a new `@ts-expect-error` (load-bearing) -> re-exposes the suppressed type error                                | replace fix with NO_OP + set `fixable:false`                                          |
| directives/no-ts-nocheck                  | detect-only | UNSAFE: deletes `@ts-nocheck` -> re-enables file-wide type-checking the file may fail                                          | replace fix with NO_OP + set `fixable:false`                                          |

(`directives/no-type-assertion-chain` stays `off` — out of scope.)

## TASK 1 — Redesign no-biome-ignore + no-prettier-ignore to comment-based detection

**Status**: [ ]

**Gap**: Both detect with a raw line-text scan (`/biome-ignore/.test(line)` / prettier-ignore), so the delete-fix deletes the WHOLE line — destroying live code on inline/trailing directives, false-positives on the token inside strings/identifiers and deletes that line, and corrupts multi-line block comments by deleting one physical line.

**Plan**:

- Port the proven sibling pattern from `no-oxlint-ignore.ts` (lines 40-99) / `no-eslint-disable.ts` (lines 38-103): iterate `context.comments`, match the directive against `comment.value`, compute the line via `offsetToLineNumber(comment.start, lineStarts)` (`framework/comment-helpers.ts`), and emit `deleteCommentLineFix(comment.start, comment.end, lineStarts, content)` — whole-line delete only when `content.slice(lineStart, comment.start).trim() === ''`, else delete only the comment span.
- Return `NO_OP_FIX` (keep the diagnostic) for multi-line block comments where the directive is interleaved with other comment text. Keep `fixable:true`.

**Files**:

- Edit: `src/rules/directives/no-biome-ignore.ts`, `src/rules/directives/no-prettier-ignore.ts`
- Test: `src/rules/directives/directives-rules.test.ts` (add fix-output tests: inline directive deletes ONLY the comment and keeps the code; a string containing the token is NOT flagged; an alone-on-line directive is whole-line-deleted; a multi-line block NO_OPs)

**Verification**: `pnpm --filter @/lint run qa:test` green; the new inline / string-false-positive / multiline tests pass.

## TASK 2 — Fix non-converging em-dash separator in no-ts-ignore + require-ts-expect-error-reason

**Status**: [ ]

**Gap**: Both insert an em-dash (U+2014) separator, but `require-ts-expect-error-reason`'s validity regex only accepts ASCII hyphen, so a single `--fix` pass yields a comment that immediately re-trips the rule; `require-ts-expect-error-reason`'s own fix is non-idempotent and stacks the suffix on every pass.

**Plan**: change the inserted separator from em-dash to ASCII hyphen in `buildReplaceFix` (`no-ts-ignore.ts` ~line 45) and `buildReasonFix` (`require-ts-expect-error-reason.ts` line 47). Keep `fixable:true`.

**Files**:

- Edit: `src/rules/directives/no-ts-ignore.ts`, `src/rules/directives/require-ts-expect-error-reason.ts`
- Test: `src/rules/directives/directives-rules.test.ts` (assert the fixed text uses the ASCII hyphen separator; assert a second lint pass over the fixed output yields 0 diagnostics — convergence/idempotence)

**Verification**: `pnpm --filter @/lint run qa:test` green; convergence test passes.

## TASK 3 — Honestly declare the 7 detect-only rules (fixable:false; 2 unsafe fixes -> NO_OP)

**Status**: [ ]

**Gap**: 7 rules cannot emit a behavior-preserving fix (they would synthesize prose / types / judgement) but are declared `fixable:true`; 5 already emit NO_OP (harmless mis-label), while `no-suppression-in-new-code` + `no-ts-nocheck` emit UNSAFE fixes that delete load-bearing compiler directives.

**Plan**:

- Set `fixable:false` (detection unchanged; they already NO_OP): `plans/no-empty-plan-sections`, `plans/no-incomplete-tasks`, `plans/require-concrete-verification`, `directives/max-suppressions-per-file`, `directives/no-ts-expect-error-on-any`.
- `directives/no-suppression-in-new-code`: remove the `deleteCommentLineFix` call, emit `NO_OP_FIX` via `createResult`, set `fixable:false` (the rule WARNS; deleting the new `@ts-expect-error` would re-expose the error it suppresses — explicitly NOT the intended resolution per its own tip).
- `directives/no-ts-nocheck`: remove the delete fix, emit `NO_OP_FIX`, set `fixable:false` (deleting `@ts-nocheck` re-enables file-wide type-checking the file may fail).

**Files**:

- Edit: the 7 rule files above
- Test: `directives-rules.test.ts` + `plans-rules.test.ts` (assert `rule.fixable === false` for each; assert `no-suppression-in-new-code` + `no-ts-nocheck` now emit NO_OP, not a deletion)

**Verification**: `pnpm --filter @/lint run qa:test` green; tests assert `fixable===false` + NO_OP for all 7.

## TASK 4 — Chain-overlap NO_OP guard for no-generic-any-assertion (+ optional no-template-placeholders hardening)

**Status**: [ ]

**Gap**: `data as any as Config` — `no-generic-any-assertion` fixes the inner `any` while `no-type-assertion-chain` fixes the whole chain; the ranges overlap and the applier has no overlap detection -> corruption. `no-type-assertion-chain` is currently `off`, so this is latent, but the guard makes the rule independently safe. Separately, `no-template-placeholders` fixes only the first date placeholder per line.

**Plan**:

- In `no-generic-any-assertion.ts`'s `TSAsExpression` visitor: after confirming `typeAnnotation.type === 'TSAnyKeyword'`, return `NO_OP_FIX` (keep the diagnostic) when this node is the inner operand of an enclosing `TSAsExpression` — detect via a top-down pre-pass that marks every `TSAsExpression` whose `.expression` is itself a `TSAsExpression`, or by checking that the source after this node's type annotation continues with `as <Type>`.
- (Optional) `no-template-placeholders.ts`: iterate per-match (`matchAll`) so all date-placeholder occurrences on a line are fixed in one pass.

**Files**:

- Edit: `src/rules/directives/no-generic-any-assertion.ts` (+ optionally `src/rules/plans/no-template-placeholders.ts`)
- Test: `directives-rules.test.ts` (assert `data as any as Config` emits NO fix from this rule)

**Verification**: `pnpm --filter @/lint run qa:test` green; chain test passes.

## TASK 5 — Fix bits-ui scroll-lock teardown (editor qa:test exit 0)

**Status**: [ ]

**Gap**: `globals:true` disables `svelteTesting()` auto-`cleanup()`, so `theme-switcher.test.ts` (which renders `<DropdownMenu.Root open>`) never unmounts; bits-ui `BodyScrollLock`'s 24ms `setTimeout` fires after jsdom teardown -> `document is not defined` -> vitest exits 1. The existing `useFakeTimers`/`runAllTimers` mitigation is mis-ordered (nothing unmounts before the flush).

**Plan**:

- In `theme-switcher.test.ts`, add `cleanup` to the existing `@testing-library/svelte` import (line 10).
- Insert `cleanup();` as the FIRST statement of `afterEach` (before `vi.runAllTimers()`), so the component unmounts (synchronously via `flushSync`) WHILE jsdom is alive — scheduling the now-fake 24ms timer, which `runAllTimers()` then fires against a live `document`.
- Refresh the explanatory comment; no assertion changed; read-only third-party bits-ui sources are NOT edited.

**Files**:

- Edit: `packages/products/storylyne/editor/src/lib/components/theme-switcher.test.ts`

**Verification**: `pnpm --filter @storylyne/editor run qa:test` exits 0 (1498 pass, 0 unhandled errors); the 2 `it(...)` assertions unchanged.

## TASK 6 — Register Rules + Config

**Status**: [ ]

**Plan**:

- Confirm every edited rule still `export default rule` (the auto-loader discovers by default export — no manual registration).
- Confirm `fixable` flags are accurate: `true` for the 12 fixable, `false` for the 7 detect-only.
- Confirm `.resist-lint.jsonc` already has the 19 rules at `error` and `no-type-assertion-chain` `off` (no edit needed).

**Files**: Edit: none beyond Tasks 1-5.

**Verification**: each edited rule ends with `export default rule;`; `git diff -- .resist-lint.jsonc` is empty; the CLI rule listing shows the corrected `fixable` flags.

## TASK 7 — Integration Verification

**Status**: [ ]

**Plan**:

- Command registration check: this package declares no VS Code commands — confirm none added (`registerCommand` count unchanged at 0).
- Config settings read check: confirm the `--fix` applier in `cli-helpers.ts` reads each rule's `fixable` flag and SKIPS the 7 `fixable:false` rules (so they never auto-fix).
- Class instantiation check: no new classes — the edited fixers are reached through the existing visitor / WorkspaceRule `check` dispatch.
- Dead code / unused export check: every helper imported is used; no orphaned exports; confirm `deleteCommentLineFix` + `offsetToLineNumber` are imported and used in no-biome/no-prettier after the redesign.

**Verification**:

- `git diff HEAD -- src/rules | grep -c registerCommand` outputs 0 (no VS Code commands added).
- `grep -c "fixable" src/cli-helpers.ts` >= 1 — the `--fix` applier reads the flag; the 7 detect-only rules are in its skip list (registered vs declared count matches).
- `grep -rn deleteCommentLineFix src/rules` shows it imported and referenced in no-biome/no-prettier — zero orphaned exports.

## TASK 8 — Full QA + Coverage

**Status**: [ ]

**Plan**:

- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @/lint run qa:test` + `pnpm --filter @storylyne/editor run qa:test` (+ `pnpm qa:test` for the full sweep)
- Verify the `@/lint` test count increased from baseline by the new fix-output / convergence / fixable tests.

**Verification**: all commands exit 0; `@/lint` >= 5764 + new cases; editor exits 0.

## TASK 9 — Final Verification + Commit

**Status**: [ ]

**Plan**:

- Verify all edited rule files compile and their tests pass.
- Verify the `fixable` flags (12 true / 7 false) and that no detect-only rule emits a real fix.
- Verify no fixable rule's fix is destructive (inline-comment + string-false-positive tests green) and the em-dash rules converge.
- Verify `qa:lint` green + `qa:test` green (editor exit 0), then commit.

**Verification**:

- `pnpm -w run qa:lint --tools` exits 0.
- `pnpm --filter @/lint run qa:test` and `pnpm --filter @storylyne/editor run qa:test` exit 0.
- The 7 detect-only rules emit NO real fix; the 2 redesigned rules delete only the comment span on inline directives.
- `git status --short` is clean after committing.

## Execution Order

| Task | Description                                        | Depends On |
| ---- | -------------------------------------------------- | ---------- |
| 1    | Redesign no-biome/no-prettier (comment-based)      | --         |
| 2    | Em-dash -> hyphen convergence                      | --         |
| 3    | 7 detect-only -> fixable:false (2 unsafe -> NO_OP) | --         |
| 4    | no-generic-any chain guard (+ optional)            | --         |
| 5    | bits-ui teardown fix                               | --         |
| 6    | Register rules + config                            | 1-5        |
| 7    | Integration verification                           | 6          |
| 8    | Full QA + Coverage                                 | 7          |
| 9    | Final verification + commit                        | 8          |
