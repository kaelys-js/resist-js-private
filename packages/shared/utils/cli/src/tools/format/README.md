# format

Multi-language code formatter supporting 90+ file types.

## Usage

```
pnpm tool format [flags] [files...]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--check` | `-C` | `boolean` | Verify formatting without modifying files (exit 1 if unformatted) |
| `--diff` | `-D` | `boolean` | Show unified diff of changes without modifying files |
| `--list-formatters` | | `boolean` | Print all registered formatters grouped by tool type |
| `--check-tools` | | `boolean` | Check availability of all external formatter tools |
| `--install-tools` | | `boolean` | Install missing formatter tools with progress tracking |
| `--list-ignored` | | `boolean` | Print ignore patterns from `.formatignore` |

## How It Works

1. Discovers files matching `**/*` (respects `.formatignore`)
2. Looks up a formatter for each file using a three-tier registry:
   - **Exact filename** (`Dockerfile`, `Makefile`, etc.)
   - **Glob pattern** (`.env.*`, `docker-compose.yaml`, etc.)
   - **File extension** (`.ts`, `.go`, `.py`, etc.)
3. Routes to the appropriate tool and applies formatting
4. Reports results per file with status indicators

### Tool Types

| Type | Examples | How it runs |
|------|----------|-------------|
| `biome` | TS/JS, JSON, CSS | Biome API with project config |
| `prettier` | Markdown, YAML, HTML, Svelte, Vue | Prettier API with project config |
| `external` | Go, Python, Rust, Shell, SQL, 40+ more | Spawns CLI tool (`gofmt`, `ruff`, `rustfmt`, etc.) |
| `custom` | `.editorconfig`, `.env`, `.gitignore`, Makefile | Inline JS transform function |
| `noop` | Dockerfile, Nginx | Pass-through (no formatting) |

### Formatter Counts

- **Biome**: 3 formatters (TS/JS, JSON, CSS)
- **Prettier**: 15 formatters (Markdown, YAML, HTML, Svelte, Vue, GraphQL, SCSS, XML, etc.)
- **External**: 54 formatters (Go, Python, Rust, Ruby, PHP, Shell, SQL, Terraform, Java, Kotlin, Swift, Haskell, Elixir, Zig, C/C++, etc.)
- **Custom**: 10 formatters (EditorConfig, env files, ignore files, Makefile, INI, CSV, etc.)
- **Noop**: 2 formatters (Dockerfile, Nginx)

### External Tool Resolution

For external formatters with multiple tool options (e.g., Python supports `ruff` then `black`), the first available tool on `PATH` wins. Use `--check-tools` to see what's available and `--install-tools` to install missing ones.

### Ignore Patterns

Create a `.formatignore` file at the workspace root with glob patterns (one per line) to exclude files from formatting. Uses the same syntax as `.gitignore`. View active patterns with `--list-ignored`.

## Architecture

```
format/
├── index.ts          # Task runner definition + formatting logic
├── flags/
│   ├── index.ts      # Auto-discovery via import.meta.glob
│   ├── check.ts      # --check flag
│   ├── diff.ts       # --diff flag
│   ├── list.ts       # --list-formatters, --check-tools, --install-tools, --list-ignored
│   └── ...
├── formatters/       # 81+ formatter definition files
│   ├── biome/        # Biome formatters (ts, json, css)
│   ├── prettier/     # Prettier formatters (md, yaml, html, svelte, etc.)
│   ├── external/     # External CLI tool formatters
│   ├── custom/       # Custom JS transform formatters
│   └── noop/         # Pass-through formatters
├── registry.ts       # Three-tier formatter lookup registry
├── runner.ts         # Format execution engine
├── types.ts          # Formatter type definitions
└── locales/
    ├── schema.ts     # Valibot schema for locale strings
    └── locales/
        └── en.ts     # English strings
```

## Examples

```sh
pnpm tool format                          # Format all files in-place
pnpm tool format --check                  # CI mode: fail if files need formatting
pnpm tool format --diff                   # Preview changes as unified diff
pnpm tool format src/index.ts             # Format specific files
pnpm tool format "src/**/*.ts"            # Format files matching glob
pnpm tool format --list-formatters        # Show all registered formatters
pnpm tool format --check-tools            # Check which external tools are installed
pnpm tool format --install-tools          # Install missing external tools
pnpm tool format --list-ignored           # Show active ignore patterns
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All files formatted (or already formatted in `--check` mode) |
| `1` | Files need formatting (`--check`) or a formatter failed |
| `2` | Invalid usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
