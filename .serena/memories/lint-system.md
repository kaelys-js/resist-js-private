# `@/lint` deep dive — packages/shared/config/tooling/lint

Custom multi-language linter built on `oxc-parser`. Package: `@/lint`, bin: `resist-lint` → `src/cli.ts`. Used by `pnpm qa:lint` (root).

## Three rule kinds (`framework/types.ts`)

| Kind | Discriminant | Operates on | Check shape |
|------|-------------|-------------|-------------|
| `TypeScriptRule` | has `visitor` | TS/Svelte AST nodes | `visitor: { NodeType: (node, ctx) => LintResult[] }` + optional `finalize()` |
| `PackageJsonRule` | has `check`, no `scope` | one package.json | `check(context: PackageJsonContext) → LintResult[]` |
| `WorkspaceRule` | has `scope: 'workspace'` | the whole repo | `check(context) → Promise<LintResult[]>` + optional `inputs(ctx) → Promise<readonly string[]>` for cache fingerprinting |

Common shape on every rule:
- `id: string` — e.g. `'jsdoc/require-param'`
- `description: string`
- `categories?: string[]` — defaults to `[id prefix]`
- `stages?: Stage[]` — defaults to `['lint']`. Stages: `'lint' | 'check' | 'pre-commit' | 'build' | 'ci' | 'test'`
- `fixable?: boolean`
- `optionsSchema?: OptionsSchema` — `Record<string, RuleOptionDef>` for config validation + IDE autocomplete

`TypeScriptRule` adds:
- `patterns: string[]` — file globs (e.g. `['**/*.ts', '**/*.svelte.ts']`)
- `visitor: Partial<AstVisitor>` — node-type → handler

## Visitor pattern (`framework/oxc-runner.ts`)

`walkNode(node, context)` performs depth-first AST walk. For each node it visits, it calls `context.rule.visitor[node.type]?.(node, context)` and collects returned `LintResult[]`.

`AstVisitor` declares ALL supported node types as optional handlers — both JS/TS (`Program`, `FunctionDeclaration`, `CallExpression`, `ThrowStatement`, `TSAsExpression`, `TSUnionType`, etc.) AND Svelte template (`Fragment`, `RegularElement`, `Component`, `BindDirective`, `OnDirective`, `EachBlock`, `IfBlock`, `SnippetBlock`, `RenderTag`, `SvelteHead`, `SvelteWindow`, etc.). Look at `framework/types.ts` `AstVisitorSchema` for the full list — ~80 node types.

`VisitorContext` (passed to every visitor):
```ts
{
  file: string,                    // absolute path
  content: string,                 // full file contents
  ast: AstNode,                    // root node
  imports: ImportInfo[],           // all imports (extracted by extractImports)
  comments: CommentInfo[],         // line+block comments
  getNodeText(node): string,       // source text for a node
  isImportedFrom(id, mod): boolean, // is `id` imported from `mod`?
  rule: TypeScriptRule,            // self-reference (current rule)
  ruleOptions?: Record<string, unknown>,  // per-rule config
  templateAst?: AstNode,           // Svelte Fragment root (svelte files only)
  ruleState?: Map<string, unknown>, // per-rule per-file scratch (script ↔ template coordination)
  originalContent?: string,        // pre-extraction content (for HTML inspection)
}
```

`oxc-runner.ts` exports:
- `parseSync(...)`, `runTypeScriptRules(...)`
- `walkNode(node, context)` — DFS walker
- `extractImports(ast)` → `ImportInfo[]`
- `extractCodeFences(content)` — for embedded-code rules
- `extractScriptBlocks(svelteContent)` — `<script>` extraction with source-map offset bookkeeping

## Fix system (`framework/types.ts`)

Three fix types:

```ts
type LintFix = {
  range: { start: number, end: number },  // byte offsets
  text: string,                            // replacement (empty = delete)
}

type FileOpFix =
  | { type: 'rename', from: string, to: string }
  | { type: 'move', from: string, to: string }
  | { type: 'create', path: string, content: string }

type NoOpFix = LintFix & { readonly __brand: 'NO_OP' }
const NO_OP_FIX: NoOpFix = { range: {start:0,end:0}, text: '' } as NoOpFix
type RealLintFix = (LintFix & { readonly __brand?: never }) | FileOpFix
```

Rule of thumb:
- `LintFix` — small in-file edits (most rules)
- `FileOpFix` — file-level (rename for naming rules, create for missing-file rules, move for relocation rules)
- `NO_OP_FIX` — placeholder ONLY for rules that detect-but-can't-fix. **A rule with `fixable: true` MAY NOT use `NO_OP_FIX`** — `NoOpFix` is not assignable to `RealLintFix`, so `createFixableResult(...)` rejects it at compile time.

Two factory helpers:
- `createResult(ruleId, file, line, col, severity, message, opts?)` — fix defaults to `NO_OP_FIX`
- `createFixableResult(ruleId, file, line, col, severity, message, opts)` — `opts.fix: RealLintFix` REQUIRED

Type guards:
- `isFileOpFix(fix)` — has `type` discriminant
- `isTextFix(fix)` — has `range` and `text`, no `type`

`LintResult` is the canonical diagnostic shape:
```ts
{
  file, line, column,
  endLine?, endColumn?,
  severity: 'error' | 'warning' | 'info',
  message: string,
  ruleId: string,
  tip?, example?, source?, url?, description?: string,
  fix: LintFix | FileOpFix,        // REQUIRED — every result MUST include a fix
}
```

## CLI flow (`cli.ts` → `cli-helpers.ts` → `framework/tool-orchestrator.ts`)

1. **`src/cli.ts`** — argv entry; reads stdin (if any), calls `runLinter`, fatal-exit on crash. (Bin: `resist-lint`.)
2. **`src/cli-helpers.ts`** — surface for the CLI:
   - `parseCliArgs(argv)` → parsed options
   - `runLinter(opts)` → main runner
   - `applyFixes(results)`, `applyFileOps(results)` — fix application
   - `collectFiles(opts)`, `collectPackageJsonFiles(opts)`, `getPackageMap()` — file discovery
   - `isBinaryFile(path)`, `getGitChangedFiles()` — discovery helpers
   - `runPkgRules(...)`, `processBailTasks(...)`
   - `writeJsonSchema(...)`, `applyRuleOptionsOverrides(...)`, `buildHelpText(...)`
   - Constants: `WORKSPACE_RULE_DOMAINS`, `BINARY_EXTENSIONS`
3. **`src/framework/tool-orchestrator.ts`** — coordinates external tools + per-file rules:
   - `ToolRegistry` class
   - `findWorkspaceRoot()`, `mapWithConcurrency()`, `matchesPattern()`
   - `ExternalTool` (per-file) and `WorkspaceTool` (whole-repo) interfaces
4. **Workers** — `framework/worker-pool.ts` `WorkerPool` class spins up `framework/worker-entry.ts` workers for parallel rule execution.

## Cache layer (`framework/cache.ts`)

`LintCache` class with file-fingerprint based caching:
- `CACHE_VERSION` (bumped on schema change)
- `CACHE_FILENAME` — disk location
- `CacheEntry`, `ToolCacheEntry` — entry shapes
- For `WorkspaceRule`s: rule's `inputs(ctx) → readonly string[]` declares the files whose `(path, mtime, size)` fingerprint determines output → cache hit if fingerprint matches.
- Rules whose output depends on env vars / network / git state should NOT declare `inputs` — they always re-run.

## Rule auto-loader (`framework/rule-loader.ts`)

`loadAllRules(strings: LintStrings) → Promise<LoadedRules>` — module-level cached promise. Discovers rules by:
1. Recursively `readdir(src/rules/)` for `.ts` files
2. Skip files: `all.ts`, `index.ts`, `*.test.ts`, `*.spec.ts`, `*.d.ts`
3. Import each one, classify by default export shape:
   - `visitor` → TypeScriptRule
   - `scope === 'workspace'` → WorkspaceRule
   - `check` only → PackageJsonRule
4. `LoadedRules` shape: `{ byCategory, byId, byStage, packageJson, typescript, workspace }` (each a Map or array)

## Other framework files

- `cache.ts` — see above
- `comment-helpers.ts` — comment parsing utilities
- `exec.ts` — process exec wrapper for external tools
- `file-fingerprint.ts` — `(path, mtime, size)` fingerprinter
- `formatters.ts` — output formatting (`formatResults`, `formatText`/`formatJson`/`formatCompact`/`formatSarif`/`formatGitHub`/`formatJunit`); `OutputFormat` type
- `missing-tool.ts` — handle missing-tool errors gracefully
- `oxc-runner.ts` — the AST runner (above)
- `rule-context.ts` — context construction for visitors + WorkspaceContext
- `rule-loader.ts` — auto-loader (above)
- `source-reader.ts` — file reading with caching
- `svelte-template.ts` — Svelte template AST extraction
- `tool-orchestrator.ts` — external tool coordination
- `types.ts` — all type definitions
- `worker-entry.ts` — child-process worker entry point
- `worker-pool.ts` — `WorkerPool` for parallel execution

## 18 rule categories (632 rule files in `src/rules/`)

For each: `<category>-rules.test.ts` is the per-category test file; `_*.ts` files are shared utilities (helpers/fixtures).

| Category | Sample rules |
|----------|-------------|
| `comments` | `no-lint-disable.ts`, `require-blank-line-groups.ts` |
| `complexity` | `array-size-warning.ts`, `_utils.ts` |
| `directives` | `max-suppressions-per-file.ts`, `no-biome-ignore.ts` |
| `hygiene` | `no-bare-catch.ts`, `no-dead-locale-keys.ts` |
| `imports` | `no-barrel-files.ts`, `no-js-extension.ts`, `no-raw-json.ts`, `no-raw-node-imports.ts`, `no-reexport.ts`, `no-relative-imports.ts`, `require-import-groups.ts` |
| `jsdoc` | `param-type-match.ts`, `require-example.ts` |
| `naming` | `camel-case-vars.ts`, `constant-screaming-case.ts` |
| `package` | `names-valid.ts`, `no-git-deps.ts` (+ `_json-fix-helpers.ts`) |
| `plans` | `files-exist.ts`, `no-empty-plan-sections.ts`, `no-incomplete-tasks.ts` |
| `primitives` | `division-by-zero.ts`, `no-array-hole.ts`, `no-array-index-string.ts` |
| `result` | `check-before-access.ts`, `no-ignore-result.ts`, `no-redundant-ok-guard.ts`, `no-result-fallback.ts`, `no-ternary-fallback.ts`, `require-ok-return.ts`, `require-result-type.ts`, `validate-function-input.ts` |
| `svelte5` | `component-naming.ts`, `no-create-event-dispatcher.ts`, `no-effect-mutation.ts`, `no-inline-styles.ts`, `no-legacy-event-handlers.ts`, `no-legacy-props.ts`, `no-legacy-reactive-statements.ts`, `no-legacy-slots.ts`, `no-reactive-class-properties.ts` (+ `_svelte-helpers.ts`) |
| `svelte5-config` | `cloudflare-adapter-settings.ts` (+ `_config-ast.ts`) |
| `testing` | `multi-export-fixture.ts`, `named-export-fixture.ts`, `require-colocated-tests.ts` |
| `typescript` | `lint-embedded-strings.ts`, `no-bare-as-cast.ts`, `no-bare-data-types.ts`, `no-builtin-types.ts`, `no-default-params.ts`, `no-empty-catch.ts`, `no-generic-function-type.ts`, `no-module-side-effects.ts`, `no-throw.ts`, `no-union-null.ts` (and more) |
| `valibot` | `await-async-parse.ts`, `colocate-schema-type.ts`, `consistent-infer.ts` |
| `vscode` | `no-hardcoded-brand.ts`, `no-unlocalized-strings.ts` (+ `_shared-inputs.ts`) |
| `workspace` | `cli-tools-help-version.ts`, `detect-undeclared-dependencies.ts` (+ `_sync-helpers.ts`) |

### Pattern by example: `typescript/no-throw.ts`
```ts
const rule: TypeScriptRule = {
  id: 'typescript/no-throw',
  description: 'Forbids throw statements — use return err() instead',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript', 'safety', 'result'],
  stages: ['lint', 'pre-commit', 'ci'],
  fixable: true,
  visitor: {
    ThrowStatement(node, context) {
      if (isIntegrationBoundaryThrow(node, context)) return [];
      // ... return [createFixableResult(...)] or [createResult(...)]
    },
  },
};
export default rule;
```
- Default export is the rule (auto-loader picks it up)
- File-private helpers (e.g. `hasIntegrationBoundaryComment`, `isIntegrationBoundaryThrow`) live above the rule
- Visitor handlers are typed-tight: `(node: AstNode, context: VisitorContext) => LintResult[]`

## 115 external tool wrappers (`src/tools/`)

Each tool exports a definition (`fooTool: ExternalTool` or `fooTool: WorkspaceTool`) + a transformation function (`transformFooOutput(output, strings) → LintResult[]`).

`registry.ts` imports them all and exports `ALL_TOOLS`, `ALL_WORKSPACE_TOOLS`.

### Three representative kinds

**1. Workspace-tool — `tools/knip.ts`**
- Runs once on the whole workspace
- knip emits JSON (`{ files: [], dependencies: [], exports: [...] }`)
- `transformKnipOutput(output, strings)` parses JSON → `LintResult[]` (one per unused file/dep/export)
- Each result gets `ruleId: 'knip/unused-export'` etc.

**2. Per-file tool — `tools/shellcheck.ts`**
- Runs per `.sh`/`.bash`/`.zsh` file
```ts
export const shellcheckTool: ExternalTool = {
  command: 'shellcheck',
  args: ['--format=json', '--severity=style'],
  filePatterns: ['**/*.sh', '**/*.bash', '**/*.zsh'],
  isAvailable() { return isCommandAvailable('shellcheck'); },
  // (transform function, name, etc.)
};
```
- Maps `level` → `severity`, builds `ruleId: 'shellcheck/SC<code>'`, links to `https://www.shellcheck.net/wiki/SC<code>` via `tip`

**3. Language-aware tool — `tools/ruff.ts`**
- Runs on Python files; native binary; JSON output
- Same shape as shellcheck — define ExternalTool + transformer

### Tool sample (alphabetical from registry)
actionlint, asciidoc, astro, attw, batch, bazel, cargo-clippy, cargo-toml, checkstyle, clang-tidy, cmake, codeowners, codeowners-checker, commitlint, conf, crystal, csv, cue, dependabot, dependency-cruiser, dhall, dmd, docker-compose, dotenv-linter, dotnet-format, editorconfig, elixir-credo, erlc, fantomas, fish, gitattributes, github-funding, github-issue-template, github-pr-template, gitleaks, go-mod, golangci-lint, graphql, groovy-lint, hadolint, handlebars, hcl, helm-lint, helm-values, hlint, htmlhint, ignore-files, ini, jscpd, jsonlint, jsonnet, julia, justfile, knip, ktlint, kube-linter, kubeconform, latex (chktex), license-checker, lockfile-lint, ls-lint, luacheck, madge, makefile (checkmake), markdownlint, move, mypy, nim, ninja, nix, nomad, npmrc, nvmrc, ocaml, oxlint, package-json-validator, packer, perl, php, powershell, properties, protobuf, publint, pyproject-toml, reason, rscript, rstcheck, rubocop, ruff, scalafmt, sentinel, shellcheck, solidity, sort-package-json, sqlfluff, stylelint, svelte-check, svglint, swiftlint, syncpack, taplo, terraform, thrift, trufflehog, tsgo, typos, vb, vlang, vyper, wat, xml, yamllint, zig, zsh.

Mock test files exist for `svelte-check-mocked.test.ts`, `tsgo-mocked.test.ts` (heavy tools that need fixtures rather than real invocation).

## Config (`src/config/schema.ts`)
- `LintConfigSchema`, `OverrideSchema`, `RuleSeveritySchema`
- `loadConfig(path?)` — discover and load `.lint.json` (or whatever `CONFIG_FILENAME` is)
- `validateConfig(raw)`
- `resolveRuleSeverity(config, ruleId, file)` — config + override resolution
- `isRuleEnabledAnywhere(config, ruleId)`
- `generateJsonSchema()` — emits the JSON schema for IDE config completion

## Locale (`src/locale/`)
- `registry.ts` — `LOCALE_REGISTRY`, `getAvailableLocales()`, `resolveLocale(name)`
- `schema.ts` — Lint*StringsSchemas (Cli/Debug/Error/Flag/ListRules/Output/Schema/Tool), `format(template, values)`
- `locales/` — per-locale strings (de/en/es/fr/ja/ko/zh)

## Constants (`src/constants.ts`)
- `CONFIG_FILENAME` — name of lint config on disk
- `LINTER_NAME` — display name
- `SCHEMA_FILENAME` — name of generated JSON schema

## How to add a new rule

1. **Create file** at `src/rules/<category>/<rule-name>.ts`
2. **Define rule** as a `TypeScriptRule` (or `PackageJsonRule`/`WorkspaceRule`)
3. **Default-export it**: `export default rule;`
4. **Pattern**: leading file-private helpers, then the rule constant, then default export
5. **Stages**: include `'lint'` (always) and any of `'pre-commit'`, `'ci'`, etc.
6. **`fixable: true`** if you provide real fixes — then use `createFixableResult` (compile-time enforcement)
7. **Add a test**: extend `<category>-rules.test.ts` (don't make a per-rule test file)
8. **Run**: `pnpm -w exec vitest run --project lint`
9. **Auto-discovery is automatic** — no manual registration needed (auto-loader walks the dir)

## How to add a new external tool

1. **Create file** at `src/tools/<tool-name>.ts`
2. **Export** `<toolName>Tool: ExternalTool | WorkspaceTool`
3. **Register** in `src/tools/registry.ts` (manual import + add to `ALL_TOOLS` or `ALL_WORKSPACE_TOOLS`)
4. **Add a transformer** function `transform<ToolName>Output(output, strings) → LintResult[]` (export it for testing)
5. **Add a test** to `src/tools/tools.test.ts`

## Tests
Vitest project: `lint` (pool=threads). Major test files at `src/`:
- `api.test.ts`, `cli.test.ts`, `cli-helpers.test.ts`, `cli-helpers-mocked.test.ts`
- `cli-run-linter-{1..5,stdin}.test.ts` — split runner tests
- Per framework module: `cache.test.ts`, `file-fingerprint.test.ts`, `formatters.test.ts`, `missing-tool.test.ts`, `oxc-runner.test.ts`, `rule-context.test.ts`, `rule-loader.test.ts`, `source-reader.test.ts`, `tool-orchestrator.test.ts`, `worker-pool.test.ts`
- Per category: `<category>-rules.test.ts`
- All tools: `tools.test.ts`
