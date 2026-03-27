# @/lint Phase 6 — Config Simplification, Locale CLI Flag, Programmatic API

**Date**: 2026-03-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Predecessor**: Phase 5 (localization, coverage, QA)

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
| Tests | 2376 pass / 0 fail |
| Branch coverage | 75.48% (threshold: 75%) |
| Statement coverage | 89.95% |
| Function coverage | 84.60% |
| Type-check | Passes |
| Format | Clean |
| Include paths in .resist-lint.jsonc | 10 explicit directories |
| Locale support | Hardcoded `en` — 47 files import `en.ts` directly |
| Programmatic API | None — CLI only, `runLinter()` returns exit code |

---

## TASK 1 — Simplify Config Include/Exclude

### Task 1.1: Add glob/path-prefix support to include/exclude resolution

**Status**: [x]

**Gap**: The current `collectFiles()` in `cli-helpers.ts` uses `excludeSet.has(entry.name)` which only matches exact directory names — not full paths or glob patterns. This means `"packages/shared/utils/cli"` as an exclude entry would NOT work because it checks `entry.name` (just `"cli"`) not the full relative path. To support `"packages/**"` as include with `"packages/shared/utils/cli"` as exclude, the resolution logic needs path-prefix matching.

**Plan**:
- Modify `collectFiles()` in `cli-helpers.ts` to compare the full relative path of each directory (relative to workspace root) against exclude entries, not just `entry.name`
- Support path-prefix exclude patterns: if exclude entry contains `/`, match against the full relative directory path (e.g., `packages/shared/utils/cli` matches `<root>/packages/shared/utils/cli/`)
- Keep existing `entry.name` matching for backward compat with simple exclude patterns (e.g., `node_modules`, `dist`)
- Add `shouldExcludeDir(dirRelPath: string, excludeSet: ReadonlySet<string>, excludePaths: readonly string[]): boolean` helper function
- Add unit tests for the new path-prefix matching logic

**Files**:
- Modify: `src/cli-helpers.ts` (collectFiles, shouldExcludeDir)
- Modify: `src/cli-helpers.test.ts` (new tests)

**Verification**: `pnpm -r --filter @/lint run qa:type-check && pnpm -w exec vitest run --project lint -- src/cli-helpers.test.ts`

---

### Task 1.2: Simplify .resist-lint.jsonc to `packages/**` with single exclusion

**Status**: [x]

**Gap**: The config currently lists 10 explicit directories under `include`. This is fragile — new packages require manual additions. A single `packages/**` (or `packages`) include with `packages/shared/utils/cli` excluded is cleaner and future-proof.

**Plan**:
- Replace the 10-entry `include` array in `.resist-lint.jsonc` with a single `"packages"` entry
- Add `"packages/shared/utils/cli"` to the `exclude` array (uses the path-prefix matching from Task 1.1)
- Run resist-lint before and after to verify identical file discovery (same files linted)
- Update `generateJsonSchema()` description if it references include patterns

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: Run `npx tsx packages/shared/config/tooling/lint/src/cli.ts --debug 2>&1 | grep -c "Linting:"` before and after — file count must match. Then: `pnpm -w run qa:lint`

---

### Task 1.3: Update config schema description and tests

**Status**: [x]

**Gap**: Schema description and tests may reference the old include pattern. Update to reflect the simplified config.

**Plan**:
- Update any schema descriptions that reference specific include paths
- Update config schema tests to validate the simplified config structure
- Add a test verifying path-prefix exclusion works with the real config

**Files**:
- Modify: `src/config/schema.ts` (if descriptions reference old paths)
- Modify: `src/config/schema.test.ts`

**Verification**: `pnpm -w exec vitest run --project lint -- src/config/schema.test.ts`

---

## TASK 2 — Custom Locale CLI Flag

### Task 2.1: Add `--locale` flag to CLI argument parsing

**Status**: [x]

**Gap**: `parseCliArgs()` has no `--locale` flag. All 47 files import `en` directly with no runtime locale selection. The @/cli package has a proper implementation via `resolveLocale()` that supports `--locale` flag, `LANG` env var, and config fallback.

**Plan**:
- Add `locale: v.optional(v.string())` field to `CliArgsSchema`
- Add `--locale=` parsing in `parseCliArgs()` (same pattern as `--config=`, `--severity=`, etc.)
- Default to `undefined` (which means "en" at resolution time)
- Add tests for `--locale=en`, `--locale=es`, no `--locale` flag

**Files**:
- Modify: `src/cli-helpers.ts` (CliArgsSchema, parseCliArgs)
- Modify: `src/cli-helpers.test.ts` (new tests)

**Verification**: `pnpm -w exec vitest run --project lint -- src/cli-helpers.test.ts`

---

### Task 2.2: Create locale registry with runtime selection

**Status**: [x]

**Gap**: Currently `en.ts` is imported at compile-time in 47 files. Need a runtime locale registry that maps locale codes to string sets, with dynamic selection based on the `--locale` flag.

**Plan**:
- Create `src/locale/registry.ts` with:
  - `type Locale = 'en'` (union type, extensible for future locales)
  - `const LOCALE_REGISTRY: Record<Locale, LintStrings> = { en }` — maps locale codes to string objects
  - `function resolveLocale(requested?: string): Result<LintStrings>` — looks up locale in registry, falls back to `en`, returns `Result` with error for invalid locales
  - `function getAvailableLocales(): readonly Locale[]` — returns available locale codes
- Export `resolveLocale` and `getAvailableLocales` from registry
- Add comprehensive tests: valid locale, invalid locale (error result), undefined (falls back to en), available locales list
- Bridge pattern: when @/lint moves to @/cli, the registry can be replaced with @/cli's `resolveLocale()` — same interface, different implementation

**Files**:
- Create: `src/locale/registry.ts`
- Modify: `src/locale/schema.test.ts` (add registry tests, or create `src/locale/registry.test.ts`)

**Verification**: `pnpm -r --filter @/lint run qa:type-check && pnpm -w exec vitest run --project lint`

---

### Task 2.3: Replace direct `en` imports with locale parameter threading

**Status**: [x]

**Gap**: 47 files import `en` directly. These need to receive the resolved locale strings as a parameter instead of importing the hardcoded English locale.

**Plan**:
- In `cli.ts`: call `resolveLocale(cliArgs.locale)` at startup, pass result to `runLinter()`
- In `runLinter()`: accept `strings: LintStrings` parameter, pass to all callsites that use `en.*`
- In `cli-helpers.ts`: replace all `en.*` references with `strings.*` parameter
- In framework files (`formatters.ts`, `rule-loader.ts`, `worker-pool.ts`): add `strings: LintStrings` parameter
- In tool files (36 files): replace `import { en }` with `strings` parameter passed through `ExternalTool.parse()` or `createResult()`
- **Critical constraint**: Tool messages are user-facing diagnostic output, so they MUST use the resolved locale. Rule messages (from AST rules) are developer-facing and can remain in English initially.
- Verify zero remaining direct `en` imports outside of `locale/locales/en.ts` and `locale/registry.ts`

**Files**:
- Modify: `src/cli.ts`
- Modify: `src/cli-helpers.ts`
- Modify: `src/framework/formatters.ts`
- Modify: `src/framework/rule-loader.ts`
- Modify: `src/framework/worker-pool.ts`
- Modify: 36 tool files in `src/tools/`

**Verification**:
- `grep -rn "from '@/lint/locale/locales/en.ts'" packages/shared/config/tooling/lint/src/ | grep -v locale/registry | grep -v locale/locales | grep -v test` — must return 0 results
- `pnpm -r --filter @/lint run qa:type-check && pnpm -w exec vitest run --project lint && pnpm -w run qa:format:check`

---

### Task 2.4: Update help text and `--list-rules` to show `--locale`

**Status**: [x]

**Gap**: `buildHelpText()` and `listRules` output do not mention the `--locale` flag. Help text string must be localized too.

**Plan**:
- Add `--locale=CODE` to `buildHelpText()` output (under OPTIONS section)
- Add `localeFlag` string to `CliStringsSchema` / `en.ts` for the help text description
- If `--locale=invalid` is passed, print available locales and exit with error
- Add tests for help text containing `--locale`, invalid locale error output

**Files**:
- Modify: `src/cli-helpers.ts` (buildHelpText)
- Modify: `src/locale/schema.ts` (add localeFlag string)
- Modify: `src/locale/locales/en.ts` (add localeFlag value)
- Modify: `src/cli-helpers.test.ts` (tests)

**Verification**: `pnpm -w exec vitest run --project lint -- src/cli-helpers.test.ts`

---

## TASK 3 — Programmatic API

### Task 3.1: Extract `lint()` function from `runLinter()`

**Status**: [ ]

**Gap**: `runLinter()` returns only an exit code (`Promise<number>`). Programmatic consumers need the actual `LintResult[]` array, fix counts, and metadata. The function also takes `CliArgs` which is CLI-specific — a programmatic API should accept a clean options object.

**Plan**:
- Create `src/api.ts` with:
  - `LintSourceSchema` — Valibot schema for inline string sources: `{ filePath: string, content: string }`
  - `LintOptionsSchema` — Valibot schema for programmatic options: `cwd`, `configPath`, `paths`, `sources` (array of `LintSource` for string linting), `ruleIds`, `categories`, `stage`, `fix`, `cache`, `jobs`, `severityOverride`, `locale`, `tools`
  - `LintResultSummarySchema` — Valibot schema for return value: `{ results: LintResult[], exitCode: number, filesLinted: number, fixesApplied: number }`
  - `async function lint(options?: LintOptions): Promise<Result<LintResultSummary>>` — the main programmatic entry point
  - `async function lintSource(source: LintSource, options?: Pick<LintOptions, 'ruleIds' | 'categories' | 'locale'>): Promise<Result<LintResult[]>>` — convenience function for linting a single string
- `lint()` implementation:
  - Resolve locale from `options.locale` (default `en`)
  - If `options.sources` provided: lint each `{ filePath, content }` pair directly via `runTypeScriptRules(filePath, content, rules, ruleOptions)` — no disk I/O needed since the AST engine already accepts strings
  - If `options.paths` provided: collect files from disk as usual
  - Both can be combined — file results + source results merged
  - Create a silent output sink (no stdout/stderr)
  - Return `Result<LintResultSummary>`
- `lintSource()` implementation:
  - Thin wrapper: calls `lint({ sources: [source], ...options })`
  - Returns just the `Result<LintResult[]>` for that source
- Add comprehensive tests for `lint()` and `lintSource()`:
  - Default options (lint current directory)
  - Custom paths (file-based)
  - String source: `lintSource({ filePath: 'virtual.ts', content: 'const x = 1;' })`
  - Mixed: paths + sources combined
  - Rule filtering on string sources
  - Fix mode on string sources (returns fixed content in result)
  - Error result for invalid config

**Files**:
- Create: `src/api.ts`
- Create: `src/api.test.ts`

**Verification**: `pnpm -r --filter @/lint run qa:type-check && pnpm -w exec vitest run --project lint -- src/api.test.ts`

---

### Task 3.2: Refactor `runLinter()` to support result capture

**Status**: [ ]

**Gap**: `runLinter()` currently writes formatted output directly to `output.stdout/stderr` and only returns an exit code. The `lint()` API function needs access to the raw `LintResult[]` before formatting.

**Plan**:
- Extract the core lint loop from `runLinter()` into an internal `_runLintCore()` function that returns `{ results: LintResult[], filesLinted: number, fixesApplied: number }`
- Refactor `runLinter()` to call `_runLintCore()`, then format and output
- The `lint()` API calls `_runLintCore()` directly and wraps in `Result`
- Ensure `runLinter()` behavior is identical before and after refactor (no observable changes)
- Run full test suite to verify no regressions

**Files**:
- Modify: `src/cli-helpers.ts` (extract _runLintCore)
- Modify: `src/api.ts` (call _runLintCore)
- Modify: `src/cli-helpers.test.ts` (verify runLinter unchanged)

**Verification**: `pnpm -w exec vitest run --project lint` — all 2376+ tests must pass

---

### Task 3.3: Export public API from package

**Status**: [ ]

**Gap**: The package has no `exports` field in `package.json` and no barrel file. External consumers can't import the API cleanly.

**Plan**:
- Create `src/index.ts` barrel file exporting:
  - `lint` function from `api.ts`
  - `LintOptions`, `LintResultSummary` types from `api.ts`
  - `LintResult`, `LintFix` types from `framework/types.ts`
  - `LintConfig` type from `config/schema.ts`
  - `loadConfig`, `resolveRuleSeverity` from `config/schema.ts`
  - `formatResults`, `OutputFormat` from `framework/formatters.ts`
  - `resolveLocale`, `getAvailableLocales` from `locale/registry.ts`
  - `LintStrings` type from `locale/schema.ts`
- Add `"exports"` field to `package.json`:
  ```json
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*"
  }
  ```
- Add tests verifying all exports are importable and have correct types
- Keep `bin` entry for CLI usage

**Files**:
- Create: `src/index.ts`
- Modify: `package.json`
- Modify: `src/api.test.ts` (add import tests)

**Verification**: `pnpm -r --filter @/lint run qa:type-check && pnpm -w exec vitest run --project lint`

---

### Task 3.4: Add integration test for programmatic API

**Status**: [ ]

**Gap**: Need an end-to-end test that exercises the `lint()` API with real files and rules, verifying the full pipeline works programmatically.

**Plan**:
- Add integration tests in `src/api.test.ts`:
  - `lint()` with default options returns results for workspace
  - `lint({ paths: ['packages/shared/config/tooling/lint/src/constants.ts'] })` returns results for a specific file
  - `lint({ ruleIds: ['jsdoc/require-param'] })` filters to a specific rule
  - `lint({ categories: ['testing'] })` filters by category
  - `lint({ locale: 'en' })` resolves English locale
  - `lint({ locale: 'invalid' })` returns error Result
  - Verify `results` array contains well-formed `LintResult` objects
  - Verify `exitCode` matches expected (0 or 1)
  - Verify `filesLinted` count is correct
- All tests must use the programmatic API, NOT shell out to the CLI

**Files**:
- Modify: `src/api.test.ts`

**Verification**: `pnpm -w exec vitest run --project lint -- src/api.test.ts`

---

## Final Verification

**Status**: [ ]

**Plan**:
- Cross-reference EVERY item in the approved changelog against implementation
- Verify config: `pnpm -w run qa:lint` — runs with simplified config, same files linted
- Verify locale: `--locale=en` works, `--locale=invalid` shows error, zero direct `en` imports remain
- Verify API: `import { lint } from '@/lint'` works, returns `Result<LintResultSummary>`
- Verify tests: `pnpm -w exec vitest run --project lint` — 0 failures
- Verify coverage: `pnpm -w exec vitest run --project lint --coverage` — all thresholds met
- Verify type-check: `pnpm -r --filter @/lint run qa:type-check`
- Verify format: `pnpm -w run qa:format:check`
- Final commit

**Verification**: All commands above pass with exit code 0

---

## Execution Order

| Order | Task | Description | Files Changed |
|-------|------|-------------|---------------|
| 1 | 1.1 | Add path-prefix exclude support to collectFiles | 2 files |
| 2 | 1.2 | Simplify .resist-lint.jsonc config | 1 file |
| 3 | 1.3 | Update schema descriptions and tests | 2 files |
| 4 | 2.1 | Add --locale flag to CLI args | 2 files |
| 5 | 2.2 | Create locale registry with runtime selection | 2 files |
| 6 | 2.3 | Replace direct en imports with locale threading | 40+ files |
| 7 | 2.4 | Update help text for --locale | 4 files |
| 8 | 3.1 | Extract lint() programmatic function | 2 files |
| 9 | 3.2 | Refactor runLinter for result capture | 3 files |
| 10 | 3.3 | Export public API from package | 3 files |
| 11 | 3.4 | Integration tests for programmatic API | 1 file |
| 12 | Final | Cross-reference and verify everything | 0 files |
