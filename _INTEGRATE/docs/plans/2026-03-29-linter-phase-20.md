# @/lint Phase 20 — Config File Validation + Import Boundaries

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-29
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 shell check functions to TypeScript workspace rules — 7 config/dotfile validation rules, 3 linter config inheritance rules, 3 import boundary rules, 2 empty directory rules.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`. Each iterates `ctx.allFiles()` to find relevant files, validates constraints, and reports via `createResult()`.

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
| Tests | 3097 pass / 0 fail |
| Type-check | Passes |
| Workspace rule files | 136 (135 rules + 1 test) |
| Test file lines | ~6900 |
| Coverage | Statements 91.7% / Branches 78.25% / Functions 87.15% / Lines 91.69% |

---

## TASK 1 — `workspace/require-vscode-folder`

**Status**: [x]

**Gap**: Shell function `check::vscode_folder_exists` ensures `.vscode/` directory exists at project root. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-vscode-folder.ts` as a `WorkspaceRule`
- Use `ctx.dirExists(join(ctx.rootDir, '.vscode'))` to check
- If not exists: report warning "Missing .vscode directory at project root"
- Add tests: dir exists → pass, dir missing → warning
- Run QA

**Files**:
- Create: `rules/workspace/require-vscode-folder.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 3 tests

**Verification**: Tests assert `severity === 'warning'`, message contains ".vscode"

---

## TASK 2 — `workspace/no-extra-vscode-files`

**Status**: [x]

**Gap**: Shell function `check::vscode_contents_valid` ensures `.vscode/` only contains `settings.json` and `extensions.json`. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-extra-vscode-files.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for paths containing `/.vscode/`
- Check `basename` against allowed set: `settings.json`, `extensions.json`
- If not in set: report error "Disallowed file in .vscode/"
- Add tests: allowed file → pass, disallowed file → error, non-.vscode file → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-extra-vscode-files.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "Disallowed", filename in message

---

## TASK 3 — `workspace/require-vscode-valid-json`

**Status**: [x]

**Gap**: Shell function `check::vscode_settings_valid_json` ensures `.vscode/settings.json` is valid JSON. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-vscode-valid-json.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for files ending with `.vscode/settings.json`
- Read file content, try `JSON.parse()` in try/catch
- If parse fails: report error "Invalid JSON in .vscode/settings.json"
- Add tests: valid JSON → pass, invalid JSON → error, non-settings file → skip
- Run QA

**Files**:
- Create: `rules/workspace/require-vscode-valid-json.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "Invalid JSON"

---

## TASK 4 — `workspace/require-editorconfig`

**Status**: [x]

**Gap**: Shell function `check::validate_editorconfig` validates `.editorconfig` existence, non-empty, `root = true`, required sections, no duplicates. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-editorconfig.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, find `.editorconfig` at root
- Check: file exists, non-empty, contains `root = true`, no duplicate section headers
- Required sections check: `[*]` must exist at minimum
- If missing/empty/no-root: report error
- Add tests: valid config → pass, missing → error, empty → error, missing root=true → warning, duplicate sections → error
- Run QA

**Files**:
- Create: `rules/workspace/require-editorconfig.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 5 tests

**Verification**: Tests assert appropriate severities, messages contain ".editorconfig"

---

## TASK 5 — `workspace/require-gitignore`

**Status**: [x]

**Gap**: Shell function `check::validate_gitignore_compliance` validates `.gitignore` existence, non-empty, trailing newline, no duplicate patterns. No TypeScript rule exists. Git-dependent checks omitted.

**Plan**:
- Create `rules/workspace/require-gitignore.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, find `.gitignore` at root (path equals `rootDir + '/.gitignore'`)
- Check: file exists (track via flag), non-empty, trailing newline, no duplicate non-comment lines
- If missing/violations: report error
- Add tests: valid → pass, missing → error, duplicate patterns → error, empty → warning
- Run QA

**Files**:
- Create: `rules/workspace/require-gitignore.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error messages contain ".gitignore"

---

## TASK 6 — `workspace/require-dockerignore`

**Status**: [x]

**Gap**: Shell function `check::validate_dockerignore_compliance` validates `.dockerignore` existence, non-empty, trailing newline, no duplicates. No TypeScript rule exists. Git-dependent checks omitted.

**Plan**:
- Create `rules/workspace/require-dockerignore.ts` as a `WorkspaceRule`
- Same pattern as require-gitignore but for `.dockerignore`
- Add tests: valid → pass, missing → error, duplicate patterns → error
- Run QA

**Files**:
- Create: `rules/workspace/require-dockerignore.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error messages contain ".dockerignore"

---

## TASK 7 — `workspace/require-gitattributes`

**Status**: [x]

**Gap**: Shell function `check::validate_gitattributes_compliance` validates `.gitattributes` existence, non-empty, required patterns (`* text=auto`, `*.ts text eol=lf`, etc.), no duplicate glob rules. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-gitattributes.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, find `.gitattributes` at root
- Check: exists, non-empty, contains required patterns, no duplicate glob patterns
- Required patterns: `* text=auto`, `*.ts text eol=lf`, `*.js text eol=lf`, `pnpm-lock.yaml -text`, `*.png binary`
- Add tests: valid → pass, missing → error, missing required pattern → error, duplicate globs → error
- Run QA

**Files**:
- Create: `rules/workspace/require-gitattributes.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 5 tests

**Verification**: Tests assert error messages contain pattern names

---

## TASK 8 — `workspace/require-biome-extends-root`

**Status**: [x]

**Gap**: Shell function `check::validate_biome_json_extends_root` ensures nested `biome.json` files declare an `extends` field. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-biome-extends-root.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `biome.json` files
- Skip root-level biome.json (path equals `rootDir + '/biome.json'`)
- Parse JSON, check for `extends` key
- If missing: report error "biome.json missing 'extends' key"
- Add tests: nested with extends → pass, nested without extends → error, root biome.json → skip
- Run QA

**Files**:
- Create: `rules/workspace/require-biome-extends-root.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "extends"

---

## TASK 9 — `workspace/require-oxlint-extends-root`

**Status**: [x]

**Gap**: Shell function `check::validate_oxlint_extends_root` ensures nested `.oxlintrc.json` files declare an `extends` field. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/require-oxlint-extends-root.ts` as a `WorkspaceRule`
- Same pattern as biome rule but for `.oxlintrc.json`
- Add tests: nested with extends → pass, nested without extends → error, root → skip
- Run QA

**Files**:
- Create: `rules/workspace/require-oxlint-extends-root.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "extends"

---

## TASK 10 — `workspace/no-linter-config-override`

**Status**: [x]

**Gap**: Shell function `check::enforce_shared_linter_inheritance` blocks nested biome.json / .oxlintrc.json unless they contain `"// override": "allowed"`. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-linter-config-override.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `biome.json` or `.oxlintrc.json`
- Skip root-level files
- Read file content, check if it contains `"// override": "allowed"` (or parse JSON and check key)
- If override comment absent: report error "Linter config override without permission"
- Add tests: with override comment → pass, without → error, root → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-linter-config-override.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "override"

---

## TASK 11 — `workspace/no-cross-product-imports`

**Status**: [x]

**Gap**: Shell function `check::disallow_relative_imports_to_product_siblings` prevents relative imports across product directories. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-cross-product-imports.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `.ts`/`.tsx`/`.js`/`.jsx` files under `packages/products/`
- Read content, regex: `from\s+['"](\.\.\/)+(api|web|data|marketing|mobile|branding|infra)/`
- If match: report error "Disallowed relative import into sibling product layer"
- Add tests: cross-product import → error, alias import → pass, non-product file → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-cross-product-imports.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "sibling product"

---

## TASK 12 — `workspace/no-deep-relative-shared-imports`

**Status**: [x]

**Gap**: Shell function `check::disallow_relative_imports_to_shared` blocks deep relative imports like `../../shared/`. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-deep-relative-shared-imports.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `.ts`/`.tsx`/`.js`/`.jsx` source files
- Read content, regex: `from\s+['"](\.\.\/)+(shared)/`
- If match: report error "Relative import into shared/ detected — use alias"
- Add tests: deep relative shared import → error, alias import → pass, non-source file → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-deep-relative-shared-imports.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "shared"

---

## TASK 13 — `workspace/no-cross-layer-imports`

**Status**: [x]

**Gap**: Shell function `check::enforce_project_boundaries` prevents product code from importing across layers (api→web, web→data, etc.) via relative paths. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-cross-layer-imports.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `.ts`/`.tsx`/`.js`/`.jsx` under `packages/products/`
- Determine which product/layer the file is in from its path
- Read content, regex: `from\s+['"](\.\.\/)+(api|web|data|infra|branding|marketing|mobile)/`
- If importing a different layer: report error "Disallowed cross-layer import"
- Add tests: cross-layer import → error, same-layer import → pass, non-product file → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-cross-layer-imports.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "cross-layer" or "sibling-layer"

---

## TASK 14 — `workspace/no-empty-tests-directory`

**Status**: [x]

**Gap**: Shell function `check::disallow_empty_tests_directory` fails if `__tests__/` directories exist but contain no test files. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-empty-tests-directory.ts` as a `WorkspaceRule`
- Two-pass: collect all file paths, find directories named `__tests__`, check if any files in that directory match `*.test.*` or `*.spec.*`
- If empty: report error "Empty test folder"
- Add tests: __tests__ with test file → pass, empty __tests__ → error, no __tests__ → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-empty-tests-directory.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "Empty test folder" or "__tests__"

---

## TASK 15 — `workspace/no-empty-benchmarks-directory`

**Status**: [x]

**Gap**: Shell function `check::disallow_empty_benchmarks_directory` fails if `__benchmarks__/` directories exist but contain no benchmark files. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-empty-benchmarks-directory.ts` as a `WorkspaceRule`
- Same pattern as empty-tests but for `__benchmarks__/` and `*.benchmark.*`
- Add tests: __benchmarks__ with file → pass, empty __benchmarks__ → error, no __benchmarks__ → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-empty-benchmarks-directory.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "Empty benchmark folder" or "__benchmarks__"

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Plan**: Register all 15 rules in `.resist-lint.jsonc` with severity levels:
- `workspace/no-cross-layer-imports`: `"error"`
- `workspace/no-cross-product-imports`: `"error"`
- `workspace/no-deep-relative-shared-imports`: `"error"`
- `workspace/no-empty-benchmarks-directory`: `"error"`
- `workspace/no-empty-tests-directory`: `"error"`
- `workspace/no-extra-vscode-files`: `"error"`
- `workspace/no-linter-config-override`: `"error"`
- `workspace/require-biome-extends-root`: `"error"`
- `workspace/require-dockerignore`: `"error"`
- `workspace/require-editorconfig`: `"error"`
- `workspace/require-gitattributes`: `"error"`
- `workspace/require-gitignore`: `"error"`
- `workspace/require-oxlint-extends-root`: `"error"`
- `workspace/require-vscode-folder`: `"warn"`
- `workspace/require-vscode-valid-json`: `"error"`

**Files**:
- Edit: `.resist-lint.jsonc`

**Verification**: Config valid, all rules load, `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run `pnpm -w run qa:lint --tools`
- Run `pnpm -w run qa:format`
- Run `pnpm --filter @/lint qa:test`
- Run `pnpm --filter @/lint qa:test:coverage`
- Verify all coverage thresholds pass (statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%)
- Verify test count above baseline (3097)

**Verification**: All QA green, coverage above thresholds

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 15 rules implemented against approved changelog
- Verify each rule file exists at `rules/workspace/<rule-name>.ts` and matches its plan
- Verify each rule has tests in `rules/workspace/workspace-rules.test.ts`
- Verify all 15 rules registered in `.resist-lint.jsonc`
- Rename 15 shell functions from `check::` to `ported::` in `common.checks.sh`
- Run final QA pass
- Commit all changes

**Verification**: All tasks `[x]`, all rules verified, shell functions renamed, commit clean

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | require-vscode-folder | — |
| 2 | no-extra-vscode-files | — |
| 3 | require-vscode-valid-json | — |
| 4 | require-editorconfig | — |
| 5 | require-gitignore | — |
| 6 | require-dockerignore | — |
| 7 | require-gitattributes | — |
| 8 | require-biome-extends-root | — |
| 9 | require-oxlint-extends-root | — |
| 10 | no-linter-config-override | — |
| 11 | no-cross-product-imports | — |
| 12 | no-deep-relative-shared-imports | — |
| 13 | no-cross-layer-imports | — |
| 14 | no-empty-tests-directory | — |
| 15 | no-empty-benchmarks-directory | — |
| 16 | Register rules in config | 1–15 |
| 17 | Full QA + Coverage | 16 |
| 18 | Final verification + commit | 17 |
