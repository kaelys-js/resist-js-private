# @/lint — Add Safe Auto-Fixers to Six `typescript/require-*` Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-06-02
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/rules/typescript/`)
**Goal**: Give each of the six `typescript/require-*` rules a correct, safe auto-fix — emit a real `LintFix`/`fileOp` for the cases provably computable from the oxc syntactic AST, and the exact `NO_OP_FIX` sentinel for the cases that are not — and remove the three fixes shipped today that would corrupt code under `--fix`.
**Architecture**: Fixes use the two channels in `framework/types.ts`: `result.fix` (a `{range,text}` byte-range edit; sentinel `NO_OP_FIX = {range:{start:0,end:0},text:''}` when unfixable) and the independent `result.fileOp` (`create`/`rename`/`move`). The `--fix` applier (`cli-helpers.ts:2015-2036`) applies any `fix` that is NOT exactly the NO_OP sentinel, plus any `fileOp` — it does NOT consult `rule.fixable`. So the sentinel is the only thing that makes the applier skip a diagnostic, and every non-inferable branch MUST return `NO_OP_FIX`. `fixable: true` + the `createFixableResult` factory are added for `--list-rules` accuracy and repo convention. Full type inference (general return-type / variable-type) is out of scope: oxc provides a syntactic AST with no type checker, so non-literal cases stay NO_OP.

Each task is atomic: implement → verify (QA + tests) → update plan → next.

---

## Context (why this change)

The user asked: "for each of these six rules WE MUST support the ability for `fix`." Investigation (direct read of all six rule files + `framework/types.ts` + the `--fix` apply path, corroborated by a 12-agent adversarial verification workflow) found that "support fix" is not uniform, and that three rules already ship dangerous fixes:

- The `--fix` applier ignores `rule.fixable`. It applies every `result.fix` that is not the exact `NO_OP_FIX` sentinel. So a placeholder or destructive fix is applied verbatim the moment a rule runs.
- `require-return-type` emits the literal text `: ReturnType` (not valid TS) and computes a wrong insert offset for paren-less arrows — e.g. `const f = x => g(x)` inserts inside the body, producing broken source (verified live).
- `require-type-annotation` emits the literal text `: TYPE` (not valid TS) on every untyped binding/param.
- `require-function-schema` sets `fixable: false` yet emits a whole-node deletion (`text: ''` over `[node.start,node.end]`); because the applier ignores `fixable`, this would delete the `v.custom<…>(…)` call and leave broken syntax.

These rules are currently `off` in `.resist-lint.jsonc:194-199`, so the hazards are latent — but the task is to make the fixers correct so they are safe whenever a rule runs (including `resist-lint --fix <file>`). The intended outcome: each rule emits a correct fix for the provably-safe subset and a true `NO_OP_FIX` (not a fake placeholder) elsewhere.

### Per-rule fixability verdict (analysis + adversarial verification)

| Rule                           | Verdict       | Fix channel          | Today                                                    | Work                                                     |
| ------------------------------ | ------------- | -------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `require-const-comment`        | Fully fixable | `fix` text insertion | Correct block-comment insert, no `fixable` flag          | Advertise + harden                                       |
| `require-non-negative-integer` | Fully fixable | `fix` text replace   | Correct `Num` to `NonNegativeInteger`, no `fixable` flag | Advertise                                                |
| `require-svelte-ts-extension`  | Fully fixable | `fileOp` rename      | `NO_OP_FIX` only                                         | Add rename fileOp + `.d.ts` guard                        |
| `require-type-annotation`      | Partial       | `fix` text insertion | Broken `: TYPE` placeholder                              | Infer literal subset, NO_OP rest                         |
| `require-return-type`          | Partial       | `fix` text insertion | Broken `: ReturnType` + wrong offset                     | Infer `void`/`Promise<void>`, NO_OP rest, fix offset bug |
| `require-function-schema`      | Partial       | `fix` text replace   | Destructive delete (`fixable:false` ignored)             | Safe guarded transform, NO_OP rest                       |

"Partial" is the honest ceiling of a syntactic AST, not a shortcut: those rules deliver a real fix for the common, provably-correct cases and a correct no-op (never a corrupting placeholder) for everything else. Each "must NO_OP when …" condition below comes from an adversarial counterexample run against the live rule.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric                                      | Value                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm -w run qa:lint` exit code             | 0 (all six rules `off` in `.resist-lint.jsonc:194-199`)                                                                                                                   |
| Rules emitting a CORRECT fix today          | 2 — `require-const-comment`, `require-non-negative-integer`                                                                                                               |
| Rules emitting a BROKEN or UNSAFE fix today | 3 — `require-return-type`, `require-type-annotation`, `require-function-schema`                                                                                           |
| Rules emitting NO fix today                 | 1 — `require-svelte-ts-extension` (`NO_OP_FIX`)                                                                                                                           |
| Rules with `fixable: true` today            | 0                                                                                                                                                                         |
| Fix applier gates on `rule.fixable`?        | No — `cli-helpers.ts:2015-2036` skips only the exact `NO_OP_FIX` sentinel, then harvests `fileOp`                                                                         |
| `@/lint` test count (must not regress)      | At least 5,664 (last recorded in `docs/plans/2026-05-04-workspace-no-array-method-in-loop.md`; re-capture exact via `pnpm --filter '@/lint' run qa:test` at TASK 1 start) |

---

## TASK 1 — `require-const-comment`: advertise + harden the existing comment-insertion fix

**Status**: [ ]

**Gap**: The rule already emits a correct, unbreakable block-comment insertion (`{range:{start:varDecl.start,end:varDecl.start}, text:'/** … */\n'}`) that the applier applies today, but it does not set `fixable: true`, does not use the `createFixableResult` factory, and the placeholder text is generic.

**Plan**:

- Import `createFixableResult` from `@/lint/framework/types.ts`; replace the raw result object literal with a `createFixableResult(...)` call; add `fixable: true` to the rule object.
- Improve the placeholder to embed the declared name(s): `/** ${nameStr}. */\n` (KEEP the block-comment form — `/** … */` self-terminates so a mid-line insertion is always valid; a `//` line-comment placeholder is a hard-forbidden invariant because it can comment out trailing code).
- Add a defensive guard: build the fix only when `typeof varDecl.start === 'number'`; otherwise emit `NO_OP_FIX` (prevents a stray byte-0 prepend if a node ever lacks an offset).
- Keep the fix on the `!hasPrecedingComment` branch only, and keep iterating `Program.body` (top-level only) — do not recurse into nested scopes (column-0 insertion would misalign indented code).

**Files**:

- Edit: `packages/shared/config/tooling/lint/src/rules/typescript/require-const-comment.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/typescript/typescript-rules.test.ts`

**Verification**:

- `pnpm --filter '@/lint' run qa:test` passes (at least baseline). New/updated cases assert: an uncommented top-level const yields one result whose `fix.text` starts with `/**` and ends with `*/\n`; a const preceded by a block comment or a line comment yields zero results; `rule.fixable === true`.

---

## TASK 2 — `require-non-negative-integer`: advertise the existing replacement fix

**Status**: [ ]

**Gap**: The rule already emits a correct, unbreakable replacement of the inner type span `Num` to `NonNegativeInteger` (`{range:{start:innerType.start,end:innerType.end}, text:'NonNegativeInteger'}`), but does not set `fixable: true` or use `createFixableResult`.

**Plan**:

- Import `createFixableResult`; replace the raw result object with `createFixableResult(...)`; add `fixable: true`.
- Preserve every existing guard — they are the safety boundary: fire only when the trimmed source slice of the inner type is exactly `Num` (blocks `Num<T>`, `ns.Num`, `(Num)`, `Numeric`), the binding id is an `Identifier`, and the initializer is a non-computed `.length` member access with an `Identifier` property named `length`. Replace ONLY `[innerType.start, innerType.end]`, never the `TSTypeAnnotation` wrapper.
- Do NOT add automatic import insertion for `NonNegativeInteger`. This matches the established contract of sibling fixable rules (`typescript/no-union-null` emits `NullableNum`, `typescript/no-bare-data-types` emits a named type) which also omit it; the resulting undefined-type error is non-corrupting and surfaces on the next `tsgo`/`svelte-check` pass. (A future import-merging enhancement is out of scope.)

**Files**:

- Edit: `packages/shared/config/tooling/lint/src/rules/typescript/require-non-negative-integer.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/typescript/typescript-rules.test.ts`

**Verification**:

- `pnpm --filter '@/lint' run qa:test` passes. New cases assert: a `Num`-typed binding initialized from `.length` yields `fix.text === 'NonNegativeInteger'` with range equal to the `Num` span; `Num<T>`, `ns.Num`, and computed `['length']` access yield zero results; `rule.fixable === true`.

---

## TASK 3 — `require-svelte-ts-extension`: add a `fileOp` rename fix

**Status**: [ ]

**Gap**: The rule emits `NO_OP_FIX`. The human action — rename the `.ts` file to `.svelte.ts` — is expressible as a `fileOp: {type:'rename'}`, which the applier harvests even when `fix` is `NO_OP_FIX` (`cli-helpers.ts` collects `result.fileOp` before the NO_OP-skip).

**Plan**:

- Import `createFixableResult`; add `fixable: true`. Compute `to = context.file.replace(/\.ts$/, '.svelte.ts')`.
- MANDATORY guard: when `context.file.endsWith('.d.ts')`, emit `fix: NO_OP_FIX` with NO `fileOp` (renaming a declaration file would produce a nonsensical `*.d.svelte.ts`). The rule's `patterns:['**/*.ts']` matches `.d.ts`, so this guard is required, not optional.
- Emit the rename only when the replace actually changes the path (`to !== context.file` and `/\.ts$/.test(context.file)`) — never a self-rename.
- Emit `createFixableResult(..., { fix: NO_OP_FIX, fileOp: { type: 'rename', from: context.file, to }, tip })`. Keep `fix` as the NO_OP sentinel (no text edit) so only the `fileOp` is applied.
- Update the `tip` to note that importers of the renamed module may need a manual update — `applyFileOps` (`cli-helpers.ts:863-911`) does `fsRename` only and does NOT rewrite importers (the same accepted limitation as the shipped `testing/require-test-suffix` rename).

**Files**:

- Edit: `packages/shared/config/tooling/lint/src/rules/typescript/require-svelte-ts-extension.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/typescript/typescript-rules.test.ts`

**Verification**:

- `pnpm --filter '@/lint' run qa:test` passes. New cases assert (with the rule's `context.file` set per case): a `.ts` file containing `$state(0)` yields a result with `fileOp.type === 'rename'`, `fileOp.to` ending in `.svelte.ts`, and `fix` equal to `NO_OP_FIX`; a `.d.ts` file containing a rune yields a result with NO `fileOp` and `fix` equal to `NO_OP_FIX`; a `.svelte.ts` file yields zero results (early return); `rule.fixable === true`.

---

## TASK 4 — `require-type-annotation`: infer the safe literal subset, NO_OP elsewhere

**Status**: [ ]

**Gap**: The rule emits the literal placeholder text `: TYPE` on every untyped binding and parameter. `: TYPE` is not valid TypeScript, and the applier would insert it verbatim under `--fix`.

**Plan**:

- Add a file-private `inferLiteralType(node)` returning a WIDENED keyword string, or `null` when not inferable:
  - `Literal`: `number` (typeof value `'number'`), `string`, `boolean`, `bigint` (typeof value `'bigint'`), `RegExp` (value `instanceof RegExp`). Always the widened keyword, never a literal type like `42` or `'a'` (correct for `let` reassignment; the rule intends meaningful types). A `null` literal returns `null` (skip; conservative).
  - `TemplateLiteral` (NOT `TaggedTemplateExpression`) returns `string` (any template, including interpolated).
  - `UnaryExpression` with `operator` in `{'-','+'}` over a numeric `Literal` argument returns `number`. Never fire on `void`/`typeof`/`!`/`~` or non-literal/non-numeric args.
  - else returns `null`.
- VariableDeclaration `Identifier` bindings: after the EXISTING skip-guards (`node.declare`, for-of / for-await head regex, `TSAsExpression`/`TSSatisfiesExpression` init, `*Schema` + `CallExpression`), compute `inferLiteralType(decl.init)`. If non-null, emit `createFixableResult` with `text: ': ' + inferred` at `id.end`. If null, emit `NO_OP_FIX`. Delete the `: TYPE` placeholder.
- `checkParams` `AssignmentPattern` (defaulted param): if `right` is a literal that `inferLiteralType` resolves, insert `': ' + inferred` at `left.end` (verified safe: a defaulted param is optional, so calling with `undefined` still compiles with the annotation). All other params — bare `Identifier`, `RestElement`, destructured `ObjectPattern`/`ArrayPattern` — emit `NO_OP_FIX` (their type is fixed by call sites / contextual typing with no syntactic signal).
- Destructured VARIABLE bindings (`ArrayPattern`/`ObjectPattern` ids) emit `NO_OP_FIX` (synthesizing the structural/tuple type is unsafe).
- Add `fixable: true`. Keep all existing skip-guards ahead of inference.

**Files**:

- Edit: `packages/shared/config/tooling/lint/src/rules/typescript/require-type-annotation.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/typescript/typescript-rules.test.ts`

**Verification**:

- `pnpm --filter '@/lint' run qa:test` passes. Tier-1 cases assert inferred widened keywords: a numeric literal yields `: number`; a string literal `: string`; a boolean `: boolean`; a unary `-1` `: number`; a template literal `: string`; a literal-defaulted param a `: number` fix at `left.end`. Tier-2 cases assert `fix` equals `NO_OP_FIX`: bare param, call-expression init, array-destructure binding, object-literal init, `void 0` init, awaited init. No case yields `fix.text === ': TYPE'`. `rule.fixable === true`.

---

## TASK 5 — `require-return-type`: infer `void`/`Promise<void>`, NO_OP elsewhere, fix the offset bug

**Status**: [ ]

**Gap**: Emits the literal text `: ReturnType` (not valid TS). `getReturnTypeInsertPos` uses `content.indexOf(')')` from the last param end, which for paren-less arrows returns a wrong, in-bounds offset: `const f = x => g(x)` inserts at the call's `)`; `const f = x => x` produces range `{-1,-1}` and drops the trailing `;`. Under `--fix` both corrupt code, and the `insertPos === -1` guard does not catch the `g(x)` case.

**Plan**:

- Delete the `: ReturnType` literal entirely.
- Add guards that emit `NO_OP_FIX`: `node.declare`/ambient; `node.generator`; a missing body (overload stub).
- Shape-detect paren-less arrows: when an `ArrowFunctionExpression` has exactly one `Identifier` param and `content[params[0].start - 1] !== '('`, emit `NO_OP_FIX` (a typed param requires added parentheses, a two-point edit that a single zero-width insert cannot express).
- Harden `getReturnTypeInsertPos`: the chosen `parenIdx` must be the params' closing paren — require `content[parenIdx] === ')'` and that it lies before the body opener (`{` for block bodies, `=>` for arrows). Return `-1` otherwise.
- Caller guard: if `insertPos < 0` OR `content[insertPos - 1] !== ')'`, emit `NO_OP_FIX`.
- Inference (only when the insert position is valid): perform a shallow walk of the body that does NOT descend into nested `FunctionDeclaration`/`FunctionExpression`/`ArrowFunctionExpression`. If the block body has ZERO `ReturnStatement` AND ZERO `ThrowStatement`, emit `': void'` (or `': Promise<void>'` when `node.async`). Any return, any throw (a throw-only body is `never`, not `void`), or an expression-bodied arrow emits `NO_OP_FIX`.
- Add `fixable: true`; use `createFixableResult` for the void/Promise<void> path.

**Files**:

- Edit: `packages/shared/config/tooling/lint/src/rules/typescript/require-return-type.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/typescript/typescript-rules.test.ts`

**Verification**:

- `pnpm --filter '@/lint' run qa:test` passes. Cases assert: an empty-body function yields `: void` at the param `)` + 1; an empty-body `async` function `: Promise<void>`; a paren-wrapped empty-body arrow `: void`; a throw-only body `NO_OP_FIX`; a partial-return body `NO_OP_FIX`; a paren-less call-body arrow `NO_OP_FIX` (shape-detect); a generator `NO_OP_FIX`. No case yields `fix.text === ': ReturnType'`. `rule.fixable === true`.

---

## TASK 6 — `require-function-schema`: safe guarded transform, remove the destructive delete

**Status**: [ ]

**Gap**: The rule sets `fixable: false` yet emits a whole-node deletion (`{range:{start:node.start,end:node.end}, text:''}`). The applier ignores `fixable: false`, so this would delete the `v.custom<…>(…)` call and leave broken syntax. The transform to `functionSchema()` is only safe under conditions the visitor never checks (it never reads `node.arguments`, never checks the callee root, never checks parent context).

**Plan**:

- IMMEDIATE: replace the deletion fix with `NO_OP_FIX` (stops the corruption regardless of the rest).
- Implement the transform `v.custom<Fn>(…)` to `functionSchema()` (range `[node.start, node.end]`, text `functionSchema()`) ONLY when ALL hold; otherwise `NO_OP_FIX`:
  1. The callee root object is valibot — walk `callee.object` to the root `Identifier` and require `context.isImportedFrom(rootName, 'valibot')` (blocks rewriting an unrelated `lib.custom<…>`).
  2. The second argument (the predicate) is the trivial always-true form — `() => true` or `() => { return true; }` (inspect `node.arguments[0]`). Anything else (e.g. `(fn) => fn.length === 2`) carries real validation logic that `functionSchema()` would silently drop, so emit NO_OP.
  3. The matched node is NOT the `.callee` of an outer `CallExpression` (not an IIFE like `v.custom<Fn>(()=>true)()`, which would become `functionSchema()()` — valid syntax, broken semantics), else emit NO_OP.
  4. `functionSchema` is ALREADY imported from `@/schemas/function` (`context.isImportedFrom('functionSchema', '@/schemas/function')`). If not imported, emit NO_OP (a single `LintFix` cannot also add the import; an unimported `functionSchema()` is an undefined reference). Keep the existing `tip` that instructs adding the import.
- Add `fixable: true` (the guarded transform is a real fix). Keep all `EXEMPT_PATTERNS` and the `FUNCTION_TYPE_PATTERN` detection unchanged.

**Files**:

- Edit: `packages/shared/config/tooling/lint/src/rules/typescript/require-function-schema.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/typescript/typescript-rules.test.ts`

**Verification**:

- `pnpm --filter '@/lint' run qa:test` passes. Cases assert (fixtures with `v` imported from `valibot` and `functionSchema` imported from `@/schemas/function`): a trivial-predicate `v.custom` yields `fix.text === 'functionSchema()'`; a logic-bearing predicate yields `NO_OP_FIX`; an immediately-invoked `v.custom<Fn>(()=>true)()` yields `NO_OP_FIX`; a non-valibot `lib.custom` yields `NO_OP_FIX`; the trivial case with `functionSchema` NOT imported yields `NO_OP_FIX`; a non-function type param yields zero results. No case yields a non-zero-range fix with empty text. `rule.fixable === true`.

---

## TASK 7 — Harden the `--fix` applier to honor an explicit `fixable: false` (defense-in-depth)

**Status**: [ ]

**Gap**: `_runLintCore` (`cli-helpers.ts:2015-2036`) applies any non-sentinel `fix`/`fileOp` regardless of `rule.fixable`. Tasks 1-6 remove today's broken-fix instances, but the framework should prevent re-introduction: a rule that deliberately sets `fixable: false` should never have a stray fix auto-applied. (Scoped narrowly: rules that leave `fixable` undefined keep current behavior, so no existing rule's autofix regresses.)

**Plan**:

- In the `--fix` collection loop, resolve the rule for `result.ruleId` from the already-loaded rules map and SKIP applying that result's `fix` and `fileOp` when the rule's `fixable === false` (an explicit opt-out). Leave `fixable === undefined` and `fixable === true` behaving exactly as today. Keep the existing NO_OP-sentinel skip.
- This makes an explicit `fixable: false` a real safety gate without changing behavior for the many rules that simply omit the flag.

**Files**:

- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts`
- Test: `packages/shared/config/tooling/lint/src/cli-helpers.test.ts`

**Verification**:

- `pnpm --filter '@/lint' run qa:test` passes. A new unit test asserts: a result whose `ruleId` belongs to a rule with `fixable: false` and that carries a non-sentinel `fix` is NOT written; a result from a `fixable: true` rule IS written; a result from a rule with `fixable` undefined behaves as before.
- NOTE: this task is separable. If the user prefers to keep scope strictly to the six rules, it can be dropped without affecting Tasks 1-6.

---

## TASK 8 — Register Rules + Config

**Status**: [ ]

**Plan**:

- Confirm every edited rule still `export default rule` (the auto-loader in `framework/rule-loader.ts` discovers rules by default export — no manual registration exists or is needed).
- Confirm each of the six rule objects now carries `fixable: true` (Tasks 1-6) and that `createFixableResult` / `NO_OP_FIX` are imported where used and not left as orphaned imports.
- Config: the six rules REMAIN `off` in `.resist-lint.jsonc:194-199`. This plan adds fix CAPABILITY, not enablement — enabling them workspace-wide is a separate decision with large blast radius and is explicitly out of scope. No edit to `.resist-lint.jsonc` is expected (which also avoids the `pre-edit-lint-config-deny.sh` gate).

**Files**:

- Edit: only the rule files and test file from Tasks 1-7 (this task verifies registration, adds no new files).

**Verification**:

- `git diff HEAD -- .resist-lint.jsonc` is empty (rules unchanged, still `off`).
- `git diff --name-only --diff-filter=A HEAD -- packages/shared/config/tooling/lint/src/rules/` is empty (no new rule files created).
- Each edited rule file still ends with `export default rule;`.

---

## TASK 9 — Integration Verification

**Status**: [ ]

**Plan**:

- Command registration check: this package declares no VS Code commands; confirm no `registerCommand` / `command.*register` calls were added — `git diff HEAD -- packages/shared/config/tooling/lint/src` shows zero added `registerCommand` lines. (Rules are auto-loaded by default export, not command-registered.)
- Config settings read check: confirm the new `fixable` flag is actually read downstream — `cli-helpers.ts` `--list-rules` reads `rule.fixable`, and (after Task 7) the applier reads it via the rule lookup (a `config.get`-equivalent read); confirm no flag is declared but never read.
- Class instantiation check: no new classes are introduced; confirm every feature is wired and instantiated — the six fixers are reached through the existing visitor dispatch exercised by the rule-loader path (no class needs manual instantiation). `git diff --stat HEAD -- packages/` shows only modifications to the six rule files, `typescript-rules.test.ts`, and (if Task 7) `cli-helpers.ts` plus its test.
- Dead code / unused export check: confirm no orphaned exports or dead code — every added helper (`inferLiteralType`, the hardened `getReturnTypeInsertPos`, the function-schema guards) is imported and used within its file; every export is imported somewhere; no created-but-unused symbols remain.

**Verification**:

- All four checks above produce the expected result (zero added commands; `fixable` read by `--list-rules` and the applier; no new classes or files beyond the listed set; no orphaned exports).
- `pnpm --filter '@/lint' run qa:test` passes with at least baseline plus the new cases.

---

## TASK 10 — Full QA + Coverage

**Status**: [ ]

**Plan**:

- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter '@/lint' run qa:test`
- Verify the `@/lint` test count increased from baseline by the number of new cases (Tasks 1-7).

**Verification**:

- `pnpm -w run qa:lint --tools` exits 0.
- `pnpm -w run qa:format` exits 0 (or reports already-formatted).
- `pnpm --filter '@/lint' run qa:test` shows at least 5,664 plus the new cases, all passing.

---

## TASK 11 — Final Verification + Commit

**Status**: [ ]

**Plan**:

- Verify all six rule files set `fixable: true` and use `createFixableResult` for real fixes and `NO_OP_FIX` for non-inferable branches.
- Verify, via the test suite, that no rule emits a corrupting fix: a dedicated assertion confirms none of the six ever produces `fix.text === ': TYPE'`, `fix.text === ': ReturnType'`, or a non-zero-range fix with empty text.
- Verify the full QA gate is green and the tree is clean, then commit.

**Verification**:

- `pnpm -w run qa:lint --tools` exits 0.
- `pnpm --filter '@/lint' run qa:test` shows at least baseline plus the new cases, all passing.
- The corrupting-fix assertion (above) passes for all six rules.
- `git status --short` is empty after committing with message `feat(lint): add safe auto-fixers to six typescript/require-* rules`.

---

## Execution Order

| Task | Description                                          | Depends On |
| ---- | ---------------------------------------------------- | ---------- |
| 1    | `require-const-comment`: advertise + harden          | --         |
| 2    | `require-non-negative-integer`: advertise            | --         |
| 3    | `require-svelte-ts-extension`: fileOp rename         | --         |
| 4    | `require-type-annotation`: literal-subset inference  | --         |
| 5    | `require-return-type`: void inference + offset bug   | --         |
| 6    | `require-function-schema`: guarded transform         | --         |
| 7    | Harden applier to honor `fixable: false` (separable) | --         |
| 8    | Register Rules + Config                              | 1-7        |
| 9    | Integration Verification                             | 8          |
| 10   | Full QA + Coverage                                   | 9          |
| 11   | Final Verification + Commit                          | 10         |
