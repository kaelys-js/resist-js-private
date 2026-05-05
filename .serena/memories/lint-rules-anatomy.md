# Lint Rules — One-rule-per-category anatomy

> Captured 2026-05-05. Path: `packages/shared/config/tooling/lint/src/rules/`. Establishes the AST-visitor pattern via 18 representative rules. Companion to `lint-system` (framework + categories). Do not duplicate framework internals here.

## Pattern recap (every rule file)

1. Top-of-file JSDoc `@module` block describing rule id + intent.
2. File-private constants/helpers (regexes, lookup tables, predicates).
3. The rule constant typed `TypeScriptRule | PackageJsonRule | WorkspaceRule`.
4. `export default rule;` (the auto-loader picks up default exports under `src/rules/**`).

Discriminants:
- **TypeScriptRule** — has `visitor: { NodeType: (node, ctx) => LintResult[] }`. Walked by `oxc-runner.ts:walkNode` against TS/Svelte AST.
- **PackageJsonRule** — has `check(context: PackageJsonContext) → LintResult[]`. One pass per package.json.
- **WorkspaceRule** — has `scope: 'workspace'` + `check(context: WorkspaceContext) → Promise<LintResult[]>`. Optional `inputs(ctx) → readonly string[]` declares fingerprinted files for the cache.

`createResult(...)` defaults `fix` to `NO_OP_FIX`. `createFixableResult(...)` REQUIRES `fix: RealLintFix` (compile-time enforced — `NoOpFix` is not assignable to `RealLintFix`).

## 18 representative rules

### 1. `comments/no-lint-disable.ts`
- **Detects**: every `eslint-disable`, `oxlint-ignore`, `oxlint-disable`, `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`, `/* global */` comment.
- **Helpers**: `DISABLE_PATTERNS` (regex+label list with `blockOnly?` flag for `/* global */`), `DEFAULT_ALLOWED_TARGETS = ['max-lines', 'max-lines-per-function']` (CLAUDE.md exempts the `max-lines` family).
- **Visitor**: `Program` (one pass — walks `context.comments` rather than AST nodes, since comments are stripped from the AST).
- **Fix shape**: `LintFix` — full-line delete. `lineStarts[idx]..lineStarts[idx+1]` → `''`.
- **Stages**: `lint`, `ci`. Patterns `**/*.ts`, `**/*.svelte.ts`, `**/*.mjs`.
- **Notable**: `optionsSchema.allowedTargets` (string[]) overrides the default exception list.

### 2. `complexity/no-await-in-loop.ts`
- **Detects**: `await` inside any loop body — runs sequentially instead of in parallel.
- **Helper**: `findAwaitInBody(node)` from `_utils.ts` (per-category shared helpers prefix `_`).
- **Visitor**: `ForStatement`, `ForInStatement`, `ForOfStatement`, `WhileStatement`, `DoWhileStatement` — each delegates to `checkLoop`.
- **Fix shape**: `NO_OP_FIX` (suggests Promise.all in `tip`, no auto-rewrite).
- **Severity**: `warning`. Stages: default `lint`.

### 3. `directives/no-biome-ignore.ts`
- **Detects**: `// biome-ignore` and `/* biome-ignore */` comments.
- **Helper**: `deleteLineFix(lineIndex, lineStarts, content)` — common pattern for line-deletion fixes.
- **Visitor**: scans `context.comments`, not AST nodes.
- **Fix shape**: `LintFix` — full-line delete.

### 4. `hygiene/no-bare-catch.ts`
- **Detects**: `catch {}` — bare catch swallows the error.
- **Helper**: `buildCatchParamFix(node, source)` — finds the `catch` keyword + opening brace, inserts `(error: unknown)` between them.
- **Visitor**: `CatchClause` — checks `node.param` is null/undefined.
- **Fix shape**: `LintFix` — text insertion. Becomes `catch (error: unknown) {`.
- **`fixable: true`** — uses `createFixableResult`-style path; `NO_FIX` constant aliases `NO_OP_FIX` for declarations of "can't fix".

### 5. `imports/no-relative-imports.ts`
- **Detects**: any `from './foo'` or `from '../bar'` import/export.
- **Helper**: `checkRelativeSource(node, ctx)` — shared between import + 2 export forms.
- **Visitor**: `ImportDeclaration`, `ExportNamedDeclaration`, `ExportAllDeclaration`.
- **Fix shape**: `NO_OP_FIX` (rewrite to `@/...` requires path resolution context the rule doesn't carry).
- **Tip**: "Replace with an @/ workspace alias".

### 6. `jsdoc/require-param.ts`
- **Detects**: function declarations with parameters but no `@param` JSDoc tag (or mismatched names).
- **Helpers**: `getJsDoc(node, content)` walks backward from `node.start` for the trailing `*/...../**` comment block; `getJsDocEndOffset(node, content)` finds the closing offset for fix insertion.
- **Visitor**: `ExportNamedDeclaration` (with FunctionDeclaration child), `FunctionDeclaration`.
- **Fix shape**: `LintFix` — text insertion for missing `@param` lines.
- **Imports**: `import * as v from 'valibot'` — uses Valibot for option validation.

### 7. `naming/pascal-case-types.ts`
- **Detects**: type aliases, interfaces, enums whose name is not `PascalCase`.
- **Pattern**: `PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]*$/`.
- **Helper**: file-private `createResult(node, id, kind, ctx)` (shadows the framework's `createResult` — nice gotcha).
- **Visitor**: `TSTypeAliasDeclaration`, `TSInterfaceDeclaration`, `TSEnumDeclaration`.
- **Fix shape**: `NO_OP_FIX` (renaming a type would require all references — too risky for autofix).
- **Note**: in `.resist-lint.jsonc` most `naming/*` rules are off (Biome handles).

### 8. `package/names-valid.ts` (WorkspaceRule)
- **Detects**: missing/empty/non-string/invalid-pattern/duplicate package.json `name` fields.
- **Pattern**: `VALID_NAME_PATTERN = /^(@([a-z0-9-~{][a-z0-9-._~}]*)?/)?[a-z0-9-~][a-z0-9-._~/]*$/`.
- **Helpers**: `findLineNumber(content, key)` — scans for `"name"` substring; `diagnoseNameIssues(name)` collects specific failure reasons (uppercase, leading `.`/`_`, spaces, invalid chars).
- **Inputs**: `ctx.getWorkspacePackages().map(p => p.path)` — fingerprints every package.json.
- **Check**: parallel `Promise.all` over `ctx.readFile(pkg.path)` (avoids `complexity/no-await-in-loop`), then sequential validation pass building a `seenNames: Map<string, string>` for dup detection.
- **Fix shape**: `NO_OP_FIX` (renaming requires manual review).
- **Stages**: `lint`, `ci`. Categories: `package`, `naming`.

### 9. `plans/no-incomplete-tasks.ts` (WorkspaceRule)
- **Detects**: plan files (`docs/plans/*.md`) older than `maxAgeDays` with unfinished `- [ ]` tasks.
- **Helpers**: `discoverPlanFiles(ctx)`, `parsePlan(...)`, `parsePlanDate(...)` from `plan-parser.ts` (shared with other plans/* rules).
- **Inputs**: plan files + a synthetic `__daily_rollover__/<UTC date>` entry — invalidates the cache once per day so the "older than N days" calculation re-runs daily.
- **Default `maxAgeDays: 7`**. Configurable via `ruleOptions.maxAgeDays`.
- **Stages**: `ci` only (not `lint`).

### 10. `primitives/no-array-hole.ts`
- **Detects**: array literals with elision (`[1, , 3]`) — array holes behave differently from `undefined`.
- **Visitor**: `ArrayExpression` — iterates `elements`, flags any `null` (oxc encodes elision as null in the array).
- **Fix shape**: `NO_OP_FIX` (suggests explicit `undefined` or `Array.from`/`.fill`).
- **Severity**: `warning`. Stages: `lint`, `check`. Patterns: `**/*.ts`, `**/*.svelte.ts`, `**/*.mjs`.

### 11. `result/check-before-access.ts`
- **Detects**: `.data` or `.error` access on a Result variable without prior `.ok` check.
- **Patterns**: `RESULT_NAME_PATTERNS` (regex set: `/[Rr]esult$/`, `/[Pp]arsed$/`, `/[Vv]alidated$/`, `/^cached$/`, `/^existing$/`, `/^found$/`, `/^loaded$/`, `/^fetched$/`, `/^checked$/`, `/^response$/`); `CHECK_PATTERNS` (regexes for `.ok` checks).
- **Helper**: `isLikelyResultVariable(name, content)` — primary detection via `Result<...>` type annotation regex; falls back to name-pattern matching.
- **Visitor**: `MemberExpression` — checks if the object is a Result variable and whether `.ok` was checked between the variable's declaration and this access (source-text scan).
- **Fix shape**: `NO_OP_FIX`.
- **Note**: One of the most complex rules — scans surrounding source text rather than just the AST node.

### 12. `svelte5/no-create-event-dispatcher.ts`
- **Detects**: `import { createEventDispatcher } from 'svelte'` + usage. Svelte 5 uses callback props.
- **Visitor**: `ImportDeclaration` (filters `source.value === 'svelte'` + matching specifier).
- **Fix shape**: `LintFix` — if the only specifier, delete the entire import; otherwise remove just the specifier.
- **Patterns**: `**/*.svelte`. Categories: `svelte5`.
- **Plan reference**: "Phase 49 — Svelte 5 Runes Lint Rules".

### 13. `svelte5-config/cloudflare-adapter-settings.ts`
- **Detects**: `svelte.config.{ts,js}` using `@sveltejs/adapter-cloudflare` without an explicit `routes: {...}` config (empty `{}` insufficient).
- **Helpers** from `_config-ast.ts`: `getDefaultExportObject(ast)`, `getNestedValue(obj, key)`, `getAdapterImport(imports)`, `CLOUDFLARE_ADAPTERS` (set of cloudflare adapter package names).
- **Visitor**: `Program` (single pass — entire file AST inspected once).
- **Special-case**: `@sveltejs/adapter-cloudflare-workers` exempt (uses `wrangler.toml` not adapter options).
- **Patterns**: `**/svelte.config.*`. Stages: `lint`, `ci`.

### 14. `testing/require-colocated-tests.ts`
- **Detects**: `.ts` files exporting functions but missing a sibling `<basename>.test.ts`.
- **Helpers**: `getExportedFunctionNames(ast)` walks `ExportNamedDeclaration` children, collects FunctionDeclaration ids.
- **Visitor**: `Program` (uses `existsSync`/`readFileSync` from `node:fs` + path joins).
- **Fix shape**: `FileOpFix` — `{ type: 'create', path: '<basename>.test.ts', content: '...' }`. One of the few rules emitting file-creation fixes.

### 15. `typescript/no-throw.ts`
- **Detects**: `throw <anything>` outside integration boundaries.
- **Helpers**: `hasIntegrationBoundaryComment(node, ctx)` (regex `/\/\/.*integration boundary:\s*\S+/i` on the throw line OR the line above); `isIntegrationBoundaryThrow(node, ctx)` requires both the comment AND the argument shape (`result.error` MemberExpression OR `new Error(...)` NewExpression).
- **Visitor**: `ThrowStatement`.
- **Fix shape**: `LintFix`. Categories: `typescript`, `safety`, `result`. Stages: `lint`, `pre-commit`, `ci`.
- **Linchpin rule**: every fallible function returns `Result<T>` instead of throwing; this rule mechanically enforces the discipline.

### 16. `valibot/await-async-parse.ts`
- **Detects**: `v.parseAsync(...)` or `v.safeParseAsync(...)` calls not preceded by `await`.
- **Pattern**: `ASYNC_PARSE_METHODS = new Set(['parseAsync', 'safeParseAsync'])`.
- **Visitor**: `CallExpression` — narrows to `MemberExpression`/`StaticMemberExpression` callees, checks `context.isImportedFrom(object.name, 'valibot')`, scans 50 chars before `node.start` for trailing `await`.
- **Fix shape**: `NO_OP_FIX`. Categories: `valibot`, `safety`. Patterns: `**/*.ts`, `**/*.svelte.ts`.

### 17. `vscode/no-unlocalized-strings.ts` (WorkspaceRule)
- **Detects**: `vscode.window.showErrorMessage('literal')` etc. instead of `format(en.x.y, {})`.
- **Helpers**: `vscodeRuleInputs(ctx)` from `_shared-inputs.ts` (only fingerprints VS Code packages). `BRAND_PATH = 'src/shared/brand.ts'` identifies VS Code packages.
- **Patterns**: `MESSAGE_API_PATTERNS = [{pattern: /showErrorMessage\(\s*(['"`])/, api: 'showErrorMessage'}, ...]`.
- **Check**: filters packages with `src/shared/brand.ts` then regex-scans every TS file.
- **Fix shape**: `NO_OP_FIX` (replacement requires understanding the locale schema). Categories: `vscode`. Stages: `lint`, `ci`.

### 18. `workspace/cli-tools-help-version.ts` (WorkspaceRule)
- **Detects**: shell scripts in `bin/` or `scripts/` directories without `--help` and `--version` handling.
- **Inputs**: `ctx.allFiles()` — every workspace file (broad).
- **Check**: filters by path (`bin/` or `scripts/`), excludes `node_modules`/`.git/`, reads each script's content and regex-checks for `--help`/`--version` arg handling.
- **Fix shape**: `fixable: false` — declared explicitly in the rule. Type signature widens the return value to a structurally-compatible shape (workaround for TS narrowing).
- **Stages**: `lint`, `check`.

## File-private helpers convention

Helpers that start with `_` (like `_utils.ts`, `_svelte-helpers.ts`, `_json-fix-helpers.ts`, `_config-ast.ts`, `_shared-inputs.ts`, `_sync-helpers.ts`) live alongside rules in the same category but are skipped by the auto-loader (filename starts with `_`, no default export of a Rule shape). Rules import them with relative paths `from './_utils.ts'` — the `imports/no-relative-imports` rule allows this within `src/rules/<category>/`.

## Cross-references

- `framework/types.ts` — type definitions for `LintResult`, `LintFix`, `FileOpFix`, `NO_OP_FIX`, `AstNode`, `VisitorContext`, `WorkspaceContext`, `PackageJsonContext`, `RuleOptionDef`, `OptionsSchema`, `Stage`, `Severity`. The discriminants for `TypeScriptRule | PackageJsonRule | WorkspaceRule` live here.
- `framework/comment-helpers.ts` — `computeLineStarts(content)`, `offsetToLineNumber(offset, lineStarts)`. Used by every rule that emits line-based fixes.
- `framework/oxc-runner.ts` — the AST walker. Iterates `context.rule.visitor[node.type]?.(node, context)` per node.
- `framework/rule-loader.ts` — auto-loads every `.ts` under `src/rules/**` (skipping `_*`, `*.test.ts`, `index.ts`, `all.ts`).
- `framework/rule-context.ts` — `WorkspaceContext` (`getWorkspacePackages`, `readFile`, `allFiles`, `rootDir`), `PackageJsonContext`.

## How to choose the right kind

| Situation | Use |
|-----------|-----|
| Detecting an AST node pattern in source code | `TypeScriptRule` |
| Reading or validating one package.json | `PackageJsonRule` |
| Cross-package / cross-file consistency check | `WorkspaceRule` |
| Output depends on (a) file content alone | declare `inputs(ctx)` in WorkspaceRule for caching |
| Output depends on a file + the date (e.g., "older than N days") | inject a synthetic `__daily_rollover__/<UTC date>` into `inputs` |
| Need to provide a fix | use `createFixableResult(...)` — TS will reject `NO_OP_FIX` |
| Fix touches another file | `FileOpFix` (`type: 'create' | 'rename' | 'move'`) |
