# @/lint Phase 29 — Git Safety, Code Quality & Image Validation Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`
**Goal**: Port 16 check functions to TypeScript workspace rules — git safety, code quality, docs validation, biome config, and image validation. Rename ported functions in source file.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, async `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`, `fileExists()`, `dirExists()`). Git commands via `execSync` with try/catch. Filesystem checks via `existsSync`/`readFileSync`.

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
| Tests | 3758 pass / 0 fail |
| Type-check | Passes |
| check:: remaining | 206 |
| ported:: count | 25 |

---

## TASK 1 — `workspace/no-git-stdin-in-ci`

**Status**: [x]

**Shell origin**: `check::git_stdin_input_blocked` (line 1661)
**What**: Warns if CI uses interactive git editors (vim/nano) for core.editor or sequence.editor
**Branches**:
- core.editor matches vim/nano → warning
- sequence.editor matches vim/nano → warning
- Neither set → pass
- git config fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-git-stdin-in-ci.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warnings for interactive editor settings

---

## TASK 2 — `workspace/no-reflog-in-ci`

**Status**: [x]

**Shell origin**: `check::git_reflog_disabled_ci` (line 1702)
**What**: Errors if core.logallrefupdates is "true"
**Branches**:
- logallrefupdates is "true" → error
- logallrefupdates is "false" or unset → pass
- git config fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-reflog-in-ci.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error when reflog is enabled

---

## TASK 3 — `workspace/no-sparse-index-disabled`

**Status**: [x]

**Shell origin**: `check::git_sparse_index_check` (line 1736)
**What**: Warns if sparse index is not enabled
**Branches**:
- git config index.sparse returns "true" → pass
- Returns other value or unset → warning
- git config fails → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-sparse-index-disabled.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning when sparse index is not enabled

---

## TASK 4 — `workspace/no-untagged-releases`

**Status**: [x]

**Shell origin**: `check::git_commit_tagged` (line 2083)
**What**: Warns if a release/version commit on HEAD has no git tag
**Branches**:
- Last commit matches release/version pattern AND has tag → pass
- Last commit matches release/version pattern AND no tag → warning
- Last commit doesn't match pattern → pass
- git commands fail → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-untagged-releases.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for untagged release commits

---

## TASK 5 — `workspace/no-uncommitted-patches`

**Status**: [x]

**Shell origin**: `check::git_commit_uncommitted_patches` (line 2117)
**What**: Warns on stray .patch or .diff files in the workspace
**Branches**:
- allFiles() contains .patch/.diff files → warning per file
- No patch/diff files → pass

**Files**:
- Create: `src/rules/workspace/no-uncommitted-patches.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for each patch/diff file found

---

## TASK 6 — `workspace/no-commit-scope-mismatch`

**Status**: [x]

**Shell origin**: `check::git_commit_branch_scope` (line 2189)
**What**: Warns if commit message scope doesn't match branch name
**Branches**:
- Scope matches branch name substring → pass
- Scope doesn't match → warning
- No scope in commit → pass
- On main/master → pass
- git commands fail → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-commit-scope-mismatch.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for mismatched scope/branch

---

## TASK 7 — `workspace/no-tracked-env-files`

**Status**: [x]

**Shell origin**: `check::env_files_not_git_tracked` (line 24)
**What**: Errors if .env* files (except .env.example) are tracked in git
**Branches**:
- git ls-files finds tracked .env files → error per file
- Only .env.example tracked → pass
- No .env files tracked → pass
- git commands fail → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-tracked-env-files.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for tracked .env files, pass for .env.example

---

## TASK 8 — `workspace/no-metadata-only-commits`

**Status**: [x]

**Shell origin**: `check::git_commit_no_diff_only_metadata` (line 2050)
**What**: Errors if last commit has no file changes (only metadata)
**Branches**:
- git log --name-only returns file names → pass
- Returns empty → error
- git commands fail → graceful empty return

**Files**:
- Create: `src/rules/workspace/no-metadata-only-commits.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error on metadata-only commit

---

## TASK 9 — `workspace/validate-stateless-utils`

**Status**: [x]

**Shell origin**: `check::utility_stateless_integrity` (line 5772)
**What**: Errors if @stateless annotated files contain side effects, globals, mutation
**Branches**:
- File with @stateless + process.env/window/document → error
- File with @stateless + console/fetch/setTimeout → error
- File with @stateless + Date.now/Math.random → error
- File with @stateless + let/var → error
- File with @stateless and clean → pass
- No @stateless files → pass

**Files**:
- Create: `src/rules/workspace/validate-stateless-utils.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for each violation type

---

## TASK 10 — `workspace/validate-docs-locale`

**Status**: [x]

**Shell origin**: `check::docs_locale_structure` (line 5851)
**What**: Errors if locale folders don't match /docs/en-US/ structure
**Branches**:
- All locales match en-US → pass
- Missing file in locale → error
- Extra file in locale → warning
- No docs/en-US → error
- No docs dir → pass

**Files**:
- Create: `src/rules/workspace/validate-docs-locale.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for missing locale files

---

## TASK 11 — `workspace/validate-docs-workspace`

**Status**: [x]

**Shell origin**: `check::docs_workspace_structure` (line 5927)
**What**: Errors if /docs/en-US/ doesn't mirror workspace package layout
**Branches**:
- All workspace packages have matching docs → pass
- Missing docs for package → error
- No docs/en-US → error

**Files**:
- Create: `src/rules/workspace/validate-docs-workspace.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for missing workspace docs

---

## TASK 12 — `workspace/validate-biome-rules`

**Status**: [x]

**Shell origin**: `check::biome_config_rule_validity` (line 5998)
**What**: Errors if biome.base.json has invalid or malformed rule values
**Branches**:
- All rules valid (boolean or object) → pass
- Rule set to null or invalid type → error
- Missing biome.base.json → error

**Files**:
- Create: `src/rules/workspace/validate-biome-rules.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for invalid rule values

---

## TASK 13 — `workspace/no-biome-disable`

**Status**: [x]

**Shell origin**: `check::biome_config_no_disable` (line 6054)
**What**: Errors if biome.base.json disables any rules (set to false)
**Branches**:
- No rules disabled → pass
- Any rule set to false → error per rule
- Missing biome.base.json → error

**Files**:
- Create: `src/rules/workspace/no-biome-disable.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for disabled rules

---

## TASK 14 — `workspace/no-legacy-image-formats`

**Status**: [x]

**Shell origin**: `check::image_format_and_compression` (line 6110)
**What**: Errors on .png/.jpg/.jpeg files; only .webp/.svg/.ico allowed
**Branches**:
- Only .webp/.svg/.ico found → pass
- .png/.jpg/.jpeg found → error per file

**Files**:
- Create: `src/rules/workspace/no-legacy-image-formats.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for legacy image formats

---

## TASK 15 — `workspace/no-unreferenced-images`

**Status**: [x]

**Shell origin**: `check::images_referenced_in_source` (line 6166)
**What**: Warns on image files not referenced in any source code
**Branches**:
- All images referenced → pass
- Unreferenced image found → warning per file

**Files**:
- Create: `src/rules/workspace/no-unreferenced-images.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warnings for unreferenced images

---

## TASK 16 — `workspace/no-missing-image-refs`

**Status**: [x]

**Shell origin**: `check::images_referenced_but_missing` (line 6229)
**What**: Errors if source code references images that don't exist
**Branches**:
- All referenced images exist → pass
- Referenced image missing → error per reference

**Files**:
- Create: `src/rules/workspace/no-missing-image-refs.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert errors for missing image references

---

## TASK 17 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add all 16 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 2, 7, 8, 9, 10, 11, 12, 13, 14, 16: `"error"`
- Rules 1, 3, 4, 5, 6, 15: `"warn"`

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All rules appear in config

---

## TASK 18 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 19 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 16 rule files exist
- Verify all 16 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Verify shell function rename count
- Commit with descriptive message

**Verification**:
- All 16 `.ts` files exist in `src/rules/workspace/`
- All 16 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^ported::' common.checks.sh` increased by 16
- `grep -c '^check::' common.checks.sh` decreased by 16
