# onboard

Set up the development environment after cloning the repo.

## Usage

```
pnpm tool onboard [flags]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--dry-run` | `-n` | `boolean` | Preview steps without executing them |
| `--verbose` | `-v` | `boolean` | Show detailed debug output |

## How It Works

1. **Prerequisites** — Checks for mise and installs it if missing via the `./bin/mise` bootstrap script
2. **Setup steps** — Runs each step from `config.tooling.onboarding.steps` as a package manager command with `RESIST_ONBOARDING=1` set in the environment
3. **Completion marker** — Writes `.resist/.onboarded` so other tools can verify onboarding has been completed

Steps are executed sequentially. If any step fails, the tool exits immediately with a non-zero exit code.

### Default Steps

| # | Step | Command | What it does |
|---|------|---------|-------------|
| 1 | `i` | `pnpm i` | Install all workspace dependencies |
| 2 | `clean` | `pnpm run clean` | Clean build artifacts |
| 3 | `setup:vscode` | `pnpm run setup:vscode` | Configure VS Code extensions |
| 4 | `update:schemas` | `pnpm run update:schemas` | Download JSON schemas for IDE autocomplete |
| 5 | `update:bac` | `pnpm run update:bac` | Update build artifacts cache |
| 6 | `secrets:login` | `pnpm run secrets:login` | Log in to Infisical for secrets access |
| 7 | `ci:local` | `pnpm run ci:local` | Set up local CI hooks via lefthook |

### Onboarding Marker

The `.resist/.onboarded` file is written after all steps complete successfully. Other CLI tools (like `checks` and `devenv`) check for this marker to ensure the developer has completed onboarding before running. The file contains a timestamp of when onboarding was last completed.

## Configuration

Steps are configured in `resist.config.ts`:

```typescript
tooling: {
  onboarding: {
    steps: ['i', 'clean', 'setup:vscode', 'update:schemas', 'update:bac', 'secrets:login', 'ci:local'],
  },
}
```

Each step is passed to the package manager as a command: `<pm> run <step>` (except `i` which maps to `<pm> i`).

## Architecture

```
onboard/
├── index.ts          # Command definition + step executor
├── flags/
│   └── index.ts      # Auto-discovery (standard flags only)
├── locales/
│   ├── schema.ts     # Valibot schema for locale strings
│   └── locales/
│       └── en.ts     # English strings
└── utils/            # Helper utilities
```

## Examples

```sh
pnpm tool onboard               # Run full setup
pnpm tool onboard --dry-run     # Preview steps without executing
pnpm tool onboard --verbose     # Show detailed debug output
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Setup complete |
| `1` | A setup step failed or prerequisite missing |
| `2` | Invalid usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
