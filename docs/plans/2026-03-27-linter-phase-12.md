# @/lint Phase 12 — Port Package.json Rules from Shell Scripts

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-27
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 6 rules from `check.package-json.sh` to TypeScript: require-license, require-scope, require-type-field, valid-bin-targets, no-git-deps, no-ts-node. Also add missing fields (license, type, bin, optionalDependencies) to PackageJsonSchema.
**Architecture**: 3 are WorkspaceRules (require-license, require-type-field, valid-bin-targets — need cross-package or file access). 3 are PackageJsonRules (require-scope, no-git-deps, no-ts-node — per-package checks). All `fixable: false`, severity `error`.

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
| Tests | 2602 pass / 0 fail |
| Type-check | Passes |
| Package rules | 15 |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 0 — Add missing fields to PackageJsonSchema

### Task 0.1: Schema Update

**Status**: [x] — Verified: Added `license`, `type`, `bin`, `optionalDependencies` to PackageJsonSchema. Type-check passes.

**Plan**:
- Add `license`, `type`, `bin`, `optionalDependencies` to `PackageJsonSchema` in `framework/types.ts`
- `license`: `v.optional(v.string())`
- `type`: `v.optional(v.string())`
- `bin`: `v.optional(v.union([v.string(), v.record(v.string(), v.string())]))`
- `optionalDependencies`: `v.optional(v.record(v.string(), v.string()))`

**Files**:
- Edit: `framework/types.ts`

**Verification**: Type-check passes

---

## TASK 1 — New Rule: `workspace/require-license`

### Task 1.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/require-license.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['package', 'licensing']`, stages `['lint', 'check']`. 6 tests. 2635 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags missing canonical LICENSE file` — mock context where docs/en-US/LICENSE doesn't exist, expect 1 result
  - `flags unextractable SPDX from LICENSE` — mock context where file exists but no SPDX pattern
  - `flags missing license field in package` — canonical is MIT, package has no license field
  - `flags mismatched license` — canonical is MIT, package has Apache-2.0
  - `passes when license matches canonical` — canonical MIT, package MIT, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/require-license.ts` (WorkspaceRule):
  - Read `{rootDir}/docs/en-US/LICENSE` via `ctx.readFile()`
  - If file missing: error `Missing canonical LICENSE file at docs/en-US/LICENSE`
  - Extract SPDX via regex `^(MIT|Apache-2.0|GPL-3.0|BSD-3-Clause)`
  - If no SPDX: error `Could not determine canonical license`
  - For each workspace package: check `license` field exists and matches canonical
  - Severity: `error`, `fixable: false`
  - Categories: `['package', 'licensing']`, Stages: `['lint', 'check']`

**Files**:
- Create: `rules/workspace/require-license.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — New Rule: `package/require-scope`

### Task 2.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/package/require-scope.ts`. `fixable: false`, severity `error`. Categories `['package', 'naming']`, stages `['lint', 'check', 'build']`. 5 tests. 2635 total tests pass.

**Plan**:
- Add tests to `rules/package/package-rules.test.ts`:
  - `flags package without required scope` — name is "foo-bar", expect 1 result
  - `flags package with wrong scope` — name is "@other/foo", expect 1 result
  - `passes package with correct scope` — name is "@/foo", expect 0 results
  - `passes root package` — isRoot: true, expect 0 results
  - `has correct rule metadata` — check id, fixable
- Create `rules/package/require-scope.ts` (PackageJsonRule):
  - Skip if `isRoot` is true
  - Default scope `@/` (read from `ruleOptions.scope` if provided)
  - If name missing or doesn't start with scope: error
  - Severity: `error`, `fixable: false`
  - Categories: `['package', 'naming']`, Stages: `['lint', 'check', 'build']`

**Files**:
- Create: `rules/package/require-scope.ts`
- Test: `rules/package/package-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — New Rule: `workspace/require-type-field`

### Task 3.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/require-type-field.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['package', 'consistency']`, stages `['lint', 'check']`. 5 tests. 2635 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags inconsistent type fields in sibling packages` — two packages under same group with different types
  - `passes when all siblings have same type` — two packages both "module"
  - `passes when single package in group` — only one package, no comparison
  - `defaults missing type to commonjs` — one has "module", other has no type field (defaults to "commonjs")
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/require-type-field.ts` (WorkspaceRule):
  - Get workspace packages via `ctx.getWorkspacePackages()`
  - Group by parent directory (second path segment under packages/)
  - For each group: collect `type` values (default to `"commonjs"` if absent)
  - If group has mixed types: error for each package listing its type
  - Severity: `error`, `fixable: false`
  - Categories: `['package', 'consistency']`, Stages: `['lint', 'check']`

**Files**:
- Create: `rules/workspace/require-type-field.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — New Rule: `workspace/valid-bin-targets`

### Task 4.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/valid-bin-targets.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['package', 'safety']`, stages `['lint', 'check']`. 6 tests. 2635 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags missing bin target file (string)` — bin is "./dist/cli.js", file doesn't exist
  - `flags missing bin target file (object)` — bin is { "mycli": "./dist/cli.js" }, file doesn't exist
  - `passes when bin target exists (string)` — file exists, expect 0 results
  - `passes when bin target exists (object)` — file exists, expect 0 results
  - `passes when no bin field` — no bin in package.json, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/valid-bin-targets.ts` (WorkspaceRule):
  - Get workspace packages via `ctx.getWorkspacePackages()`
  - For each package: check `bin` field
  - If string: resolve path relative to package dir, check `ctx.fileExists()`
  - If object: resolve each value path, check `ctx.fileExists()`
  - Missing file: error `Missing bin target: ${binPath}`
  - Severity: `error`, `fixable: false`
  - Categories: `['package', 'safety']`, Stages: `['lint', 'check']`

**Files**:
- Create: `rules/workspace/valid-bin-targets.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — New Rule: `package/no-git-deps`

### Task 5.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/package/no-git-deps.ts`. `fixable: false`, severity `error`. Categories `['package', 'safety']`, stages `['lint', 'check']`. 6 tests. 2635 total tests pass.

**Plan**:
- Add tests to `rules/package/package-rules.test.ts`:
  - `flags git+https dependency in dependencies` — dep value starts with "git+https://", expect 1 result
  - `flags git+https dependency in devDependencies` — same for devDeps
  - `flags git+https dependency in optionalDependencies` — same for optionalDeps
  - `flags git+https dependency in peerDependencies` — same for peerDeps
  - `passes when no git+https dependencies` — normal semver values, expect 0 results
  - `has correct rule metadata` — check id, fixable
- Create `rules/package/no-git-deps.ts` (PackageJsonRule):
  - Check all 4 dep fields: dependencies, devDependencies, optionalDependencies, peerDependencies
  - For each entry: if value starts with `git+https://` → error
  - Message: `Disallowed git+https dependency: ${key}: ${value}`
  - Tip: `Replace git+https dependencies with pinned tarballs or published versions`
  - Severity: `error`, `fixable: false`
  - Categories: `['package', 'safety']`, Stages: `['lint', 'check']`

**Files**:
- Create: `rules/package/no-git-deps.ts`
- Test: `rules/package/package-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — New Rule: `package/no-ts-node`

### Task 6.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/package/no-ts-node.ts`. `fixable: false`, severity `error`. Categories `['package', 'tooling']`, stages `['lint', 'check']`. 5 tests. 2635 total tests pass.

**Plan**:
- Add tests to `rules/package/package-rules.test.ts`:
  - `flags ts-node in dependencies` — dep key "ts-node", expect 1 result
  - `flags ts-node in devDependencies` — devDep key "ts-node", expect 1 result
  - `flags ts-node in scripts` — script value contains "ts-node", expect 1 result
  - `passes when no ts-node references` — clean package.json, expect 0 results
  - `has correct rule metadata` — check id, fixable
- Create `rules/package/no-ts-node.ts` (PackageJsonRule):
  - Check dependencies, devDependencies, optionalDependencies for key "ts-node"
  - Check scripts values for string containing "ts-node"
  - Each match: error `Disallowed ts-node usage: ${key}: ${value}`
  - Tip: `Remove ts-node; use native Node.js --experimental-strip-types or Bun instead`
  - Severity: `error`, `fixable: false`
  - Categories: `['package', 'tooling']`, Stages: `['lint', 'check']`

**Files**:
- Create: `rules/package/no-ts-node.ts`
- Test: `rules/package/package-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 7 — Register Rules + Config

**Status**: [x] — Verified: All 6 rules registered in `.resist-lint.jsonc`. 3 workspace rules under `workspace/` prefix, 3 package rules under `package/` prefix. All `"error"` severity.

**Plan**:
- Add all 6 rules to `.resist-lint.jsonc` with severity `"error"`
- Workspace rules: `workspace/require-license`, `workspace/require-type-field`, `workspace/valid-bin-targets`
- Package rules: `package/require-scope`, `package/no-git-deps`, `package/no-ts-node`

**Files**:
- Edit: `.resist-lint.jsonc`

**Verification**: Config valid, all rules load

---

## TASK 8 — Full QA + Coverage

**Status**: [x] — Verified: 2635 tests pass. Type-check clean. Format clean. Coverage: statements 90.58%, branches 76.54%, functions 85.39%, lines 90.56% — all above thresholds.

**Plan**:
- Run `pnpm --filter @/lint qa:type-check`
- Run `pnpm -w run qa:test`
- Run `pnpm -w run qa:format:check`
- Run `pnpm --filter @/lint qa:test:coverage`
- Verify all coverage thresholds pass

**Verification**: All QA green, coverage above thresholds

---

## TASK 9 — Final Verification + Cleanup

**Status**: [x] — Verified: All 6 rules match changelog. Shell script removed. Committed.

**Plan**:
- Verify all 6 rules implemented against changelog
- Remove ported shell script: `_INTEGRATE/linter/_linter-test-to-convert/check.package-json.sh`
- Commit all changes

**Verification**: All tasks [x], shell script removed, commit clean
