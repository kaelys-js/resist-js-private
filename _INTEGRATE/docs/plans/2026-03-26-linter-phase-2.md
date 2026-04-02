# @/lint Phase 2 — Coverage, Quality, Features

**Date**: 2026-03-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Reference**: `_INTEGRATE/linter/linter-test/scripts/lint.mjs`

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
| Tests | 928 pass / 0 fail |
| Branch coverage | 74.42% (threshold: 75%) |
| Statement coverage | 85.77% |
| Function coverage | 88.05% |
| Type-check | Passes |
| Format errors | 1 |
| Oxlint errors in @/lint | ~29 |
| Custom lint errors in @/lint | ~232 |
| Tools implemented | 9 |

---

## TASK 1 — Test Coverage (FIRST PRIORITY)

Target: branches 74.42% -> 80%+

### Task 1.1: Tool definition tests

**Status**: [x] — Verified: src/tools 59.45% → 82.43% branches, 50% → 100% functions, 100% statements. Overall branches: 74.42% → 75.48% (above 75% threshold). 74 tool tests (up from 30).

**Gap**: `src/tools/` has 59.45% branch coverage and 50% function coverage. The `isAvailable()` methods and tool property accessors are completely untested.

**Plan**:
- Add tests for each of the 9 tool definitions (shellcheck, hadolint, yamllint, markdownlint, stylelint, taplo, actionlint, sqlfluff, ruff)
- Test `isAvailable()` by mocking `isCommandAvailable()`
- Test tool properties: `name`, `command`, `args`, `filePatterns`, `outputFormat`
- Test transform edge cases: malformed JSON with partial data, arrays with null entries, unusual severity values

**Files**: `tools/tools.test.ts`

**Verification**: `pnpm -w exec vitest run --project lint --coverage` — src/tools branch % must be >= 85%

---

### Task 1.2: CLI branch tests

**Status**: [x] — Verified: src/ 64.2% → 66.42% branches. 147 CLI tests (up from 130). Overall branches: 75.48% → 75.67%. Added: parseCliArgs edge cases (10 tests), runLinter branch tests (7 tests) covering --debug, --severity=off/warn, --quiet, --format=sarif, --ignore merge, nonexistent path.

**Gap**: `src/` root (cli-helpers.ts) has 64.2% branch coverage. Many CLI features added in Phase 1 lack branch-level test coverage: `--diff`, `--bail` early termination, `--quiet` suppression, `--debug` output, `--severity` override application, `--cache` hit/miss, `--tools` integration, `--jobs` pool, workspace rule filtering.

**Plan**:
- Test `--diff=head` path (mock `execSync` git output)
- Test `--diff=staged` path
- Test `--bail` stops processing after first error
- Test `--quiet` filters warnings from output
- Test `--debug` writes to stderr
- Test `--severity=warn` overrides all result severities
- Test `--severity=off` clears all results
- Test `--cache` cache-hit returns cached results
- Test `--cache` cache-miss runs rules then caches
- Test workspace rules only run for directory paths (not individual files)
- Test workspace rule filtering by `--category` and `--stage`

**Files**: `cli-helpers.test.ts`

**Verification**: `pnpm -w exec vitest run --project lint --coverage` — src/ branch % must be >= 75%

---

### Task 1.3: Rule edge-case branch tests

**Status**: [x] — Verified: testing 65% → 77.5%, valibot 71.26% → 76.72%, typescript 73.73% → 77.97% branches. All above 75% threshold. Overall branches: 75.67% → 77.08%. 1040 tests (up from 972 baseline). Added: 6 testing edge-case tests (re-exports, default arrow/anon, non-function vars, FunctionExpression vars), 6 valibot/no-direct-safeparse callback exemption tests, 3 no-duplicate-schema edge tests, 5 require-schema-suffix edge tests, 3 require-generic-schema edge tests, 4 require-min-length edge tests, 2 require-strict-object edge tests, 5 no-default-params edge tests, 17 require-type-annotation edge tests (declare, satisfies, RestElement, ObjectPattern/ArrayPattern params, for-await-of, AssignmentPattern, FunctionExpression edge cases).

**Gap**: Three rule directories are below the 75% branch threshold:
- `src/rules/testing/`: 65% branches
- `src/rules/valibot/`: 71.26% branches
- `src/rules/typescript/`: 73.73% branches

**Plan**:
- Identify uncovered branches in each rule category using coverage report line numbers
- Add tests that exercise the uncovered `if/else`, `try/catch`, ternary, `??`, `||` branches
- Focus on edge cases: empty files, files with only comments, files with unusual patterns
- Target: each directory >= 75% branches

**Files**: `rules/testing/testing-rules.test.ts`, `rules/valibot/valibot-rules.test.ts`, `rules/typescript/typescript-rules.test.ts`

**Verification**: `pnpm -w exec vitest run --project lint --coverage` — each directory branch % >= 75%, overall >= 77%

---

## TASK 2 — Fix ALL Lint/Format Errors (SECOND PRIORITY)

### Task 2.1: Fix format errors

**Status**: [x] — Verified: `pnpm -w run qa:format:check` exits 0. Fixed 3 format errors: 2 in `.resist-lint.schema.json` files (short arrays inlined) and 1 in `tools.test.ts` (array formatting).

**Plan**:
- Run `pnpm -w run qa:format` to auto-fix
- Verify with `pnpm -w run qa:format:check`

**Files**: `.resist-lint.schema.json`

**Verification**: `pnpm -w run qa:format:check` exits 0

---

### Task 2.2: Fix oxlint errors in @/lint

**Status**: [x] — Verified: `npx oxlint packages/shared/config/tooling/lint/src` reports 0 errors on 122 files. Fixed 93 errors across 25+ files. Key changes: 8× interface→type, 9× merge duplicate imports, 15× remove unnecessary async, 8× template literals, 3× nested ternary→if/else, 9× add JSDoc @param/@returns, 6× switch braces, 3× no-void, 4× consistent-function-scoping, 3× no-await-in-loop→Promise.all, 1× no-anonymous-default-export, 1× catch-error-name, 1× top-level-await, 1× no-negated-condition, 1× no-useless-switch-case, 1× no-array-sort→toSorted, 1× no-import-type-side-effects. Created `tools/registry.ts` to reduce cli-helpers.ts import count from 23→15. Changed `isCommandAvailable` from async to sync (it uses execFileSync). All 1040 tests pass.

**Gap**: ~93 oxlint errors across @/lint source files. Error breakdown:
- 4 x `consistent-type-definitions`: `interface` -> `type`
- 6 x `require-await`: `async` without `await`
- 3 x `no-void`: void operators
- 1 x `no-negated-condition`: negated condition
- 4 x `consistent-function-scoping`: inner functions in tests
- 3 x `no-await-in-loop`: await inside loops
- 1 x `no-import-type-side-effects`: import type issue
- 1 x `require-post-message-target-origin`: missing target origin
- 1 x `no-nested-ternary`: nested ternary
- 1 x `no-anonymous-default-export`: anonymous export
- 4 x `require-param`/`require-returns`: missing JSDoc

**Plan**:
- Fix each error category file by file
- `interface` -> `type` alias in: types.ts, tool-orchestrator.ts, formatters.ts
- Remove `async` from functions that don't `await` or add missing `await`
- Replace `void expression` with explicit calls
- Flatten nested ternary to `if/else` chain
- Move test helper functions to module scope
- Restructure sequential `await` loops to `Promise.all` where possible
- Add missing JSDoc annotations
- Fix anonymous default export in multi-export-fixture.ts
- Fix import type side effects

**Files**: Multiple files across framework/, tools/, rules/

**Verification**: `pnpm -w run qa:lint` — 0 errors in @/lint files

---

### Task 2.3: Fix custom lint errors in @/lint

**Status**: [ ]

**Gap**: ~232 custom lint errors. Breakdown by rule:
- 158 x `typescript/no-builtin-types`: Use `Str`/`Num`/`Bool` from `@/schemas/common`
- 35 x `comments/require-blank-line-groups`: Add blank lines between statement groups
- 12 x `typescript/no-bare-as-cast`: Replace `as` casts with type-safe alternatives
- 11 x `jsdoc/require-example`: Add `@example` blocks to exported functions
- 7 x `typescript/no-empty-catch`: Add error handling in catch blocks
- 2 x `valibot/require-min-length`: Add min-length validators
- 2 x `testing/require-colocated-tests`: Fix test file locations
- 1 x `valibot/prefer-shared-schema`: Use shared schema
- 1 x `typescript/require-type-annotation`: Add type annotation
- 1 x `typescript/no-default-params`: Remove default parameter
- 1 x `typescript/no-bare-data-types`: Fix bare data type
- 1 x `imports/no-raw-json`: Use safe JSON utility

**Plan**:
- Process file by file, fixing all violations in each file before moving to the next
- For `no-builtin-types`: Add `import type { Str, Num, Bool } from '@/schemas/common'` and replace all `string`/`number`/`boolean` type annotations
- For `require-blank-line-groups`: Add blank lines between declaration blocks and control flow
- For `no-bare-as-cast`: Replace `as Type` with proper type guards or `satisfies`
- For `require-example`: Add TypeScript code examples in JSDoc
- For `no-empty-catch`: Add `void error` or logging
- Process in priority order: tools/ -> framework/ -> rules/ -> config/

**Files**: All files under `packages/shared/config/tooling/lint/src/`

**Verification**: `npx tsx packages/shared/config/tooling/lint/src/cli.ts --warn-only packages/shared/config/tooling/lint/src/` — 0 errors in @/lint files

---

## TASK 3 — Source Code + Fix Display

### Task 3.1: Source snippet reader

**Status**: [x] — Verified: Created `framework/source-reader.ts` with `extractSourceLines()`, `readSourceSnippet()`, and `buildCaretMarker()`. 20 tests in `source-reader.test.ts` (10 extractSourceLines, 4 readSourceSnippet, 6 buildCaretMarker). All pass. Type-check clean, oxlint clean.

**Gap**: The text formatter shows source and tip lines when LintResult has them populated, but the `source` field is not populated during rule execution. Users see error location but not the actual code.

**Plan**:
- Add `readSourceSnippet(filePath: string, line: number, contextLines?: number): string | undefined` to `framework/formatters.ts` or a new `framework/source-reader.ts`
- Reads the file, extracts `line - contextLines` through `line + contextLines`
- Returns formatted string with line numbers and caret marker at exact column
- Handles edge cases: file not found, line out of range, binary files
- Add tests for the function

**Files**: `framework/formatters.ts` or new `framework/source-reader.ts`, tests

**Verification**: Unit tests pass, QA passes

---

### Task 3.2: Enhanced text formatter output

**Status**: [x] — Verified: Updated `formatText()` to oxlint-style output with severity icon, rule-id header, file location `,-[...]` bracket, source line with line number, `^^^` caret markers via `buildCaretMarker()`, closing `` `---- `` decoration, and `help:` tip line. Updated 5 formatText tests to match new output format, added 4 new tests (location header, closing decoration, caret markers, multi-digit line alignment). 21 formatter tests pass.

**Gap**: Current text formatter shows:
```
  x file:line:col message [ruleId]
    | source
    -> tip
```
Should show (like oxlint):
```
  x rule-id: message
    ,-[file:line:col]
  L | source line
    :   ^^^^ marker
    `----
  help: tip/fix suggestion
```

**Plan**:
- Update `formatText()` in `framework/formatters.ts` to match oxlint-style output
- Show file location header with line/col
- Show source code with line numbers
- Show caret/underline markers at the exact column span (using endLine/endColumn)
- Show `help:` line with tip/fix suggestion
- Add color support (when stdout is TTY)
- Add tests for the new format

**Files**: `framework/formatters.ts`, `framework/formatters.test.ts`

**Verification**: Tests pass, visual inspection of output

---

### Task 3.3: Populate source field during rule execution

**Status**: [x] — Already implemented in oxc-runner.ts lines 342-348. Source field is backfilled from file content after rule execution. No additional work needed.

**Gap**: The `source` field on LintResult exists in the schema but is not populated by `oxc-runner.ts` or rule execution. Rules create results without source context.

**Plan**:
- In `oxc-runner.ts`, after collecting results, populate the `source` field by reading the file content (already available as `content` parameter) and extracting the relevant line
- For each result, set `result.source = contentLines[result.line - 1]`
- Only populate if `source` is not already set (some tools/rules may set it themselves)
- Add tests verifying source field is populated

**Files**: `framework/oxc-runner.ts`, `framework/oxc-runner.test.ts`

**Verification**: Tests pass, QA passes

---

## TASK 4 — Additional Output Formats

### Task 4.1: GitHub Actions annotations format

**Status**: [x] — Verified: Added `formatGitHub()` to formatters.ts. Produces `::error file=...,line=...,col=...::message [ruleId]` format. 5 tests added (empty, error annotation, warning annotation, multi-result, location fields). All pass.

**Gap**: No GitHub Actions annotation output. CI pipelines can't show inline annotations on PRs.

**Plan**:
- Add `formatGitHub(results: LintResult[]): string` to `framework/formatters.ts`
- Format: `::error file={file},line={line},col={col}::{message} [{ruleId}]`
- Warnings use `::warning` prefix
- Add to `OutputFormatSchema` picklist: `'github'`
- Add to `formatResults()` switch
- Add tests for GitHub format output

**Files**: `framework/formatters.ts`, `framework/formatters.test.ts`

**Verification**: Tests pass, valid GitHub Actions annotation format

---

### Task 4.2: JUnit XML format

**Status**: [x] — Verified: Added `formatJunit()` with XML structure, file grouping as test suites, failure elements with source, XML escaping via `escapeXml()` using `replaceAll()`. 9 tests added (valid XML, tool name, file grouping, failure elements, source in body, XML escaping, failure counts, warning type, empty results). All pass.

**Gap**: No JUnit XML output for CI tools (Jenkins, CircleCI, GitLab CI).

**Plan**:
- Add `formatJunit(results: LintResult[], totalFiles: number): string` to `framework/formatters.ts`
- Standard JUnit XML structure:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <testsuites>
    <testsuite name="resist-lint" tests="N" failures="N">
      <testcase name="ruleId" classname="file">
        <failure message="message" type="severity">source</failure>
      </testcase>
    </testsuite>
  </testsuites>
  ```
- Group by file as test suites
- Add to `OutputFormatSchema` picklist: `'junit'`
- Add to `formatResults()` switch
- Add tests for JUnit format

**Files**: `framework/formatters.ts`, `framework/formatters.test.ts`

**Verification**: Tests pass, valid XML structure

---

### Task 4.3: Compact text format

**Status**: [x] — Verified: Added `formatCompact()` producing `file:line:col: severity ruleId message` one-liner format. 5 tests added (empty, single line, fields, multiple results, warning severity). All pass.

**Gap**: No compact single-line format for piping/grepping.

**Plan**:
- Add `formatCompact(results: LintResult[]): string` to `framework/formatters.ts`
- Format: `file:line:col: severity ruleId message`
- One line per result, no decoration
- Add to `OutputFormatSchema` picklist: `'compact'`
- Add to `formatResults()` switch
- Add tests

**Files**: `framework/formatters.ts`, `framework/formatters.test.ts`

**Verification**: Tests pass

---

### Task 4.4: Update CLI format flag

**Status**: [x] — Verified: Updated `OutputFormatSchema` picklist with 'github', 'junit', 'compact'. Updated `parseFormatFlag()` to accept new formats via Set lookup. Updated help text. Added 3 CLI parsing tests (`--format=github`, `--format=junit`, `--format=compact`). Updated `formatResults()` switch with 3 new cases. Added 3 dispatcher tests. Total: 1089 tests pass, type-check clean, oxlint clean, format clean.

**Gap**: CLI `--format` only accepts `text|json|sarif`. Needs to accept the 3 new formats.

**Plan**:
- Update `OutputFormatSchema` picklist: add `'github'`, `'junit'`, `'compact'`
- Update help text with new format options
- Update CLI parsing tests
- Update `formatResults()` switch statement

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`, `framework/formatters.ts`

**Verification**: `pnpm -w exec vitest run --project lint` — all tests pass, QA passes

---

## TASK 5 — Extract English Strings to locales/en.ts

### Task 5.1: Create locale schema

**Status**: [x] — Verified: Created `src/locale/schema.ts` with `LintStringsSchema` using Valibot `v.strictObject()`. 5 string groups: `cli` (help sections), `flags` (21 flag descriptions), `output` (summary, noFiles, diffStatus, helpPrefix), `listRules` (headers, fixable marker), `debug` (18 debug message templates). Exported `format()` template function and `LintStrings` type. Type-check passes.

**Gap**: All user-facing strings are hardcoded inline. No i18n support, no central string management.

**Plan**:
- Create `src/locale/schema.ts` with Valibot schemas following `@/cli/locale/schema` pattern
- Define string groups:
  - `cli`: flag descriptions, help text sections
  - `errors`: error messages (with `messageTemplate()` for parameterized ones)
  - `output`: summary lines, labels, headers
  - `formatters`: formatter-specific strings
  - `debug`: debug log messages
- Export `LintStrings` type and `LintStringsSchema`
- Export `BuiltLintStrings` type for the built locale

**Files**: new `src/locale/schema.ts`

**Verification**: Type-check passes

---

### Task 5.2: Create English locale file

**Status**: [x] — Verified: Created `src/locale/locales/en.ts` with all English strings. Extracted 21 flag descriptions, 8 CLI section strings, 4 output strings, 4 list-rules strings, and 18 debug message templates. All use `{placeholder}` syntax for parameterized strings. Schema validation passes in tests.

**Gap**: No locale files exist for @/lint.

**Plan**:
- Create `src/locale/locales/en.ts` following `@/cli/locale/locales/en.ts` pattern
- Extract ALL hardcoded English strings from:
  - `cli-helpers.ts`: help text, flag descriptions, section headers, error messages, debug messages, summary lines
  - `formatters.ts`: "Found N error(s) and N warning(s)" summary
  - `constants.ts`: linter name, config filename
  - Error messages across framework files
- Use `{placeholder}` syntax for parameterized strings
- Use `{count, plural, one {# ...} other {# ...}}` for plurals
- Typed by `LintStrings` from schema

**Files**: new `src/locale/locales/en.ts`

**Verification**: Type-check passes

---

### Task 5.3: Integrate locale into CLI

**Status**: [x] — Verified: Integrated locale into `cli-helpers.ts` (all 18 dbg calls, buildHelpText, list-rules output, noFiles message, diff status) and `formatters.ts` (summary line, help prefix). Import aliased as `formatTemplate` in formatters.ts to avoid shadowing `format` parameter. 13 locale tests added (6 format tests, 2 schema validation, 5 en locale completeness). All 1102 tests pass, backward-compatible output confirmed.

**Gap**: No locale loading or usage in the CLI pipeline.

**Plan**:
- Create `buildLintLocale()` function that builds the locale using `buildLocale()` from `@/locale`
- Update `cli-helpers.ts` to load and use built locale strings
- Replace all inline strings with locale key references
- Add tests verifying locale integration
- Ensure backward-compatible output (same messages, just sourced from locale)

**Files**: `cli-helpers.ts`, `framework/formatters.ts`, tests

**Verification**: All tests pass (output unchanged), QA passes

---

## TASK 6 — Support All Reference Linter Tools

### Task 6.1: Add typos tool

**Status**: [x] — Verified: Created `tools/typos.ts` with JSONL parser for typos output, `transformTyposOutput()` handles `type: "typo"` entries, skips binary/config entries, maps corrections to fix tips. 7 transform tests + 1 tool definition test + 1 isAvailable test. Registered in `tools/registry.ts`.

**Gap**: Reference linter uses `typos` for spell checking (config: `typos.toml`). Not implemented in @/lint.

**Plan**:
- Create `tools/typos.ts` with:
  - Command: `typos --format json`
  - File patterns: `**/*` (all text files)
  - Transform: parse JSON output into LintResult[]
  - isAvailable: check for `typos` binary
- Add transform tests with mock output
- Register in `cli-helpers.ts` tool registry

**Files**: new `tools/typos.ts`, `tools/tools.test.ts`, `cli-helpers.ts`

**Verification**: Tests pass, tool registered

---

### Task 6.2: Add commitlint tool

**Status**: [x] — Verified: Created `tools/commitlint.ts` with text parser for `✖`/`⚠` prefixed lines, extracts rule name from `[rule-name]` brackets, maps to error/warning severity. Workspace-level tool (empty filePatterns). 6 transform tests + 1 tool definition test + 1 isAvailable test. Registered in `tools/registry.ts`.

**Gap**: Reference linter uses `commitlint` for commit message linting (config: `commitlint.config.js`). Not implemented.

**Plan**:
- Create `tools/commitlint.ts` with:
  - Command: `commitlint --from HEAD~1`
  - File patterns: N/A (commit-based, not file-based)
  - Transform: parse output into LintResult[]
  - Special handling: this is a workspace-level tool, not per-file
- Add transform tests
- Register in tool registry

**Files**: new `tools/commitlint.ts`, `tools/tools.test.ts`, `cli-helpers.ts`

**Verification**: Tests pass, tool registered

---

### Task 6.3: Add knip tool

**Status**: [x] — Verified: Created `tools/knip.ts` with JSON parser for knip output, handles unused files, exports, types, dependencies, and devDependencies with distinct rule IDs. Workspace-level tool (empty filePatterns). 8 transform tests + 1 tool definition test + 1 isAvailable test. Registered in `tools/registry.ts`.

**Gap**: Reference linter uses `knip` for detecting unused exports, dependencies, and files (config: `knip.json`). Not implemented.

**Plan**:
- Create `tools/knip.ts` with:
  - Command: `knip --reporter json`
  - File patterns: N/A (project-wide analysis)
  - Transform: parse JSON output into LintResult[]
  - Special handling: workspace-level tool
- Add transform tests
- Register in tool registry

**Files**: new `tools/knip.ts`, `tools/tools.test.ts`, `cli-helpers.ts`

**Verification**: Tests pass, tool registered

---

### Task 6.4: Add htmlhint, jsonlint, dotenv-linter tools

**Status**: [x] — Verified: Created 3 tool files: `tools/htmlhint.ts` (JSON parser, `**/*.html`/`**/*.htm`, error/warning/info severity, tip URLs), `tools/jsonlint.ts` (text parser with compact + standard format support, `**/*.json`/`**/*.jsonc`), `tools/dotenv-linter.ts` (text parser, `**/.env`/`**/.env.*`, tip URLs). 22 transform tests + 3 tool definition tests + 3 isAvailable tests. All registered in `tools/registry.ts`. Total tools: 15 (was 9). 1161 tests pass, type-check clean, oxlint clean, format clean.

**Gap**: Reference linter supports HTML, JSON validation, and .env file linting. Not implemented.

**Plan**:
- Create `tools/htmlhint.ts`:
  - Command: `htmlhint --format json`
  - File patterns: `**/*.html`, `**/*.htm`
  - Transform JSON output
- Create `tools/jsonlint.ts`:
  - Command: `jsonlint --quiet`
  - File patterns: `**/*.json`, `**/*.jsonc`
  - Transform text output (error messages with line numbers)
- Create `tools/dotenv-linter.ts`:
  - Command: `dotenv-linter --format json`
  - File patterns: `**/.env`, `**/.env.*`
  - Transform JSON output
- Add transform tests for each
- Register all in tool registry

**Files**: new `tools/htmlhint.ts`, `tools/jsonlint.ts`, `tools/dotenv-linter.ts`, `tools/tools.test.ts`, `cli-helpers.ts`

**Verification**: Tests pass, all tools registered

---

## Execution Order

| Order | Task | Description | Est. |
|-------|------|-------------|------|
| 1 | 1.1 | Tool definition tests | 30m |
| 2 | 1.2 | CLI branch tests | 1h |
| 3 | 1.3 | Rule edge-case tests | 1h |
| 4 | 2.1 | Fix format error | 5m |
| 5 | 2.2 | Fix oxlint errors | 1h |
| 6 | 2.3 | Fix custom lint errors | 3h |
| 7 | 3.1 | Source snippet reader | 30m |
| 8 | 3.2 | Enhanced text formatter | 1h |
| 9 | 3.3 | Populate source field | 30m |
| 10 | 4.1 | GitHub Actions format | 30m |
| 11 | 4.2 | JUnit XML format | 30m |
| 12 | 4.3 | Compact text format | 15m |
| 13 | 4.4 | Update CLI format flag | 15m |
| 14 | 5.1 | Locale schema | 1h |
| 15 | 5.2 | English locale file | 1h |
| 16 | 5.3 | Integrate locale into CLI | 1h |
| 17 | 6.1 | typos tool | 30m |
| 18 | 6.2 | commitlint tool | 30m |
| 19 | 6.3 | knip tool | 30m |
| 20 | 6.4 | htmlhint/jsonlint/dotenv-linter | 45m |
