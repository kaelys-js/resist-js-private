# `@/cli` deep dive — packages/shared/utils/cli

CLI task-runner framework — the entry for `pnpm tool <name>`. Dispatches to one of 15 tools. Public-published (`"private": false` would be set on release; currently v0.0.1, not in registry).

## Package
- **Name**: `@/cli`
- **Description**: "CLI task runner framework with Valibot schemas, concurrency pools, and i18n support"
- **Vitest**: Runs its OWN local `vitest run` (NOT routed through root vitest projects). `qa:test` filter list at root excludes `@/cli` from the workspace `pnpm qa:test` chain.
- **Local config**: `vitest.config.ts` at the package root.
- **Dependencies**: `diff ^8.0.3`, `glob ^13.0.0`, `handlebars ^4.7.8`
- **Tool runner script**: `pnpm tool <name>` → `node --import tsx src/utils/tool.ts <name>`

## File structure (`src/`)
```
locale/
  schema.ts         ← BuiltCliStringsSchema, format
  locales/          ← per-locale (en, etc.)
schemas/
  index.ts          ← re-export of all CLI schemas (FlagDefinition, TaskOptions, RunSummary, etc.)
utils/              ← FRAMEWORK
  tool.ts           ← Entry point: `await dispatchTool()`. MODULE constant.
  core.ts           ← initializeCli, dispatchTool, handleStandardFlags, signal handlers, fatalError
  runner.ts         ← createRunner, runCore, discoverFiles, readStdin, calculateSummary
  command.ts        ← createCommand
  installer.ts      ← Tool prereq + install via mise/brew/npm
  views.ts          ← Output formatting (compact/detailed/diff/grouped/junit/summary)
  locales.ts        ← resolveLocale (loads CLI locale strings)
  flags/            ← 30+ per-flag modules + shared/
    index.ts        ← parseFlags, FLAG_DEFINITIONS, RUNNER_FLAG_DEFS, COMMAND_FLAG_DEFS, buildArgvFromFlags
    color.ts, concurrency.ts, cwd.ts, debug.ts, dry-run.ts, fail-fast.ts,
    filter.ts, format.ts, github-actions.ts, group.ts, help.ts, ignore.ts,
    json.ts, list-files.ts, locale.ts, log-level.ts, no-header.ts, output.ts,
    progress.ts, quiet.ts, serial.ts, silent.ts, slow-threshold.ts, stats.ts,
    stdin-filepath.ts, stdin.ts, summary-only.ts, timeout.ts, timing.ts, verbose.ts
    shared/         ← env.ts, product.ts (shared flag helpers)
tools/              ← 15 tools
  checks/, config/, dev-proxy/, devenv/, format/, generate-icons/,
  local-ci/, onboard/, product-create/, product-logs/, schema-updater/,
  secrets/, secrets-setup/, sync/, vscode-setup/
```

## Framework (`utils/`)

### Entry — `utils/tool.ts`
```ts
export const MODULE = true;   // top-level await marker
await dispatchTool();
```
Just calls `dispatchTool()` from `core.ts` — that does everything else.

### `utils/core.ts` — initialization + dispatch
- `initializeCli(opts) → InitializeCliResult` — sets up signal handlers, log setup, locale resolution, output format detection, environment + runtime detection, onboarding check
- `dispatchTool()` — main router; reads argv, finds the tool dir, dynamically imports its `index.ts`, calls its `default` runner with parsed flags
- `handleStandardFlags(argv, def)` → `StandardFlagsResult` — handles `--help`/`--version`/`--locale`/etc. before the tool sees argv
- `setupCliSignalHandlers(opts)` — wraps `setupGlobalErrorHandling` with CLI-specific TTY clearing, localized interrupt messages, exit-code handling
- `requireOnboarding(strings)` — checks `.resist/.onboarded` marker; bails early if not done (skipped for the `onboard` tool itself)
- `checkRuntimeSupport(strings)` — runtime version check
- `fatalError(err, strings)` — formats and exits

Types: `CliDefinition`, `InitializeCliResult`. Constants: `ExitCodeValue`.

### `utils/runner.ts` — task runner engine
The CORE pattern for tools that process many files in parallel (`format`, `checks`, `secrets`, etc.):
- `createRunner(def: TaskRunnerDefinitionBase) → TaskRunner` — factory
- `runCore(args, def, strings) → Result<RunCoreResult>` — orchestrates: parse flags → discover files → read stdin → execute tasks via `runPool` (from `@/utils/core/pool`) → format output
- `discoverFiles(input: DiscoverFilesInput)` — uses `glob` to expand patterns; respects ignores
- `readStdin(opts)` — reads stdin if `--stdin` flag set
- `calculateSummary(results)` — builds `RunSummary` (totals, slowest, fastest, failures)

Schemas: `CreateRunnerInputSchema`, `DiscoverFilesInputSchema`, `RunSummarySchema`, `TaskResultSchema`, `ExitCodeValue`. Types: `TaskOptions`, `TaskResult`, `TaskContext`, `TaskRunner`, `TaskRunnerDefinition`, `InvokeOptions`, `InvokeResult`, `RunCoreResult`, `RunOutput`, `NullableFileDuration`, `FlagDefinition`, `ReadonlyTaskOptions`.

### `utils/command.ts` — command-only tools
For tools that are NOT file-iterators (e.g. `secrets get`, `onboard`, `vscode-setup`):
- `createCommand(def: CommandDefinition) → Command` — single-shot tool with subcommands

### `utils/installer.ts` — tool installation
- `checkPrerequisite(name)` / `getPrerequisite(name)` — basic system check
- `checkToolVersion(name, expected)` → `VersionCheckResult`
- `installTool(name, opts)` / `installToolAsync(name, opts)` — install via mise/brew/npm
- `getToolInstallCommands(...)` — `InstallCommandsRecord` (per-PM commands)
- `getToolPrerequisite(name)`, `lookupInstallDef(name)`, `lookupToolVersion(name)`
- `isToolAvailable(name)` — bool check
- `clearToolCache()` — invalidate availability cache
- `getExtraToolPaths()`, `getPmRootAddDevCmd()`, `waitForBrewLock()`
- Constants: `MISE_BACKENDS`, `NODE_TOOL_BINARY_MAP`
- Backends: **mise** (system tools — installed to workspace-local `./bin/mise`), **brew** (macOS fallback), **npm** (Node tools — added to root workspace `devDependencies` at exact versions from config)

### `utils/views.ts` — output formatters
- `printCompactResults(...)` — single-line per result
- `printDetailedStats(...)` — full stats table
- `printDiff(...)` — unified diff
- `printGroupedResults(...)` — grouped by status/file
- `printJunitOutput(...)` — JUnit XML
- `printSummary(...)` — summary block
- `printTaskResult(...)` — per-task formatter
- `buildJunitXml(...)`, `buildRunOutput(...)`
- `formatCompact(...)`, `formatCounter(...)`

### `utils/flags/` — flag system

**Auto-discovery** via `import.meta.glob`:
```ts
const flagModules = import.meta.glob<{ default: readonly FlagDefinition[] }>(
  ['./*.ts', '!./index.ts'],
  { eager: true },
);
export const FLAG_DEFINITIONS = Object.values(flagModules)
  .flatMap(mod => mod.default)
  .sort((a, b) => a.order - b.order);
```
Each `flags/<name>.ts` exports `default: readonly FlagDefinition[]`. The barrel sorts by `order` field.

**Two scope buckets**:
- `COMMAND_FLAG_DEFS` — `scope === 'command'` (subset for command tools)
- `RUNNER_FLAG_DEFS` — full set (for runner tools)

**Validation at module-load**: `SIDE_EFFECT_VALIDATION` — checks every `def.sideEffects[i].property` references a known flag property. Returns Result.err if invalid (caught at first `parseFlags` call).

**`parseFlags(args, flagDefs, cliStrings)` → `Result<CoreParseFlagsResult>`**:
1. Detect duplicate longs/shorts (framework vs tool collision)
2. Build defaults: from `defaultFromConfig` (looks in `getConfig()`), then `default`, else type-zero (false / 0 / '' / [])
3. Build O(1) lookup maps (booleanByArg, valueByLong, valueByShort)
4. Single pass over args:
   - Boolean flag → set true, apply `sideEffects` if any
   - `--flag=value` → applyValueFlag
   - `--flag value` or `-x value` → applyValueFlag (consume next arg)
   - Unknown → error
5. Validate values via `def.schema` (Valibot); collect errors
6. Return `{flags, explicitFlags}` or `err(ERRORS.CLI.PARSE_FAILED)` with formatted messages

**`buildArgvFromFlags(flags, flagDefs)`** — inverse: convert `{check:true, filter:'*.ts'}` → `['--check', '--filter', '*.ts']`. Used for programmatic CLI invocation.

**`extractPositionalArgs(args, flagDefs)`** — pulls non-flag args (skipping value-flag's value).

**`formatFlagErrors(errors, strings, flagDefs)`** — locale-aware: delegates to `def.formatError` if defined, else generic.

**Help flag builders**: `buildCommandHelpFlags`, `buildStandardHelpFlags` (in `flags/help.ts`).

### `utils/locales.ts`
- `resolveLocale(opts) → ResolvedLocale` — picks the locale from arg/env/config and loads CLI strings
- `BuiltCliStrings` type — the resolved + formatted string tree

## Tools (`src/tools/`)

Each tool is a directory with the same shape:
```
<tool>/
  README.md
  index.ts        ← default export = the tool's entry (TaskRunner | Command)
  flags/          ← per-tool flag definitions (auto-merged with framework flags)
  locales/        ← per-tool locale strings
  utils/          ← tool-private helpers
  schemas/        ← tool-private Valibot schemas
  formatters/     ← tool-private output formatting
  template/       ← tool-private templates (sync uses Handlebars; sync's template/ is the actual template files)
  TODO.md         ← tool-private TODO (some tools)
```

Not every tool has every dir — the structure is opt-in. `format/` has `formatters/` + `schemas/`; `sync/` has `template/`; etc.

### Deep dives — 4 representative tools

#### `checks` — version-consistency validator
**Purpose**: Validates version consistency across config, lockfile, package.json, mise.toml, schemas, and installed tools.

**Flags**:
- `--fix`/`-f` (bool) — auto-remediation
- `--dry-run`/`-n` (bool) — preview commands
- `--verbose`/`-v` (bool) — detailed output

**How it works**: Runs 7 sequential validation passes (Config vs Lockfile, Config vs package.json, etc.) — each emits a result with severity `pass | fail | warn | skip`. Severity `fail` affects exit code.

**Used by**: `pnpm qa:checks` (root + per-package script that calls `pnpm --filter @/cli tool checks --cwd .`).

#### `format` — multi-language formatter (90+ file types)
**Purpose**: Routes each file to its formatter based on extension/glob/exact-name.

**Flags**:
- `--check`/`-C` — verify only, exit 1 if unformatted
- `--diff`/`-D` — show unified diff
- `--list-formatters` — print all registered formatters by tool type
- `--check-tools` — verify external formatter availability
- `--install-tools` — install missing formatters with progress
- `--list-ignored` — print `.formatignore` patterns

**How**:
1. Discover files matching `**/*` (respects `.formatignore`)
2. Three-tier registry lookup per file:
   - **Exact filename** (Dockerfile, Makefile)
   - **Glob pattern** (.env.*, docker-compose.yaml)
   - **Extension** (.ts, .go, .py)
3. Route to tool, apply formatting
4. Per-file status indicators

#### `secrets` — Infisical operations
**Purpose**: Manage Infisical secrets via subcommands.

**Subcommands** (positional `[action]`):
- `show` (default) — JSON to terminal
- `get`, `set`, `delete`
- `list` (masked values), `search` (by key pattern)
- `doctor` — 8 diagnostic checks
- `migrate` — .env → Infisical
- `rotate` — rotate by category (jwt, api, database)
- `sync` — push secrets to Cloudflare Workers
- `login`, `logout`, `whoami`
- `validate` — validate against Valibot schemas (uses `@/schemas/core-config/secret-schemas`)

#### `sync` — config-templating engine
**Purpose**: Render Handlebars templates against `resist.config.ts` to generate consistent config files (pnpm-workspace.yaml, .gitignore, etc.).

**Flags**:
- `--dry-run`/`-n` — preview without writing

**How**:
1. Create `resist.config.ts` from defaults if missing
2. Load + Valibot-validate the config
3. Lockfile mismatch detection (warn)
4. Flatten config into template context
5. Discover all `.hbs` templates in `template/` dir
6. Render each, compare to current file, write only if changed
7. Skip PM-specific templates that don't match the active PM
8. **Validate Handlebars** — detect undefined variables/helpers BEFORE writing (prevents silent typos)
9. Detect stale outputs (files no longer corresponding to any template)

`template/` directory contains the actual `.hbs` templates that define the entire workspace's rendered config.

### The other 11 tools (one-line summaries)

- **`config`** — read/edit/validate `resist.config.ts` (the workspace config)
- **`devenv`** — set up dev environment (containers, services, hosts; companion to `onboard`). Has `TODO.md`.
- **`dev-proxy`** — local-domain reverse proxy for development (auto-installs hard prereqs)
- **`generate-icons`** — wrapper for `generate-icons.sh` (called by storylyne editor's prebuild). Just the shell script — no `index.ts`/`flags`.
- **`local-ci`** — run a local approximation of CI pipeline. Has `TODO.md`.
- **`onboard`** — first-time setup after clone. Steps from `config.tooling.onboarding.steps`. Sets `RESIST_ONBOARDING=1`. Writes `.resist/.onboarded` marker.
- **`product-create`** — scaffold a new product from `products-template/`
- **`product-logs`** — tail/aggregate product logs
- **`schema-updater`** — refresh JSON schemas (`schemas.json`, `schemas.schema.json`) for IDE autocomplete on `resist.config.ts`
- **`secrets-setup`** — initial Infisical project setup (machine identity, environments, etc.)
- **`vscode-setup`** — configure user/workspace VS Code settings, install recommended extensions (incl. `@resist/vscode`)

## Locale (`src/locale/`)
- `schema.ts` — `BuiltCliStringsSchema`, `BuiltCliStrings` type, `format(template, values) → Result<Str>`
- `locales/` — per-locale strings
- Resolved at startup by `resolveLocale` (in `utils/locales.ts`)
- All user-facing messages go through `strings.section.key({values})` (returns `Result<Str>`)

## Schemas (`src/schemas/`)
- `index.ts` — barrel re-exporting CLI-specific schemas: `FlagDefinition`, `FlagName`, `TaskOptions`, `TaskContext`, `TaskResult`, `RunSummary`, `CommandDefinition`, `TaskRunnerDefinition`, `ExitCodeValue`, `InstallCommand`, `ToolName`, `BaseLocaleStrings`, `ExtendedFlags`, `StandardFlagsConfig`, `HelpFlagEntry`, `CoreParseFlagsResult`, `FlagsRecord`, `FlagValidationError`, etc.
- All CLI types are Valibot-derived (`v.InferOutput<typeof Schema>`)

## Patterns
- **Auto-discovery via `import.meta.glob`** for both `flags/` modules and (via dispatch) `tools/`
- **Single source of truth** for flag definitions — adding a flag = creating a `flags/<name>.ts` file
- **All public API returns `Result<...>`** — no throws (project-wide convention)
- **Defaults from config**: `def.defaultFromConfig: 'foo'` reads `getConfig().foo` at parse time
- **Side effects in flags**: `def.sideEffects: [{property: 'json', value: true}]` lets `--silent` automatically set `--json` etc.
- **Per-tool flag merging**: each tool's `flags/` is concatenated with framework flags before parsing → unified namespace
- **Pool-based concurrency**: `runCore` uses `runPool` from `@/utils/core/pool` (worker concurrency limited by `--concurrency` flag)
- **Schema-based flag validation**: each flag carries a Valibot schema, errors surface with locale-formatted messages
- **Onboarding gate**: tools (except `onboard` itself) refuse to run until `.resist/.onboarded` exists

## How to add a new tool

1. **Create directory** at `src/tools/<name>/`
2. **`README.md`** with usage + flags table
3. **`flags/<flag>.ts`** files (one per flag, `default` exports `readonly FlagDefinition[]`)
4. **`locales/`** with strings (at minimum `en.ts`)
5. **`utils/`**, **`schemas/`**, **`formatters/`** as needed
6. **`index.ts`** with `default export` of either `TaskRunner` (file-iterating) or `Command` (subcommand-style)
7. **No registration needed** — `dispatchTool()` finds it by directory name

## How to add a new flag (framework-level)

1. **Create file** at `src/utils/flags/<flag-name>.ts`
2. **`default` export** `readonly FlagDefinition[]` (one or more flags can share a file)
3. **Required fields**: `name`, `long`, `short?`, `type` (boolean/string/number), `property` (camelCase), `scope` ('command' or 'runner'), `order` (sort key), `description`, `schema` (Valibot — required for value flags)
4. **Optional**: `default`, `defaultFromConfig`, `repeatable`, `sideEffects`, `formatError`
5. **Auto-discovery is automatic** — no registration

## Tests
- Local `vitest run` (excluded from root `pnpm qa:test`)
- Most modules have paired `.test.ts` files (mocked + real)

## Important note on dependency
`@/cli` depends on the entire foundation: `@/config` (loader), `@/schemas/{common,core-config,result,function}`, `@/utils/{core,result}`, `@/secrets/infisical` (used by `secrets`/`secrets-setup`/`onboard` tools). Lives at the top of the dependency graph (with `@storylyne/editor`).
