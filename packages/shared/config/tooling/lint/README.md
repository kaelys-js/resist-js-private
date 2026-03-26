# @/lint

Custom AST-based linter for the monorepo. Uses oxc-parser for TypeScript/Svelte parsing with a visitor-pattern rule system. Configuration is driven by `.resist-lint.jsonc` at the workspace root.

## Source Files

| File | Description |
| --- | --- |
| `src/cli.ts` | CLI entry point — thin wrapper that delegates to `cli-helpers.ts` |
| `src/cli-helpers.ts` | All CLI logic — arg parsing, file discovery, fix application, linter loop |
| `src/config/schema.ts` | Valibot-validated configuration schema and loader for `.resist-lint.jsonc` |
| `src/constants.ts` | Shared constants — linter name, config filename, schema filename |
| `src/framework/types.ts` | Type definitions for rules, AST visitors, lint results, and fixes |
| `src/framework/oxc-runner.ts` | oxc-parser integration — AST parsing, traversal, and rule execution |
| `src/framework/rule-loader.ts` | Auto-discovery of rules from `src/rules/` directories |
| `src/rules/` | 62 TypeScript AST rules + 14 package.json rules across 9 categories |

## Usage

```bash
# Run on specific paths
resist-lint packages/shared/schemas

# List all rules with severity
resist-lint --list-rules

# Run specific rule
resist-lint --rule=jsdoc/require-param packages/shared/schemas

# Auto-fix
resist-lint --fix packages/shared/schemas

# JSON output
resist-lint --json packages/shared/schemas

# Show help
resist-lint --help
```

## Configuration

Configuration is loaded from `.resist-lint.jsonc` at the workspace root. Supports JSONC (JSON with `//` and `/* */` comments). The JSON Schema (`.resist-lint.schema.json`) is auto-generated on each lint run for IDE autocomplete.

```jsonc
{
  "$schema": "./.resist-lint.schema.json",
  "include": ["packages/shared/schemas"],
  "exclude": ["node_modules", "dist", "*.test.ts", "*.d.ts"],
  "extensions": [".ts", ".svelte.ts", ".mjs"],
  "rules": {
    "jsdoc/require-param": "error",
    "typescript/no-empty-catch": "warn",
    "testing/require-colocated-tests": "off"
  },
  "overrides": [
    {
      "files": ["**/tooling/**"],
      "rules": { "imports/no-relative-imports": "off" }
    }
  ]
}
```

## API Reference

### CLI Flags

- `--help`, `-h` — Show help with usage examples
- `--list-rules` — Print all rules with their severity and patterns
- `--rule=id[,id2]` — Run only the specified rule(s)
- `--fix` — Auto-apply fixes to source files
- `--json` — Output results as JSON
- `--warn-only` — Exit 0 even if errors are found

### Config Schema (`src/config/schema.ts`)

- `loadConfig(cwd)` — Load and validate `.resist-lint.jsonc` from directory
- `resolveRuleSeverity(config, ruleId, filePath)` — Get effective severity for a rule on a file (respects overrides)
- `generateJsonSchema(ruleIds, descriptions)` — Generate JSON Schema document with rule enum values for IDE autocomplete
- `LintConfigSchema` — Valibot schema for the configuration file
- `RuleSeveritySchema` — Valibot picklist for `"error" | "warn" | "off"`

### CLI Helpers (`src/cli-helpers.ts`)

- `parseCliArgs(argv)` — Parse raw CLI arguments into structured `CliArgs`
- `runLinter(cliArgs, output)` — Run the full linter pipeline (config, rules, files, output)
- `shouldLint(filePath, config)` — Check if a file should be linted based on extensions and excludes
- `collectFiles(dir, config)` — Recursively collect lintable files from a directory
- `applyFixes(content, fixes)` — Apply code fixes in reverse offset order
- `buildHelpText(name, config, schema)` — Build formatted CLI help text

### Rule Loader (`src/framework/rule-loader.ts`)

- `loadAllRules()` — Auto-discover and import all rules from `src/rules/`. Returns `{ typescript: TypeScriptRule[], packageJson: PackageJsonRule[] }`

### Runner (`src/framework/oxc-runner.ts`)

- `runTypeScriptRules(filePath, content, rules)` — Parse file with oxc-parser and run rules against the AST
- `walkNode(node, callback)` — Recursively walk an AST node tree

## Rule Categories

| Category | Rules | Description |
| --- | --- | --- |
| `comments/` | 4 | Section markers, blank line groups, lint disable detection |
| `imports/` | 7 | Import hygiene — no barrels, no relative imports, import groups |
| `jsdoc/` | 8 | JSDoc completeness — params, returns, examples, module tags |
| `naming/` | 5 | Naming conventions — camelCase, PascalCase, kebab-case |
| `package/` | 14 | package.json validation — scripts, dependencies, config |
| `result/` | 8 | Result pattern enforcement — ok checks, type annotations |
| `testing/` | 1 | Test file co-location |
| `typescript/` | 15 | TypeScript strictness — type annotations, no throw, no bare casts |
| `valibot/` | 12 | Valibot schema conventions — strict objects, namespaced imports |
