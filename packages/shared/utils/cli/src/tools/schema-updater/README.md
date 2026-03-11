# schema-updater

Download and cache JSON schemas from remote URLs, local packages, and custom sources for IDE autocompletion.

## Usage

```
pnpm tool schema-updater [flags]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--dry-run` | `-n` | `boolean` | Show what would be done without writing files |
| `--verbose` | `-v` | `boolean` | Show detailed progress for each schema |
| `--filter` | `-f` | `string` | Only update schemas whose name contains this substring |
| `--concurrency` | `-c` | `number` | Maximum concurrent HTTP requests (default: 6) |
| `--list` | `-l` | `boolean` | Display schema status table without updating |
| `--force` | | `boolean` | Override dirty tree check and force re-download |

## How It Works

1. **Checks working tree** — Verifies the schemas directory has no uncommitted changes (use `--force` to override)
2. **Reads configuration** — Loads `schemas.json` from the CLI tools directory
3. **Applies filter** — If `--filter` is set, only matching schemas are processed
4. **Processes schemas** — Downloads/copies all schemas in parallel (limited by `--concurrency`, default 6) using three source types:
   - **Remote** — Downloads from URLs (supports `{version}` template substitution from lockfile/package.json). Sends `If-None-Match` ETag headers for conditional requests.
   - **Local** — Copies from `node_modules` paths
   - **Custom** — Copies from the project's `schemas/` directory
5. **Validates JSON** — All downloaded/copied content is validated as parseable JSON
6. **Detects changes** — Compares fetched content with existing files, skips writing unchanged schemas
7. **Writes schemas** — Saves changed schemas to the configured schemas directory
8. **Updates metadata** — Writes `schemas.meta.json` with timestamps, tool versions, and ETags for freshness tracking
9. **Generates VS Code config** — Writes `schemas.vscode.json` mapping `fileMatch` patterns to schema paths for IDE integration
10. **Detects version drift** — Warns when installed tool versions differ from schema-declared versions

### Schema Source Types

| Source | URL Pattern | Example |
|--------|-------------|---------|
| Remote | `https://.../{version}/schema.json` | Biome, Turborepo, TypeScript schemas |
| Local | `node_modules/<pkg>/schema.json` | Package-bundled schemas |
| Custom | `schemas/<name>/schema.json` | Project-specific schemas |

### Version Detection

For remote schemas with `{version}` in the URL, the tool resolves the installed package version by checking (in order):

1. **Config** — `resist.config.ts` versions (nodeTools, systemTools)
2. **Lockfile** — `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock`
3. **package.json** — `dependencies` or `devDependencies`

### Retry Logic

Remote downloads use exponential backoff:

| Setting | Value |
|---------|-------|
| Max attempts | 3 |
| Backoff | 1s, 2s, 4s |
| Timeout | 15s per request |
| Client errors (4xx) | Fail immediately |
| Server/network errors | Retry |

### ETag Caching

Remote schemas use HTTP conditional requests via `If-None-Match` / `ETag` headers. When a schema hasn't changed on the server, it returns 304 Not Modified and the local copy is kept without re-downloading. Use `--force` to skip ETag caching.

### Content Change Detection

After fetching, the tool compares new content with the existing file on disk. If identical, the file is not rewritten and the schema is counted as "unchanged" in the summary. This prevents unnecessary git diffs.

### Dirty Working Tree Check

Before modifying files, the tool checks `git status` of the schemas directory. If there are uncommitted changes, it errors with a message to commit/stash first. Use `--force` to override this check.

### Fallback Behavior

If a schema fails to download but an existing copy exists on disk, the existing version is kept and a warning is logged. Only schemas that fail with no existing fallback are treated as errors.

### VS Code Integration

After processing, the tool writes `schemas.vscode.json` containing `json.schemas` entries that map `fileMatch` glob patterns to local schema file paths. The sync tool's `.vscode/settings.json.hbs` template reads this file to generate IDE-ready schema associations.

## Configuration

Schemas are defined in `schemas.json` at `packages/shared/utils/cli/src/tools/schema-updater/schemas.json`. Each entry specifies:

- **type** — Source type (`remote`, `local`, `custom`)
- **url/path** — Source URL or filesystem path
- **fileMatch** — VS Code glob patterns for files this schema applies to
- **versionSource** — Optional package name for version template substitution
- **versionCheck** — Optional version drift detection configuration

## Architecture

```
schema-updater/
├── index.ts              # Command definition + download/copy/cache logic
├── schemas.json          # Schema source configuration (42 entries)
├── schemas.schema.json   # JSON Schema for schemas.json validation
├── schemas/              # Custom schema files
│   ├── actionlint.schema.json
│   ├── gitleaks.schema.json
│   └── ...
├── flags/
│   ├── index.ts          # Auto-discovery via import.meta.glob
│   ├── filter.ts         # --filter flag
│   ├── concurrency.ts    # --concurrency flag
│   ├── list.ts           # --list flag
│   └── force.ts          # --force flag
└── locales/
    ├── schema.ts         # Valibot schema for locale strings
    └── locales/
        └── en.ts         # English strings
```

## Examples

```sh
pnpm tool schema-updater                           # Download/update all schemas
pnpm tool schema-updater --dry-run                 # Preview without writing
pnpm tool schema-updater --verbose                 # Show per-schema progress
pnpm tool schema-updater --filter=biome            # Update only biome schema
pnpm tool schema-updater --filter=github           # Update all GitHub-related schemas
pnpm tool schema-updater --list                    # Show status of all schemas
pnpm tool schema-updater --concurrency=2           # Limit to 2 parallel downloads
pnpm tool schema-updater --force                   # Force re-download ignoring cache
pnpm tool schema-updater --filter=turbo --verbose  # Verbose update of turbo schema only
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All schemas updated successfully |
| `1` | One or more schemas failed with no existing fallback |
| `2` | Invalid usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
