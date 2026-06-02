# Workspace QA — Eliminate 1,008 `jsdoc/require-param` + `jsdoc/require-returns` Errors via Built-in Autofix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-30
**Package**: workspace-wide — `packages/**/*.{ts,svelte.ts}` across 126 source files in 10 packages
**Goal**: Make `pnpm -w run qa:lint` exit 0 by resolving every one of the **1,008** lint diagnostics produced by the JSDoc-type-annotation rules (`jsdoc/require-param` and `jsdoc/require-returns`). The strategy uses the rules' built-in autofix to apply 1,002 / 1,008 fixes in a single run with `{Type}` annotations drawn directly from each function's TypeScript AST, plus authored repairs for the remaining 6 hold-outs.

**Context**: The previous JSDoc cleanup phase made `qa:lint` exit 0 by adding `@module` and JSDoc skeletons across 3,107+ files. The next-stricter rule pair is now active and surfaces 1,008 follow-on diagnostics — `@param` and `@returns` tags missing the `{Type}` annotation that editor tooltips and `tsdoc`-driven docs need. Both rules already expose autofix data on every diagnostic (`require-returns` is marked `fixable: true` at the rule level; `require-param` returns `fix:` payloads on every result and the runner applies them whenever `--fix` is passed, regardless of the top-level flag — see `cli-helpers.ts:1824-1858`). The autofix payload pulls the actual TypeScript type from the function's AST via `extractParamType` (`require-param.ts:135-145`) and `getReturnType` (`require-returns.ts:66-78`), so types written into JSDoc match the actual signature exactly. Authored descriptions already present in the JSDoc are preserved verbatim. Only 6 diagnostics need manual repair — all structural cases the autofix cannot handle.

**Architecture**:

- **Autofix-first** (TASK 1). Run `pnpm -w run qa:lint --fix --tools` once at the workspace root. The runner walks every file with diagnostics, reads the file, applies the per-result `fix.range` / `fix.text` payloads in offset-descending order via `applyFixes()` (`cli-helpers.ts:1850`), and writes the result back. Token-precise edits — no AST rewrites, no surrounding code touched.
- **Source of truth for autofix payloads — the lint rule's own AST extraction**. For `@param X` with missing `{Type}`, `extractParamType(paramNode, content)` reads `param.typeAnnotation.typeAnnotation` and slices the original source text between its byte offsets — verbatim type characters, no normalization (`require-param.ts:135-145`). For `@returns`, `getReturnType()` does the same for `funcNode.returnType.typeAnnotation` (`require-returns.ts:66-78`). The `{Type}` written into JSDoc is byte-for-byte the type from the function signature.
- **6 hold-outs the autofix cannot handle** (TASK 2):
  - **4 × `@param 'X' does not match any function parameter`**. The function is an arrow expression with a single destructured parameter (`({ a, b }) =>`), and the JSDoc uses `@param input` / `@param params` for the destructured object plus `@param input.a` / `@param input.b` for the fields. The rule skips dot-notation entries (`X.field`) and skips bare `rootN` entries when destructuring is present, but flags any other bare name. The autofix payload for these results has empty `text` (`require-param.ts:293`) — a no-op. **Fix**: rename the bare `@param input` / `@param params` → `@param root0`, leveraging the existing destructured-pattern carve-out at `require-param.ts:280`. Sites:
    - `packages/products/storylyne/editor/src/hooks.client.ts:690` (`handleError`)
    - `packages/products/storylyne/editor/src/hooks.server.ts:234` (`handle`)
    - `packages/products/storylyne/editor/src/hooks.server.ts:362` (`handleError`)
    - `packages/products/storylyne/editor/src/routes/api/lens/compile-standalone/+server.ts:644` (anonymous handler)
  - **2 × `@returns {Malformed} does not match actual return type`** in `packages/shared/config/tooling/lint/src/rules/svelte5/_svelte-helpers.ts`. The author wrote a JSDoc type containing literal `}` characters that prematurely close the `{...}` braces — the autofix CAN handle these (the rule emits a fix replacing `{Malformed}` with `{ActualType}` — `require-returns.ts:219`), so they should drop in TASK 1's autofix run. Verify post-autofix; if any remain, manually replace at:
    - Line 171 (`findAssignmentTargets`) — `{Array<{ name: string; node: AstNode}` → `{Array<{ name: string; node: AstNode }>}`
    - Line 230 (`getModuleScriptRange`) — `{{ startLine: number; endLine: number}` → `{{ startLine: number; endLine: number } | null}`
- **`{unknown}` audit** (TASK 3). When the rule cannot resolve a TypeScript type from the AST (e.g. parameter without explicit annotation in a callback signature), `extractParamType` falls back to `'unknown'` (`require-param.ts:138-143`). The autofix would write `{unknown}` into JSDoc — technically valid, but doesn't match actual usage. After TASK 1 lands, grep the workspace for `@param {unknown}` and `@returns {unknown}` introduced by this run; if any exist, audit each site and replace `{unknown}` with the actual type from the function signature (read the source's type annotation directly).
- **Workspace-bulk-script blocker (CLAUDE.md §"Active-Plan Binding Contract")** denies `python3` glob walks and multi-file `sed -i` runs. The lint runner's built-in `--fix` is a TypeScript-driven workspace operation that does not match those patterns and is allowed. The 6 manual hold-outs go through per-site `Edit` tool calls.
- **Pre-edit-lint-config-deny.sh** denies edits to `tools/oxlint.ts`, `tools/svelte-check.ts`, `tools/tsgo.ts`, `framework/oxc-runner.ts` that ADD `"off"` rules or `files: [...]` overrides. JSDoc-only edits (the autofix's domain) do not match those patterns. Only the four manual `root0` renames in TASK 2 touch source code, none of them in protected files.

Each task is atomic: implement → verify → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any further changes)

| Metric                                                          | Value                                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm -w run qa:lint` exit code                                 | 1                                                                                       |
| Total errors surfaced by qa:lint                                | 1,008                                                                                   |
| `jsdoc/require-param` — `is missing {Type}`                     | 588                                                                                     |
| `jsdoc/require-param` — `does not match any function parameter` | 4                                                                                       |
| `jsdoc/require-returns` — `is missing {Type}`                   | 414                                                                                     |
| `jsdoc/require-returns` — `does not match actual return type`   | 2                                                                                       |
| Affected files                                                  | 126                                                                                     |
| Affected packages                                               | 10                                                                                      |
| `pnpm -w run qa:test:coverage` exit code                        | 0 (19,745 tests passing)                                                                |
| Workspace coverage thresholds                                   | All four pass (Statements 92.12, Branches 80.47, Functions 93.49, Lines 92.13)          |
| Captured lint output                                            | `/tmp/lint-output.txt` (7,240 lines)                                                    |
| `--fix` runner location                                         | `packages/shared/config/tooling/lint/src/cli-helpers.ts:1824-1858`                      |
| `--fix` engine                                                  | `applyFixes()` in `framework/oxc-runner.ts` (offset-descending `splice` of byte ranges) |

---

## TASK 1 — Run built-in autofix for the 1,002 mechanical diagnostics

**Status**: [x]

**Gap**: 1,002 of the 1,008 diagnostics carry per-result `fix:` payloads with byte-precise insertion / replacement data populated from the function's AST. The lint runner's `--fix` flag applies them in one workspace-level invocation.

**Plan**:

- Verify lint output capture is current. If `/tmp/lint-output.txt` is stale, regenerate with `pnpm -w run qa:lint`.
- Run `pnpm -w run qa:lint --fix --tools` from the workspace root. The runner walks each affected file once, applies fixes in offset-descending order, writes via `writeFileSync`, and increments `fixesApplied` per file. (Reference: `cli-helpers.ts:1824-1858`.)
- Re-run `pnpm -w run qa:lint` (no `--fix`) and capture remaining error count. Expected: ≤ 6 (the 4 `root0` cases plus possibly 0-2 `_svelte-helpers.ts` mismatches if the autofix didn't land cleanly).
- Inspect `git status --short` to confirm only `.ts` and `.svelte.ts` files in `packages/**/src/**` are modified.
- Sanity-check three random touched files via `git diff <file>` to confirm only `{Type}` tokens were inserted (never code logic).
- Stage and commit: `fix(jsdoc): autofix 1,002 require-param/require-returns {Type} annotations workspace-wide`.

**Files**:

- Edit: 126 source files in `packages/**/src/**/*.{ts,svelte.ts}` (modified by autofix; identified per `/tmp/lint-output.txt`)
- Test: `pnpm -w run qa:test` (smoke check across the workspace; comment-only edits should not change test results)

**Verification**:

- `pnpm -w run qa:lint 2>&1 \| grep -cE 'jsdoc/require-(param\|returns)'` returns ≤ 6.
- `git diff HEAD~1 --shortstat -- packages/` shows only insertions / minor token replacements.
- All `qa:test` results unchanged (19,745 passing).

---

## TASK 2 — Repair the 4 destructured-arg `@param` hold-outs (`root0` rename)

**Status**: [x]

**Gap**: 4 sites remain after TASK 1's autofix. Each is an arrow-function export with a destructured parameter where the JSDoc uses an authored name (`input` / `params` / `event`) instead of the rule's expected `root0` convention. The autofix's empty-text payload cannot fix this; the bare `@param` name must be renamed.

**Plan**:

- For each site, edit the JSDoc block to:
  - Rename the bare `@param <name>` line → `@param root0`.
  - Rename every `@param <name>.<field>` child line → `@param root0.<field>` (preserving the field-level `{Type}` and description verbatim).
- The four sites:
  - `packages/products/storylyne/editor/src/hooks.client.ts:690` (`handleError = ({ error, status, message }) => …`) — `params` → `root0`.
  - `packages/products/storylyne/editor/src/hooks.server.ts:234` (`handle = async ({ event, resolve }) => …`) — `input` → `root0`.
  - `packages/products/storylyne/editor/src/hooks.server.ts:362` (`handleError = ({ error, event, status, message }) => …`) — `params` → `root0`.
  - `packages/products/storylyne/editor/src/routes/api/lens/compile-standalone/+server.ts:644` (anonymous `({ … }) => …` route handler) — `event` → `root0`.

**Files**:

- Edit: `packages/products/storylyne/editor/src/hooks.client.ts`
- Edit: `packages/products/storylyne/editor/src/hooks.server.ts`
- Edit: `packages/products/storylyne/editor/src/routes/api/lens/compile-standalone/+server.ts`
- Test: `pnpm --filter @storylyne/editor run qa:test`

**Verification**:

- `pnpm -w run qa:lint 2>&1 \| grep -c "does not match any function parameter"` returns 0.
- `pnpm --filter @storylyne/editor run qa:test` exits 0 with unchanged pass count.

---

## TASK 3 — `{unknown}` audit + manual repair

**Status**: [x]

**Gap**: For diagnostics where the rule's `extractParamType` couldn't resolve a type from the AST (no explicit annotation, exotic destructuring, etc.), the fallback is the literal string `'unknown'` (`require-param.ts:138-143`). The autofix wrote `{unknown}` into those JSDoc blocks during TASK 1. `unknown` is a valid TypeScript type but does not match the function's actual usage — the user's directive ("match actual usage") requires authored repair.

**Plan**:

- Grep the workspace for newly-introduced `{unknown}` annotations: `git diff HEAD~2 -- packages/ \| grep -E '^\+.*@(param\|returns) \{unknown\}' \| head -50` (`HEAD~2` because TASK 1 lands one commit; this audit runs against that commit).
- For each hit, open the file at the reported location, read the function signature, and identify the actual type the parameter / return _should_ carry (look at how the parameter is consumed inside the body, or what the surrounding type contract requires).
- Edit the JSDoc replacing `{unknown}` with the authored type. Preserve descriptions verbatim.
- Examples of likely `{unknown}` falls:
  - Callbacks passed to `Array.prototype` methods — type is the array's element type.
  - Event handlers — type is `Event` or a specific subtype like `MouseEvent`.
  - Result-pattern combinators — type is `Result<T>` for the inferred T.
- Per-file Edit calls; verify each file's per-package `qa:test` is unchanged.

**Files**:

- Edit: any `packages/**/*.ts` or `packages/**/*.svelte.ts` file containing newly-added `@param {unknown}` or `@returns {unknown}` entries (count and list determined post-TASK-1)
- Test: `pnpm --filter <affected-package> run qa:test` for each package touched

**Verification**:

- `git diff HEAD~3 -- packages/ \| grep -E '^\+.*@(param\|returns) \{unknown\}'` returns empty.
- All package `qa:test` runs exit 0 with unchanged pass counts.

---

## TASK 4 — Register Rules + Config audit

**Status**: [x]

**Plan**:

- This phase modifies only JSDoc payloads (TASKs 1-3). It registers no new rules and adds no new exports.
- Verify `.resist-lint.jsonc` is unchanged: `git diff --name-only HEAD~3 -- .resist-lint.jsonc` returns empty.
- Verify the rule registry size is unchanged: `find packages/shared/config/tooling/lint/src/rules -name '*.ts' -not -name '*.test.ts' -not -name '_*' \| wc -l` matches baseline.
- Verify no `fixable:` flag changes in the JSDoc rules: `git diff HEAD~3 -- packages/shared/config/tooling/lint/src/rules/jsdoc/` returns empty.

**Files**: read-only audit (no edits).

**Verification**:

- `git diff --name-only HEAD~3 -- .resist-lint.jsonc` empty.
- Rule registry size unchanged.
- No JSDoc rule source edits.

---

## TASK 5 — Integration Verification

**Status**: [x]

**Plan**:

- **Command registration check**: `grep -cE 'registerCommand\|command\.register' packages/shared/config/tooling/lint/src/cli-helpers.ts` is unchanged from baseline (no commands added or removed).
- **Config settings read check**: `grep -nE 'config\.rules\|config\.get' packages/shared/config/tooling/lint/src/cli-helpers.ts` returns ≥1 (the existing severity-aware cache hash call site).
- **Class instantiation check**: this plan creates no new exported classes or features. `git log --diff-filter=A --name-only HEAD~3..HEAD -- 'packages/**/*.ts'` returns empty (no new source files).
- **Dead code / unused export check**: zero new exports — `git diff HEAD~3 -- packages/ \| grep -cE '^\+export '` returns 0.

**Files**: read-only audit (no edits).

**Verification**:

- All four checks above produce expected counts.
- `pnpm -w run qa:lint --tools 2>&1 \| grep -cE '^  ✗ '` returns 0.

---

## TASK 6 — Full QA + Coverage

**Status**: [x]

**Plan**:

- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint`
- Run: `pnpm -w run qa:test:coverage`
- Confirm all four exit 0.
- Confirm test count is unchanged from baseline (19,745) — TASKs 1-3 add JSDoc tokens only, no new tests.
- Confirm workspace coverage thresholds still pass (Statements ≥92, Branches ≥80, Functions ≥93, Lines ≥92).

**Verification**:

- `pnpm -w run qa:format:check` exits 0.
- `pnpm -w run qa:lint` exits 0.
- `pnpm -w run qa:test:coverage` exits 0 — `pnpm -w run qa:test:coverage 2>&1 \| grep -c 'does not meet global threshold'` returns 0.
- `pnpm -w run qa:test:coverage 2>&1 \| grep -E 'Tests' \| grep -oE '[0-9]+ passed' \| head -1` shows pass count ≥ 19,745.
- `pnpm -w run qa:test:coverage 2>&1 \| grep -E 'Functions' \| grep -oE '[0-9]+\.[0-9]+%' \| head -1` shows percentage ≥ 91.00.

---

## TASK 7 — Final Verification + Commit

**Status**: [x]

**Plan**:

- Verify TASK 1 autofix landed: `pnpm -w run qa:lint 2>&1 \| grep -cE 'jsdoc/require-(param\|returns)'` returns 0.
- Verify TASK 2 `root0` renames landed: `pnpm -w run qa:lint 2>&1 \| grep -c "does not match any function parameter"` returns 0.
- Verify TASK 3 `{unknown}` audit landed: `git log -3 --oneline` shows TASK 1, TASK 2, TASK 3 commits in order; final `git diff HEAD~3..HEAD -- packages/ \| grep -cE '^\+.*\{unknown\}'` returns 0.
- Verify TASK 4 registry audit: no `.resist-lint.jsonc` diff.
- Verify TASK 5 integration audit: zero new exports, zero command-registry changes.
- Verify TASK 6 full QA: all four `pnpm -w run qa:*` commands exit 0.
- Final aggregate commit (or per-task commits — TASKs 1, 2, 3 each get their own commit by design).

**Verification**:

- `pnpm -w run qa:lint 2>&1 \| grep -cE '^  ✗ '` returns 0.
- `pnpm -w run qa:test:coverage` exits 0 with no `does not meet global threshold` lines.
- `git status --short` empty after the final commit.
- `git log -3 --format=%s` shows three commits whose subjects start with `fix(jsdoc):`.

---

## Execution Order

| Task | Description                                            | Depends On |
| ---- | ------------------------------------------------------ | ---------- |
| 1    | Run built-in autofix (clears 1,002+ diagnostics)       | --         |
| 2    | Manual `root0` rename for 4 destructured-arg hold-outs | 1          |
| 3    | `{unknown}` audit + manual repair                      | 1, 2       |
| 4    | Register Rules + Config audit                          | 3          |
| 5    | Integration Verification                               | 4          |
| 6    | Full QA + Coverage                                     | 5          |
| 7    | Final Verification + Commit                            | 6          |
