# secrets

Manage Infisical secrets: show, get, set, delete, validate, and more.

## Usage

```
pnpm tool secrets [action] [flags]
```

## Actions

| Action | Description |
|--------|-------------|
| `show` (default) | Display secrets as JSON to terminal |
| `get` | Get a single secret value by key |
| `set` | Set a secret value |
| `delete` | Delete a secret |
| `list` | List all secrets at a path (masked values) |
| `search` | Search secrets by key name pattern |
| `doctor` | Run 8 diagnostic checks on Infisical setup |
| `migrate` | Migrate .env files to Infisical |
| `rotate` | Rotate secrets by category (jwt, api, database) |
| `sync` | Push secrets to Cloudflare Workers |
| `login` | Log in to Infisical |
| `logout` | Log out of Infisical |
| `whoami` | Display current Infisical user |
| `validate` | Validate secrets against Valibot schemas |

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--product` | `-p` | `string` | Target a specific product (`<name>` or `all`) |
| `--env` | `-e` | `string` | Target environment (`development`, `staging`, `production`) |
| `--json` | | `boolean` | Output raw JSON for scripting |
| `--key` | `-k` | `string` | Secret key name for get/set/delete actions |
| `--value` | `-v` | `string` | Secret value for set action |
| `--path` | | `string` | Infisical folder path (default: `/`) |
| `--dry-run` | | `boolean` | Preview changes without applying them |
| `--force` | `-f` | `boolean` | Skip confirmation prompts |
| `--category` | `-c` | `string` | Secret category for rotation (`jwt`, `api`, `database`, `all`) |
| `--verbose` | | `boolean` | Show detailed output |
| `--backup` | | `boolean` | Create backup before destructive operations |

## How It Works

### show (default)

Spawns `infisical export --env <env> --format json` and inherits stdout directly.
With `--product=<name>`, fetches from `/products/<name>` path.
With `--product=all`, discovers all products and fetches each sequentially.

### get

Fetches all secrets at the path as JSON, looks up the key, and displays the value.
Requires `--key` flag. Works with `--path` for subfolder targeting.

### set

Sets a secret via `infisical secrets set "KEY=VALUE"`.
Requires `--key` and `--value` flags. Supports `--dry-run` for preview.

### delete

Deletes a secret via `infisical secrets delete KEY`.
Requires `--key` flag. Supports `--dry-run` for preview.

### list

Fetches all secrets at the given path and displays them with masked values.
Shows first 4 characters followed by asterisks for each value.

### search

Searches all secrets (global + all products) by case-insensitive substring match.
Pass the query as the second positional argument: `pnpm tool secrets search API`.

### doctor

Runs 8 diagnostic checks:
1. Infisical CLI installed
2. Authenticated
3. `.infisical.json` exists
4. `resist.config.ts` valid
5. Server reachable
6. Secret fetch works
7. No `.env` files in workspace root
8. `.env*` in `.gitignore`

### migrate

Discovers `.env*` files (10 patterns), parses KEY=VALUE entries,
maps filenames to Infisical environments, and uploads via CLI.
Supports `--dry-run`, `--backup`, and environment override via `--env`.

### rotate

Generates cryptographically secure replacement values by category:
- `jwt`: JWT_SECRET, JWT_REFRESH_SECRET (base64url, min 64 chars)
- `api`: API_SECRET_KEY, RESEND_API_KEY, REVENUECAT_API_KEY, LEMON_SQUEEZY_API_KEY (hex)
- `database`: DATABASE_AUTH_TOKEN (hex)
- `all`: All of the above

Requires `--category` flag. Supports `--dry-run`.

### sync

Pushes secrets to Cloudflare Workers via `wrangler secret put`.
Checks that `wrangler` is installed, fetches secrets from Infisical,
then pushes each via stdin to avoid shell escaping issues.
Supports `--dry-run`.

### login / logout / whoami

Authentication management:
- `login`: Sets `INFISICAL_API_URL` from config, runs `infisical login`
- `logout`: Runs `infisical logout`
- `whoami`: Runs `infisical user get`, parses email from output

### validate

Validates fetched secrets against Valibot schemas from `@/schemas/core-config/secret-schemas`.
Checks required keys per folder (global: cloudflare, turbo, devenv; product: api, auth, app, marketing, status, storage).
With `--product=<name>`, validates only that product.
Reports per-folder pass/fail with missing key details.

## Prerequisites

| Tool | Auto-Install | Purpose |
|------|-------------|---------|
| Infisical CLI | **No** — install via `pnpm tool secrets-setup` | Secrets access |
| wrangler | **No** — `npm install -g wrangler` | Required only for `sync` action |

The Infisical CLI must be authenticated (`infisical login` or `pnpm tool secrets login`) and the workspace must have a `.infisical.json` file.

## Configuration

The tool reads Infisical settings from `resist.config.ts`:

```typescript
tooling: {
  infisical: {
    siteUrl: 'http://localhost:8080',       // Server URL
    serverVersion: '0.151.0',               // Docker image version
    globalProjectSlug: 'global',            // Global project name
    auth: {
      method: 'interactive',                // token | machine-identity | interactive
      cacheTtlSeconds: 300,                 // SDK cache TTL (5 min)
    },
    docker: {
      composeFile: 'docker-compose.infisical.yml',
      service: 'infisical',
    },
    environments: {
      default: 'development',               // Default when no --env flag
      branchMapping: {
        main: 'production',
        staging: 'staging',
      },
    },
  },
}
```

## Architecture

```
secrets/
├── index.ts              # 14-action dispatcher (v2.0.0)
├── flags/
│   ├── index.ts           # Auto-discovery via import.meta.glob
│   ├── product.ts         # --product flag
│   ├── env.ts             # --env flag
│   ├── json.ts            # --json flag
│   ├── key.ts             # --key flag
│   ├── value.ts           # --value flag
│   ├── path.ts            # --path flag
│   ├── dry-run.ts         # --dry-run flag
│   ├── force.ts           # --force flag
│   ├── category.ts        # --category flag
│   ├── verbose.ts         # --verbose flag
│   └── backup.ts          # --backup flag
├── utils/
│   ├── infisical.ts       # CLI helpers (fetch, classify errors, require)
│   ├── doctor.ts          # 8 diagnostic checks
│   ├── migrate.ts         # .env → Infisical migration
│   ├── rotate.ts          # Secret rotation by category
│   ├── sync.ts            # Cloudflare Workers sync
│   ├── validate-secrets.ts # Schema validation per folder
│   └── search.ts          # Cross-project secret search
└── locales/
    ├── schema.ts          # Valibot schema (~80 locale keys)
    └── locales/
        └── en.ts          # English strings
```

## Examples

```sh
# Show
pnpm tool secrets                                      # Global secrets (development)
pnpm tool secrets --env=production                     # Global secrets (production)
pnpm tool secrets --product=myapp                      # Product-specific secrets
pnpm tool secrets --product=all --env=staging          # All products (staging)

# CRUD
pnpm tool secrets get --key=API_SECRET_KEY             # Get a single secret
pnpm tool secrets set --key=API_KEY --value=abc123     # Set a secret
pnpm tool secrets delete --key=OLD_KEY                 # Delete a secret
pnpm tool secrets list --path=/products/myapp          # List secrets at path

# Search
pnpm tool secrets search API                           # Search by key pattern

# Operations
pnpm tool secrets doctor                               # Run diagnostic checks
pnpm tool secrets migrate --dry-run                    # Preview .env migration
pnpm tool secrets migrate --backup                     # Migrate with backups
pnpm tool secrets rotate --category=jwt                # Rotate JWT secrets
pnpm tool secrets rotate --category=all --dry-run      # Preview all rotations
pnpm tool secrets sync --dry-run                       # Preview Workers sync
pnpm tool secrets validate --env=production            # Validate against schemas

# Auth
pnpm tool secrets login                                # Log in to Infisical
pnpm tool secrets logout                               # Log out
pnpm tool secrets whoami                               # Show current user
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Operation completed successfully |
| `1` | Secret not found or validation failed |
| `2` | Invalid command usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
