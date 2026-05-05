# Lint External Tools — wrapper anatomy

> Captured 2026-05-05. Path: `packages/shared/config/tooling/lint/src/tools/`. Establishes the external-tool wrapper pattern via 4 representative tools. Companion to `lint-system` (framework + categories). Do not duplicate orchestrator content.

## Two kinds of tools (`framework/tool-orchestrator.ts`)

| Kind | Trigger | Per-invocation scope | Example |
|------|---------|----------------------|---------|
| `ExternalTool` | per-file (matched by `filePatterns`) | ONE file per process | shellcheck (.sh), ruff (.py) |
| `WorkspaceTool` | once per `runLinter` invocation | whole repo (or whole package) | knip, svelte-check, tsgo |

Common shape:
- `name: string` — tool id (used in cache keys, `ruleId` prefix).
- `command: string` — executable name (e.g. `'shellcheck'`, `'ruff'`).
- `args: readonly string[]` — fixed CLI flags (output format etc.).
- `outputFormat?: 'json' | 'text'`.
- `isAvailable(): boolean` — typically `isCommandAvailable(command)` (which-style lookup).
- `transform(output: string, strings: LintStrings): LintResult[]` — the parser.

`ExternalTool` adds `filePatterns: string[]`. `WorkspaceTool` may add `inputs?(ctx)` for cache fingerprinting + a custom `run(opts)` that does whole-repo orchestration.

## Pattern recap (every tool file)

1. JSDoc `@module` describing what tool + plan reference (some).
2. Top of file: any private types (e.g. `KnipIssue`).
3. Exported `transformXOutput(output, strings) → LintResult[]` (always exported for direct unit testing).
4. Exported tool definition `<name>Tool: ExternalTool | WorkspaceTool`.

The tool is registered manually in `tools/registry.ts` (see "Registry mechanics" below) — there's no auto-loader for tools (unlike rules).

## 4 representative tools

### 1. Workspace-tool — `tools/knip.ts`

**Purpose**: detects unused exports/dependencies/files via knip CLI (single workspace pass).

**Key types** (file-private):
```ts
type KnipIssue = {
  type: string;       // 'exports' | 'dependencies' | 'files' | 'types' | ...
  filePath: string;
  symbol?: string;
  line?: number;
  col?: number;
};
```

**`transformKnipOutput(output, strings)`**:
- Parses knip's JSON: `{ files: [...], dependencies: [...], issues: [...] }`.
- For each `files[]` entry → `createResult('knip/unused-file', filePath, 1, 1, 'warning', strings.tools.knipUnusedFile, { tip: strings.tools.knipUnusedFileTip })`.
- For each `issues[]` entry → ruleId pattern `'knip/unused-${issueType}'` (e.g., `'knip/unused-export'`).
- `try { JSON.parse(...) } catch { return [] }` — silent failure on malformed output (prevents linter from crashing on tool quirks).

**`knipTool: WorkspaceTool`**: typical workspace-tool shape — runs once, parses JSON, emits results across many files.

### 2. Per-file tool — `tools/shellcheck.ts`

**Purpose**: lints `.sh`/`.bash`/`.zsh` files via `shellcheck`.

**`transformShellcheckOutput(output, strings)`**:
- ShellCheck JSON shape: `[{ file, line, column, endLine, endColumn, level, code, message }]`.
- Severity mapping: `level === 'error'` → `'error'`; `level === 'info'` → `'info'`; default `'warning'`.
- ruleId pattern: `` `shellcheck/SC${code}` `` (e.g., `shellcheck/SC2086`).
- Tip uses `format(strings.tools.toolSeeDocsAt, { url: 'https://www.shellcheck.net/wiki/SC<code>' })` to build a docs link via the locale system.

**`shellcheckTool: ExternalTool`**:
```ts
{
  name: 'shellcheck',
  command: 'shellcheck',
  args: ['--format=json', '--severity=style'],
  filePatterns: ['**/*.sh', '**/*.bash', '**/*.zsh'],
  outputFormat: 'json',
  isAvailable: () => isCommandAvailable('shellcheck'),
  transform: transformShellcheckOutput,
}
```

### 3. Language-aware tool — `tools/ruff.ts`

**Purpose**: lints Python files via `ruff` (Astral's native-binary linter).

**`transformRuffOutput(output, strings)`**:
- Ruff JSON shape: `[{ code, message, filename, location: { row, column }, end_location: { row, column } }]`.
- Always emits `severity: 'warning'` (Ruff doesn't expose severity in JSON).
- ruleId: `` `ruff/${code}` ``. Tip URL: `https://docs.astral.sh/ruff/rules/<code>`.

**`ruffTool: ExternalTool`**: `args: ['check', '--output-format', 'json']`, `filePatterns: ['**/*.py']`.

Identical to `shellcheck` in shape — establishes the "per-file native-binary linter" template that ~80% of tools in the registry follow.

### 4. Mocked workspace tool — `tools/svelte-check.ts` (+ `svelte-check-mocked.test.ts`)

**Purpose**: `svelte-check` is a heavy compiler-driven type-checker; running it in tests would be slow and flaky. The mocked test file (`svelte-check-mocked.test.ts`) sits alongside the real `svelte-check.ts` and exercises only the `transformSvelteCheckOutput` parser against fixture stdout.

**Distinguishing features** of svelte-check + tsgo wrappers (the only tools with mocked tests):
- They depend on the project's tsconfig + node_modules graph (heavy I/O).
- They run `execFileAsync` with custom env to surface diagnostics in a parseable format.
- Their `inputs(ctx)` declarations exclude `.svelte-check/` (svelte-check's own incremental cache — derived data) and other build-output dirs:
  ```ts
  const FINGERPRINT_SKIP_DIRS = new Set([
    'node_modules', '.svelte-kit', '.svelte-check',
    'dist', '.turbo', '.cache', 'coverage',
  ]);
  ```
- They use `mapWithConcurrency(items, TOOL_CONCURRENCY, fn)` to parallelize per-package invocations.
- They use `missingToolResult(...)` to emit a standardized "tool not installed" diagnostic instead of crashing.
- `tsgo-mocked.test.ts` exercises the tsgo (oxc-equivalent typechecker) parser similarly.

These two are the only WorkspaceTools alongside `knip` in `ALL_WORKSPACE_TOOLS`.

## Registry mechanics (`tools/registry.ts`)

- Manual import for every tool: `import { actionlintTool } from '@/lint/tools/actionlint.ts';` (~115 lines).
- Two readonly arrays exported:
  - `ALL_TOOLS: readonly ExternalTool[]` — every per-file tool (~113 entries: actionlint, asciidoc, astro, attw, batch, bazel, cargo-clippy, cargo-toml, checkmake, checkstyle, chktex, clang-tidy, cmake, codeowners, codeowners-checker, commitlint, conf, credo, crystal, csv, cue, dependabot, dependency-cruiser, dhall, dmd, docker-compose, dotenv-linter, dotnet-format, editorconfig, erlc, fantomas, fish, gitattributes, github-funding, github-issue-template, github-pr-template, gitleaks, go-mod, golangci-lint, graphql, groovy-lint, hadolint, handlebars, hcl, helm-lint, helm-values, hlint, htmlhint, ignore-files, ini, jscpd, jsonlint, jsonnet, julia, just, knip, ktlint, kube-linter, kubeconform, license-checker, lockfile-lint, ls-lint, luacheck, madge, markdownlint, move, mypy, nim, ninja, nix, nomad, npmrc, nvmrc, ocaml, oxlint, package-json-validator, packer, perl, php, powershell, properties, protobuf, publint, pyproject-toml, reason, rscript, rstcheck, rubocop, ruff, scalafmt, sentinel, shellcheck, solhint, sort-package-json, sqlfluff, stylelint, svglint, swiftlint, syncpack, taplo, terraform, thrift, trufflehog, typos, vb, vlang, vyper, wat, xml, yamllint, zig, zsh).
  - `ALL_WORKSPACE_TOOLS: readonly WorkspaceTool[] = [svelteCheckTool, tsgoTool]` — two heavy tools that operate on the whole repo.

(Note: `knipTool` is in `ALL_TOOLS` despite being a workspace-style tool because it returns per-file results from a single invocation — it lives in the per-file pool because the orchestrator runs it once and distributes results, not because it pattern-matches files.)

`ToolRegistry` (in `framework/tool-orchestrator.ts`) consumes these arrays and dispatches per file (matching `filePatterns`) or per workspace.

## Patterns shared across all tools

1. **JSON output preferred** — `outputFormat: 'json'` + `try/catch` around `JSON.parse`. Silent return `[]` on parse failure prevents one tool's quirk from breaking the whole lint run.
2. **`createResult(...)` always used** — never `createFixableResult` (external tools don't supply fixes; that requires AST integration).
3. **ruleId pattern: `'<toolname>/<diagnostic-code>'`** — e.g., `'shellcheck/SC2086'`, `'ruff/E501'`, `'knip/unused-file'`.
4. **Docs link via `tip`** — `tip: format(strings.tools.toolSeeDocsAt, { url: '...' })` — every tool diagnostic links to the upstream rule's docs page so users can investigate.
5. **`isAvailable()` is sync** — `isCommandAvailable(command)` does a synchronous `which`-style lookup, cached internally.
6. **Severity defaults to `warning`** — only escalated when the tool's own severity field maps to `error`.

## How to add a new external tool

1. **Create file** `src/tools/<tool-name>.ts`.
2. **Export** `transform<ToolName>Output(output, strings) → LintResult[]` — the parser (always exported for unit testing).
3. **Export** `<toolName>Tool: ExternalTool | WorkspaceTool`.
4. **Manually import + register** in `src/tools/registry.ts` (alphabetical order):
   - Add `import { fooTool } from '@/lint/tools/foo.ts';`.
   - Add `fooTool` to `ALL_TOOLS` (or `ALL_WORKSPACE_TOOLS`) — also alphabetical.
5. **Add a test** to `src/tools/tools.test.ts` (or a `*-mocked.test.ts` for heavy tools).
6. **Add locale strings** to `src/locale/locales/en.ts` if the tool emits messages or tips that need i18n.
7. **Run**: `pnpm -w exec vitest run --project lint`.

## Cross-references

- `framework/tool-orchestrator.ts` — `ExternalTool` / `WorkspaceTool` interfaces, `ToolRegistry`, `mapWithConcurrency`, `TOOL_CONCURRENCY`, `isCommandAvailable`, `missingToolResult`, `findWorkspaceRoot`, `matchesPattern`.
- `framework/exec.ts` — `execFileAsync(...)` wrapper used by all tool runners (consistent timeout + env handling).
- `framework/file-fingerprint.ts` — `fingerprintFiles(paths) → string` for cache invalidation.
- `framework/cache.ts` — `LintCache` integrated with tool runs via `inputs(ctx)`.
- `locale/schema.ts` — `LintStrings` (passed as 2nd arg to every transform); `format(template, values)` for parametric messages.
