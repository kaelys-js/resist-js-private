# checks

Validate version consistency across config, lockfile, package.json, mise.toml, schemas, and installed tools.

## Usage

```
pnpm tool checks [flags]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--fix` | `-f` | `boolean` | Attempt auto-remediation of detected mismatches |
| `--dry-run` | `-n` | `boolean` | Preview fix commands without executing them |
| `--verbose` | `-v` | `boolean` | Show detailed output for each check |

## How It Works

Runs 7 sequential validation passes comparing version information across different sources. Each check emits a result with one of four severities:

| Severity | Symbol | Meaning |
|----------|--------|---------|
| `pass` | `✓` | Versions match |
| `fail` | `✗` | Mismatch detected (affects exit code) |
| `warn` | `⚠` | Potential issue (does not affect exit code) |
| `skip` | `–` | Check not applicable |

### Pass 1: Config vs. Lockfile

Compares Node tool versions in `resist.config.ts` against the package manager lockfile (`pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock`). Uses regex pattern matching specific to each lockfile format. Binary lockfiles (`bun.lockb`) are skipped.

**Fix:** Runs `<pm> install` to regenerate the lockfile.

### Pass 2: Config vs. package.json devDependencies

Compares Node tool versions in config against `devDependencies` in the root `package.json`. Catches cases where a developer updated `package.json` directly without updating `resist.config.ts`.

**Fix:** Runs `<pm> run update:sync` to regenerate package.json from config.

### Pass 3: Config vs. mise.toml

Compares system tool versions (hcloud, kubectl, helm, etc.) in config against the `[tools]` section in `mise.toml`. Uses regex matching against TOML key-value pairs.

**Fix:** Runs `<pm> run update:sync` to regenerate mise.toml from config.

### Pass 4: Config vs. Installed Tools

Checks that installed system tool versions match the config-pinned versions using `checkToolVersion()` from the installer utility. Emits `warn` (not `fail`) since tools may not be installed on every machine.

**Fix:** Runs `./bin/mise install <tool>@<version>` for each mismatched tool.

### Pass 5: Schema Version Drift

Reads `schemas.json` and checks each schema's `versionCheck` field against the installed package version (resolved from lockfile or `package.json`). Emits `warn` when a schema URL contains an outdated version.

**No auto-fix** — run `pnpm tool schema-updater` to update schemas.

### Pass 6: Schema Freshness

Reads `schemas.meta.json` and checks the `lastUpdated` timestamp for each schema. Emits `warn` if any schema hasn't been updated in over 90 days.

**No auto-fix** — run `pnpm tool schema-updater` to refresh schemas.

### Pass 7: Internal Consistency

Runs 6 sub-checks for monorepo consistency:

| # | Check | What it validates |
|---|-------|-------------------|
| 7a | `.nvmrc` | Matches `config.versions.node` |
| 7b | `packageManager` field | Root `package.json` has correct `packageManager` field |
| 7c | No Volta | Root `package.json` does not contain a `volta` section |
| 7d | `mise.toml` exists | File exists when system tools are configured |
| 7e | Bootstrap script | `./bin/mise` bootstrap script exists |
| 7f | `.gitignore` | Contains `.mise/` entry |

**Fix:** Runs `<pm> run update:sync` to regenerate consistency files.

### Summary

After all passes, prints a summary line:

```
3 passed, 1 failed, 2 warnings, 1 skipped
```

Exit code is `1` if any checks have `fail` severity. Warnings do not affect the exit code.

## Architecture

```
checks/
├── index.ts          # Command definition + 7 pass functions + helpers
├── flags/
│   ├── index.ts      # Auto-discovery via import.meta.glob
│   └── fix.ts        # --fix flag definition
└── locales/
    ├── schema.ts     # Valibot schema for locale strings
    └── locales/
        └── en.ts     # English strings
```

## Examples

```sh
pnpm tool checks                    # Run all validation passes
pnpm tool checks --fix              # Auto-fix detected mismatches
pnpm tool checks --fix --dry-run    # Preview fix commands without executing
pnpm tool checks --verbose          # Show detailed output per check
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed (warnings don't affect exit) |
| `1` | One or more checks failed |
| `2` | Invalid usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
