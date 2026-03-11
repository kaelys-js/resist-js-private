# vscode-setup

Install recommended VS Code extensions, remove conflicting ones, and audit extension status.

## Usage

```
pnpm tool vscode-setup [flags]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--dry-run` | `-n` | `boolean` | Preview changes without installing or removing extensions |
| `--verbose` | `-v` | `boolean` | Show detailed progress including version info |
| `--list` | `-l` | `boolean` | Display installed extensions with status annotations |
| `--filter` | `-f` | `string` | Only process extensions matching this substring |
| `--diff` | `-d` | `boolean` | Show comparison between installed and configured extensions |
| `--force` | | `boolean` | Force reinstall already-installed extensions |
| `--json` | | `boolean` | Output results in JSON format for scripting |

## How It Works

1. **Verifies `code` CLI** — Checks that the `code` CLI is available in PATH
2. **Reads extensions config** — Parses `.vscode/extensions.json` (supports JSONC)
3. **Parses categories** — Extracts category headers from JSONC comments for grouping
4. **Applies filter** — If `--filter` is set, only matching extensions are processed
5. **Lists installed** — Runs `code --list-extensions` (with `--show-versions` for list/diff/verbose modes)
6. **Branches on mode:**
   - **List mode** (`--list`) — Displays installed extensions grouped by category with status annotations (recommended, unwanted, extra) and optional version info
   - **Diff mode** (`--diff`) — Shows missing (recommended but not installed), unwanted (installed but conflicting), extra (installed but not configured), and OK (recommended and installed) extensions
   - **Install mode** (default) — Removes unwanted extensions, installs recommended ones, displays summary
7. **JSON output** (`--json`) — In any mode, outputs structured JSON instead of human-readable text
8. **Exit code** — Returns exit code 1 if any extensions failed to install

### Extension Status Types

| Status | Meaning |
|--------|---------|
| `recommended` | In `recommendations` array and installed |
| `missing` | In `recommendations` array but not installed |
| `unwanted` | In `unwantedRecommendations` array and installed |
| `extra` | Installed but not in any configuration list |

### Category Grouping

Extensions are grouped by category in `--list` and `--diff` modes. Categories are parsed from JSONC comments in `.vscode/extensions.json`:

- Banner comments: `// ===== CATEGORY (description) =====`
- Simple comments: `// Category name`

### JSON Output Format

When `--json` is used, a single JSON object is emitted to stdout:

```json
{
  "mode": "install | list | diff",
  "config": {
    "recommended": ["publisher.ext", "..."],
    "unwanted": ["publisher.ext", "..."]
  },
  "extensions": [],
  "diff": {},
  "results": {},
  "stats": {
    "installed": 0,
    "skipped": 0,
    "failed": 0,
    "uninstalled": 0
  }
}
```

### Extension Identifiers

Extensions use the standard VS Code format: `publisher.extension-name` (e.g., `biomejs.biome`, `svelte.svelte-vscode`).

## Prerequisites

| Tool | Auto-Install | Purpose |
|------|-------------|---------|
| VS Code `code` CLI | **No** — must be in PATH | Extension management |

On macOS, the `code` CLI is installed via VS Code's command palette: `Shell Command: Install 'code' command in PATH`.

## Architecture

```
vscode-setup/
├── index.ts              # Command definition + handler
├── flags/
│   ├── index.ts          # Auto-discovery via import.meta.glob
│   ├── list.ts           # --list flag
│   ├── filter.ts         # --filter flag
│   ├── diff.ts           # --diff flag
│   ├── force.ts          # --force flag
│   └── json.ts           # --json flag
└── locales/
    ├── schema.ts         # Valibot schema for locale strings
    └── locales/
        └── en.ts         # English strings
```

## Examples

```sh
pnpm tool vscode-setup                           # Install/remove extensions
pnpm tool vscode-setup --dry-run                 # Preview without changes
pnpm tool vscode-setup --list                    # List installed with status
pnpm tool vscode-setup --list --verbose          # List with version numbers
pnpm tool vscode-setup --diff                    # Audit extension status
pnpm tool vscode-setup --diff --verbose          # Audit with OK extensions shown
pnpm tool vscode-setup --filter=svelte           # Only process Svelte extensions
pnpm tool vscode-setup --force                   # Reinstall all recommended
pnpm tool vscode-setup --json                    # JSON output for scripting
pnpm tool vscode-setup --diff --json             # Audit as JSON
pnpm tool vscode-setup --list --json             # List as JSON
pnpm tool vscode-setup --filter=python --list    # List only Python extensions
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Extensions configured successfully |
| `1` | One or more extensions failed to install |
| `2` | VS Code CLI not found, extensions.json missing/invalid, or workspace error |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
