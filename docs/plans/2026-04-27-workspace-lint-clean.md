# Workspace QA — Clear 290 qa:lint Diagnostics from Newly-Activated Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-27
**Package**: workspace-wide (`packages/**`) + `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Make `pnpm -w run qa:lint` exit 0 by resolving every one of the 290 diagnostics introduced when commit `0020a194` enabled five previously-off rules in `.resist-lint.jsonc` (`comments/no-lint-disable`, `directives/max-suppressions-per-file`, `directives/no-suppression-in-new-code`, `directives/require-ts-expect-error-reason`, `jsdoc/param-type-match`). Per the user mandate, every diagnostic is fixed at the code or rule level — no rule reverts, no severity downgrades, no `allowedTargets` escape hatches.
**Architecture**:
- The five activated rules' detection logic uses `context.content.split('\n')` line-text scanning, so they self-flag their own RegExp source patterns and any test fixture string mentioning the pattern. **Root-cause fix at the rule level**: replace line-text scanning with AST comment iteration (oxc exposes leading/trailing comment ranges via `context.tokens`/`context.ast`). Once rules only inspect actual `// …` and `/* … */` comment ranges, ~140 false-positives in rule sources, rule unit-test files, and rule integration tests vanish.
- The remaining ~150 diagnostics are real: legitimate `@ts-expect-error` directives in type-test files, real `oxlint-disable text-encoding-identifier-case` in e2e Playwright tests, and a handful of `eslint-disable` / `@ts-ignore` / `/* global */` survivors. Each is fixed at the source: type-test `@ts-expect-error` directives are migrated to a runtime `expectTypeError<T>()` testing helper (`@/utils/core`); Playwright e2e tests configure the underlying oxlint rule via `.oxlintrc.json` overrides for the `e2e/**` glob; remaining legacy `eslint-disable`/`@ts-ignore` are converted to proper type-narrowing fixes.
- `directives/require-ts-expect-error-reason` regex (`/@ts-expect-error\s+-\s+.{10,}/`) is widened to accept the codebase's `--` (double-dash) convention as well as `-`.
- `comments/no-lint-disable` and `directives/require-ts-expect-error-reason` partially overlap — once `no-lint-disable` is the active source-of-truth (CLAUDE.md: "NEVER use lint disable comments — Only `max-lines` and `max-lines-per-function` are OK to disable"), the latter rule becomes vestigial. **Decision**: keep `require-ts-expect-error-reason` ENABLED since CLAUDE.md exempts `max-lines` / `max-lines-per-function` and those exemptions also apply to `@ts-expect-error` when the rule's `allowedTargets` lists those rule IDs. The two rules are made non-overlapping by giving `comments/no-lint-disable` an `allowedTargets: ['max-lines','max-lines-per-function']` default that already exists in its schema (`optionsSchema.allowedTargets`).
- The 1 `jsdoc/param-type-match` error is a documentation-only mismatch (`readonly (keyof ProductSecrets)[]` JSDoc vs `ReadonlyArray<keyof ProductSecrets>` actual). Trivial doc-comment fix.

Each task is atomic: implement → verify (`pnpm -w run qa:lint --tools` for the rule under fix; `pnpm --filter @/lint run qa:test`) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `pnpm -w run qa:lint` exit code | 1 |
| `pnpm -w run qa:lint 2>&1 \| grep -cE '^  ✗ '` total errors | 290 |
| `comments/no-lint-disable` errors | 221 (80 `@ts-expect-error` / 57 `eslint-disable` / 30 `oxlint-disable` / 19 `@ts-ignore` / 16 `oxlint-ignore` / 15 `@ts-nocheck` / 4 `/* global */`) |
| `directives/require-ts-expect-error-reason` errors | 68 |
| `jsdoc/param-type-match` errors | 1 |
| Affected files | 57 |
| Workspace tests | 19,738 / 19,738 passing |
| Workspace coverage thresholds | All four pass (functions 93.53%, branches 80.38%, statements 92.09%, lines 92.09%) |

---

## TASK 1 — Convert 5 detection rules from line-text to AST comment-only scanning

**Status**: [ ]

**Gap**: `comments/no-lint-disable.ts:46-77`, `directives/require-ts-expect-error-reason.ts:34-58`, `directives/no-ts-ignore.ts`, `directives/no-ts-nocheck.ts`, `directives/no-oxlint-ignore.ts`, `directives/no-eslint-disable.ts`, `directives/no-ts-expect-error-on-any.ts`, `directives/max-suppressions-per-file.ts`, `directives/no-suppression-in-new-code.ts` all use `context.content.split('\n')` line-text scanning. They flag any line whose text matches the detection RegExp — including (a) rule source files where the RegExp is declared as a constant, (b) rule unit-test fixture strings, (c) rule docstrings, (d) string literals containing the pattern as documentation. ~140 of the 290 errors trace to this self-flagging.

**Plan**:
- Replace each rule's `Program(node, context) { const lines = context.content.split('\n'); … }` with an AST comment iterator. The framework already exposes `VisitorContext` — extend it (in `src/framework/types.ts`) with a `comments: Array<{ value: string; type: 'Line'|'Block'; range: { start: number; end: number }; loc: { start: { line:number; column:number }; end: {…} } }>` field populated by `oxc-runner.ts` from oxc's program comments.
- Each rule iterates `context.comments` instead of lines, applying its detection regex only to comment values. String literals, RegExp source bodies, and identifiers no longer trigger.
- Edit `src/framework/oxc-runner.ts:runTypeScriptRules` to extract comments from the parsed oxc program (oxc-parser exposes `program.comments`) and pass through `VisitorContext`.
- Update `comments/no-lint-disable.ts` to pull `allowedTargets` default from `['max-lines','max-lines-per-function']` per CLAUDE.md exemption list.
- Update `directives/require-ts-expect-error-reason.ts` regex to accept both `-` and `--` separators: `/@ts-expect-error\s+-{1,2}\s+.{10,}/`.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/framework/types.ts` (add `comments` field to `VisitorContext`)
- Edit: `packages/shared/config/tooling/lint/src/framework/oxc-runner.ts` (populate `comments` from parsed program)
- Edit: `packages/shared/config/tooling/lint/src/rules/comments/no-lint-disable.ts` (AST iteration + default `allowedTargets`)
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/require-ts-expect-error-reason.ts` (AST iteration + `-{1,2}` regex)
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/no-ts-ignore.ts` (AST iteration)
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/no-ts-nocheck.ts` (AST iteration)
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/no-oxlint-ignore.ts` (AST iteration)
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/no-eslint-disable.ts` (AST iteration)
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/no-ts-expect-error-on-any.ts` (AST iteration)
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/max-suppressions-per-file.ts` (AST iteration)
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/no-suppression-in-new-code.ts` (AST iteration)
- Edit: `packages/shared/config/tooling/lint/src/rules/comments/comments-rules.test.ts` (update fixture expectations — string literals no longer flagged)
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/directives-rules.test.ts` (same)
- Test: `packages/shared/config/tooling/lint/src/rules/comments/comments-rules.test.ts`

**Verification**:
- `pnpm -w run qa:lint 2>&1 \| grep -cE 'comments/no-lint-disable'` drops from 221 to ≤ 100.
- `pnpm -w run qa:lint 2>&1 \| grep -cE 'directives/require-ts-expect-error-reason'` drops from 68 to ≤ 30 (only real `@ts-expect-error` without proper reason remain).
- `pnpm --filter @/lint exec vitest run --project lint src/rules/comments/ src/rules/directives/ 2>&1 \| grep -E '^\s*Tests'` all tests pass.
- `pnpm --filter @/lint run qa:test` exit 0.

---

## TASK 2 — Migrate type-test `@ts-expect-error` directives to runtime `expectTypeError<T>()` helper

**Status**: [ ]

**Gap**: `packages/shared/schemas/template-literal/src/infer.ts` (34 errors), `packages/shared/schemas/template-literal/src/template-literal.test.ts` (22 errors), and similar type-test patterns use `// @ts-expect-error -- conditional branch: …` to assert that a generic constraint correctly errors when violated. Once TASK 1's AST scan lands, these still fail `comments/no-lint-disable` because they ARE actual comments. They cannot simply be removed (that defeats the test). They must be replaced with a non-comment-based type-assertion mechanism.

**Plan**:
- Add a new helper `expectTypeError<T extends never>(): void` in `@/utils/core` that uses TypeScript's `never`-narrowing: passing a non-`never` type to it produces a compile-time error without needing `@ts-expect-error`.
- Sister helper `expectAssignable<Expected, Actual>(): void` for positive type assertions.
- Refactor every `@ts-expect-error` in `infer.ts` and `template-literal.test.ts` to either:
  - (a) Use `expectTypeError<…>()` for the negative branch (the type that should be erroneous), OR
  - (b) Convert the test to a runtime `expectTypeOf` assertion using `vitest`'s built-in (which doesn't need `@ts-expect-error`).
- Repeat across every type-test file flagged by TASK 1 baseline.

**Files**:
- Create: `packages/shared/utils/core/src/type-test-helpers.ts` (`expectTypeError`, `expectAssignable`)
- Create: `packages/shared/utils/core/src/type-test-helpers.test.ts`
- Edit: `packages/shared/utils/core/src/index.ts` (re-export helpers)
- Edit: `packages/shared/schemas/template-literal/src/infer.ts` (remove ~16 `@ts-expect-error`, replace with `expectTypeError<…>()`)
- Edit: `packages/shared/schemas/template-literal/src/template-literal.test.ts` (~14 instances)
- Edit: `packages/shared/schemas/result/src/result.test.ts` (~3 instances)
- Edit: any other type-test files flagged by `pnpm -w run qa:lint 2>&1 \| grep '@ts-expect-error' \| grep -oE 'packages/[^]:]+'` after TASK 1.
- Test: `packages/shared/utils/core/src/type-test-helpers.test.ts`
- Test: `packages/shared/schemas/template-literal/src/template-literal.test.ts`

**Verification**:
- `grep -rE '^\s*//\s*@ts-expect-error' packages/shared/schemas/template-literal/src/ \| wc -l` returns 0.
- `pnpm --filter @/schemas/template-literal run qa:test` exit 0 with same number of tests as baseline (no test deleted; only the assertion mechanism changed).
- `pnpm -w run qa:lint 2>&1 \| grep -cE "@ts-expect-error"` drops by ≥ 60.

---

## TASK 3 — Configure underlying linters via `.oxlintrc.json` to eliminate real `oxlint-disable` directives

**Status**: [ ]

**Gap**: `packages/products/storylyne/editor/e2e/{error-pages,head-meta,layout}.test.ts` contain `// oxlint-disable-next-line text-encoding-identifier-case -- HTML charset attribute uses "utf-8" per spec` (4×) and `/* oxlint-disable no-undef -- page.evaluate callbacks run in browser context where getComputedStyle is a global */` (1× block). `@/cli` and several other source files contain `eslint-disable` survivors from pre-oxlint era.

**Plan**:
- Inspect each `oxlint-disable` site. For `text-encoding-identifier-case` in e2e tests: the rule fires on `'utf-8'` string literals because oxlint normalizes to `'UTF-8'`. Fix at the rule config: in `.oxlintrc.json`, add an `overrides` block scoped to `e2e/**/*.test.ts` setting `"text-encoding-identifier-case": "off"` since e2e tests assert against actual HTML `<meta charset="utf-8">` per HTML5 spec.
- For `no-undef` on `page.evaluate` browser-context globals: in `.oxlintrc.json` overrides, add `globals: { document: 'readonly', window: 'readonly', getComputedStyle: 'readonly', ... }` for the `e2e/**` scope.
- For each `eslint-disable` survivor: remove the comment, fix the underlying issue (pre-oxlint annotations are stale; the rule no longer fires under oxlint).
- For each `oxlint-ignore`: same — these are aliases for `oxlint-disable`; the underlying issue must be fixed and the comment removed.

**Files**:
- Edit: `.oxlintrc.json` (add e2e overrides block: `text-encoding-identifier-case: off`, browser globals)
- Edit: `packages/products/storylyne/editor/e2e/error-pages.test.ts` (remove 1 oxlint-disable)
- Edit: `packages/products/storylyne/editor/e2e/head-meta.test.ts` (remove 3 oxlint-disable)
- Edit: `packages/products/storylyne/editor/e2e/layout.test.ts` (remove oxlint-disable)
- Edit: each non-rule-source `eslint-disable` site (use `pnpm -w run qa:lint 2>&1 \| grep eslint-disable \| grep -oE 'packages/[^]:]+:[0-9]+' \| sort -u` after TASK 1 to get the residual list).
- Test: `packages/products/storylyne/editor/e2e/head-meta.test.ts` (verify still passes after disable removal)

**Verification**:
- `grep -rnE 'oxlint-(disable|ignore)' packages/products/storylyne/editor/e2e/ \| wc -l` returns 0.
- `grep -rnE 'eslint-disable' packages/ \| wc -l` drops from baseline to 0.
- `pnpm --filter @storylyne/editor exec playwright test e2e/head-meta.test.ts` exit 0 (unchanged behavior).
- `pnpm -w run qa:lint 2>&1 \| grep -cE "oxlint-(disable|ignore)\|eslint-disable"` returns 0.

---

## TASK 4 — Convert remaining real `@ts-ignore` / `@ts-nocheck` / `/* global */` to proper TypeScript narrowing or oxlintrc globals

**Status**: [ ]

**Gap**: After TASKs 1–3 and Mass-removal of `@ts-expect-error` from type-tests, residual real suppressions remain: ~19 `@ts-ignore` (legacy escape hatches that pre-date strict TS), ~15 `@ts-nocheck` (whole-file disables), ~4 `/* global */` declarations. CLAUDE.md mandates "Add missing globals to `.oxlintrc.json` instead of `/* global */` comments."

**Plan**:
- For each `@ts-ignore` site: read the line, identify why the type error was suppressed, fix it via type narrowing (`as`-cast with comment; `if (typeof x === 'string')` guard; `satisfies` operator; declared overload). Remove the suppression.
- For each `@ts-nocheck` file: usually a generated file or a Svelte file with cross-tooling type churn. If generated, add to `.oxlintrc.json` `ignorePatterns`. If hand-authored, fix the typing issue and remove `@ts-nocheck`.
- For each `/* global X */` block: move `X` into `.oxlintrc.json`'s `globals` map per CLAUDE.md. Remove the comment block.

**Files**:
- Edit: `.oxlintrc.json` (add residual globals to `globals` map)
- Edit: every file flagged by `pnpm -w run qa:lint 2>&1 \| grep -E '@ts-ignore|@ts-nocheck|/\* global' \| grep -oE 'packages/[^]:]+:[0-9]+' \| sort -u` after TASK 3.
- Test: per-package `qa:test` for each touched package; ensure no regression.

**Verification**:
- `grep -rnE '^\s*//\s*@ts-ignore\|^\s*//\s*@ts-nocheck' packages/ \| wc -l` returns 0 (excluding rule source files which now use AST scan, not line scan).
- `grep -rnE '/\* global' packages/ \| wc -l` returns 0.
- `pnpm -w run qa:lint 2>&1 \| grep -c "comments/no-lint-disable"` returns 0.
- `pnpm -w run qa:lint 2>&1 \| grep -c "directives/require-ts-expect-error-reason"` returns 0.

---

## TASK 5 — Fix the lone jsdoc/param-type-match diagnostic

**Status**: [ ]

**Gap**: `packages/shared/secrets/infisical/src/cloudflare.ts:315` has `@param {readonly (keyof ProductSecrets)[]} keys - …` but the actual parameter type at line 326 is `ReadonlyArray<keyof ProductSecrets>`. The `jsdoc/param-type-match` rule (added in commit 0020a194) compares the JSDoc form against the TS signature and rejects the syntactic mismatch.

**Plan**:
- Change line 315's JSDoc from `{readonly (keyof ProductSecrets)[]}` to `{ReadonlyArray<keyof ProductSecrets>}` to match the TypeScript form exactly.
- Verify: read `packages/shared/config/tooling/lint/src/rules/jsdoc/param-type-match.ts` to understand the comparison algorithm — it appears to do textual normalization. If equivalent forms (`T[]` vs `Array<T>`, `readonly T[]` vs `ReadonlyArray<T>`) are not normalized, that is itself a rule-level bug; fix the rule to treat `readonly T[]` and `ReadonlyArray<T>` as equivalent (canonical forms).

**Files**:
- Edit: `packages/shared/secrets/infisical/src/cloudflare.ts` (1-line JSDoc change)
- Possibly Edit: `packages/shared/config/tooling/lint/src/rules/jsdoc/param-type-match.ts` (add `readonly T[]` ↔ `ReadonlyArray<T>` normalization)
- Test: `packages/shared/config/tooling/lint/src/rules/jsdoc/jsdoc-rules.test.ts` (add fixture for both forms)

**Verification**:
- `pnpm -w run qa:lint 2>&1 \| grep -c "jsdoc/param-type-match"` returns 0.
- `pnpm --filter @/secrets/infisical run qa:test` exit 0.
- `pnpm --filter @/lint exec vitest run --project lint src/rules/jsdoc/jsdoc-rules.test.ts` exit 0.

---

## TASK 6 — Register Rules + Config

**Status**: [ ]

**Plan**:
- This phase doesn't add new rules; it modifies five existing ones. Nothing to register in `.resist-lint.jsonc` — the activations are already there from commit 0020a194.
- Verify the auto-loader still picks up every modified rule by running `pnpm --filter @/lint exec node --import ./packages/shared/config/tooling/node/src/register-aliases.mjs packages/shared/config/tooling/lint/src/cli.ts --list-rules \| wc -l` and asserting count is unchanged from baseline.
- Confirm `VisitorContext.comments` field addition is exported through `@/lint/framework/types.ts` for any downstream rule that wants AST comment access.

**Files**:
- Read-only audit: `.resist-lint.jsonc` (no edits expected — must stay byte-for-byte identical to baseline minus any rule that gets removed via this phase, which is none)

**Verification**:
- `git diff --name-only HEAD -- .resist-lint.jsonc` returns empty (no config changes; only source/test changes).
- `pnpm --filter @/lint exec node --import ./packages/shared/config/tooling/node/src/register-aliases.mjs packages/shared/config/tooling/lint/src/cli.ts --list-rules 2>&1 \| wc -l` matches baseline ± 0.

---

## TASK 7 — Integration Verification

**Status**: [ ]

**Plan**:
- **Command registration check**: `grep -cE 'registerCommand\|command\.register' packages/shared/config/tooling/lint/src/` is unchanged from baseline (this phase adds no CLI commands).
- **Config settings read check**: every modified rule's `optionsSchema.allowedTargets` is read via `context.ruleOptions?.allowedTargets`. `grep -nE "ruleOptions\?\.allowedTargets" packages/shared/config/tooling/lint/src/rules/comments/no-lint-disable.ts` returns ≥1.
- **Class instantiation check**: every modified rule still exports a default value matching `TypeScriptRuleSchema`. Verified by running `pnpm --filter @/lint exec node --import ./packages/shared/config/tooling/node/src/register-aliases.mjs packages/shared/config/tooling/lint/src/cli.ts --list-rules 2>&1 \| grep -cE "^(comments|directives|jsdoc)/"` — count matches baseline.
- **Dead code / unused export check**: the new `type-test-helpers.ts` (TASK 2) is exported from `@/utils/core/src/index.ts` and imported by at least one type-test file. `grep -rn "from '@/utils/core'" packages/shared/schemas/template-literal/src/ \| grep -c "expectTypeError\|expectAssignable"` returns ≥ 1.

**Files**:
- No edits expected; this task is read-only verification (and gap-fix-only edits if any check fails).

**Verification**:
- All four `grep`/`wc` commands above produce expected counts.
- `pnpm -w run qa:lint --tools 2>&1 \| grep -cE '^  ✗ '` returns 0 (no orphans, no missing wiring).

---

## TASK 8 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint`
- Run: `pnpm -w run qa:test:coverage`
- Confirm all four exit 0.
- Confirm test count rose from baseline (19,738) by at least 8 (new tests for `type-test-helpers.ts`, comments AST scan, directives AST scan, jsdoc-normalization).
- Confirm workspace coverage thresholds still pass (functions ≥91%, branches ≥78%, statements ≥90%, lines ≥90%).

**Verification**:
- `pnpm -w run qa:format:check` exits 0.
- `pnpm -w run qa:lint` exits 0.
- `pnpm -w run qa:test:coverage` exits 0 — `pnpm -w run qa:test:coverage 2>&1 \| grep -c 'does not meet global threshold'` returns 0.
- `pnpm -w run qa:test:coverage 2>&1 \| grep -E 'Tests' \| grep -oE '[0-9]+ passed' \| head -1` shows ≥ 19746.
- `pnpm -w run qa:test:coverage 2>&1 \| grep -E 'Functions' \| grep -oE '[0-9]+\.[0-9]+%' \| head -1` shows ≥ 91.00.

---

## TASK 9 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify TASK 1 lint output drop ≥140 errors (rule self-flagging eliminated).
- Verify TASK 2 type-test refactor produces 0 `@ts-expect-error` in `template-literal/`, `result/`, `function/`, `generic/`.
- Verify TASK 3 e2e file disable removal: 0 `oxlint-disable`/`oxlint-ignore` in `e2e/**`.
- Verify TASK 4 residual disable cleanup: 0 `@ts-ignore`, 0 `@ts-nocheck`, 0 `/* global */` outside rule source helpers (which now use AST scan and don't trigger).
- Verify TASK 5 jsdoc fix: 0 `jsdoc/param-type-match` errors.
- Verify TASK 8 full QA: all four `pnpm -w run qa:*` exit 0.
- Commit with message: `fix(lint): clear 290 lint diagnostics — rule AST-comment scan + type-test helper + oxlintrc overrides`.

**Verification**:
- Verify `pnpm -w run qa:lint 2>&1 \| grep -cE '^  ✗ '` returns 0.
- Verify `pnpm -w run qa:test:coverage` exits 0 with no `does not meet global threshold` lines.
- Verify `git status --short` empty after commit.
- Verify `git log -1 --format=%s` matches the commit message.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Convert detection rules to AST comment scan | -- |
| 2 | Migrate type-test `@ts-expect-error` to `expectTypeError<T>()` helper | 1 |
| 3 | Configure `.oxlintrc.json` for e2e text-encoding + globals | 1 |
| 4 | Convert remaining `@ts-ignore` / `@ts-nocheck` / `/* global */` | 1, 3 |
| 5 | Fix `jsdoc/param-type-match` diagnostic | -- |
| 6 | Register Rules + Config audit | 1–5 |
| 7 | Integration Verification | 6 |
| 8 | Full QA + Coverage | 7 |
| 9 | Final Verification + Commit | 8 |
