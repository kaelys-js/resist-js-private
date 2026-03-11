# @/cli

A CLI task runner framework with Valibot schemas, concurrency pools, and i18n
support.

## Overview

This package provides a framework for building CLI tools that process files in
parallel. It handles:

- Flag parsing (standard + tool-specific flags)
- File discovery via glob patterns
- Concurrent task execution with configurable parallelism
- Multiple output formats (pretty, compact, JSON, GitHub Actions, JUnit XML)
- Environment variable detection (NO_COLOR, FORCE_COLOR, CI, GITHUB_ACTIONS)
- Signal handling for graceful shutdown (SIGINT, SIGTERM)
- Progress output, grouping, and statistics
- i18n support for all user-facing strings

## Quick Start

```typescript
import {
  createRunner,
  type TaskRunnerDefinition,
  type TaskResult,
  type RunnerLocaleStrings,
} from '@/cli';

interface MyStrings extends RunnerLocaleStrings {
  startMessage: (mode: string) => string;
}

const locale: Record<string, MyStrings> = {
  en: {
    description: 'Processes files',
    examples: [{ command: 'pnpm tool my-tool', description: 'Process all files' }],
    exitCodes: [
      { code: 0, description: 'Success' },
      { code: 1, description: 'Task failure' },
      { code: 2, description: 'Invalid usage' },
      { code: 3, description: 'Fatal error' },
      { code: 130, description: 'Interrupted' },
    ],
    startMessage: (mode) => `Starting in ${mode} mode`,
  },
};

// Tool flags defined in tools/my-tool/flags/ using FlagDefinition[]
import { TOOL_FLAG_DEFS } from './flags';

const definition: TaskRunnerDefinition<{ check: boolean }, MyStrings> = {
  id: 'my-tool',
  name: 'My Tool',
  locale,
  version: '1.0.0',
  extensions: ['.ts', '.js'],
  flagDefs: TOOL_FLAG_DEFS,
  task: async (file, ctx) => {
    // ctx.options has typed flags, ctx.locale.runner has runner strings
    if (ctx.options.dryRun) {
      console.log(`Would process: ${file}`);
    }
    return {
      file,
      relativePath: file.split('/').pop() || file,
      status: 'success',
      category: 'TypeScript',
      error: null,
      duration: 10,
      output: null,
    };
  },
  onStart: (ctx) => {
    console.log(ctx.locale.runner.startMessage(ctx.options.check ? 'check' : 'write'));
  },
};

const runner = createRunner({ definition });
const exitCode = await runner.run(); // args default to process.argv.slice(2)
process.exit(exitCode);
```

## Standard Flags

All runners automatically support these flags:

### Basic Flags

| Flag          | Short | Description                                          |
| ------------- | ----- | ---------------------------------------------------- |
| `--help`      | `-h`  | Show help                                            |
| `--version`   | `-V`  | Show version                                         |
| `--verbose`   | `-v`  | Verbose output                                       |
| `--quiet`     | `-q`  | Suppress output                                      |
| `--silent`    |       | Suppress output (alias for --quiet)                  |
| `--format`    |       | Output format (pretty, compact, json, github, junit) |
| `--json`      |       | JSON output (deprecated: use --format=json)          |
| `--group`     | `-g`  | Group by category                                    |
| `--color`     |       | Force color                                          |
| `--no-color`  |       | Disable color                                        |
| `--dry-run`   | `-n`  | Preview mode                                         |
| `--fail-fast` |       | Stop on first error                                  |

### File Discovery Flags

| Flag               | Short | Description                                          |
| ------------------ | ----- | ---------------------------------------------------- |
| `--list-files`     | `-l`  | List files only                                      |
| `--filter`         | `-f`  | Filter files by pattern                              |
| `--ignore`         | `-i`  | Ignore pattern (repeatable)                          |
| `--cwd`            |       | Override working directory                           |
| `--stdin`          |       | Read from stdin (requires --stdin-filepath)          |
| `--stdin-filepath` |       | Filepath for stdin content (for extension detection) |

### Execution Flags

| Flag            | Short | Description                                  |
| --------------- | ----- | -------------------------------------------- |
| `--concurrency` | `-c`  | Max parallel tasks                           |
| `--timeout`     | `-t`  | Task timeout (ms)                            |
| `--debug`       | `-d`  | Enable debug output                          |
| `--serial`      | `-s`  | Run tasks serially (same as --concurrency=1) |

### Output Flags

| Flag               | Short | Description                                                  |
| ------------------ | ----- | ------------------------------------------------------------ |
| `--progress`       | `-p`  | Show progress bar                                            |
| `--stats`          |       | Show detailed statistics                                     |
| `--timing`         |       | Show per-file timing                                         |
| `--summary-only`   |       | Only show summary                                            |
| `--slow-threshold` |       | Warn for slow files (ms)                                     |
| `--github-actions` |       | GitHub Actions annotations (deprecated: use --format=github) |
| `--no-header`      |       | Hide header                                                  |
| `--output`         | `-o`  | Write output to file                                         |
| `--locale`         |       | Set locale (default: en)                                     |
| `--log-level`      |       | Internal log level (silent, error, warn, info, debug)        |

## Output Formats

Use `--format=<type>` to select the output format:

### Pretty (default)

Human-readable output with colors and formatting.

```
My Tool v1.0.0
A description

[OK] src/file1.ts
[OK] src/file2.ts

All 2 files processed successfully in 50ms
```

### Compact

One line per file, suitable for piping and parsing.

```
OK    src/file.ts
FAIL  src/bad.ts - Error message
SKIP  src/ignored.ts
```

### JSON

Machine-readable JSON output.

```json
{
  "success": true,
  "summary": { "total": 2, "success": 2 },
  "files": [],
  "byCategory": { "TypeScript": [] }
}
```

### GitHub Actions

GitHub Actions workflow commands for annotations.

```
::notice::All 2 files processed successfully in 50ms
::error file=src/bad.ts::Syntax error on line 10
```

### JUnit XML

JUnit XML format for CI systems.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="CLI" tests="3" failures="1" time="0.050">
  <testsuite name="CLI" tests="3" failures="1" time="0.050">
    <testcase name="src/file.ts" time="0.020"/>
    <testcase name="src/bad.ts" time="0.015">
      <failure message="Error">Error</failure>
    </testcase>
  </testsuite>
</testsuites>
```

## Environment Variables

The CLI respects these environment variables:

| Variable         | Effect                             |
| ---------------- | ---------------------------------- |
| `NO_COLOR`       | Disables color output              |
| `FORCE_COLOR`    | Forces color output                |
| `CI`             | Disables progress bar              |
| `GITHUB_ACTIONS` | Auto-enables GitHub Actions format |

Explicit flags always override environment variables.

## Exit Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 0    | Success - all tasks completed           |
| 1    | Task failure - one or more tasks failed |
| 2    | Invalid usage - bad flags or arguments  |
| 3    | Fatal error - internal/unexpected error |
| 130  | Interrupted - received SIGINT (Ctrl+C)  |

## Tool Flags

Tools define their flags as `FlagDefinition[]` in a `flags/` directory using
the same auto-discovery pattern as standard flags:

```
tools/my-tool/
├── flags/
│   ├── index.ts      ← import.meta.glob auto-discovery
│   └── options.ts    ← exports default: readonly FlagDefinition[]
├── locales/
└── index.ts          ← imports TOOL_FLAG_DEFS, passes to definition
```

Each flag definition file exports an array of `FlagDefinition` objects with
`scope: 'tool'`:

```typescript
// tools/my-tool/flags/options.ts
import { BooleanSchema } from '@/schemas/common';
import type { FlagDefinition } from '@/cli/schemas';

const defs: readonly FlagDefinition[] = [
  {
    name: 'check',
    property: 'check',
    long: '--check',
    short: '-C',
    type: 'boolean',
    scope: 'tool',
    schema: BooleanSchema,
    descriptionKey: 'check',
    order: 200,
    handle: (_config) => okUnchecked(null),
  },
];

export default defs;
```

The `flags/index.ts` auto-discovers all sibling `.ts` files:

```typescript
// tools/my-tool/flags/index.ts
import type { FlagDefinition } from '@/cli/schemas';

const flagModules = import.meta.glob<{ default: readonly FlagDefinition[] }>(
  ['./*.ts', '!./index.ts'],
  { eager: true },
);

export const TOOL_FLAG_DEFS: readonly FlagDefinition[] = Object.values(flagModules)
  .flatMap((mod) => mod.default)
  .sort((a, b) => a.order - b.order);
```

Tool flags get the same treatment as standard flags: Valibot schema validation,
environment defaults, handler chain, and collision detection. Flag values are
passed to your task function via `ctx.options`.

**Important:** Tool flags must not collide with standard flags. Duplicate
`--long` or `-short` forms are detected at parse time.

**Help Output:** Tool flags are displayed in a separate "TOOL OPTIONS" section
in `--help` output, making it clear which flags are tool-specific vs. standard
framework flags.

## Task Result

Your task function must return a `TaskResult`:

```typescript
type TaskResult = {
  file: string; // Absolute file path
  relativePath: string; // Display path
  status: 'success' | 'unchanged' | 'failed' | 'skipped';
  category: string | null; // For grouping (e.g., 'TypeScript')
  error: string | null; // Error message if failed
  duration: number; // Processing time in ms
  output: string | null; // Optional output/diff
};
```

## Lifecycle Hooks

All hooks receive a context object with parsed options and locale strings:

```typescript
const definition: TaskRunnerDefinition = {
  // ...
  onStart: async (ctx) => {
    // Called before processing starts
    if (ctx.options.verbose) console.log('Starting...');
  },
  onComplete: async (results: TaskResult[], ctx) => {
    // Called after all tasks complete
    if (ctx.options.dryRun) console.log('Dry run complete');
  },
  onError: async (error: Error, file: string, ctx) => {
    // Called when a task fails
    if (ctx.options.verbose) console.error(`Error in ${file}:`, error);
  },
};
```

## Typed Tool Flags

Use generics for type-safe tool flags:

```typescript
import { TOOL_FLAG_DEFS } from './flags';

// Define your tool flags type
type MyFlags = {
  check: boolean;
  config: string;
};

// Use generic to get typed options
const definition: TaskRunnerDefinition<MyFlags> = {
  id: 'my-tool',
  name: 'My Tool',
  locale: { en: { description: '...', examples: [], exitCodes: [] } },
  version: '1.0.0',
  flagDefs: TOOL_FLAG_DEFS,
  task: async (file, ctx) => {
    // ctx.options.check and ctx.options.config are typed!
    if (ctx.options.check) {
      /* ... */
    }
    const config = ctx.options.config; // string
    // ...
  },
  onStart: (ctx) => {
    // Typed here too
    console.log('Check mode:', ctx.options.check);
  },
};
```

## File Discovery

Configure how files are discovered:

```typescript
const definition: TaskRunnerDefinition = {
  // ...
  patterns: ['src/**/*'], // Glob patterns
  extensions: ['.ts', '.tsx'], // File extensions
  ignore: ['node_modules/**'], // Ignore patterns
};
```

Users can also pass files/patterns as positional arguments:

```bash
my-tool src/
my-tool "**/*.ts"
my-tool file1.ts file2.ts
```

Use `--cwd` to override the working directory for file discovery:

```bash
my-tool --cwd=/path/to/project
```

## Signal Handling

The CLI handles signals gracefully:

- **SIGINT** (Ctrl+C): Gracefully stops running tasks and exits with code 130
- **SIGTERM**: Same as SIGINT
- **SIGPIPE**: Ignored (prevents crash when piped to `head`)

## Error Handling

Invalid flags return exit code 2 with a consistent error format:

```
My Tool v1.0.0
A description

Invalid --concurrency value: "abc". Must be a positive integer.

Use --help for usage information.
```

## Simple Command Mode

For commands that don't process multiple files in parallel, use `createCommand`:

```typescript
import { createCommand, type CommandContext, type CommandLocaleStrings } from '@/cli';

// Define your strings type
interface MyStrings extends CommandLocaleStrings {
  greeting: string;
  farewell: (name: string) => string;
}

// Colocate locale strings with your command
const locale: Record<string, MyStrings> = {
  en: {
    description: 'A simple command',
    examples: [{ command: 'pnpm tool my-command', description: 'Run command' }],
    exitCodes: [
      { code: 0, description: 'Success' },
      { code: 1, description: 'Failure' },
      { code: 2, description: 'Invalid usage' },
      { code: 3, description: 'Fatal error' },
      { code: 130, description: 'Interrupted' },
    ],
    flags: {},
    greeting: 'Hello!',
    farewell: (name) => `Goodbye, ${name}!`,
  },
};

const command = createCommand<MyStrings>({
  id: 'my-command',
  name: 'my-command',
  version: '1.0.0',
  locale,
  handler: async (ctx: CommandContext<MyStrings>) => {
    const name = ctx.args[0];
    console.log(ctx.locale.command.greeting);
    if (name) {
      console.log(ctx.locale.command.farewell(name));
    }
  },
});

command.run().then(process.exit);
```

### CommandContext

The handler receives a `CommandContext` with:

- `options` - Parsed flags (standard subset + tool-specific), typed as `Readonly<CommandFlags & TToolFlags>`
- `locale` - Locale strings split into:
  - `locale.cli` - Framework strings (help text, flag descriptions, etc.)
  - `locale.command` - Your command-specific strings for the current locale
- `args` - Positional CLI arguments (after flags)
- `cwd` - Current working directory

### CommandOptions

Standard flags available on `ctx.options` for all commands:

`help`, `version`, `verbose`, `quiet`, `color`, `noColor`, `dryRun`, `locale`, `debug`, `noHeader`, `cwd`, `logLevel`

## Utility Modules

The framework exports utility modules for common CLI operations:

### Path Utilities

```typescript
import { cwd, joinPath, pathExists, getDirFromImportMeta } from '@/cli';

const currentDir = cwd();
const fullPath = joinPath([currentDir, 'src', 'index.ts']);
const exists = pathExists(fullPath);
const __dirname = getDirFromImportMeta(import.meta.url);
```

### File System Utilities

```typescript
import {
  readFile,
  writeFile,
  mkdirRecursive,
  copyDir,
  readDir,
  parseJsonWithComments,
} from '@/cli';

const content = readFile('/path/to/file.txt');
writeFile('/path/to/output.txt', content);
mkdirRecursive('/path/to/new/dir');
copyDir('/src', '/dest');
const files = readDir('/path/to/dir');
const config = parseJsonWithComments('{ /* comment */ "key": "value" }');
```

### Process Utilities

```typescript
import {
  exit,
  fatalExit,
  runCommand,
  runPmCommand,
  spawnProcess,
  execSyncSafe,
  execSyncBool,
  commandExists,
  ensureCommand,
} from '@/cli';

runCommand('npm install', 'inherit');
runPmCommand(['dev'], 'inherit'); // Uses configured package manager
const output = execSyncSafe('git status');
const success = execSyncBool('npm test');

if (!commandExists('docker')) {
  fatalExit({ message: 'Docker not found' });
}

ensureCommand('node', 'brew install node');
```

### Network Utilities

```typescript
import {
  isPortAvailable,
  findAvailablePort,
  getLocalIpAddresses,
  getLocalHostname,
} from '@/cli';

const available = await isPortAvailable(3000);
const port = await findAvailablePort(3000); // Finds 3000 or next available

const ips = getLocalIpAddresses(); // ['192.168.1.42', '10.0.0.5']
const mdns = getLocalHostname(); // 'my-machine.local'
```

### Workspace Utilities

```typescript
import {
  findWorkspaceRoot,
  getWorkspaceRoot,
  discoverProducts,
  isValidProductName,
} from '@/cli';

const root = findWorkspaceRoot(); // Returns null if not found
const root2 = getWorkspaceRoot(); // Throws if not found

const products = discoverProducts('/path/to/monorepo');
// { names: ['app1', 'app2'], paths: ['/path/to/app1', '/path/to/app2'] }

const valid = isValidProductName('my-app'); // true
```

## Built-in Tools

The CLI framework includes these tools, each with its own README:

| Tool             | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `checks`         | Validate version consistency across config, lockfile, and tools |
| `config`         | Display configuration as JSON                                |
| `dev-proxy`      | Local HTTPS reverse proxy with Caddy, mkcert, and Cloudflare Tunnel |
| `devenv`         | Set up local and remote dev environments (containers + Coder) |
| `format`         | Multi-language code formatter (90+ file types)               |
| `local-ci`       | Run GitHub Actions workflows locally via act                 |
| `onboard`        | Development environment setup wizard                         |
| `product-create` | Create new products from template                            |
| `product-logs`   | Tail Cloudflare Worker logs via wrangler                     |
| `schema-updater` | Download and cache JSON schemas from remote URLs             |
| `secrets`        | Display secrets from Infisical                               |
| `secrets-setup`  | Set up self-hosted Infisical secrets management              |
| `sync`           | Render Handlebars templates from resist.config.ts            |
| `vscode-setup`   | Install/uninstall VS Code extensions from extensions.json    |

Run any tool with `pnpm tool <name>`. Each tool directory has a README with
flags, behavior, and examples.

## Architecture

```
src/
├── index.ts              # Public API exports
├── schemas/index.ts      # Valibot schemas for all types
├── locale/
│   ├── index.ts          # Locale resolution
│   ├── schema.ts         # String schemas
│   └── locales/en.ts     # English strings
├── utils/
│   ├── runner.ts         # Task runner engine
│   ├── command.ts        # Simple command wrapper
│   ├── core.ts           # Shared flag parsing, signal handling, validation
│   ├── pool.ts           # Concurrency pool
│   ├── output.ts         # Terminal output helpers
│   ├── paths.ts          # Path utilities
│   ├── fs.ts             # File system utilities
│   ├── process.ts        # Process utilities
│   ├── network.ts        # Network utilities
│   ├── workspace.ts      # Workspace utilities
│   ├── installer.ts      # Tool installer utilities
│   ├── onboarding.ts     # Onboarding marker check
│   └── tool.ts           # Tool dispatcher
└── tools/
    ├── checks/           # Version consistency validation
    │   └── flags/        # Tool flag definitions (--fix)
    ├── config/           # Config display
    │   └── flags/        # Tool flag definitions (--product)
    ├── dev-proxy/        # Development proxy
    │   └── flags/        # Tool flag definitions (--expose, --tunnel)
    ├── devenv/           # Dev environment setup (local + remote)
    │   ├── flags/        # Tool flag definitions (--force, --rebuild, --image-only, --prune)
    │   └── utils/        # Prerequisites, steps, teardown
    ├── format/           # Multi-language formatter
    │   ├── flags/        # Tool flag definitions (--check, --diff, etc.)
    │   ├── formatters/   # 67 formatter definitions
    │   ├── types.ts      # Formatter types
    │   ├── registry.ts   # Formatter lookup registry
    │   └── runner.ts     # Format execution engine
    ├── local-ci/         # Local CI workflow runner
    │   └── flags/        # Tool flag definitions (--workflow, --job)
    ├── onboard/          # Onboarding wizard
    ├── product-create/   # Product creation
    │   └── flags/        # Tool flag definitions (--product)
    ├── product-logs/     # Log tailing
    │   └── flags/        # Tool flag definitions (--product, --env)
    ├── schema-updater/   # Schema downloader
    ├── secrets/          # Secrets display
    │   └── flags/        # Tool flag definitions (--product, --env)
    ├── secrets-setup/    # Infisical bootstrap/connect
    │   ├── flags/        # Tool flag definitions (--skip-login)
    │   └── utils/        # Bootstrap, connect, provision
    ├── sync/             # Config-to-template sync
    │   ├── config.ts     # Sync configuration
    │   ├── mapping.ts    # Template mapping rules
    │   ├── transform.ts  # Config flattener
    │   └── helpers.ts    # Handlebars helpers
    └── vscode-setup/     # VS Code extension manager
```

## Exports

Main entry point (`@/cli`):

### Core

- `createRunner` - Task runner factory (batch file processing)
- `createCommand` - Simple command factory (one-shot commands)
- `runPool`, `mapPool`, `filterPool`, `forEachPool` - Concurrency pool utilities

### Types

- `TaskRunnerDefinition`, `TaskResult`, `TaskFunction`, `TaskContext`, `TaskLocale` -
  Runner types
- `RunnerLocaleStrings` - Locale string interface for runners
- `CommandDefinition`, `CommandContext`, `CommandFlags`, `CommandLocale`,
  `CommandLocaleStrings` - Command types
- `ExitCodeValue`, `OutputFormat`, `LogLevel` - Constants

### Utilities

- Path: `cwd`, `joinPath`, `pathExists`, `getDirFromImportMeta`
- FS: `readFile`, `writeFile`, `mkdirRecursive`, `copyDir`, `readDir`,
  `parseJsonWithComments`
- Process: `exit`, `fatalExit`, `runCommand`, `runPmCommand`, `spawnProcess`,
  `execSyncSafe`, `execSyncBool`, `commandExists`, `ensureCommand`,
  `isWindows`, `isMacOS`, `isLinux`
- Network: `isPortAvailable`, `findAvailablePort`, `isPortAvailableSync`,
  `getLocalIpAddresses`, `getLocalHostname`
- Workspace: `findWorkspaceRoot`, `getWorkspaceRoot`, `discoverProducts`,
  `isValidProductName`
- Installer: `isToolAvailable`, `installTool`, `installToolAsync`, `waitForBrewLock`,
  `clearToolCache`, `checkPrerequisite`, `getToolPrerequisite`, `getToolInstallCommands`

### Output

- Colors: `bold`, `dim`, `red`, `green`, `yellow`, `cyan`, `blue`, `magenta`,
  etc.
- Symbols: `symbols` (success, error, warning, info, bullet)
- Formatters: `printHeader`, `printHelp`, `formatDuration`, `formatCompact`,
  `buildJunitXml`

### Locale

- `getCliStrings`, `getCliStringsForLocale`, `getAvailableLocales`,
  `resolveLocale`

### Schemas

- `PortSchema`, `HttpStatusCodeSchema`, `EnvironmentSchema`, `ProductNameSchema`
- `InstallCommandSchema`, `InstallResultSchema`

## Testing

```bash
# Use your package manager (pnpm, npm, yarn, or bun)
pnpm check        # Type-check + lint + test
pnpm test         # Run tests
pnpm test:coverage # Run with coverage
```
