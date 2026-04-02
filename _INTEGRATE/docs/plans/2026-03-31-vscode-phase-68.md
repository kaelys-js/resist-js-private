# VSCode Phase 68 — Lint Rules + Self-Linting + Orphan Resolution

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/rules/`) + `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Write 4 lint rules that prevent Phase-67-style failures (orphaned exports, bare catches, duplicate functions, dead locale keys), enable resist-lint on the VSCode extension source, fix all 18 orphaned exports (wiring 2 unimplemented features, removing 4 dead exports, unexporting 11 internal-only exports), and fix all violations the new linter catches.
**Architecture**: New rules in `src/rules/hygiene/` category. Rules use `WorkspaceRule` type for cross-file analysis (orphans, duplicates) and `TypeScriptRule` for per-file analysis (bare catch, dead locale keys). VSCode extension adds `qa:lint:resist` script. Orphans resolved by category: wire unimplemented features, delete dead code, remove `export` keyword from internal helpers.

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
| @/lint tests | Run `pnpm qa:test --filter @/lint` to get count |
| @resist/vscode tests | 357 total (357 pass) |
| @resist/vscode test files | 32 |
| Orphaned exports in vscode | 18 |
| Bare catch blocks (non-test) | 2 (locale/schema.ts) |
| Dead locale keys | 0 (cleaned in Phase 67) |
| Duplicate functions | 0 (cleaned in Phase 67) |
| resist-lint on vscode | Not enabled |

---

## TASK 1 — Write `hygiene/no-bare-catch` rule

**Status**: [ ]

**Gap**: Bare `catch {}` blocks that swallow errors are undetectable. Phase 67 TASK 13 found one manually. A lint rule catches them automatically.

**Plan**:
- Create `src/rules/hygiene/no-bare-catch.ts`
- Rule type: `TypeScriptRule` with `visitor.CatchClause`
- Logic: if catch clause has no parameter binding (bare `catch {`), report error
- Allow override via `resist-lint-disable-next-line: hygiene/no-bare-catch` for intentional cases (like Intl fallbacks)
- Severity: `error`
- Patterns: `['**/*.ts', '**/*.svelte.ts']`
- Categories: `['hygiene']`
- Stages: `['lint', 'ci']`
- Fix: not fixable (requires developer decision on error handling)
- Create test file `src/rules/hygiene/hygiene-rules.test.ts`
- Test cases: bare `catch {}` reports, `catch (e) {}` does not report, `catch (error: unknown) { use(error) }` does not report

**Files**:
- Create: `src/rules/hygiene/no-bare-catch.ts`
- Create: `src/rules/hygiene/hygiene-rules.test.ts`

**Verification**: `pnpm qa:test --filter @/lint` passes including new tests, rule catches `catch {}` but not `catch (e) {}`

---

## TASK 2 — Write `hygiene/no-orphaned-exports` rule

**Status**: [ ]

**Gap**: Exports with no non-test consumer are invisible until manual grep audit. Phase 67 found 18 orphans only by exhaustive manual checking. This rule automates that.

**Plan**:
- Create `src/rules/hygiene/no-orphaned-exports.ts`
- Rule type: `WorkspaceRule` with `scope: 'workspace'`
- Logic:
  1. Scan all `.ts` files for `export function`, `export class`, `export const`, `export interface`, `export type`
  2. For each export, search all other non-test `.ts` files for an import of that symbol
  3. If zero non-test importers found, report the export as orphaned
  4. Skip: test files (`*.test.ts`), declaration files (`*.d.ts`), barrel/index files
  5. Skip: `export default` (entry points)
  6. Skip: exports with `// resist-lint-allow: hygiene/no-orphaned-exports` comment
- Severity: `warning` (not error — some exports are intentionally public API for future consumers)
- Categories: `['hygiene']`
- Stages: `['ci']` (expensive cross-file analysis, run in CI only)
- Fix: not fixable (requires developer decision: wire up, remove export, or delete)
- Add tests in `hygiene-rules.test.ts`

**Files**:
- Create: `src/rules/hygiene/no-orphaned-exports.ts`
- Edit: `src/rules/hygiene/hygiene-rules.test.ts`

**Verification**: `pnpm qa:test --filter @/lint` passes, rule detects orphaned exports in test fixtures

---

## TASK 3 — Write `hygiene/no-duplicate-function-signatures` rule

**Status**: [ ]

**Gap**: `mapSeverity` was duplicated across provider.ts and diagnostics.ts. No automated detection exists for functions with the same name exported from different modules.

**Plan**:
- Create `src/rules/hygiene/no-duplicate-function-signatures.ts`
- Rule type: `WorkspaceRule` with `scope: 'workspace'`
- Logic:
  1. Scan all `.ts` files for `export function <name>` patterns
  2. Group by function name
  3. If the same function name is exported from 2+ different files, report each as a duplicate
  4. Skip: test files, declaration files
  5. Skip: common names that are intentionally duplicated (configurable via ruleOptions `allowedNames`)
- Severity: `warning`
- Categories: `['hygiene']`
- Stages: `['ci']`
- Fix: not fixable
- Add tests in `hygiene-rules.test.ts`

**Files**:
- Create: `src/rules/hygiene/no-duplicate-function-signatures.ts`
- Edit: `src/rules/hygiene/hygiene-rules.test.ts`

**Verification**: `pnpm qa:test --filter @/lint` passes, rule detects duplicate function names across files

---

## TASK 4 — Write `hygiene/no-dead-locale-keys` rule

**Status**: [ ]

**Gap**: 10 dead locale keys existed in Phase 67 with no automated detection. Manual grep is unreliable. This rule scans locale objects and verifies every key has a non-test/non-definition reference.

**Plan**:
- Create `src/rules/hygiene/no-dead-locale-keys.ts`
- Rule type: `WorkspaceRule` with `scope: 'workspace'`
- Logic:
  1. Find the locale definition file (configurable via ruleOptions `localeFile`, default `locale/en.ts`)
  2. Parse it to extract all dot-path keys (e.g., `messages.binaryNotFound`, `progress.workspace`)
  3. For each key, search all non-test, non-locale-definition `.ts` files for `en.<key>` reference
  4. If zero references found, report the key as dead
  5. Skip: test files, the locale definition file itself, schema files
- Severity: `warning`
- Categories: `['hygiene']`
- Stages: `['ci']`
- Fix: not fixable
- Add tests in `hygiene-rules.test.ts`

**Files**:
- Create: `src/rules/hygiene/no-dead-locale-keys.ts`
- Edit: `src/rules/hygiene/hygiene-rules.test.ts`

**Verification**: `pnpm qa:test --filter @/lint` passes, rule detects locale keys with no non-test consumer

---

## TASK 5 — Fix Phase 67 orphaned exports (18 items)

**Status**: [ ]

**Gap**: Phase 67 left 18 orphaned exports. 2 are unimplemented features that need wiring, 4 are dead code to delete, 11 need `export` keyword removed, 1 is intentional.

**Plan**:

**Wire unimplemented features (2):**
- `applyFixes` in `lint/diff-preview.ts` — use in `lint/commands.ts` COMMANDS.lintFix handler to DRY up the manual fix-application logic (lines 71-96 duplicate what `applyFixes` does)
- `getPerFolderLintOptions` in `lint/per-folder.ts` — wire into `lint/provider.ts` `lintDocument()` to resolve per-folder options in multi-root workspaces

**Delete dead code (4):**
- `createStatusBar` in `shared/status-bar.ts` — fully replaced by `createToolStatusBar`. Delete function + remove from test imports
- `InlineOverrideDecorator` in `lint/inline-overrides.ts` — never instantiated anywhere. Delete entire file + test file (inline-overrides.test.ts)
- `runToolLines` in `shared/runner.ts` — never called. Delete function + remove from test imports
- `formatNumber` in `locale/schema.ts` — never used. Delete function + remove from test imports

**Remove export keyword (11):**
- `isLintableDocument` in `shared/document-filter.ts` — duplicate of `isWorkspaceDocument`, remove export
- `collectImportDiagnostics` in `lint/import-sorting.ts` — internal helper, remove export
- `isImportDiagnostic` in `lint/import-sorting.ts` — internal helper, remove export
- `formatTimingReport` in `lint/profiling.ts` — internal helper, remove export
- `parseTimingOutput` in `lint/profiling.ts` — internal helper, remove export
- `mapEntryToDiagnostic` in `lint/provider.ts` — internal helper, remove export
- `DocumentEventType` in `shared/events.ts` — internal type, remove export
- `FileProcessResult` in `shared/progress.ts` — internal type, remove export
- `runTool` in `shared/runner.ts` — internal base function, remove export
- `ToolResult` in `shared/runner.ts` — internal type, remove export
- `StateChangeCallback` in `shared/state.ts` — internal type, remove export

**Intentional export (1):**
- `COMMAND_PREFIX` in `shared/brand.ts` — used within same file to derive COMMANDS, exported for white-labelling. Add `// resist-lint-allow: hygiene/no-orphaned-exports -- white-label API` comment

**Handle bare catches (2):**
- `locale/schema.ts` lines 55 and 74 — add `// resist-lint-disable-next-line: hygiene/no-bare-catch` with justification comment for Intl fallbacks

**Update all affected tests:**
- Remove test imports for deleted functions
- Update test imports for unexported functions (tests may need to import differently or be restructured)
- If a test directly imports a now-private function, keep the function exported only if the test provides meaningful coverage that can't be achieved through the public API

**Files**:
- Edit: `src/lint/commands.ts` (use `applyFixes`)
- Edit: `src/lint/provider.ts` (use `getPerFolderLintOptions`)
- Edit: `src/shared/status-bar.ts` (delete `createStatusBar`)
- Delete: `src/lint/inline-overrides.ts` + `src/lint/inline-overrides.test.ts`
- Edit: `src/shared/runner.ts` (delete `runToolLines`, unexport `runTool`, `ToolResult`)
- Edit: `src/locale/schema.ts` (delete `formatNumber`, add bare-catch disable comments)
- Edit: `src/shared/document-filter.ts` (unexport `isLintableDocument`)
- Edit: `src/lint/import-sorting.ts` (unexport helpers)
- Edit: `src/lint/profiling.ts` (unexport helpers)
- Edit: `src/lint/provider.ts` (unexport `mapEntryToDiagnostic`)
- Edit: `src/shared/events.ts` (unexport `DocumentEventType`)
- Edit: `src/shared/progress.ts` (unexport `FileProcessResult`)
- Edit: `src/shared/state.ts` (unexport `StateChangeCallback`)
- Edit: `src/shared/brand.ts` (add allow comment to `COMMAND_PREFIX`)
- Edit: affected test files (update imports for deleted/unexported items)
- Edit: `src/locale/en.ts` (remove `inlineOverrides` group if InlineOverrideDecorator deleted)
- Edit: `src/locale/schema.ts` (remove `InlineOverridesStrings` if file deleted)
- Edit: `src/locale/locale.test.ts` (remove inlineOverrides tests)

**Verification**: Tests pass, zero orphaned exports when manually audited, `grep -c 'export function createStatusBar\|export class InlineOverrideDecorator\|export function runToolLines\|export function formatNumber' src/` returns 0

---

## TASK 6 — Enable resist-lint on VSCode extension

**Status**: [ ]

**Gap**: The VSCode extension has zero resist-lint enforcement. @/lint lints itself via its own qa:lint script. The VSCode extension needs the same.

**Plan**:
- Add `qa:lint:resist` script to `packages/shared/config/tooling/vscode/package.json` that runs resist-lint on `src/`
- Create `.resist-lint.jsonc` config in `packages/shared/config/tooling/vscode/` (or use workspace config with appropriate include pattern)
- Enable the 4 new hygiene rules + any existing rules that apply to the extension source
- Configure rule options (e.g., `no-dead-locale-keys` locale file path, `no-orphaned-exports` exclusions)
- Add `qa:lint:resist` to the turbo pipeline so it runs in CI
- Run the linter and verify zero violations (after TASK 5 fixes)

**Files**:
- Edit: `packages/shared/config/tooling/vscode/package.json`
- Create or Edit: lint config for vscode extension
- Edit: `turbo.json` (if needed for pipeline)

**Verification**: `pnpm --filter @resist/vscode run qa:lint:resist` exits 0, all 4 hygiene rules enabled and passing

---

## TASK 7 — Fix all resist-lint violations on VSCode extension

**Status**: [ ]

**Gap**: After enabling resist-lint, there may be additional violations from existing rules (not just the 4 new ones) that need fixing.

**Plan**:
- Run resist-lint on vscode extension source
- Fix all reported violations
- If any violations are false positives, add appropriate disable comments with justification
- Re-run until clean

**Files**:
- Edit: various `src/` files as needed based on violations

**Verification**: `pnpm --filter @resist/vscode run qa:lint:resist` exits 0 with zero violations

---

## TASK 8 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify all 4 new rules auto-load (no manual registration needed per rule-loader.ts)
- Verify rules appear in `--list-rules` output
- Verify `.resist-lint.jsonc` has all 4 hygiene rules configured for vscode package
- Verify no orphaned code from this phase (all new rule files have consumers via rule-loader)

**Verification**: All 4 rules appear in `resist-lint --list-rules`, config enables all 4 for vscode, all exports reachable

---

## TASK 9 — Integration Verification

**Status**: [ ]

**Plan**:
- Verify all 4 lint rules are registered and loadable by rule-loader
- Verify config settings for each rule are read correctly (ruleOptions)
- Verify all rule classes/functions are instantiated during lint execution
- Verify no unused exports or dead code created by this phase
- Grep audit: `grep -rn 'export ' src/rules/hygiene/ --include='*.ts' | grep -v test` → each export used
- Verify vscode extension `qa:lint:resist` runs all 4 hygiene rules
- Verify zero orphaned exports remain in vscode extension (the linter itself catches this now)

**Verification**:
- `grep -c 'registerCommand' src/lint/commands.ts` in vscode package still ≥ 15
- All config settings have config.get calls
- All feature classes instantiated
- No orphaned exports — linter enforces this automatically now

---

## TASK 10 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm qa:test --filter @/lint`
- Run: `pnpm qa:test --filter @resist/vscode`
- Run: `pnpm --filter @resist/vscode run qa:lint:resist`
- Verify all tests pass across both packages

**Verification**: All pnpm commands exit 0

---

## TASK 11 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 4 rule files exist in `src/rules/hygiene/`
- Verify resist-lint runs on vscode extension source
- Verify zero orphaned exports in vscode extension
- Verify zero bare catch blocks without disable comment
- Verify zero duplicate functions across modules
- Verify zero dead locale keys
- Verify all integration checks pass
- Commit with descriptive message

**Verification**:
- All 4 rule `.ts` files exist
- `pnpm --filter @resist/vscode run qa:lint:resist` exits 0
- Integration audit shows zero gaps
- Orphan count: 0 (enforced by linter)

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Write no-bare-catch rule | -- |
| 2 | Write no-orphaned-exports rule | -- |
| 3 | Write no-duplicate-function-signatures rule | -- |
| 4 | Write no-dead-locale-keys rule | -- |
| 5 | Fix Phase 67 orphaned exports | -- |
| 6 | Enable resist-lint on vscode extension | 1-4 |
| 7 | Fix all resist-lint violations | 5, 6 |
| 8 | Register rules + config | 1-7 |
| 9 | Integration verification | 8 |
| 10 | Full QA + Coverage | 9 |
| 11 | Final verification + commit | 10 |
