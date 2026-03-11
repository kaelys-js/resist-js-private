# product-logs

Tail live logs from Cloudflare Workers via `wrangler tail` with full filtering and formatting support.

## Usage

```
pnpm tool product-logs [flags]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--product` | `-p` | `string` | Product to tail logs from |
| `--env` | | `string` | Target environment (`development`, `staging`, `production`) |
| `--service` | `-S` | `string` | Service layer to tail (`api`, `app`, `status`, `assets`, `marketing`). Default: `api` |
| `--format` | `-F` | `string` | Output format (`json`, `pretty`) |
| `--status` | | `string[]` | Filter by invocation status (`ok`, `error`, `canceled`). Repeatable |
| `--header` | `-H` | `string[]` | Filter by request header (`key:value`). Repeatable |
| `--method` | | `string[]` | Filter by HTTP method (`GET`, `POST`, etc.). Repeatable |
| `--sampling-rate` | | `number` | Fraction of requests to sample (0 to 1) |
| `--search` | | `string` | Filter logs by text substring |
| `--ip` | | `string[]` | Filter by client IP (or `self`). Repeatable |
| `--version-id` | | `string` | Tail a specific Worker version deployment |
| `--wrangler-debug` | | `boolean` | Enable wrangler debug logging |

## How It Works

1. **Discovers products** — Scans `packages/products/` for available products
2. **Resolves product** — Routes based on `--product` flag:
   - If set, validates the product exists and uses it
   - If only one product exists in the workspace, auto-selects it
   - If multiple products exist without `--product`, exits with a list of available products
3. **Resolves service** — Uses `--service` flag value (default: `api`)
4. **Resolves environment** — Uses `--env` flag value, or falls back to the default environment from `resist.config.ts`
5. **Builds wrangler args** — Converts passthrough flags (`--format`, `--status`, `--header`, `--method`, `--sampling-rate`, `--search`, `--ip`, `--version-id`, `--wrangler-debug`) into wrangler tail CLI arguments
6. **Spawns wrangler** — Runs `wrangler tail --env <env> [wrangler args]` via the package manager's workspace filter command scoped to `@<product>/<service>`
7. **Streams output** — Inherits stdio for real-time log streaming until interrupted with Ctrl+C

### Package Manager Commands

The tool constructs the appropriate workspace command for the configured package manager:

| PM | Command |
|----|---------|
| pnpm | `pnpm --filter @<product>/<service> exec wrangler tail --env <env> [args]` |
| npm | `npm --workspace @<product>/<service> exec wrangler tail --env <env> [args]` |
| yarn | `yarn workspace @<product>/<service> exec wrangler tail --env <env> [args]` |
| bun | `bun --filter @<product>/<service> exec wrangler tail --env <env> [args]` |

### Service Layers

Each product contains up to 5 service layers. The `--service` flag targets which layer's Worker to tail:

| Service | Description | Default |
|---------|-------------|---------|
| `api` | API layer (Cloudflare Workers) | Yes |
| `app` | Product application | |
| `status` | Status page service | |
| `assets` | Static assets | |
| `marketing` | Public-facing website | |

### Filtering

Multiple filters combine with AND logic — all filters must match for a log entry to appear. Repeatable flags combine with OR logic within the same filter type.

**Example:** `--status=error --method=POST --method=PUT` shows log entries that are errors AND used POST or PUT methods.

## Prerequisites

| Tool | Auto-Install | Purpose |
|------|-------------|---------|
| wrangler | **No** — expected as a devDependency | Cloudflare Workers CLI |

Wrangler should be installed as a devDependency in the product service's `package.json`. The tool runs it via the package manager's workspace executor.

## Architecture

```
product-logs/
├── index.ts              # Command definition + handler + wrangler arg builder
├── flags/
│   ├── index.ts          # Auto-discovery via import.meta.glob
│   ├── product.ts        # --product flag (shared)
│   ├── env.ts            # --env flag (shared)
│   ├── service.ts        # --service flag
│   ├── tail-format.ts    # --format flag
│   ├── status-filter.ts  # --status flag (repeatable)
│   ├── header-filter.ts  # --header flag (repeatable)
│   ├── method-filter.ts  # --method flag (repeatable)
│   ├── sampling-rate.ts  # --sampling-rate flag
│   ├── search.ts         # --search flag
│   ├── ip-filter.ts      # --ip flag (repeatable)
│   ├── version-id.ts     # --version-id flag
│   └── wrangler-debug.ts # --wrangler-debug flag
└── locales/
    ├── schema.ts         # Valibot schema for locale strings
    └── locales/
        └── en.ts         # English strings
```

## Examples

```sh
pnpm tool product-logs                                           # Auto-select product, tail API logs
pnpm tool product-logs --product=myapp                           # Specific product, API service
pnpm tool product-logs --product=myapp --service=status          # Tail status page Worker
pnpm tool product-logs -p myapp --format=json                    # JSON output for piping
pnpm tool product-logs -p myapp --format=json | jq '.outcome'   # Pipe JSON to jq
pnpm tool product-logs -p myapp --status=error                   # Errors only
pnpm tool product-logs -p myapp --status=error --status=canceled # Errors and canceled
pnpm tool product-logs -p myapp --method=POST --method=PUT       # Mutation requests only
pnpm tool product-logs -p myapp --search="timeout"               # Search for substring
pnpm tool product-logs -p myapp --sampling-rate=0.1              # Sample 10% of traffic
pnpm tool product-logs -p myapp --ip=self                        # Only this machine's requests
pnpm tool product-logs -p myapp --header="X-Custom:value"        # Filter by header
pnpm tool product-logs -p myapp --env=production --version-id=abc123  # Specific version in prod
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Logs stopped gracefully |
| `1` | Failed to start wrangler or product not found |
| `2` | Invalid usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
