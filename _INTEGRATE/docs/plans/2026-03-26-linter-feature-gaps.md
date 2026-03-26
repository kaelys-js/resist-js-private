# Linter Feature Gaps — Implementation Plan

**Date**: 2026-03-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Reference**: `_INTEGRATE/linter/linter-test/scripts/`

Each task is atomic: implement → verify (QA + tests) → mark done → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## TIER 1 — Quick Wins

### Task 1.1: `byId` Map index in rule loader

**Status**: [x] — Verified: type-check ✅, 724 tests ✅ (+5 new byId tests)

**Gap**: Reference linter builds a `byId: Map<string, Rule>` for O(1) lookup by rule ID. Our loader has no equivalent — `--rule=` filtering does a linear scan.

**Plan**:
- Add `byId: v.custom<Map<string, TypeScriptRule | PackageJsonRule>>(...)` to `LoadedRulesSchema` in `rule-loader.ts`
- Build the `byId` Map in `loadAllRules()` alongside `byCategory`/`byStage`
- Add duplicate-ID detection (warn to stderr + skip if `byId.has(id)`)
- Use `byId` in `runLinter()` for `--rule=` filtering instead of `.filter(r => ruleIds.includes(r.id))`
- Add tests in `rule-loader.test.ts`:
  - `byId` is a Map
  - Known rule IDs are present (e.g., `jsdoc/require-param`, `package/require-tsgo`)
  - `byId.size` equals total typescript + packageJson count
  - Every entry's `.id` matches its key

**Files**: `framework/rule-loader.ts`, `framework/rule-loader.test.ts`, `cli-helpers.ts`

---

### Task 1.2: `createResult()` factory helper

**Status**: [x] — Verified: type-check ✅, 730 tests ✅ (+6 new createResult tests)

**Gap**: Reference linter has `createResult(ruleId, file, line, column, severity, message, tip?, example?)` reducing boilerplate. Our rules construct result objects manually with 8+ fields every time.

**Plan**:
- Add `createResult()` to `framework/types.ts` (co-located with `LintResultSchema`)
- Signature:
  ```typescript
  function createResult(
    ruleId: string,
    file: string,
    line: number,
    column: number,
    severity: 'error' | 'warning' | 'info',
    message: string,
    opts?: { tip?: string; example?: string; fix?: LintFix; endLine?: number; endColumn?: number }
  ): LintResult
  ```
- Default `fix` to the no-op `{ range: { start: 0, end: 0 }, text: '' }` when omitted
- Export from `types.ts` so rules can import it
- Do NOT migrate existing rules in this PR (separate future refactor)
- Add tests:
  - Returns valid `LintResult` with all required fields
  - Default fix is no-op when omitted
  - Optional fields (tip, example, endLine, endColumn) pass through
  - Explicit fix overrides default

**Files**: `framework/types.ts`, `framework/rule-loader.test.ts` (or a new `framework/types.test.ts`)

---

### Task 1.3: Binary file detection

**Status**: [x] — Verified: type-check ✅, 765 tests ✅ (+35 new: 24 binary true, 8 binary false, 1 no ext, 2 case-insensitive)

**Gap**: Reference linter has `isBinaryFile()` that checks extensions (`.png`, `.jpg`, `.woff2`, `.zip`, `.pdf`, etc.) and skips them during discovery. Our `collectFiles()` only checks extensions against a whitelist, which effectively skips binaries — but if someone adds `.*` or a broad extension to config, binary files could slip through.

**Plan**:
- Add `BINARY_EXTENSIONS` set to `cli-helpers.ts` (same list as reference: images, fonts, archives, media, databases):
  ```
  .png, .jpg, .jpeg, .gif, .ico, .webp, .avif,
  .woff, .woff2, .ttf, .otf, .eot,
  .zip, .tar, .gz, .bz2, .7z, .rar,
  .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx,
  .exe, .dll, .so, .dylib,
  .mp3, .mp4, .wav, .ogg, .webm, .avi, .mov,
  .sqlite, .db
  ```
- Add `isBinaryFile(filePath: string): boolean` exported function
- Insert binary check in `shouldLint()` before the extension check — binary files always return `false`
- Add tests:
  - `isBinaryFile()` returns true for each known binary extension
  - `isBinaryFile()` returns false for `.ts`, `.json`, `.md`
  - `shouldLint()` rejects binary files even if their extension is in config

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

### Task 1.4: `--quiet` flag (errors only, suppress warnings)

**Status**: [x] — Verified: type-check ✅, 767 tests ✅ (+2 new quiet parsing tests)

**Gap**: Reference linter supports `--quiet` to suppress warning-level output. Our CLI has no equivalent.

**Plan**:
- Add `quiet: v.boolean()` to `CliArgsSchema`
- Parse `--quiet` in `parseCliArgs()`
- In `runLinter()` output section:
  - When `quiet` is true, filter `allResults` to only `severity === 'error'` before rendering
  - Still count warnings in the summary line (so user knows they exist)
- Update help text with `--quiet` description
- Add tests:
  - `parseCliArgs(['--quiet'])` sets `quiet: true`
  - Default is `quiet: false`
  - Output suppresses warnings when quiet is true
  - Summary line still mentions warning count

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

### Task 1.5: `--bail` flag (stop on first error)

**Status**: [x] — Verified: type-check ✅, 769 tests ✅ (+2 new bail parsing tests)

**Gap**: Reference linter supports `--bail` to exit early on first error. Useful for large repos in CI.

**Plan**:
- Add `bail: v.boolean()` to `CliArgsSchema`
- Parse `--bail` in `parseCliArgs()`
- In `runLinter()`, after processing each file's task results, check if any result has `severity === 'error'` and `bail` is true → stop processing remaining files, skip package.json rules, go straight to output
- Update help text with `--bail` description
- Add tests:
  - `parseCliArgs(['--bail'])` sets `bail: true`
  - Default is `bail: false`
  - When bail is set, linter stops after first file with errors (mock test)

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

## TIER 2 — Moderate Effort

### Task 2.1: Multiple rule export formats

**Status**: [x] — Verified: type-check ✅, 784 tests ✅ (+6 new multi-export tests, 2 fixture files)

**Gap**: Reference linter's `loadRuleModule()` handles three export shapes:
1. `export default rule` (single rule) — our current behavior
2. `export default [rule1, rule2]` (array of rules)
3. `export { rules }` (named `rules` array export)

Our loader only handles shape 1.

**Plan**:
- In `loadAllRules()` in `rule-loader.ts`, after importing each module, update the rule extraction logic:
  1. If `mod.default` is an array → iterate and push each valid rule
  2. If `mod.rules` is an array → iterate and push each valid rule
  3. Otherwise → treat `mod.default` as a single rule (existing behavior)
- Maintain the same validation: each item must have `id` (string), then discriminate by `visitor` vs `check`
- Add a test fixture file (e.g., `rules/testing/_multi-export-fixture.ts`) that exports an array to verify array loading works
- Add tests in `rule-loader.test.ts`:
  - Array default export loads multiple rules
  - Named `rules` export loads rules
  - Mixed: default + named exports both get loaded
  - Invalid items in arrays are skipped

**Files**: `framework/rule-loader.ts`, `framework/rule-loader.test.ts`, test fixture file

---

### Task 2.2: `--ignore=pattern` CLI flag

**Status**: [x] — Verified: type-check ✅, 772 tests ✅ (+3 new ignore parsing tests)

**Gap**: Reference linter supports additional ignore patterns from CLI. Our linter only uses config-file `exclude` patterns.

**Plan**:
- Add `ignore: v.array(v.string())` to `CliArgsSchema`
- Parse `--ignore=pattern[,pattern2]` in `parseCliArgs()` (same comma-split as `--rule=`)
- In `runLinter()`, merge CLI ignore patterns with `config.exclude` before passing to `collectFiles()` and `shouldLint()`
- Update help text with `--ignore` description and example
- Add tests:
  - `parseCliArgs(['--ignore=*.test.ts,*.spec.ts'])` sets `ignore: ['*.test.ts', '*.spec.ts']`
  - Default is `ignore: []`
  - Ignored patterns are applied during file collection

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

### Task 2.3: `--config=path` CLI flag

**Status**: [x] — Verified: type-check ✅, 774 tests ✅ (+2 new config parsing tests)

**Gap**: Reference linter supports custom config file paths. Our linter always looks for `.resist-lint.jsonc` in the workspace root.

**Plan**:
- Add `configPath: v.optional(v.string())` to `CliArgsSchema`
- Parse `--config=path` in `parseCliArgs()`
- Update `loadConfig()` in `config/schema.ts` to accept an optional `configPath` parameter — if provided, use that path instead of `resolve(cwd, CONFIG_FILENAME)`
- In `runLinter()`, pass `cliArgs.configPath` to `loadConfig()`
- Update help text with `--config` description
- Add tests:
  - `parseCliArgs(['--config=./custom.jsonc'])` sets `configPath`
  - Default is `configPath: undefined`
  - `loadConfig()` uses custom path when provided
  - `loadConfig()` falls back to default when not provided

**Files**: `cli-helpers.ts`, `config/schema.ts`, `cli-helpers.test.ts`, `config/schema.test.ts`

---

### Task 2.4: `--severity=X` global severity override

**Status**: [x] — Verified: type-check ✅, 778 tests ✅ (+4 new severity parsing tests)

**Gap**: Reference linter allows overriding all result severities from CLI (e.g., treat everything as a warning).

**Plan**:
- Add `severityOverride: v.optional(v.picklist(['error', 'warn', 'off']))` to `CliArgsSchema`
- Parse `--severity=warn` flag in `parseCliArgs()`
- In `runLinter()`, after all results are collected and before output, apply the override:
  - `--severity=warn` → set all results to `severity: 'warning'`
  - `--severity=off` → clear all results (effectively disabling the linter)
  - `--severity=error` → set all results to `severity: 'error'`
- `--severity=warn` combined with `--warn-only` is effectively a "soft lint" mode
- Update help text
- Add tests:
  - `parseCliArgs(['--severity=warn'])` sets `severityOverride: 'warn'`
  - Default is `severityOverride: undefined`
  - Override applies to all results
  - Works correctly with `--warn-only`

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

### Task 2.5: `source` and `url` fields on LintResult

**Status**: [x] — Verified: type-check ✅, 785 tests ✅ (+1 new source/url test)

**Gap**: Reference linter results can include `source` (code snippet showing the offending line) and `url` (link to documentation for the rule). Our `LintResultSchema` has `tip` and `example` but not `source`/`url`.

**Plan**:
- Add to `LintResultSchema` in `types.ts`:
  - `source: v.optional(v.string())` — the source code line that triggered the lint error
  - `url: v.optional(v.string())` — link to documentation for the rule
- In `oxc-runner.ts`, after running rules, populate `source` by extracting the source line from file content using the result's `line` number
- `url` can be set per-rule in rule definitions (optional field, rules can populate it or leave it undefined)
- Update text formatter in `runLinter()` to show source snippet when available (indented under the diagnostic line)
- Add tests:
  - `LintResultSchema` validates with `source` and `url` fields
  - `LintResultSchema` validates without them (optional)
  - Text output includes source snippet when present

**Files**: `framework/types.ts`, `framework/oxc-runner.ts`, `cli-helpers.ts`, tests

---

### Task 2.6: `--format=json|text|sarif` output formats

**Status**: [x] — Verified: type-check ✅, 812 tests ✅ (+21 new: 4 parsing + 17 formatter tests)

**Gap**: Reference linter supports multiple output formats. We have `--json` flag (boolean), but no SARIF or structured text format.

**Plan**:
- Add `format: v.optional(v.picklist(['text', 'json', 'sarif']))` to `CliArgsSchema`
- Parse `--format=X` flag. Keep `--json` as an alias for `--format=json` for backward compatibility
- Extract result formatting into a `formatResults(results, format, allFiles)` function in a new `framework/formatters.ts`:
  - `text`: current human-readable output format (default)
  - `json`: current `JSON.stringify(results)` behavior
  - `sarif`: [SARIF 2.1.0](https://sarifweb.azurewebsites.net/) format — used by GitHub Code Scanning, VS Code SARIF Viewer. Structure:
    ```json
    {
      "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      "version": "2.1.0",
      "runs": [{
        "tool": { "driver": { "name": "resist-lint", "rules": [...] } },
        "results": [...]
      }]
    }
    ```
- Update `runLinter()` to use `formatResults()` instead of inline formatting
- Add tests for each format:
  - Text format matches current output
  - JSON format is valid JSON array
  - SARIF format validates against SARIF schema structure
  - `--json` is backward-compatible alias

**Files**: `cli-helpers.ts`, new `framework/formatters.ts`, `framework/formatters.test.ts`, `cli-helpers.test.ts`

---

### Task 2.7: `--diff` flag (only lint changed files)

**Status**: [x] — Verified: type-check ✅, 789 tests ✅ (+4 new diff parsing tests)

**Gap**: Reference linter has git diff integration to only lint staged/changed files. Very useful for pre-commit hooks and incremental CI.

**Plan**:
- Add `diff: v.optional(v.picklist(['head', 'staged']))` to `CliArgsSchema`
- Parse `--diff` flag (defaults to `'head'` if no value) and `--diff=staged` variant
- When `--diff` is set:
  - `head`: run `git diff --name-only HEAD` to get changed files
  - `staged`: run `git diff --cached --name-only` to get staged files
- Filter `allFiles` to only those returned by git diff (intersect with discovered files)
- For `--diff=staged`, this is ideal for pre-commit hooks combined with `--stage=pre-commit`
- Add tests:
  - `parseCliArgs(['--diff'])` sets `diff: 'head'`
  - `parseCliArgs(['--diff=staged'])` sets `diff: 'staged'`
  - Default is `diff: undefined`
  - File filtering works correctly (mock git output)

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

### Task 2.8: `--debug` flag (verbose logging)

**Status**: [x] — Verified: type-check ✅, 791 tests ✅ (+2 new debug parsing tests)

**Gap**: Reference linter has verbose debug output showing which rules are loaded, which files are scanned, timing per rule.

**Plan**:
- Add `debug: v.boolean()` to `CliArgsSchema`
- Parse `--debug` flag in `parseCliArgs()`
- Add debug logging throughout `runLinter()`, all via `output.stderr()` so they don't pollute JSON/SARIF output:
  - Rule load: `[debug] Loaded 60 TypeScript rules, 14 package.json rules`
  - File discovery: `[debug] Found 347 lintable files in 3 paths`
  - Rule filtering: `[debug] After --category=typescript filter: 25 rules`
  - Per-file timing: `[debug] src/foo.ts — 12ms (5 rules)`
  - Package.json: `[debug] Running 14 package.json rules on 8 package.json files`
  - Total: `[debug] Total lint time: 1.23s`
- Update help text
- Add tests:
  - `parseCliArgs(['--debug'])` sets `debug: true`
  - Default is `debug: false`
  - Debug output goes to stderr, not stdout
  - Debug messages contain expected information

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

### Task 2.9: Workspace scope (new rule type)

**Status**: [x] — Verified: type-check ✅, 843 tests ✅ (10 workspace loader tests, 22 rule-context tests, 3 workspace rules, CLI integration with filtering)

**Gap**: Reference linter has `{ type: 'workspace' }` scope for rules that check the entire monorepo (e.g., `workspace-valid`, `no-empty-files`, `no-merge-conflicts`, `no-crlf`, `encoding-utf8`, `names-valid`). Our linter has no workspace-scoped rules.

**Sub-tasks**:

#### 2.9a: WorkspaceRule type definition
- Add `WorkspaceContextSchema` to `types.ts`:
  ```typescript
  WorkspaceContextSchema = v.strictObject({
    rootDir: v.string(),
    allFiles: v.custom<() => AsyncIterable<string>>(isFn),
    readFile: v.custom<(path: string) => Promise<string>>(isFn),
    fileExists: v.custom<(path: string) => Promise<boolean>>(isFn),
    dirExists: v.custom<(path: string) => Promise<boolean>>(isFn),
    getWorkspacePackages: v.custom<() => Promise<WorkspacePackage[]>>(isFn),
    ruleOptions: v.optional(v.record(v.string(), v.unknown())),
  })
  ```
- Add `WorkspacePackageSchema`:
  ```typescript
  WorkspacePackageSchema = v.strictObject({
    path: v.string(),
    dir: v.string(),
    packageJson: v.record(v.string(), v.unknown()),
    name: v.optional(v.string()),
  })
  ```
- Add `WorkspaceRuleSchema`:
  ```typescript
  WorkspaceRuleSchema = v.strictObject({
    id: v.string(),
    description: v.string(),
    categories: v.optional(v.array(v.string())),
    stages: v.optional(v.array(StageSchema)),
    check: v.custom<(context: WorkspaceContext) => Promise<LintResult[]>>(isFn),
    fixable: v.optional(v.boolean()),
  })
  ```
- Discriminator: workspace rules have `check` that takes `WorkspaceContext` — use a `scope: 'workspace'` literal field on the rule object to distinguish from `PackageJsonRule`
- **Files**: `framework/types.ts`

#### 2.9b: Rule loader workspace support
- Add `workspace: WorkspaceRule[]` to `LoadedRulesSchema`
- In `loadAllRules()`, classify rules with `scope: 'workspace'` into the `workspace` array
- Update `backfillDefaults()` to handle workspace rules
- Add workspace rules to `byCategory`/`byStage`/`byId` indexes
- **Files**: `framework/rule-loader.ts`, `framework/rule-loader.test.ts`

#### 2.9c: Workspace rule execution in CLI
- Add `createWorkspaceContext(rootDir)` factory function in new `framework/rule-context.ts`
- In `runLinter()`, after file rules and package rules, run workspace rules:
  - Create workspace context
  - Filter workspace rules by category/stage/ruleId flags
  - Execute each rule's `check()` and collect results
- **Files**: `cli-helpers.ts`, new `framework/rule-context.ts`, `framework/rule-context.test.ts`

#### 2.9d: Initial workspace rules (3 rules)
- Port from reference linter:
  1. `workspace/no-merge-conflicts` — scan files for unresolved merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
  2. `workspace/no-crlf` — check text files for Windows-style line endings
  3. `workspace/no-empty-files` — files must have content (>0 bytes, not just whitespace)
- Place in `rules/workspace/` directory
- Each rule gets categories `['workspace', 'safety']` and stages `['lint', 'pre-commit', 'ci']`
- **Files**: new `rules/workspace/no-merge-conflicts.ts`, `rules/workspace/no-crlf.ts`, `rules/workspace/no-empty-files.ts`, `rules/workspace/workspace-rules.test.ts`

---

### Task 2.10: RuleContext utilities

**Status**: [x] — Verified: type-check ✅, 834 tests ✅ (+22 new rule-context tests)

**Gap**: Reference linter provides a rich `RuleContext` with utilities: `allFiles()`, `readFile()`, `fileExists()`, `dirExists()`, `getWorkspacePackages()`, `search()`. Our rules import `fs` directly, which means each rule reimplements I/O error handling.

**Plan** (builds on 2.9c's `rule-context.ts`):
- `framework/rule-context.ts` provides:
  - `createWorkspaceContext(rootDir: string): WorkspaceContext`
  - Internal helpers: `getAllFiles()` async generator (recursive, skips `node_modules`/`.git`/`dist`/etc.)
  - `readFile(path)` — async read with error handling (returns content or throws)
  - `fileExists(path)` / `dirExists(path)` — async stat checks
  - `getWorkspacePackages()` — reads `pnpm-workspace.yaml`, expands globs, reads each package.json
  - `search(pattern: RegExp, files?: AsyncIterable<string>)` — async generator yielding `SearchMatch` objects
- Add `SearchMatchSchema` and `WorkspacePackageSchema` to `types.ts`
- Add comprehensive tests:
  - `getAllFiles()` skips node_modules, .git
  - `fileExists()` returns true/false correctly
  - `getWorkspacePackages()` finds packages from pnpm-workspace.yaml
  - `search()` yields matches with correct line/column
  - `createWorkspaceContext()` returns valid context object

**Files**: `framework/rule-context.ts`, `framework/rule-context.test.ts`, `framework/types.ts`

---

## TIER 3 — Major Architecture

### Task 3.1: Worker thread parallelism

**Status**: [x] — Verified: type-check ✅, 857 tests ✅ (+11 worker pool tests, +3 `--jobs` parsing tests)

**Gap**: Reference linter supports `--parallel` / `--jobs=N` with worker thread pools. Our linter processes files with `Promise.all()` but within a single thread.

**Sub-tasks**:

#### 3.1a: Worker pool infrastructure
- Create `framework/worker-pool.ts`:
  - `WorkerPool` class that manages a pool of `worker_threads.Worker` instances
  - Constructor takes `poolSize: number` (default: `os.cpus().length`)
  - `execute(task: WorkerTask): Promise<WorkerResult>` — sends task to next available worker
  - `shutdown(): Promise<void>` — terminates all workers
  - Task shape: `{ filePath: string; content: string; ruleIds: string[]; ruleOptions: Record<string, Record<string, unknown>> }`
  - Result shape: `{ results: LintResult[] }`
- Create `framework/worker-entry.ts`:
  - Worker script that receives messages, imports rules, runs `runTypeScriptRules()`, posts results back
  - Must handle rule loading once at startup (not per-task)
- Add tests:
  - Worker pool initializes with correct number of workers
  - Tasks are distributed across workers
  - Results are collected correctly
  - Pool shuts down cleanly

**Files**: new `framework/worker-pool.ts`, new `framework/worker-entry.ts`, `framework/worker-pool.test.ts`

#### 3.1b: CLI integration
- Add `jobs: v.optional(v.number())` to `CliArgsSchema`
- Parse `--jobs=N` flag (default: `os.cpus().length`, `--jobs=1` disables parallelism)
- In `runLinter()`, when `jobs > 1`:
  - Create `WorkerPool` with `jobs` workers
  - Distribute file tasks to workers instead of using `Promise.all()` in main thread
  - Collect results from all workers
  - Shut down pool after all tasks complete
- When `jobs === 1`, use existing single-threaded `Promise.all()` path
- Update help text with `--jobs` description
- Add tests:
  - `parseCliArgs(['--jobs=4'])` sets `jobs: 4`
  - Default uses CPU count
  - `--jobs=1` disables worker pool

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

### Task 3.2: Tool orchestrator system

**Status**: [x] — Verified: type-check ✅, 892 tests ✅ (+15 orchestrator tests, +18 tool transform tests, +2 `--tools` parsing tests)

**Gap**: Reference linter orchestrates 50+ external tools (oxlint, biome, tsc, svelte-check, shellcheck, hadolint, etc.) as a unified lint pipeline. Our linter runs only custom AST rules.

**Sub-tasks**:

#### 3.2a: Tool definition schema
- Create `framework/tool-orchestrator.ts` with:
  - `ExternalToolSchema`:
    ```typescript
    ExternalToolSchema = v.strictObject({
      name: v.string(),
      command: v.string(),
      args: v.array(v.string()),
      outputFormat: v.picklist(['json', 'text', 'sarif']),
      filePatterns: v.array(v.string()),
      transform: v.custom<(output: string) => LintResult[]>(isFn),
      isAvailable: v.optional(v.custom<() => Promise<boolean>>(isFn)),
    })
    ```
  - `ToolRegistry` class:
    - `register(tool: ExternalTool): void`
    - `getToolsForFile(filePath: string): ExternalTool[]`
    - `runTool(tool: ExternalTool, files: string[]): Promise<LintResult[]>`
    - `runAll(files: string[]): Promise<LintResult[]>` — runs all applicable tools in parallel
  - Availability check: `isAvailable()` runs `which <command>` to verify tool is installed
- Add tests:
  - Tool registration and lookup by file pattern
  - Tool availability detection
  - Transform function converts tool output to LintResult[]

**Files**: new `framework/tool-orchestrator.ts`, `framework/tool-orchestrator.test.ts`

#### 3.2b: Built-in tool definitions
- Create `tools/` directory with tool definitions:
  - `tools/shellcheck.ts` — shell script linting (`.sh`, `.bash`, `.zsh`)
  - `tools/hadolint.ts` — Dockerfile linting
  - `tools/yamllint.ts` — YAML validation (`.yaml`, `.yml`)
  - `tools/markdownlint.ts` — Markdown linting (`.md`, `.mdx`)
- Each tool file exports an `ExternalTool` with the appropriate `transform()` to convert tool output to `LintResult[]`
- Tools gracefully degrade: if not installed, skip with a debug message (no error)
- Add tests for each transform function (mock tool output → expected LintResult[])

**Files**: new `tools/shellcheck.ts`, `tools/hadolint.ts`, `tools/yamllint.ts`, `tools/markdownlint.ts`, `tools/tools.test.ts`

#### 3.2c: CLI integration for tool orchestrator
- Add `tools: v.boolean()` flag to `CliArgsSchema` (default: false, opt-in)
- Parse `--tools` flag
- In `runLinter()`, when `--tools` is set:
  - Load tool registry
  - Register all built-in tools
  - Run applicable tools on discovered files
  - Merge tool results with custom rule results
- Update help text
- Add integration tests

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

### Task 3.3: File hash caching for incremental runs

**Status**: [x] — Verified: type-check ✅, 914 tests ✅ (+16 cache tests, +3 `--cache` parsing tests, CLI integration with hit/miss tracking)

**Gap**: Reference linter caches file content hashes and only re-lints changed files. Significant performance improvement for repeated runs on large repos.

**Sub-tasks**:

#### 3.3a: Cache infrastructure
- Create `framework/cache.ts`:
  - `LintCacheSchema`:
    ```typescript
    LintCacheSchema = v.strictObject({
      version: v.string(),
      ruleHash: v.string(),
      entries: v.record(v.string(), v.strictObject({
        hash: v.string(),
        mtime: v.number(),
        results: v.array(LintResultSchema),
      })),
    })
    ```
  - `LintCache` class:
    - `load(cachePath: string): LintCache` — load from disk, return empty if missing/invalid
    - `save(cachePath: string): void` — write to disk
    - `get(filePath: string, content: string): LintResult[] | null` — return cached results if hash matches
    - `set(filePath: string, content: string, results: LintResult[]): void` — update cache entry
    - `computeHash(content: string): string` — fast content hash (use `crypto.createHash('md5')`)
    - `computeRuleHash(rules: Array<...>): string` — hash of rule IDs + mtimes to invalidate when rules change
  - Cache file: `.resist-lint-cache.json` in workspace root
- Add tests:
  - Cache stores and retrieves results correctly
  - Cache misses when file content changes
  - Cache misses when rule definitions change
  - Empty/corrupt cache file returns empty cache
  - Cache saves to and loads from disk

**Files**: new `framework/cache.ts`, `framework/cache.test.ts`

#### 3.3b: CLI integration for caching
- Add `cache: v.boolean()` to `CliArgsSchema` (default: false initially)
- Parse `--cache` and `--no-cache` flags
- In `runLinter()`, when `--cache` is set:
  - Load cache at start
  - Before linting each file, check cache — if hit, use cached results
  - After linting each file, update cache
  - Save cache at end
  - Report cache hit rate in summary: `(42/50 cached)`
- When `--no-cache` is set: delete cache file if it exists, run full lint
- Update help text
- Add tests

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

---

### Task 3.4: Additional file format handlers via tool orchestrator (LAST TASK)

**Status**: [x] — Verified: type-check ✅, 928 tests ✅ (+14 new tool transform tests for stylelint, taplo, actionlint, sqlfluff, ruff)

**Gap**: Reference linter handles 85+ file formats. Our linter handles 3 (`.ts`, `.svelte.ts`, `.mjs`). This task extends the tool orchestrator (Task 3.2) with additional external tool integrations.

**Plan**: Extend the tool orchestrator with additional tool definitions covering the most common file formats in the monorepo. Each tool is a thin wrapper that:
1. Checks if the tool binary is available (`which`)
2. Runs it with JSON output format when possible
3. Transforms output into `LintResult[]`

**Tools to add** (grouped by category):

**Web/Frontend**:
- `stylelint` — CSS/SCSS/Less linting (`.css`, `.scss`, `.less`)
- `svelte-check` — Svelte diagnostics (`.svelte`)

**Data/Config**:
- `taplo` — TOML validation (`.toml`)
- `actionlint` — GitHub Actions workflow validation (`.github/workflows/*.yml`)

**Infrastructure**:
- `sqlfluff` — SQL linting (`.sql`)

**Languages** (if used in monorepo):
- `ruff` — Python linting (`.py`)
- `clippy` — Rust linting (`.rs`, via `cargo clippy`)

Each tool gets:
- A file in `tools/<name>.ts`
- A transform function tested with mock output
- Graceful degradation when not installed

**Files**: `tools/*.ts`, `tools/tools.test.ts` (extended)

---

## Execution Order

| Order | Task | Description | Est. |
|-------|------|-------------|------|
| 1 | 1.1 | `byId` Map index | 30 min |
| 2 | 1.2 | `createResult()` factory | 30 min |
| 3 | 1.3 | Binary file detection | 20 min |
| 4 | 1.4 | `--quiet` flag | 20 min |
| 5 | 1.5 | `--bail` flag | 20 min |
| 6 | 2.2 | `--ignore=pattern` flag | 30 min |
| 7 | 2.3 | `--config=path` flag | 30 min |
| 8 | 2.4 | `--severity=X` override | 30 min |
| 9 | 2.1 | Multiple export formats | 1 hr |
| 10 | 2.5 | `source`/`url` on LintResult | 1 hr |
| 11 | 2.7 | `--diff` flag | 1.5 hr |
| 12 | 2.8 | `--debug` flag | 1 hr |
| 13 | 2.6 | `--format=json\|text\|sarif` | 2 hr |
| 14 | 2.10 | RuleContext utilities | 2 hr |
| 15 | 2.9 | Workspace scope (a/b/c/d) | 3 hr |
| 16 | 3.1 | Worker thread parallelism (a/b) | 4 hr |
| 17 | 3.2 | Tool orchestrator (a/b/c) | 4 hr |
| 18 | 3.3 | File hash caching (a/b) | 4 hr |
| 19 | 3.4 | Additional file format handlers | 3 hr |
