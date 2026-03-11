# product-create

Create a new product from the template directory.

## Usage

```
pnpm tool product-create --product <name> [flags]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--product` | `-p` | `string` | Name of the product to create (required) |
| `--dry-run` | `-n` | `boolean` | Preview source/target paths without copying |

## How It Works

1. **Validates the product name** — Must be lowercase, start with a letter, contain only letters, numbers, and hyphens (e.g., `my-app`, `dashboard2`)
2. **Checks template directory** — Verifies `packages/products-template/` exists
3. **Checks for collisions** — Verifies `packages/products/<name>/` does not already exist
4. **Copies template** — Recursively copies the entire template directory to `packages/products/<name>/`
5. **Prints next steps** — Instructions for installing dependencies and updating config

No files are modified after copying — the template is used as-is. The developer should then update `resist.config.ts` to register the new product and run `pnpm tool sync` to generate product-specific config files.

### Product Name Validation

| Rule | Valid | Invalid |
|------|-------|---------|
| Lowercase only | `myapp` | `MyApp` |
| Start with letter | `app1` | `1app` |
| Letters, numbers, hyphens | `my-app-2` | `my_app`, `my.app` |

### Template Directory Structure

The template at `packages/products-template/` contains the standard product layer structure:

```
packages/products-template/
├── config/       # Product config (imports from global)
├── iac/          # Infrastructure as Code (Pulumi)
├── assets/       # Static assets, health data
├── api/          # API layer (Cloudflare Workers)
├── status/       # Status page service
├── marketing/    # Public-facing website
└── app/          # Product app (Svelte + Capacitor)
```

## Architecture

```
product-create/
├── index.ts          # Command definition + handler
├── flags/
│   ├── index.ts      # Auto-discovery via import.meta.glob
│   └── product.ts    # --product flag definition
└── locales/
    ├── schema.ts     # Valibot schema for locale strings
    └── locales/
        └── en.ts     # English strings
```

## Examples

```sh
pnpm tool product-create --product myapp            # Create new product
pnpm tool product-create -p myapp --dry-run         # Preview without copying
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Product created successfully |
| `1` | Validation failed, template missing, or product already exists |
| `2` | Invalid usage (missing `--product` flag) |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
