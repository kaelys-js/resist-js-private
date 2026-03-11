# secrets-setup

Set up self-hosted Infisical secrets management. Detects whether to bootstrap a local server or connect to a remote VPS based on the configured `siteUrl`. Supports teardown via `--reset`.

## Usage

```
pnpm tool secrets-setup [flags]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--skip-login` | `-S` | `boolean` | Skip interactive login (for CI or re-provisioning) |
| `--reset` | — | `boolean` | Tear down Infisical setup (stop containers, remove config, logout) |

## How It Works

1. Checks for `--reset` flag — if set, routes to reset mode (skips all other steps)
2. Verifies Infisical CLI is installed (auto-installs via `./bin/mise install infisical` if missing)
3. Detects mode from `resist.config.ts` → `tooling.infisical.siteUrl`:
   - **Bootstrap** — `siteUrl` is `http://localhost:8080`
   - **Connect** — `siteUrl` is a remote URL (e.g., `https://infisical.example.com`)
4. Routes to the appropriate setup flow
5. Tests the connection by running `infisical secrets --env=development`

### Bootstrap Mode (Local Server)

For local development — starts a self-hosted Infisical instance via Docker Compose.

1. **Generate `.env.infisical`** — Creates crypto keys (`ENCRYPTION_KEY`, `AUTH_SECRET`) and database connection strings. Only generated if the file doesn't already exist.
2. **Start Docker Compose** — Runs `docker compose -f docker-compose.infisical.yml up -d`. Health-checks the server by polling `${siteUrl}/api/status` (30 retries, 2 second intervals).
3. **Authenticate** — Runs `infisical login` interactively (skipped with `--skip-login`).
4. **Auto-provision structure** — Creates Infisical projects, folders, and prompts for secret values:
   - Creates a `global` project with folders: `/cloudflare`, `/<git-provider>`, `/turbo`, `/devenv`
   - Creates a project per product with folders: `/api`, `/app`, `/marketing`, `/status`
   - Prompts for each expected secret value interactively
   - Creates machine identities: `coder-vps` and `<provider>-ci`
5. **Write `.infisical.json`** — Saves the project ID for future CLI operations.
6. **VPS deploy prompt** — Asks whether to deploy Infisical to a VPS now (runs `devenv deploy` if confirmed).

### Connect Mode (Remote Server)

For connecting to an existing Infisical instance deployed on a VPS.

1. **Authenticate** — Runs `infisical login` against the remote server (skipped with `--skip-login`).
2. **Verify config** — Checks that `.infisical.json` exists at the workspace root. If missing, instructs the first developer to commit the file.

### Reset Mode

Teardown the current Infisical setup. The mode (bootstrap or connect) is auto-detected from `siteUrl`.

**Bootstrap reset (local):**
1. Stops Docker Compose services (`docker compose down --volumes --remove-orphans`)
2. Removes `.env.infisical`
3. Removes `.infisical.json`
4. Runs `infisical logout`

**Connect reset (remote):**
1. Runs `infisical logout` (clears cached auth tokens)
2. Removes `.infisical.json` (local project link)
3. Prints reconnect hint

> Connect reset does NOT destroy the remote server — use `devenv destroy` for that.

## Prerequisites

| Tool | Auto-Install | Required For |
|------|-------------|--------------|
| Infisical CLI | Yes (via mise) | Bootstrap + Connect modes |
| Docker | **No** | Bootstrap mode only |

## Configuration

Controlled via `resist.config.ts`:

```typescript
tooling: {
  infisical: {
    siteUrl: 'http://localhost:8080',  // Local bootstrap
    // or: 'https://infisical.example.com'  // Remote connect
    docker: {
      composeFile: 'docker-compose.infisical.yml',  // Docker Compose file path
      service: 'infisical',                         // Docker Compose service name
    },
  },
}
```

### Expected Secret Structure

**Global project:**

| Folder | Secrets |
|--------|---------|
| `/cloudflare` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| `/github` | `GITHUB_PAT`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` |
| `/turbo` | `TURBO_TOKEN`, `TURBO_TEAM` |
| `/devenv` | `HETZNER_TOKEN` |

**Per-product project:**

| Folder | Secrets |
|--------|---------|
| `/api` | `D1_DATABASE_ID`, `KV_NAMESPACE_ID`, `API_SECRET_KEY` |
| `/app` | `POSTHOG_API_KEY`, `LEMON_SQUEEZY_API_KEY`, `REVENUECAT_API_KEY` |
| `/marketing` | `RESEND_API_KEY`, `GA_MEASUREMENT_ID` |
| `/status` | `STATUS_PAGE_TOKEN` |

## Architecture

```
secrets-setup/
├── index.ts          # Command definition + mode routing (bootstrap/connect/reset)
├── flags/
│   ├── index.ts      # Auto-discovery via import.meta.glob
│   ├── skip-login.ts # --skip-login flag definition
│   └── reset.ts      # --reset flag definition
├── locales/
│   ├── schema.ts     # Valibot schema for locale strings
│   └── locales/
│       └── en.ts     # English strings
└── utils/
    ├── bootstrap.ts  # Local Docker Compose setup + env generation
    ├── connect.ts    # Remote server authentication
    ├── provision.ts  # Project/folder/secret creation via Infisical API
    └── reset.ts      # Teardown: bootstrap reset (Docker) + connect reset (VPS)
```

## Examples

```sh
pnpm tool secrets-setup                  # Interactive setup (auto-detects mode)
pnpm tool secrets-setup --skip-login     # Re-provision without re-authenticating
pnpm tool secrets-setup --reset          # Tear down current setup
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Setup completed successfully |
| `1` | Setup failed or prerequisite missing |
| `2` | Invalid usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
