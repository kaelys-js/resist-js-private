# Environment Variables & Secrets — webforge / resist-js-private

> Captured 2026-05-05. Branch: `main`. Companion to `secrets-infisical-overview` and `schemas-core-config-overview`.

The monorepo has a strict separation between three layers of "environment data". Confusing them is a common source of bugs.

## Three layers

### 1. Raw env (`process.env.*` / `import.meta.env.*`)

**`process.env.*`** — Node-only, mutable at runtime, available everywhere there's a Node `process`. Browser/edge runtimes don't have it.

- Wrapped by `getEnvRecord(): Result<EnvRecordWithUndefined>` in `packages/shared/utils/core/src/process.ts:240`. Returns empty object in non-Node runtimes.
- Wrapped by `detectEnvironment()` in `packages/shared/utils/core/src/environment.ts:447` — reads NODE_ENV/CI/CF flags and returns a typed `EnvironmentConfig`.
- **Lint rule `workspace/no-env-or-globals-in-shared-libs`** blocks direct `process.env.*` / `globalThis.*` / `global.*` access in shared library code (`packages/shared/...`). Allowed in: tests, mocks, fixtures (paths matching `__tests__`, `.test.`, `.spec.`, `mock`, `fixture`). Reason: shared libs must be runtime-portable.

**`import.meta.env.*`** — Vite-injected at BUILD time. Available in browser bundle. Read-only.

- Augmented with type declarations in `packages/shared/utils/{web-vitals,beacon}/src/env.d.ts` and `vite-env.d.ts`. Adds `DEV: boolean`, `PROD: boolean`, `MODE: string`, `SSR: boolean`.
- Used to gate dev-only console output in beacon/web-vitals reporters.

### 2. Source-injected build globals

Injected by Vite `define` at build time (and matched by Vitest `define` for tests). These appear as `__GLOBAL__` literals in source:

| Global               | Type   | Source                                          |
|----------------------|--------|--------------------------------------------------|
| `__APP_VERSION__`    | string | `getPackageVersion('./package.json')`            |
| `__GIT_COMMIT__`     | string | `getGitInfo().commit` (short SHA)                |
| `__GIT_COMMIT_FULL__`| string | `getGitInfo().commitFull`                        |
| `__GIT_BRANCH__`     | string | `getGitInfo().branch`                            |
| `__GIT_DIRTY__`      | boolean| `getGitInfo().dirty` (raw boolean, not stringified) |
| `__BUILD_TIMESTAMP__`| string | `new Date().toISOString()`                       |

Type declarations in `packages/shared/utils/core/src/build-globals.d.ts` — declared as ambient globals.

Set in 3 places (must be kept in sync):
1. `packages/shared/config/tooling/vite/src/index.ts:147-154` — production via `createViteConfig`.
2. `vitest.config.ts:193-200, 226-232, 356-362, 403-409` — test fixtures (hardcoded `"abc1234"` / `"test-branch"` / `"0.0.0-test"`).
3. Type declarations in `packages/shared/utils/core/src/build-globals.d.ts`.

**Used by**:
- `src/hooks.{client,server}.ts` (storylyne) — `setupGlobalErrorHandling({ release: __APP_VERSION__, serverName: __GIT_COMMIT__, tags: { branch: __GIT_BRANCH__, side: 'client'|'server' } })`.
- `src/hooks.server.ts` — `response.headers.set('X-App-Version', __APP_VERSION__); response.headers.set('X-Git-Commit', __GIT_COMMIT__);`
- `@/utils/devtools` — `BUILD_INFO` constant exposed to dev toolbar.

**Custom defines**: `createViteConfig` accepts `extraDefines: Record<string, string>`. No products use this currently.

### 3. Infisical-resolved secrets

Production secrets live in Infisical (https://infisical.com — open-source secrets manager). Two paths into the codebase:

#### Node-side path: `@/secrets/infisical/secrets`

```ts
import { getSecrets } from '@/secrets/infisical/secrets';
import { AllSecretsSchema } from '@/schemas/core-config/secret-schemas';

const result = await getSecrets(AllSecretsSchema, { environment: 'production' });
if (result.ok) { const secrets = result.data; }
```

- `getSecrets`, `getSecret`, `getProductSecrets`, `getGlobalSecrets`, `loadSecretsToEnv` — see `secrets-infisical-overview`.
- Validates against Valibot schemas from `@/schemas/core-config/secret-schemas.ts`.

#### Cloudflare Worker path: `@/secrets/infisical/cloudflare`

```ts
import { createSecretsProxy, validateWorkerEnv, withValidatedEnv } from '@/secrets/infisical/cloudflare';

const secrets = createSecretsProxy(env); // lazy validation
// Or middleware:
export default withValidatedEnv(handler);
```

- `createSecretsProxy(env)` — wraps the Worker `env` binding object as `ProductSecrets`. Validates lazily on first access. Throws on validation failure (integration boundary — Workers can't propagate Result).
- Secrets are synced to Workers via `pnpm tool secrets sync` → `wrangler secret put` (each secret pushed via stdin to avoid shell-escaping issues).

### Infisical client env vars (`packages/shared/secrets/infisical/src/client.ts:83`)

Recognized env-var names (the `ENV_VARS` constant):
- `INFISICAL_SITE_URL` — Infisical server URL (e.g., `https://app.infisical.com` or self-hosted).
- `INFISICAL_TOKEN` — service token (deprecated auth method).
- `INFISICAL_CLIENT_ID` — Universal Auth client ID (preferred).
- `INFISICAL_CLIENT_SECRET` — Universal Auth client secret.
- `INFISICAL_PROJECT_ID` — Infisical project ID for this workspace.
- `INFISICAL_ENV` — fallback environment when not specified.
- `INFISICAL_CACHE_TTL` — client-side cache TTL.
- `INFISICAL_DEBUG` — enable verbose logging.

Auth method auto-detected from which combination of env vars is set (`getAuthMethod()`). Schema: `InfisicalAuthMethodSchema` from `@/schemas/core-config/tooling`.

## Environment hierarchy

Defined in `packages/shared/secrets/infisical/src/environments.ts`:
- `ENVIRONMENT_HIERARCHY: ['development', 'staging', 'production']` — index 0 is least restrictive, 2 is most.
- `DEFAULT_BRANCH_MAPPING`: maps git branches to environments (e.g., `main` → `production`, `staging` → `staging`, anything else → `development`).
- `getEnvironmentFromBranch(branch)` — applies the mapping.
- `canAccessEnvironment(requesting, target)` — returns `Result<Bool>` whether `requesting` can access `target` (higher index = less restricted; can access same or more restricted).
- `detectEnvironment()` — priority chain:
  1. Already-set `INFISICAL_ENV`.
  2. `NODE_ENV` if it's a valid `StandardEnvironment` (development/staging/production).
  3. CI: if `CI === 'true'`, derive from branch via `GITHUB_REF_NAME`/`GITHUB_HEAD_REF`/`CI_COMMIT_BRANCH`. Default to `'staging'`.
  4. Default: `'development'` (local).

## Required env vars by environment

This codebase doesn't yet define a strict required-vars-per-env table. The current shape:

### Local dev (no Infisical)

- `NODE_ENV=development` (auto-defaults if unset).
- All Worker env bindings empty → `createDataService(_platform, delayMs)` returns mock service.
- No actual external secrets needed for storylyne to run locally.

### Local dev (with Infisical)

- All `INFISICAL_*` vars from above (auth flow varies by method).
- `pnpm tool secrets pull` or `loadSecretsToEnv()` populates `process.env`.

### Production (Cloudflare Worker)

- Cloudflare-set secrets (via `wrangler secret put` or dashboard) become Worker `env.*` bindings.
- `App.Platform.env: ProductSecrets` — typed by `@/schemas/core-config/secret-schemas` `ProductSecretsSchema`.
- Currently: NO secrets are required for storylyne to deploy because no production-code-paths read them yet (data layer is mock-only, no payment integration, no auth backend).

## Secret schema groups

From `packages/shared/schemas/core-config/src/secret-schemas.ts`:

**`GLOBAL_SECRET_SCHEMAS`** — workspace-level (Infisical path `/`):
- `Cloudflare`, `Turbo`, `DevEnv`, `GitHub`, `GitLab`, `Email` (Resend), `Status`, `Storage`, `Analytics`, `Auth`, `Database`.
- Subgroups: `All`, `Global`.

**`PRODUCT_SECRET_SCHEMAS`** — per-product (Infisical path `/<product>/`):
- `Product`, `Payment`, `RevenueCat`.
- Subgroups: per-product layer (api, auth, app, marketing, status, storage).

**Building blocks**:
- `ApiKeySchema` — non-empty trimmed string.
- `DatabaseUrlSchema` — `postgres://` / `postgresql://` URL.
- `DurationStringSchema` — `5m`, `30s`, `1h` style.
- `NonEmptyStringSchema` — trimmed, min length 1.
- `SecretKeySchema` — high-entropy string.
- `UrlStringSchema` — valid URL.

**Provider expectations** (from `secrets-setup/utils/provision.ts:49`):
- `/cloudflare`: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- `/turbo`: `TURBO_TOKEN`, `TURBO_TEAM` (remote turbo cache)
- `/devenv`: `HETZNER_TOKEN`
- `/api`: `D1_DATABASE_ID`, `KV_NAMESPACE_ID`, `API_SECRET_KEY`
- `/app`: `POSTHOG_API_KEY`, `LEMON_SQUEEZY_API_KEY`, `REVENUECAT_API_KEY`
- `/marketing`: `RESEND_API_KEY`, `GA_MEASUREMENT_ID`
- `/status`: `STATUS_PAGE_TOKEN`

(These are the schemas declared in expectation of integrations; only the Cloudflare and Infisical paths are wired up to actual code today.)

## .env files (mostly NOT used)

- `.gitignore` excludes `.env` and `.env.*` EXCEPT `.env.example`.
- **No `.env.example` is currently tracked anywhere in the repo.**
- Lint rule `workspace/no-tracked-env-files` enforces no `.env*` files in git (except `.env.example`).
- Lint rule `workspace/no-multiple-env-files` enforces only `.env`, `.env.example`, `.env.template` at workspace root.
- The `secrets migrate` tool (`packages/shared/utils/cli/src/tools/secrets/utils/migrate.ts`) discovers `.env*` files (10 patterns), parses KEY=VALUE entries, maps filenames to Infisical environments (via `mapFileToEnvironment`: `production`/`prod` → production, `staging`/`stag` → staging, else development), and uploads via Infisical CLI.
- The intent: developers don't keep `.env` files; secrets live in Infisical and get pulled on-demand.

## Turbo passthrough env vars

`turbo.json:4`: `globalPassThroughEnv: ["NODE_ENV", "CI", "VITE_*", "PUBLIC_*", "PLAYWRIGHT_*"]`.

Only these env-vars cross the turbo cache boundary. Changes to other env vars do NOT invalidate the cache. Implications:
- `VITE_*` and `PUBLIC_*`: SvelteKit/Vite convention — these are baked into the client bundle. Cache invalidates on change.
- `PLAYWRIGHT_*`: e2e config (PLAYWRIGHT_TEST_BASE_URL, PLAYWRIGHT_BROWSERS_PATH, etc.).
- `NODE_ENV` + `CI`: standard branching switches.
- Secret env-vars (`INFISICAL_*`, `CLOUDFLARE_*`) DON'T invalidate the cache — intentional (secrets shouldn't bust builds).

## Files referencing `process.env.*` (top hits, app code)

- `packages/shared/secrets/infisical/src/client.ts` — uses `ENV_VARS.*` constants (the INFISICAL_* set).
- `packages/shared/secrets/infisical/src/secrets.ts:115` — `process.env[ENV_VARS.PROJECT_ID] ?? ''` (project ID fallback).
- `packages/shared/secrets/infisical/src/environments.ts:265-275` — `NODE_ENV`, `CI`, `GITHUB_REF_NAME`, `GITHUB_HEAD_REF`, `CI_COMMIT_BRANCH` for env detection.
- `packages/shared/utils/core/src/process.ts:240-263` — `getEnvRecord()` wrapper.
- `packages/shared/utils/core/src/environment.ts:447+` — `detectEnvironment()` reads many vars (NODE_ENV, CI, NO_COLOR, FORCE_COLOR, COLORTERM, TERM, COLUMNS, etc.).
- `packages/shared/config/tooling/vscode/src/shared/runner.ts:36` — sets `FORCE_COLOR=0` and prepends `node_modules/.bin` to `PATH` for child processes.
- `packages/shared/config/tooling/lint/src/cli.ts:22` — prepends workspace `node_modules/.bin` to `PATH`.
- `packages/shared/utils/cli/src/tools/secrets-setup/index.ts:112` — `process.env.INFISICAL_API_URL = siteUrl` (test connection).
- `packages/shared/config/tooling/svelte/src/index.ts:347` — `IS_PRODUCTION: Bool = process.env.NODE_ENV === 'production'`.

## Files referencing `import.meta.env.*`

Mostly type declarations (`*.d.ts`). Active usage is minimal:
- `@/utils/web-vitals` — gates verbose vital logging on `import.meta.env.DEV`.
- `@/utils/beacon` — gates beacon-noisy paths on `import.meta.env.DEV`.

## Critical relationships

1. **Adding a new build global**: type-decl in `build-globals.d.ts`, define in vite factory `index.ts:147`, define in vitest.config.ts `define` (every project that uses it).
2. **Adding a new Infisical secret**: schema entry in `secret-schemas.ts` (under appropriate group), secrets-setup `getExpectedSecrets` if it should be provisioned, optionally `validateWorkerEnv` if it's a Worker secret.
3. **Reading a Worker secret in a route**: `event.platform?.env?.<KEY>` — typed via `App.Platform.env` (set in `app.d.ts`). Use `createSecretsProxy` for lazy-validated access.
4. **Reading a Node secret in CLI / build**: `getSecret(SchemaName, { key, environment })` from `@/secrets/infisical/secrets` — never raw `process.env`.
5. **Test-time env-var mocking**: tests can write to `process.env.*` directly (e.g., `workspace-rules-4.test.ts` sets `MR_CHANGED_FILES`/`MR_APPROVED`); restore in afterEach. Lint rule allows env access in test files.
