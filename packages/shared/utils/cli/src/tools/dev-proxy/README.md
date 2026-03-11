# dev-proxy

Start a local HTTPS development proxy using Caddy and mkcert.

## Usage

```
pnpm tool dev-proxy [flags]
```

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--dry-run` | `-n` | `boolean` | Preview configuration without starting Caddy or creating certificates |
| `--expose` | `-e` | `boolean` | Expose services to the local network (bind to 0.0.0.0) |
| `--tunnel` | `-t` | `boolean` | Expose services to the internet via Cloudflare Tunnel |

## How It Works

1. Auto-installs missing prerequisites (`mkcert`, `caddy`, and `cloudflared` if `--tunnel`)
2. Discovers all products from `packages/products/`
3. Allocates ports per service using the base port and increment from `resist.config.ts`:
   - Per product: `app` (+0), `api` (+1), `status` (+2), `assets` (+3), `marketing` (+4)
   - Global services: `admin`, `docs`, `qa` on fixed ports
4. Runs `mkcert -install` and generates a single TLS certificate covering all local domains
5. Generates a Caddyfile with reverse-proxy entries including:
   - TLS termination via mkcert certificates
   - Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Server removal)
   - CORS preflight handling (OPTIONS responses with appropriate headers)
   - Compression (gzip + zstd via `encode`)
6. Spawns Caddy as a subprocess, piping the Caddyfile via stdin
7. Checks service health and displays status indicators per service
8. Watches `resist.config.ts` for changes and hot-reloads Caddy (500ms debounce)
9. Handles SIGINT/SIGTERM for graceful shutdown

### Domain Naming

| Service | Domain pattern |
|---------|---------------|
| marketing | `{product}.{localTld}` |
| all others | `{service}.{product}.{localTld}` |

Example with `localTld = ".localhost"` and product `myapp`:

```
myapp.localhost         -> :3004  (marketing)
app.myapp.localhost     -> :3000  (app)
api.myapp.localhost     -> :3001  (api)
status.myapp.localhost  -> :3002  (status)
assets.myapp.localhost  -> :3003  (assets)
```

### Security Headers

Every proxied service automatically receives:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Server` | _(removed)_ | Hide server identity |
| `Access-Control-Allow-Origin` | `*` | CORS for local dev |

CORS preflight requests (OPTIONS) are handled automatically with a 204 response.

### Auto-Install

Prerequisites are automatically installed when missing (skipped in `--dry-run`) via `installToolAsync()`:

| Tool | Purpose |
|------|---------|
| `caddy` | HTTPS reverse proxy server |
| `mkcert` | Local TLS certificate generation |
| `cloudflared` | Cloudflare Tunnel (only with `--tunnel`) |

The installer detects the platform and uses the appropriate package manager or direct download. Concurrent installations are serialized to prevent conflicts.

### `--expose` (LAN Access)

Adds port-based Caddy site blocks bound to `0.0.0.0` so services are accessible from
other devices on the local network via `https://<hostname>.local:<PORT>`.

- Adds LAN IP addresses and mDNS hostname to certificate SANs
- Forces certificate regeneration on each start (IPs may change via DHCP)
- Displays both local and network URLs

### `--tunnel` (Internet Exposure)

Spawns Cloudflare tunnels to expose services to the internet.

**Ephemeral tunnels** (default): One quick tunnel per service using `cloudflared`. Each service gets a
random `*.trycloudflare.com` URL — no Cloudflare account required.

**Named tunnels** (configured): When `tunnelName` is set in `resist.config.ts`, uses a persistent
named tunnel with a stable URL. Requires `cloudflared tunnel create` setup and DNS configuration.
Named tunnels are essential for webhook development and OAuth callbacks where URLs must remain stable.

- Tunnel URLs are parsed from cloudflared stderr (30 second timeout per tunnel)
- Tunnels are stopped and restarted on config hot-reload
- `--tunnel` and `--expose` are independent and composable

### Health Checks

When displaying the service configuration table, dev-proxy checks if each service is actually
responding by making a `curl` request. Services show healthy or unreachable status indicators.
This helps quickly identify which dev servers are running.

## Configuration

Controlled via `resist.config.ts`:

```typescript
tooling: {
  devProxy: {
    port: 3000,
    https: true,
    localTld: '.localhost',
    tunnelName: '',         // Set for persistent tunnel URLs
    tunnelHostname: '',     // Custom hostname for named tunnel
  },
}
```

## Examples

```sh
pnpm tool dev-proxy                  # Start the HTTPS proxy
pnpm tool dev-proxy --dry-run        # Preview port allocations and domains
pnpm tool dev-proxy --expose         # Expose services to the local network
pnpm tool dev-proxy --tunnel         # Expose services to the internet
pnpm tool dev-proxy --expose --tunnel # Both LAN and internet exposure
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Proxy stopped gracefully |
| `1` | Failed to start (missing tools, port conflict) |
| `2` | Invalid command usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Interrupted (Ctrl+C) |
