# 00 — Foundation: Tool Rename, Config Inheritance, Schema Foundation, Custom Caddy Build

## Context

The `dev-proxy` CLI tool (`pnpm tool dev-proxy`) is being expanded from a simple HTTPS reverse proxy to a full Cloudflare edge simulation engine. This plan covers:

1. **Rename** `dev-proxy` → `edge` (`pnpm tool edge`)
2. **Config inheritance model** — global defaults + per-product overrides
3. **Edge config schema foundation** — top-level `EdgeConfigSchema` that all feature schemas plug into
4. **Custom Caddy build** via `xcaddy` with `coraza-caddy` + `caddy-ratelimit` modules
5. **`.resist/` directory structure** for local data

## Documentation Links

- Caddy: https://caddyserver.com/docs/
- xcaddy: https://github.com/caddyserver/xcaddy
- coraza-caddy: https://github.com/corazawaf/coraza-caddy
- caddy-ratelimit: https://github.com/mholt/caddy-ratelimit
- Valibot: https://valibot.dev/

---

## 1. Tool Rename: `dev-proxy` → `edge`

### Files to rename/move

```
packages/shared/utils/cli/src/tools/dev-proxy/  →  packages/shared/utils/cli/src/tools/edge/
```

Directory contents (all move):
- `index.ts` (main tool entry)
- `flags/index.ts` (flag definitions)
- `locales/schema.ts` (locale string schema)
- `locales/locales/en.ts` (English locale)
- `README.md`

### Files that reference `dev-proxy` (update all imports/strings)

| File | Change |
|------|--------|
| `packages/shared/utils/cli/src/utils/installer.ts` | Path imports |
| `packages/shared/utils/cli/src/schemas/index.ts` | Path imports |
| `packages/shared/utils/cli/src/utils/locales.ts` | Path imports |
| `packages/shared/utils/cli/src/utils/command.ts` | Path imports |
| `packages/shared/utils/cli/README.md` | Documentation references |
| `packages/tools/README.md` | Documentation references |

The tool dispatcher at `packages/shared/utils/cli/src/utils/core.ts` uses dynamic import:
```typescript
mod = await import(`../tools/${tool}/index.ts`);
```
This means renaming the directory to `edge/` is sufficient — `pnpm tool edge` will resolve to `../tools/edge/index.ts` automatically.

### Code changes in `index.ts` (now `edge/index.ts`)

```diff
- * Dev Proxy Tool
+ * Edge Tool
  *
- * Starts a local HTTPS reverse proxy using Caddy and mkcert.
+ * Starts a local Cloudflare edge simulation using Caddy and mkcert.
  * Discovers products from `packages/products/`, generates per-service
  * virtual hosts, provisions TLS certificates, and watches
  * `resist.config.ts` for hot reload.
  *
- * Usage: `<pm> tool dev-proxy [--dry-run] [--expose] [--tunnel]`
+ * Usage: `<pm> tool edge [--dry-run] [--expose] [--tunnel]`
  *
  * @module
  */

-import { TOOL_FLAG_DEFS } from '@/cli/tools/dev-proxy/flags';
-import type { BuiltDevProxyStrings } from '@/cli/tools/dev-proxy/locales/schema';
+import { TOOL_FLAG_DEFS } from '@/cli/tools/edge/flags';
+import type { BuiltEdgeStrings } from '@/cli/tools/edge/locales/schema';
```

### Locale schema rename

```diff
// locales/schema.ts
-export type BuiltDevProxyStrings = ...
+export type BuiltEdgeStrings = ...
```

### Flag definitions update

```diff
// flags/index.ts — update tool name in descriptions
-description: 'dev-proxy tool flags'
+description: 'edge tool flags'
```

---

## 2. Config Inheritance Model

### Architecture

```
resist.config.ts (global)
  tooling.edge: EdgeConfigSchema  ← NEW (global defaults)

product/config/ (per-product)
  edge: EdgeConfigSchema          ← overrides (deep merge)
```

The merged config is consumed by:
- **`pnpm tool edge`** → generates Caddyfile + starts companion services
- **`product/iac/`** → Pulumi reads same config → generates CF resources

### Deep merge strategy

```typescript
/**
 * Deep-merges per-product edge config over global defaults.
 * Product values win. Arrays are replaced (not concatenated).
 * Undefined product values inherit from global.
 *
 * @param global - Global edge config from `resist.config.ts`.
 * @param product - Per-product edge config overrides.
 * @returns Merged edge config.
 */
function mergeEdgeConfig(
  global: EdgeConfig,
  product: Partial<EdgeConfig>,
): Result<EdgeConfig> {
  // Deep merge implementation — product values win, arrays replaced
  const merged: Unknown = deepMerge(global, product);
  return safeParse(EdgeConfigSchema, merged);
}
```

### Schema addition to `tooling.ts`

```diff
// packages/shared/schemas/core-config/src/tooling.ts

+import { EdgeConfigSchema } from '@/schemas/core-config/edge';

 export const ToolingSchema = v.strictObject({
-	/** Dev proxy configuration */
-	devProxy: v.optional(DevProxySchema, {}),
+	/** Dev proxy configuration (ports, TLS, local TLD) */
+	devProxy: v.optional(DevProxySchema, {}),
+	/** Cloudflare edge simulation configuration */
+	edge: v.optional(EdgeConfigSchema, {}),
 	/** Formatting configuration */
 	formatting: v.optional(FormattingSchema, {}),
```

> **Note**: `devProxy` is kept — it holds port/TLD/HTTPS config that the edge tool still needs. The `edge` field holds Cloudflare-specific feature config (SSL, WAF, caching, etc.). The edge tool reads BOTH `tooling.devProxy` (for ports) and `tooling.edge` (for CF features).

---

## 3. Edge Config Schema Foundation

### New file: `packages/shared/schemas/core-config/src/edge.ts`

This is the **root schema** that composes all feature schemas:

```typescript
/**
 * Edge Config Schema
 *
 * Root schema for Cloudflare edge simulation configuration.
 * Composes feature-specific schemas into a single top-level schema.
 * Used by both the local edge tool (Caddy) and Pulumi IaC generation.
 *
 * @module
 */

import * as v from 'valibot';

import { SslConfigSchema } from '@/schemas/core-config/edge-ssl';
import { WafConfigSchema } from '@/schemas/core-config/edge-security';
import { RateLimitConfigSchema } from '@/schemas/core-config/edge-security';
import { BotConfigSchema } from '@/schemas/core-config/edge-security';
import { FirewallConfigSchema } from '@/schemas/core-config/edge-security';
import { RulesConfigSchema } from '@/schemas/core-config/edge-rules';
import { CacheConfigSchema } from '@/schemas/core-config/edge-cache';
import { PerformanceConfigSchema } from '@/schemas/core-config/edge-performance';
import { AccessConfigSchema } from '@/schemas/core-config/edge-access';
import { DnsConfigSchema } from '@/schemas/core-config/edge-dns';
import { EmailConfigSchema } from '@/schemas/core-config/edge-email';
import { AnalyticsConfigSchema } from '@/schemas/core-config/edge-analytics';
import { LoadBalancerConfigSchema } from '@/schemas/core-config/edge-load-balancing';
import { MediaConfigSchema } from '@/schemas/core-config/edge-media';
import { ApiSecurityConfigSchema } from '@/schemas/core-config/edge-api-security';
import { NotificationsConfigSchema } from '@/schemas/core-config/edge-notifications';
import { ClientSecurityConfigSchema } from '@/schemas/core-config/edge-client-security';
import { ChallengesConfigSchema } from '@/schemas/core-config/edge-challenges';

// =============================================================================
// Edge Config Schema
// =============================================================================

/**
 * Valibot schema for the complete Cloudflare edge simulation configuration.
 * Every setting here maps 1:1 to a Cloudflare zone/account setting.
 * The same schema drives local Caddy simulation AND Pulumi IaC generation.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 *
 * const result = safeParse(EdgeConfigSchema, {
 *   enabled: true,
 *   ssl: { alwaysUseHttps: true, minTlsVersion: '1.2' },
 *   waf: { owasp: { enabled: true } },
 *   cache: { defaultBrowserTtl: 14400 },
 * });
 * if (!result.ok) return result;
 * const config: EdgeConfig = result.data;
 * ```
 */
export const EdgeConfigSchema = v.strictObject({
  /** Enable edge simulation (when false, tool acts as plain reverse proxy) */
  enabled: v.optional(v.boolean(), false),

  /** SSL/TLS configuration */
  ssl: v.optional(SslConfigSchema, {}),

  /** WAF configuration (Coraza + OWASP CRS) */
  waf: v.optional(WafConfigSchema, {}),

  /** Rate limiting configuration */
  rateLimiting: v.optional(RateLimitConfigSchema, {}),

  /** Bot management configuration */
  bot: v.optional(BotConfigSchema, {}),

  /** IP firewall, UA blocking, zone lockdown */
  firewall: v.optional(FirewallConfigSchema, {}),

  /** Rules engine (transforms, redirects, origin, config, snippets) */
  rules: v.optional(RulesConfigSchema, {}),

  /** Cache configuration */
  cache: v.optional(CacheConfigSchema, {}),

  /** Performance settings (protocols, compression, images) */
  performance: v.optional(PerformanceConfigSchema, {}),

  /** Cloudflare Access configuration */
  access: v.optional(AccessConfigSchema, {}),

  /** Challenge & Turnstile configuration */
  challenges: v.optional(ChallengesConfigSchema, {}),

  /** DNS configuration */
  dns: v.optional(DnsConfigSchema, {}),

  /** Email routing configuration */
  email: v.optional(EmailConfigSchema, {}),

  /** Analytics & observability */
  analytics: v.optional(AnalyticsConfigSchema, {}),

  /** Load balancing */
  loadBalancing: v.optional(LoadBalancerConfigSchema, {}),

  /** Media (Stream, Images, fonts, WebRTC) */
  media: v.optional(MediaConfigSchema, {}),

  /** API security (Shield, JWT, schema validation) */
  apiSecurity: v.optional(ApiSecurityConfigSchema, {}),

  /** Notification policies */
  notifications: v.optional(NotificationsConfigSchema, {}),

  /** Client-side security (Page Shield, CSP) */
  clientSecurity: v.optional(ClientSecurityConfigSchema, {}),
});

/** Inferred output type of {@link EdgeConfigSchema}. */
export type EdgeConfig = v.InferOutput<typeof EdgeConfigSchema>;
```

### Stub schemas for each feature file

Each feature schema file (01-19) starts as a stub that the corresponding plan fills in. Initial stub pattern:

```typescript
// packages/shared/schemas/core-config/src/edge-ssl.ts (example stub)
/**
 * SSL/TLS Edge Config Schema
 *
 * @module
 */
import * as v from 'valibot';

export const SslConfigSchema = v.strictObject({});
export type SslConfig = v.InferOutput<typeof SslConfigSchema>;
```

Each feature plan defines the complete schema for its file.

---

## 4. Custom Caddy Build

### New system tool versions

```diff
// packages/shared/schemas/core-config/src/versions.ts — SystemToolVersionsSchema

+	/** Go language (required for xcaddy build) */
+	go: v.optional(PinnedVersionSchema, '1.24.0'),
+	/** xcaddy — custom Caddy builder */
+	xcaddy: v.optional(PinnedVersionSchema, '0.4.4'),
+	/** ClickHouse — Analytics Engine simulation */
+	clickhouse: v.optional(PinnedVersionSchema, '25.2.1'),
+	/** Mailpit — local email routing simulation */
+	mailpit: v.optional(PinnedVersionSchema, '1.23.1'),
+	/** coturn — local TURN server for WebRTC */
+	coturn: v.optional(PinnedVersionSchema, '4.6.3'),
```

### mise.toml task for building custom Caddy

```toml
# Generated by sync when edge.enabled = true
# packages/shared/utils/cli/src/tools/sync/template/packages/mise.toml.hbs

{{#if tooling.edge.enabled}}
[tools]
go = "{{versions.systemTools.go}}"

[tasks.build-caddy]
description = "Build custom Caddy binary with edge simulation modules"
run = """
go install github.com/caddyserver/xcaddy/cmd/xcaddy@v{{versions.systemTools.xcaddy}}
xcaddy build v{{versions.systemTools.caddy}} \
  --with github.com/corazawaf/coraza-caddy/v2 \
  --with github.com/mholt/caddy-ratelimit \
  --output .resist/bin/caddy-edge
"""
{{/if}}
```

### Edge tool: custom Caddy binary detection

```diff
// packages/shared/utils/cli/src/tools/edge/index.ts — startProxy()

+/**
+ * Resolves the Caddy binary path.
+ * If edge simulation is enabled and custom binary exists, use it.
+ * Otherwise, fall back to system Caddy.
+ *
+ * @param edgeEnabled - Whether edge simulation is enabled.
+ * @returns Path to the Caddy binary.
+ */
+function resolveCaddyBinary(edgeEnabled: Bool): Result<Path> {
+	if (edgeEnabled) {
+		const customBinary: Path = '.resist/bin/caddy-edge' as Path;
+		// Check if custom binary exists
+		// If not, log warning and fall back to system caddy
+	}
+	return isToolAvailable('caddy');
+}
```

---

## 5. `.resist/` Directory Structure

Created by the edge tool on first run when `edge.enabled = true`:

```
.resist/
├── bin/
│   └── caddy-edge          # Custom Caddy binary (built by mise)
├── keys/
│   ├── access-signing.pem  # Ed25519 key for Access JWT simulation
│   └── access-signing.pub  # Public key
├── cache/                  # Tiered cache L2 (disk)
├── cache-reserve/          # Cache Reserve persistent storage
├── images/                 # Cloudflare Images local store
├── stream/                 # Cloudflare Stream local store
├── pipelines/              # Pipeline event sinks (ndjson)
├── logs/
│   ├── access.ndjson       # Caddy access logs
│   ├── bot-analytics.ndjson
│   ├── cache.ndjson
│   ├── csp-violations.ndjson
│   ├── nel.ndjson
│   ├── web-analytics.ndjson
│   ├── tail.ndjson
│   └── logpush/            # CF Logpush format logs
├── clickhouse/             # Analytics Engine (ClickHouse) data
├── geo/                    # MaxMind GeoLite2 DB (optional)
├── mailpit/                # Mailpit data directory
└── hosts                   # Generated /etc/hosts entries
```

### Directory creation function

```typescript
/**
 * Ensures the `.resist/` directory structure exists.
 * Creates all subdirectories needed by enabled edge features.
 *
 * @param config - Merged edge config.
 * @returns Ok on success, Err on filesystem failure.
 */
function ensureResistDirectories(config: EdgeConfig): Result<Void> {
  const dirs: StrArray = [
    '.resist/bin',
    '.resist/keys',
    '.resist/logs',
    '.resist/logs/logpush',
  ] as StrArray;

  if (config.cache.enabled) {
    dirs.push('.resist/cache' as Str);
    dirs.push('.resist/cache-reserve' as Str);
  }
  if (config.analytics.enabled) {
    dirs.push('.resist/clickhouse' as Str);
  }
  if (config.email.enabled) {
    dirs.push('.resist/mailpit' as Str);
  }
  if (config.media.images.enabled) {
    dirs.push('.resist/images' as Str);
  }
  if (config.media.stream.enabled) {
    dirs.push('.resist/stream' as Str);
  }
  // ... etc for each feature

  for (const dir of dirs) {
    const result: Result<Void> = mkdirp(dir);
    if (!result.ok) return result;
  }

  return okUnchecked(undefined as Void);
}
```

### `.gitignore` addition

```diff
# .gitignore (workspace root)
+# Edge simulation local data
+.resist/
```

---

## 6. Enhanced `generateCaddyfile()` Hook Point

The existing `generateCaddyfile()` produces a simple Caddyfile. The enhancement adds a hook for edge middleware injection:

```diff
// packages/shared/utils/cli/src/tools/edge/index.ts

 function generateCaddyfile(
   services: ServiceArray,
   certFile: Path,
   keyFile: Path,
   expose: Bool,
+  edgeConfig: EdgeConfig,
 ): Result<Str> {
   // ... existing base Caddyfile generation ...

+  // If edge simulation is enabled, inject edge middleware
+  if (edgeConfig.enabled) {
+    const edgeCaddyResult: Result<Str> = generateEdgeCaddyDirectives(edgeConfig);
+    if (!edgeCaddyResult.ok) return edgeCaddyResult;
+    // Insert edge directives into each site block
+  }

   return okUnchecked(caddyfile as Str);
 }
```

The `generateEdgeCaddyDirectives()` function is defined in `utils/caddy.ts` and is the subject of all subsequent feature plans (01-18).

---

## Verification

1. **Rename**: `pnpm tool edge --help` works (tool dispatcher resolves `edge/index.ts`)
2. **Schema**: `safeParse(EdgeConfigSchema, { enabled: true })` validates successfully
3. **Config inheritance**: Global + product configs deep-merge correctly
4. **Caddy build**: `mise run build-caddy` produces `.resist/bin/caddy-edge`
5. **Directory**: Running `pnpm tool edge` with `edge.enabled: true` creates `.resist/` structure
6. **Dry run**: `pnpm tool edge --dry-run` outputs enhanced Caddyfile skeleton

## Dependencies

- None (this is the foundation — all other plans depend on this)

## Implementation Order

1. Rename directory + update all imports
2. Create stub schema files
3. Add `edge` field to `ToolingSchema`
4. Add system tool versions
5. Add `.resist/` directory creation
6. Add custom Caddy binary resolution
7. Add `edgeConfig` parameter to `generateCaddyfile()`
8. Update mise.toml template for `build-caddy` task
9. Tests
