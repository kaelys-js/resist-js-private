# config

Display, inspect, validate, and manage configuration.

## Usage

```
pnpm tool config [action] [flags]
```

## Actions

| Action | Description |
|--------|-------------|
| `show` (default) | Display full config as JSON |
| `get` | Get a specific value by dot-notation key |
| `validate` | Validate config against Valibot schemas |
| `list` | List all top-level keys with types |
| `schema` | Display schema structure |
| `path` | Show resolved config file paths |
| `init` | Create starter `resist.config.ts` from template |

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--product` | `-p` | `string` | Target a specific product (`<name>` or `all`) |
| `--key` | `-k` | `string` | Dot-notation key path (e.g. `tooling.ci.enabled`) |
| `--json` | | `boolean` | Output raw JSON for scripting |

## How It Works

### show (default)

Loads the merged `resist.config.ts` via the `@/config` loader and prints as formatted JSON.
With `--product=<name>`, dynamically imports the product config module.
With `--product=all`, discovers and prints all product configs.

### get

Resolves a dot-notation key path against the config object.
Requires `--key` flag. Works with `--product`.

### validate

Validates global config via `getConfig()` (already schema-validated by loader).
With `--product`, validates against `ProductConfigSchema`.
With `--product=all`, validates all products and prints summary.

### list

Lists top-level keys with their value types.
Works with `--product` to list product config keys.

### schema

Introspects `CoreConfigObjectSchema` to show field names, types, and required/optional.
With `--key`, navigates to a sub-schema.

### path

Shows the resolved absolute path to config files.
Works with `--product` and `--product=all`.

### init

Creates a starter `resist.config.ts` at the workspace root.
Skips if the file already exists.

## Architecture

```
config/
├── index.ts              # Command definition + 7-action dispatcher
├── flags/
│   ├── index.ts          # Auto-discovery via import.meta.glob
│   ├── product.ts        # --product flag (accepts "all")
│   ├── json.ts           # --json flag
│   └── key.ts            # --key/-k flag
├── utils/
│   ├── resolve-key.ts    # Dot-notation key resolution
│   ├── schema-info.ts    # Valibot schema introspection
│   └── init-template.ts  # resist.config.ts template
└── locales/
    ├── schema.ts         # Valibot schema for locale strings
    └── locales/
        └── en.ts         # English strings
```

## Examples

```sh
pnpm tool config                                # Show full global config
pnpm tool config show --product=myapp           # Show product config
pnpm tool config get -k tooling.ci.enabled      # Get specific value
pnpm tool config get -k layers --product=myapp  # Get product value
pnpm tool config validate                       # Validate global config
pnpm tool config validate --product=all         # Validate all products
pnpm tool config list                           # List global keys
pnpm tool config schema -k tooling              # Show tooling sub-schema
pnpm tool config path --product=all             # Show all config paths
pnpm tool config init                           # Create starter config
pnpm tool config show --json | jq '.tooling'    # Pipe JSON to jq
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Completed successfully |
| `1` | Config not found or validation failed |
| `2` | Invalid usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
