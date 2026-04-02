# @/lint Phase 21 — File Validation, Naming Enforcement + Framework Artifact Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-29
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 shell check functions to TypeScript workspace rules — 3 file naming/casing, 2 documentation quality, 4 framework artifact blocking, 3 module/package validation, 2 config delegation, 1 benchmark naming.
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
| Tests | 3160 pass / 0 fail |
| Type-check | Passes |
| Workspace rule files | 151 |
| Test file lines | ~7800 |
| Coverage | Statements 91.85% / Branches 78.53% / Functions 87.42% / Lines 91.84% |

---

## TASK 1 — `workspace/validate-filename-casing`

**Status**: [x]

**Gap**: Shell function `check::validate_filename_casing` enforces kebab-case/snake_case filenames in key directories. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/validate-filename-casing.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for paths under `packages/shared/`, `packages/products/`, `.vscode/`, `.husky/`
- Check `basename` against regex `/^[a-z0-9._-]+$/` — reject if doesn't match
- If violation: report error with tip about lowercase naming
- Add tests: valid kebab-case → pass, uppercase file → error, file outside scoped dirs → skip
- Run QA

**Files**:
- Create: `rules/workspace/validate-filename-casing.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert `severity === 'error'`, message contains "casing"

---

## TASK 2 — `workspace/enforce-docs-naming`

**Status**: [x]

**Gap**: Shell function `check::enforce_docs_naming_conventions` ensures docs files are `.md` with kebab-case names. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/enforce-docs-naming.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for paths under `/docs/`
- Allow uppercase known files: README.md, CHANGELOG.md, SECURITY.md, LICENSE, GOVERNANCE.md, PROJECT_CHARTER.md, CODE_OF_CONDUCT.md
- Check 1: non-`.md` files in docs → error
- Check 2: `.md` files with non-kebab-case name → error
- Add tests: valid → pass, non-md file → error, uppercase md → error, README.md → pass
- Run QA

**Files**:
- Create: `rules/workspace/enforce-docs-naming.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 5 tests

**Verification**: Tests assert errors for bad naming, pass for allowed uppercase files

---

## TASK 3 — `workspace/enforce-test-file-naming`

**Status**: [x]

**Gap**: Shell function `check::enforce_test_file_naming` ensures test files use `*.test.ts(x)` and reside in `__tests__/`. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/enforce-test-file-naming.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`:
  - Check 1: files matching `*.test.ts(x)` NOT in `__tests__/` → error "misplaced test"
  - Check 2: files IN `__tests__/` NOT matching `*.test.ts(x)` → error "bad naming"
- Add tests: test in __tests__ → pass, misplaced test → error, bad name in __tests__ → error
- Run QA

**Files**:
- Create: `rules/workspace/enforce-test-file-naming.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert both error paths (misplaced + bad naming)

---

## TASK 4 — `workspace/no-todo-in-docs`

**Status**: [x]

**Gap**: Shell function `check::disallow_todo_in_docs` scans docs for TODO/FIXME placeholders. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-todo-in-docs.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `*.md` under `/docs/`
- Read content, regex scan for `TODO|FIXME|<insert[^>]*here>`
- If match: report warning with line info
- Add tests: clean doc → pass, TODO in doc → warning, non-docs file → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-todo-in-docs.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert `severity === 'warning'`, message contains "placeholder"

---

## TASK 5 — `workspace/no-broken-markdown-links`

**Status**: [x]

**Gap**: Shell function `check::validate_markdown_links` verifies local link references resolve. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-broken-markdown-links.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `*.md` files
- Parse content for `[text](href)` patterns via regex
- Skip http/https/mailto/anchor-only links
- For local links: check `ctx.fileExists()` on resolved path
- If broken: report error with file and link target
- Add tests: valid link → pass, broken link → error, http link → skip
- Run QA

**Files**:
- Create: `rules/workspace/no-broken-markdown-links.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains broken link path

---

## TASK 6 — `workspace/no-nextjs-artifacts`

**Status**: [x]

**Gap**: Shell function `check::disallow_nextjs_artifacts` blocks Next.js files. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-nextjs-artifacts.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, check basename/path against: `next.config.js`, `next.config.ts`, `next-env.d.ts`, `.next`
- If match: report error "Next.js artifacts not allowed"
- Add tests: next.config.js → error, normal file → pass
- Run QA

**Files**:
- Create: `rules/workspace/no-nextjs-artifacts.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "Next.js"

---

## TASK 7 — `workspace/no-gatsby-artifacts`

**Status**: [x]

**Gap**: Shell function `check::disallow_gatsby_artifacts` blocks Gatsby files. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-gatsby-artifacts.ts` as a `WorkspaceRule`
- Check for: `gatsby-config.js`, `gatsby-node.js`, `gatsby-browser.js`
- If match: report error "Gatsby artifacts not allowed"
- Add tests: gatsby-config.js → error, normal file → pass
- Run QA

**Files**:
- Create: `rules/workspace/no-gatsby-artifacts.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "Gatsby"

---

## TASK 8 — `workspace/no-hugo-configs`

**Status**: [x]

**Gap**: Shell function `check::disallow_hugo_configs` blocks Hugo config files. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-hugo-configs.ts` as a `WorkspaceRule`
- Check for: `config.toml`, `config.yaml`, `config.yml` at root level, `layouts/`, `archetypes/` directories
- If match: report error "Hugo config not allowed"
- Add tests: config.toml → error, normal file → pass
- Run QA

**Files**:
- Create: `rules/workspace/no-hugo-configs.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "Hugo"

---

## TASK 9 — `workspace/no-unapproved-ssg`

**Status**: [x]

**Gap**: Shell function `check::disallow_static_site_generators` blocks unapproved SSG configs. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-unapproved-ssg.ts` as a `WorkspaceRule`
- Check for: `11ty.config.js`, `mkdocs.yml`, `mkdocs.yaml`, `docusaurus.config.js`, `_sidebar.md`, `docsify.js`
- If match: report error "Unapproved SSG config"
- Add tests: mkdocs.yml → error, normal file → pass
- Run QA

**Files**:
- Create: `rules/workspace/no-unapproved-ssg.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "static site generator" or "SSG"

---

## TASK 10 — `workspace/validate-mjs-cjs-usage`

**Status**: [x]

**Gap**: Shell function `check::validate_mjs_cjs_usage` validates ESM/CJS file extensions match nearest package.json type. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/validate-mjs-cjs-usage.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, filter for `.mjs` and `.cjs` files
- For each: find nearest `package.json` by walking up path segments, read it, check `type` field
- `.mjs` requires `"type": "module"`, `.cjs` requires `"type": "commonjs"`
- If mismatch: report error
- Add tests: .mjs with type=module → pass, .mjs without → error, .cjs with type=commonjs → pass, .cjs without → error
- Run QA

**Files**:
- Create: `rules/workspace/validate-mjs-cjs-usage.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 5 tests

**Verification**: Tests assert error messages contain file extension and expected type

---

## TASK 11 — `workspace/no-exports-overlap`

**Status**: [x]

**Gap**: Shell function `check::validate_exports_overlap` detects duplicate export subpaths across packages. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/no-exports-overlap.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`, collect all `package.json` files
- Parse each, extract `exports` keys, build a map of `pkgName/exportKey → filePath`
- If same resolved export path exists in two packages: report error
- Add tests: no overlap → pass, two packages same export → error, no exports → pass
- Run QA

**Files**:
- Create: `rules/workspace/no-exports-overlap.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains "overlap" or "conflict"

---

## TASK 12 — `workspace/enforce-workspace-version-alignment`

**Status**: [x]

**Gap**: Shell function `check::enforce_workspace_version_alignment` checks major version consistency. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/enforce-workspace-version-alignment.ts` as a `WorkspaceRule`
- Two-pass: first collect all package names → versions, then check each dep declaration
- For internal deps: extract major version from declared version and from dependency spec
- If major versions differ: report error
- Add tests: aligned versions → pass, misaligned major → error, external dep → skip
- Run QA

**Files**:
- Create: `rules/workspace/enforce-workspace-version-alignment.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert error message contains package name and version mismatch

---

## TASK 13 — `workspace/validate-root-biome-json`

**Status**: [x]

**Gap**: Shell function `check::validate_root_biome_json` validates root biome.json delegates to shared base. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/validate-root-biome-json.ts` as a `WorkspaceRule`
- Find root `biome.json` via `ctx.allFiles()`
- Check: exists, has `$schema`, has `extends` pointing to shared base, no extra top-level keys
- If violations: report error for each
- Add tests: valid config → pass, missing extends → error, extra keys → error, missing file → error
- Run QA

**Files**:
- Create: `rules/workspace/validate-root-biome-json.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 5 tests

**Verification**: Tests assert specific error messages for each violation type

---

## TASK 14 — `workspace/validate-root-oxlintrc-json`

**Status**: [x]

**Gap**: Shell function `check::validate_root_oxlintrc_json` validates root .oxlintrc.json. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/validate-root-oxlintrc-json.ts` as a `WorkspaceRule`
- Same pattern as biome rule but for `.oxlintrc.json`
- Check: exists, has `$schema`, has `extends`, no extra top-level keys
- Add tests: valid → pass, missing extends → error, extra keys → error, missing file → error
- Run QA

**Files**:
- Create: `rules/workspace/validate-root-oxlintrc-json.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 5 tests

**Verification**: Tests assert specific error messages for each violation type

---

## TASK 15 — `workspace/enforce-benchmark-file-naming`

**Status**: [x]

**Gap**: Shell function `check::enforce_benchmark_file_naming` ensures benchmark files use proper naming. No TypeScript rule exists.

**Plan**:
- Create `rules/workspace/enforce-benchmark-file-naming.ts` as a `WorkspaceRule`
- Iterate `ctx.allFiles()`:
  - Check 1: files matching `*.benchmark.ts(x)` NOT in `__benchmarks__/` → error
  - Check 2: files IN `__benchmarks__/` NOT matching `*.benchmark.ts(x)` → error
- Add tests: benchmark in __benchmarks__ → pass, misplaced → error, bad name → error
- Run QA

**Files**:
- Create: `rules/workspace/enforce-benchmark-file-naming.ts`
- Test: `rules/workspace/workspace-rules.test.ts` — 4 tests

**Verification**: Tests assert both error paths (misplaced + bad naming)

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Plan**: Register all 15 rules in `.resist-lint.jsonc` with severity levels:
- `workspace/enforce-benchmark-file-naming`: `"error"`
- `workspace/enforce-docs-naming`: `"error"`
- `workspace/enforce-test-file-naming`: `"error"`
- `workspace/enforce-workspace-version-alignment`: `"error"`
- `workspace/no-broken-markdown-links`: `"warn"`
- `workspace/no-exports-overlap`: `"error"`
- `workspace/no-gatsby-artifacts`: `"error"`
- `workspace/no-hugo-configs`: `"error"`
- `workspace/no-nextjs-artifacts`: `"error"`
- `workspace/no-todo-in-docs`: `"warn"`
- `workspace/no-unapproved-ssg`: `"error"`
- `workspace/validate-filename-casing`: `"error"`
- `workspace/validate-mjs-cjs-usage`: `"error"`
- `workspace/validate-root-biome-json`: `"error"`
- `workspace/validate-root-oxlintrc-json`: `"error"`

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
- Verify test count above baseline (3160)

**Verification**: All QA green, coverage above thresholds

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 15 rules implemented against approved changelog
- Verify each rule file exists at `rules/workspace/<rule-name>.ts`
- Verify each rule has tests in `rules/workspace/workspace-rules.test.ts`
- Verify all 15 rules registered in `.resist-lint.jsonc`
- Verify test count ≥ 3220 (baseline 3160 + ~60 new)
- Verify coverage thresholds maintained
- Rename 15 shell functions from `check::` to `ported::` in `common.checks.sh`
- Run final QA pass
- Commit all changes

**Verification**:
- Verify all 15 rule files exist at expected paths
- Verify each rule has ≥3 test cases in workspace-rules.test.ts
- Verify all registered in .resist-lint.jsonc with correct severity
- Verify 3220+ tests pass with 0 failures
- Verify coverage: statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%
- Verify 15 shell functions renamed to ported:: prefix

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | validate-filename-casing | — |
| 2 | enforce-docs-naming | — |
| 3 | enforce-test-file-naming | — |
| 4 | no-todo-in-docs | — |
| 5 | no-broken-markdown-links | — |
| 6 | no-nextjs-artifacts | — |
| 7 | no-gatsby-artifacts | — |
| 8 | no-hugo-configs | — |
| 9 | no-unapproved-ssg | — |
| 10 | validate-mjs-cjs-usage | — |
| 11 | no-exports-overlap | — |
| 12 | enforce-workspace-version-alignment | — |
| 13 | validate-root-biome-json | — |
| 14 | validate-root-oxlintrc-json | — |
| 15 | enforce-benchmark-file-naming | — |
| 16 | Register rules in config | 1–15 |
| 17 | Full QA + Coverage | 16 |
| 18 | Final verification + commit | 17 |
