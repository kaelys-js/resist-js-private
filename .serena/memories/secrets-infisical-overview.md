# `@/secrets/infisical` — packages/shared/secrets/infisical

Infisical secrets-manager wrapper. Bundles secret fetching for Node + Cloudflare Workers contexts.

## Package
- **Name**: `@/secrets/infisical` (private, v1.0.0 — only versioned shared package)
- **Vitest project**: `secrets-infisical`
- **Dependencies**: `@infisical/sdk ^2.0.0`
- **Internal deps**: `@/utils/core`, `@/schemas/core-config`

## File structure (`src/`)
```
index.ts            ← barrel
client.ts           ← Infisical client lifecycle
client.test.ts
secrets.ts          ← secret fetching API
secrets.test.ts
cloudflare.ts       ← Cloudflare Worker env adapter
cloudflare.test.ts
environments.ts     ← Environment hierarchy + branch mapping
environments.test.ts
```

## Public API per file

### `client.ts` — connection lifecycle
- `createClient(opts)` — instantiate Infisical client
- `getClient()` — module singleton accessor
- `clearClient()` — reset
- `isAuthenticated()` — bool
- `getAuthMethod()` — which auth flow is active
- `resolveOptions(input)` — defaults + env-var resolution
- Types: `ClientOptions`, `ResolvedOptions`
- Constants: `ENV_VARS` — recognized env-var names for client config

### `secrets.ts` — secret fetching
- `getSecret(key, opts?)`
- `getSecrets(keys, opts?)`
- `getSecretsByKeys(keys, opts?)`
- `getAllSecrets(opts?)`
- `getProductSecrets(productName, opts?)`
- `getGlobalSecrets(opts?)`
- `hasSecret(key, opts?)`
- `loadSecretsToEnv(opts?)` — pulls secrets and writes to `process.env`
- All take Valibot-validated options schemas

### `cloudflare.ts` — Worker env adapter
- `createSecretsProxy(env)` — wraps Worker env binding object
- `getEnvSecret(env, key)`, `getEnvSecretOrDefault(env, key, default)`
- `hasEnvSecret(env, key)`, `hasRequiredSecrets(env, requiredKeys)`
- `validateWorkerEnv(env, schema)` — validates against a schema
- `withValidatedEnv(handler)` — middleware wrapping a fetch handler

### `environments.ts` — environment hierarchy
- `detectEnvironment()` — from current context (NODE_ENV, branch, etc.)
- `validateEnvironment(name)` 
- `canAccessEnvironment(current, target)` — auth-tier check
- `getParentEnvironment(name)`, `getChildEnvironments(name)`
- `getEnvironmentFromBranch(branch)` — uses branch-mapping table
- Constants: `DEFAULT_BRANCH_MAPPING`, `ENVIRONMENT_HIERARCHY`

## Patterns
- **Two runtime modes**:
  - Node — `client.ts` + `secrets.ts` (full SDK, can mutate `process.env`)
  - Cloudflare Worker — `cloudflare.ts` (proxy over the Workers env binding; no SDK calls)
- Module-singleton client (`getClient`/`clearClient`)
- All secret keys validated against `@/schemas/core-config` `secret-schemas.ts`
- Environment hierarchy is data-driven (tables, not switch statements)

## Used by
- `@storylyne/editor` — server-side secret access
- `@/cli` `secrets`/`secrets-setup`/`onboard` tools
- `@/config` (loader) — for env-var resolution
