# Resist Tooling

Real-time linting, auto-fix, and workspace tooling for the Resist monorepo.

## Features

- Real-time linting as you type, on save, and on file open
- Quick fix code actions with auto-fix suggestions
- "Fix All" to apply all auto-fixable problems at once
- Diff preview for reviewing fixes before applying
- Code lens showing rule IDs and issue counts inline
- Per-rule disable comments (line and file level)
- Diagnostic filtering by category
- Performance timing breakdown
- Unused import removal
- Build stage indicator with quick-pick switching
- Format-on-save integration
- Stale diagnostic cleanup for idle files
- Multi-root workspace support with per-folder configuration

## Commands

All commands are available via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| Resist: Lint: Check Current File | Lint the active file |
| Resist: Lint: Check Entire Workspace | Lint all files in the workspace |
| Resist: Lint: Fix All Auto-Fixable Problems | Apply all available fixes |
| Resist: Lint: Clear All Diagnostics | Remove all lint diagnostics |
| Resist: Lint: Show All Available Rules | List rules in the output channel |
| Resist: Lint: Restart and Re-Check Open Files | Clear cache and re-lint |
| Resist: Show Resist Output Channel | Open the output channel |
| Resist: Lint: Check Staged Changes Only | Lint only git-staged files |
| Resist: Lint: Check Uncommitted Changes Only | Lint uncommitted changes |
| Resist: Lint: Preview All Fixes (Diff) | Side-by-side diff of fixes |
| Resist: Lint: Show Performance Timing | Per-rule timing breakdown |
| Resist: Lint: Filter Diagnostics by Category | Filter by rule category |
| Resist: Lint: Clear Diagnostic Filter | Remove category filter |
| Resist: Lint: Remove Unused Imports | Batch-remove unused imports |
| Resist: Lint: Change Active Stage | Switch the lint stage |

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `resist.lint.enable` | boolean | `true` | Enable/disable the linter |
| `resist.lint.onSave` | boolean | `true` | Lint on file save |
| `resist.lint.onType` | boolean | `true` | Lint as you type (debounced) |
| `resist.lint.onOpen` | boolean | `true` | Lint on file open |
| `resist.lint.debounceMs` | number | `500` | Debounce delay for lint-on-type |
| `resist.lint.maxProblems` | number | `100` | Max diagnostics per file |
| `resist.lint.stage` | string | `"lint"` | Active lint stage |
| `resist.lint.fixOnSave` | boolean | `false` | Auto-fix on save |
| `resist.lint.codeLens` | boolean | `false` | Show inline code lenses |
| `resist.lint.formatOnSave` | boolean | `false` | Use lint fixes for format-on-save |
| `resist.lint.cache` | boolean | `true` | Cache file hashes |
| `resist.lint.quiet` | boolean | `false` | Suppress warnings |
| `resist.lint.debug` | boolean | `false` | Verbose debug logging |

## Requirements

- Node.js >= 25
- The `resist-lint` CLI must be installed in `node_modules/.bin`
- A workspace with `pnpm-workspace.yaml` (monorepo root detection)

## License

MIT
