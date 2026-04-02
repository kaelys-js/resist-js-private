# @/lint Phase 13 — Port common.checks.sh Batch 1 (File Hygiene + Code Quality)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-27
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 rules from `common.checks.sh` to TypeScript workspace rules: no-empty-files, no-exec-bit, no-temp-files, no-excess-trailing-newlines, no-mixed-indentation, no-editor-artifacts, no-binary-files, no-case-collisions, no-large-files, no-tsbuildinfo, no-hardcoded-ips, no-js-source-files, no-insecure-urls, no-skipped-tests, no-unsafe-regex.
**Architecture**: All 15 are WorkspaceRules with `scope: 'workspace'`. Most use `ctx.allFiles()` + filename/extension checks or `ctx.readFile()` content checks. All `fixable: false`.

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
| Tests | 2635 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 30 |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — `workspace/no-empty-files`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, read each via `ctx.readFile()`
- If content is empty string AND filename is not `.gitignore`, `.env`, `.keep`: warn
- Severity: `warn`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags empty file, passes non-empty file, passes allowed empty files (.gitignore/.env/.keep), metadata check

---

## TASK 2 — `workspace/no-exec-bit`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, for each file use `node:fs/promises` `stat()` to check permissions
- If file has executable bit (mode & 0o111) AND is not `.sh` AND path doesn't contain `/scripts/`: error
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags .ts file with exec bit, passes .sh file, passes file in scripts/ dir, metadata check

---

## TASK 3 — `workspace/no-temp-files`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, check filename against patterns: `*.log`, `*.tmp`, `*.bak`, `*.orig`, `*.swp`, `*.swo`, `*.swn`, `.DS_Store`, `*~`
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags .log file, flags .DS_Store, flags file ending with ~, passes normal .ts file, metadata check

---

## TASK 4 — `workspace/no-excess-trailing-newlines`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, read content, check if it ends with `\n\n\n` (3+ newlines)
- Severity: `warn`, Categories: `['workspace', 'encoding']`, Stages: `['lint', 'check']`
- Tests: flags file with 3+ trailing newlines, passes file with single trailing newline, passes file with no trailing newline, metadata check

---

## TASK 5 — `workspace/no-mixed-indentation`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, read content, check each line with regex `/^\t+ +/`
- If any line starts with tab(s) followed by space(s): error
- Severity: `error`, Categories: `['workspace', 'encoding']`, Stages: `['lint', 'check']`
- Tests: flags file with mixed tab+space indentation, passes all-spaces file, passes all-tabs file, metadata check

---

## TASK 6 — `workspace/no-editor-artifacts`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, check path for: `.idea/` directory, `.vscode/launch.json`, `.vscode/.debug/`
- Note: `.swp`/`.swo`/`*~` already covered by `no-temp-files`, so this rule focuses on IDE directory artifacts
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags .idea/ file, flags .vscode/launch.json, passes normal source file, passes .vscode/settings.json (allowed), metadata check

---

## TASK 7 — `workspace/no-binary-files`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, check extension against: `.exe`, `.bin`, `.o`, `.a`, `.so`, `.dll`, `.dylib`, `.class`, `.jar`, `.pyc`
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags .exe file, flags .dll file, flags .pyc file, passes .ts file, metadata check

---

## TASK 8 — `workspace/no-case-collisions`

**Status**: [ ]

**Plan**:
- Collect all file paths from `ctx.allFiles()`, lowercase each, detect duplicates
- For each collision pair: error listing both paths
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags Foo.ts and foo.ts collision, passes unique filenames, metadata check

---

## TASK 9 — `workspace/no-large-files`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, read content, count lines
- If line count > 1000: warn with line count
- Filter to source files only (`.ts`, `.js`, `.svelte`, `.css`, `.json`, `.yaml`, `.yml`, `.md`)
- Severity: `warn`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags file with >1000 lines, passes file with <1000 lines, metadata check

---

## TASK 10 — `workspace/no-tsbuildinfo`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, check if filename ends with `.tsbuildinfo`
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags .tsbuildinfo file, passes .ts file, metadata check

---

## TASK 11 — `workspace/no-hardcoded-ips`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, filter to source files (`.ts`, `.js`, `.json`, `.yaml`, `.yml`)
- Read content, regex match `/\b(\d{1,3}\.){3}\d{1,3}\b/g`
- Exclude `127.0.0.1` and `0.0.0.0`
- Severity: `warn`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags file with hardcoded IP, passes file with 127.0.0.1, passes file with 0.0.0.0, passes file with no IPs, metadata check

---

## TASK 12 — `workspace/no-js-source-files`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, check if extension is `.js`, `.cjs`, or `.mjs`
- Exclude files under `node_modules/` (already excluded by allFiles), `dist/`, `build/` (also excluded)
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags .js file, flags .cjs file, flags .mjs file, passes .ts file, metadata check

---

## TASK 13 — `workspace/no-insecure-urls`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, filter to source files (`.ts`, `.js`, `.json`, `.yaml`, `.yml`, `.md`)
- Read content, regex match `http://` URLs
- Exclude `http://localhost` and `http://127.0.0.1`
- Severity: `warn`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags file with http:// URL, passes file with https://, passes file with http://localhost, metadata check

---

## TASK 14 — `workspace/no-skipped-tests`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, filter to `.test.ts` files
- Read content, regex match `(describe|it|test)\.(skip|only|todo)\(`
- Severity: `error`, Categories: `['workspace', 'testing']`, Stages: `['lint', 'check']`
- Tests: flags it.skip, flags describe.only, flags test.todo, passes normal test, metadata check

---

## TASK 15 — `workspace/no-unsafe-regex`

**Status**: [ ]

**Plan**:
- Iterate `ctx.allFiles()`, filter to `.ts` files (excluding `.test.ts`)
- Read content, detect nested quantifier patterns: `(.*)+`, `(a+)+`, `(a*)*`, `([^"]+)+`
- Regex to detect: `/\([^)]*[+*][^)]*\)[+*]/` (simplified nested quantifier detection)
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags nested quantifier pattern, passes safe regex, metadata check

---

## TASK 16 — Register Rules + Config

**Status**: [ ]

**Plan**: Register all 15 rules in `.resist-lint.jsonc`

---

## TASK 17 — Full QA + Coverage

**Status**: [ ]

---

## TASK 18 — Final Verification + Commit

**Status**: [ ]
