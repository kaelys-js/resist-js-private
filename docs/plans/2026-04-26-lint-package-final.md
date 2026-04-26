# `@/lint` Package — Final qa:lint Cleanup (242 → 0)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`) plus 1 plan file (`docs/plans/2026-04-26-workspace-qa-lint.md`)
**Goal**: Make `pnpm -w run qa:lint` (no path arg) exit 0 by clearing all 242 remaining diagnostics that the cache invalidation in commit 4f3da7e2 (archive of 13 historical plans) revealed in the `@/lint` package source. The `@/lint` package was previously committed in partial state at d898e4b7; this completes that work.
**Architecture**: 6 task groups by mechanism — (A) bulk Python regex sweeps for repetitive mechanical rules, (B) per-site Edits for rules that require contextual judgement (no-non-null-assertion, no-negated-condition, no-unused-vars, no-nested-ternary), (C) JSDoc additions, (D) smaller mechanical sweeps, (E) my own active plan file's tail-task expansion, (F) investigation of `plans/*` rule false-positives inside `lint/src/rules/plans/*.ts` fixture strings (may require rule scope extension if fixture-string patterns trigger the rule recursively).

Each task is atomic: implement → verify (`pnpm -w run qa:lint`) → run `@/lint` tests → update plan → next.

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
| Total errors | 242 |
| Files with diagnostics | 49 |
| `@/lint` test count (must not regress) | 5315 |

| Rule | Count |
|------|------:|
| `oxlint/no-non-null-assertion` | 44 |
| `oxlint/no-unused-vars` | 27 |
| `oxlint/no-negated-condition` | 21 |
| `oxlint/require-returns` | 20 |
| `oxlint/prefer-destructuring` | 15 |
| `oxlint/require-param` | 13 |
| `oxlint/no-lonely-if` | 8 |
| `oxlint/prefer-string-raw` | 7 |
| `oxlint/no-duplicate-imports` | 7 |
| `oxlint/prefer-template` | 5 |
| `oxlint/numeric-separators-style` | 5 |
| `oxlint/no-duplicates` | 5 |
| `oxlint/no-await-in-loop` | 5 |
| `oxlint/consistent-function-scoping` | 5 |
| `oxlint/require-await` | 4 |
| `oxlint/no-nested-ternary` | 4 |
| `oxlint/no-array-sort` | 4 |
| `oxlint/array-type` | 4 |
| `oxlint/prefer-set-has` | 3 |
| `oxlint/prefer-number-properties` | 3 |
| (15+ smaller rules each <3) | ~25 |
| `plans/require-plan-structure` (in plan file + lint-source fixture strings) | 7 |
| `plans/require-concrete-verification` (in plan file + lint-source) | 2 |
| `plans/no-empty-plan-sections` (in plan file) | 1 |

---

## TASK 1 — Group A: bulk Python regex sweeps for mechanical rules

**Status**: [ ]

**Gap**: 13+ rules trigger across 30+ files in repetitive, mechanical patterns suitable for bulk regex transformation (same approach used successfully in earlier @/utils/core, @/products, and @/ui cleanups in this session).

**Plan**:
- Run a Python heredoc script that applies one regex per pass for each of these rules across all `*.ts` files under `packages/shared/config/tooling/lint/src/`:
  - `prefer-destructuring`: `const x = obj.x` → `const { x } = obj` (regex matches single-property reads with simple identifiers).
  - `numeric-separators-style`: `1000`/`100000` → `1_000`/`100_000` for integer literals ≥ 5 digits.
  - `no-lonely-if`: `} else { if (x) { ... } }` → `} else if (x) { ... }`.
  - `no-duplicate-imports` + `no-duplicates`: merge two `import {...}` lines from the same module into one.
  - `prefer-template`: `'a' + x + 'b'` → `` `a${x}b` ``.
  - `prefer-string-raw`: `'\\d+'` → `String.raw`\d+\``.
  - `prefer-at`: `arr[arr.length - 1]` → `arr.at(-1)`.
  - `prefer-string-slice`: `.substr(...)` / `.substring(...)` → `.slice(...)` (only when arg shape matches).
  - `no-useless-concat`: `'a' + 'b'` (literal+literal) → `'ab'`.
  - `prefer-number-properties`: `parseInt(x, 10)` → `Number.parseInt(x, 10)`; `isNaN(x)` → `Number.isNaN(x)`.
  - `array-type`: `T[]` → `Array<T>` for non-simple T (e.g. `(A | B)[]`).
  - `no-array-sort`: `.sort(...)` → `.toSorted(...)` (immutable variant).
  - `no-new-array`: `new Array(n)` → `Array.from({ length: n })` or `[]`.
- Use the same nested-paren-aware regex conventions from prior session (avoid breaking template literals, type generics, etc.).
- After each regex pass, immediately run `pnpm -w run qa:lint --tools` and `pnpm --filter '@/lint' run qa:test` to catch any regression.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/**/*.ts` (~30 files, mechanical)
- Test: `packages/shared/config/tooling/lint/src/cli.test.ts`

**Verification**:
- `pnpm -w run qa:lint 2>&1 | grep -cE 'oxlint/(prefer-destructuring|numeric-separators-style|no-lonely-if|no-duplicate-imports|no-duplicates|prefer-template|prefer-string-raw|prefer-at|prefer-string-slice|no-useless-concat|prefer-number-properties|array-type|no-array-sort|no-new-array)'` returns `0`.
- `pnpm --filter '@/lint' run qa:test` final summary shows `Test Files  46 passed (46)` and `Tests  5315 passed (5315)`.

---

## TASK 2 — Group B: per-site judgement Edits

**Status**: [ ]

**Gap**: 4 rules require context-specific guard/structure choices that cannot be safely bulk-replaced:
- `oxlint/no-non-null-assertion` (44 sites): each `x!` needs to become either an explicit `if (x === undefined) throw …` guard, a `?? fallback`, or `assertNotNull(x)` depending on local invariants.
- `oxlint/no-negated-condition` (21 sites): flip `if (!cond) A; else B;` → `if (cond) B; else A;` and verify body order is still semantically correct.
- `oxlint/no-unused-vars` (27 sites): each unused identifier must be confirmed truly dead — could be partially-imported destructured types, prefix-unused params (`_foo` rename works), or actual deletions.
- `oxlint/no-nested-ternary` (4 sites): refactor to if/else helper or switch on each.

**Plan**:
- For each of the ~96 sites: Read the file ±10 lines of context, choose the right transformation, apply via Edit tool. Group consecutive sites in the same file into one Read+Edit batch where possible.
- After each file, run `pnpm --filter '@/lint' run qa:test --filter <rule-target-file>` if a test file was touched, else continue.
- After all sites in a rule are done, run a full `pnpm --filter '@/lint' run qa:test` to confirm no regression.

**Files**:
- Edit: ~30 distinct `.ts` files in `packages/shared/config/tooling/lint/src/`
- Each edit grouped by file to minimise Read calls.

**Verification**:
- `pnpm -w run qa:lint 2>&1 | grep -cE 'oxlint/(no-non-null-assertion|no-negated-condition|no-unused-vars|no-nested-ternary)'` returns `0`.
- `pnpm --filter '@/lint' run qa:test` final summary shows `Tests  5315 passed (5315)`.

---

## TASK 3 — Group C: JSDoc `@param` and `@returns` additions

**Status**: [ ]

**Gap**: 13 `require-param` + 20 `require-returns` errors on functions whose JSDoc is missing those tags. All are in production rule code or framework code — accurate JSDoc is required for documentation generation.

**Plan**:
- For each site, Read the function signature, write a one-line `@param`/`@returns` description that accurately reflects the parameter or return type.
- Avoid placeholder/generic descriptions ("the input"); use semantically meaningful phrasing.
- Group sites by file.

**Files**:
- Edit: ~20 distinct `.ts` files (overlap with TASK 2 in many cases — combine when efficient).

**Verification**:
- `pnpm -w run qa:lint 2>&1 | grep -cE 'oxlint/(require-param|require-returns)'` returns `0`.
- `pnpm --filter '@/lint' run qa:test` final summary shows `Tests  5315 passed (5315)`.

---

## TASK 4 — Group D: smaller mechanical rules

**Status**: [ ]

**Gap**: ~12 rules with <5 occurrences each, all mechanical:
- `oxlint/no-await-in-loop` (5): `Promise.all` map or per-file override matching the `core/network.ts` precedent.
- `oxlint/require-await` (4): drop `async` or insert `await Promise.resolve()` no-op (matches simulator-test precedent).
- `oxlint/consistent-function-scoping` (5): hoist non-capturing inner functions.
- `oxlint/prefer-set-has` (3), `prefer-regexp-test` (1), `prefer-array-find` (1), `prefer-spread` (1), `prefer-await-to-then` (1), `prefer-string-starts-ends-with` (1).
- `oxlint/no-template-curly-in-string` (2): escape `${}` literal cases.
- `oxlint/filename-case` (2): rename to kebab-case.
- `oxlint/consistent-type-definitions` (2): `interface` ↔ `type`.
- `oxlint/check-tag-names` (2): JSDoc tag spelling.
- `oxlint/curly` (2): wrap single-statement bodies.

**Plan**:
- One Edit per site where the rule is mechanical.
- For `filename-case` (file rename): `git mv` and update all imports referencing the old name.
- For `no-await-in-loop` sites where Promise.all isn't appropriate (sequential needed), add a per-file override to `.oxlintrc.json` matching the existing `**/utils/core/src/network.ts` precedent — but only after explicit user approval at that point.

**Files**:
- Edit: ~15 `.ts` files
- Possible: `git mv` for `filename-case` (2 files)
- Possible: `.oxlintrc.json` per-file overrides (only if necessary and approved mid-stream)

**Verification**:
- `pnpm -w run qa:lint 2>&1 | grep -cE 'oxlint/(no-await-in-loop|require-await|consistent-function-scoping|prefer-set-has|prefer-regexp-test|prefer-array-find|prefer-spread|prefer-await-to-then|prefer-string-starts-ends-with|no-template-curly-in-string|filename-case|consistent-type-definitions|check-tag-names|curly)'` returns `0`.
- `pnpm --filter '@/lint' run qa:test` final summary shows `Tests  5315 passed (5315)`.

---

## TASK 5 — Group E: expand the active plan file's tail-task structure

**Status**: [ ]

**Gap**: My own plan file `docs/plans/2026-04-26-workspace-qa-lint.md` (committed at 4f3da7e2 alongside the archive moves) trips ~10 plan-rule errors because TASKS 2–5 (Register Rules + Config / Integration Verification / Full QA + Coverage / Final Verification + Commit) have shorter plan-bullet sets and verification lines that the strict `plans/*` rules flag.

**Plan**:
- Edit `docs/plans/2026-04-26-workspace-qa-lint.md`: expand each tail task to ≥2 plan bullets, add concrete verification commands (specific grep counts, file counts, exit codes), replace any generic phrasing.
- Re-lint the file with `pnpm -w run qa:lint docs/plans/2026-04-26-workspace-qa-lint.md` until it returns 0.

**Files**:
- Edit: `docs/plans/2026-04-26-workspace-qa-lint.md`

**Verification**:
- `pnpm -w run qa:lint docs/plans/2026-04-26-workspace-qa-lint.md 2>&1 | grep -cE '^  ✗ '` returns `0`.

---

## TASK 6 — Group F: investigate plans/* rule false-positives in lint-source files

**Status**: [ ]

**Gap**: Three errors in `packages/shared/config/tooling/lint/src/rules/plans/require-plan-structure.ts`, three in `…/require-concrete-verification.ts`, and three more in similar files. These appear to be the `plans/*` rules tripping on FIXTURE STRINGS embedded in the rule's TypeScript source code (the rule contains literal markdown plan content as test data). Need to confirm whether this is a real defect (the rules should not lint their own source's fixture strings) or whether the diagnostics point to legitimate issues in the rule's documentation comments.

**Plan**:
- Read each of the cited files at the cited line numbers.
- Determine if the diagnostic targets a literal fixture string (false positive) or actual prose comment (real issue).
- If false positive: extend the `plans/*` rules to skip files inside `packages/shared/config/tooling/lint/src/rules/plans/*.ts` (the rules' own source files). Justification: a markdown-validation rule's TypeScript source contains intentional bad-plan fixtures for testing; those must not be flagged.
- If real issue: edit the comments to be plan-rule compliant.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/require-plan-structure.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/require-concrete-verification.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/no-template-placeholders.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/plan-parser.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/plans/plans-rules.test.ts`

**Verification**:
- `pnpm -w run qa:lint 2>&1 | grep -cE 'plans/'` returns `0`.
- `pnpm --filter '@/lint' run qa:test` final summary shows `Tests  5315 passed (5315)` (the rule-tests reference fixture file paths under `/mock/`, unaffected by any scope change).

---

## TASK 7 — Register Rules + Config

**Status**: [ ]

**Plan**:
- TASKS 1–4 touch only source code and one possible `.oxlintrc.json` override (TASK 4 sub-bullet); confirm via `git diff --name-only HEAD packages/`.
- TASK 5 touches one plan file; confirm via `git diff --name-only HEAD docs/plans/`.
- TASK 6 may touch `plan-parser.ts` (one filter line) — confirm via `git diff packages/shared/config/tooling/lint/src/rules/plans/plan-parser.ts`.
- No new exports introduced; this is cleanup only.

**Files**:
- Confirm-only: no additional edits beyond what TASKS 1–6 produced.

**Verification**:
- `git diff --name-only HEAD` lists only the files edited by TASKS 1–6 plus this plan file. No orphaned changes.
- `git diff --stat HEAD -- packages/` shows changes scoped to `packages/shared/config/tooling/lint/src/`.

---

## TASK 8 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/config/tooling/lint/src` is unchanged from baseline (this is a lint package; no registerCommand expected).
- Config settings read check: `grep -rc 'config\.get(' packages/shared/config/tooling/lint/src` is unchanged from baseline (no new config reads added).
- Class instantiation check: no new classes introduced; verify via `git diff --stat HEAD -- packages/shared/config/tooling/lint/src/` — only existing files modified.
- Dead code / unused export check: TASK 2 deletes 27 unused vars; verify with `pnpm -w run qa:lint 2>&1 | grep -c 'no-unused-vars'` returns 0.

**Verification**:
- All four counts above produce identical pre/post values (except `no-unused-vars` count which drops from 27 → 0).
- `pnpm -w run qa:lint 2>&1 | grep -cE '^  ✗ '` outputs `0`.

---

## TASK 9 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format` (formats whitespace from regex sweeps).
- Run: `pnpm -w run qa:lint` (no path arg). Must exit `0`.
- Run: `pnpm --filter '@/lint' run qa:test`. Must show 5315 tests pass.
- Run: spot-check a few `pnpm --filter '@/<other-pkg>' run qa:test` to confirm no cross-package regression (e.g. `@/utils/core`, `@/ui`).

**Verification**:
- `pnpm -w run qa:lint` exits `0`.
- `pnpm -w run qa:lint 2>&1 | grep -cE '^  ✗ '` outputs `0`.
- `pnpm --filter '@/lint' run qa:test` final summary line shows `Tests  5315 passed (5315)`.
- No other package's test count drops below baseline.

---

## TASK 10 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all touched files match the spec from TASKS 1–6.
- Verify `pnpm -w run qa:lint` exits `0` from a fresh shell.
- Verify clean tree after commit (`git status --short` empty).
- Commit with message: `fix(lint): clear all qa:lint diagnostics in @/lint package` and a body listing every rule cleared with its before-count.

**Verification**:
- `pnpm -w run qa:lint` exits `0`.
- `git log -1 --format=%s` matches `fix(lint): clear all qa:lint diagnostics in @/lint package`.
- `git status --short` is empty after commit.
- `pnpm --filter '@/lint' run qa:test` (post-commit re-run) still shows 5315 tests pass.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Group A: bulk regex sweeps | -- |
| 2 | Group B: per-site judgement Edits | 1 |
| 3 | Group C: JSDoc additions | 1, 2 |
| 4 | Group D: smaller mechanical rules | 1 |
| 5 | Group E: expand active plan file | -- |
| 6 | Group F: plans/* false positives | -- |
| 7 | Register Rules + Config audit | 1-6 |
| 8 | Integration Verification | 7 |
| 9 | Full QA + Coverage | 8 |
| 10 | Final verification + commit | 9 |
