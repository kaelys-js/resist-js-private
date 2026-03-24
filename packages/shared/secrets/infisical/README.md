# @/secrets/infisical

Type-safe Infisical secret management for the WebForge monorepo.

## Overview

Provides Result-pattern wrappers around the Infisical SDK for fetching, validating, and managing secrets. Supports Node.js server scripts and Cloudflare Workers.

## Source Files

| File | Description |
|------|-------------|
| `client.ts` | Singleton client factory with env var fallbacks and auth detection |
| `environments.ts` | Git branch → environment mapping and secret inheritance hierarchy |
| `secrets.ts` | Type-safe secret fetching with Valibot schema validation |
| `cloudflare.ts` | Cloudflare Workers integration with lazy validation proxy |

## Usage

```typescript
import { getSecrets } from '@/secrets/infisical/secrets';
import { AllSecretsSchema } from '@/schemas/core-config/secret-schemas';

const result = await getSecrets(AllSecretsSchema, { environment: 'production' });

if (result.ok) {
  const secrets = result.data;
}
```

## API Reference

### client.ts

| Export | Kind | Description |
|--------|------|-------------|
| `ClientOptionsSchema` | schema | Client configuration options |
| `ClientOptions` | type | Inferred client options |
| `ResolvedOptionsSchema` | schema | Fully resolved options (post-env-var) |
| `ResolvedOptions` | type | Inferred resolved options |
| `ENV_VARS` | const | Environment variable name mapping |
| `resolveOptions` | function | Resolve options with env var fallbacks |
| `getClient` | function | Get or create singleton client |
| `createClient` | function | Create new client (non-singleton) |
| `clearClient` | function | Clear cached client instance |
| `getAuthMethod` | function | Detect auth method from env vars |
| `isAuthenticated` | function | Check if client can access secrets |

### environments.ts

| Export | Kind | Description |
|--------|------|-------------|
| `ENVIRONMENT_HIERARCHY` | const | Ordered environment list for inheritance |
| `getEnvironmentFromBranch` | function | Map git branch to environment |
| `getParentEnvironment` | function | Get parent for secret inheritance |
| `getChildEnvironments` | function | Get child environments |
| `canAccessEnvironment` | function | Check secret access permissions |
| `detectEnvironment` | function | Auto-detect from env vars and CI |
| `validateEnvironment` | function | Validate environment string |

### secrets.ts

| Export | Kind | Description |
|--------|------|-------------|
| `GetSecretsOptionsSchema` | schema | Options for fetching secrets |
| `GetSecretsOptions` | type | Inferred options |
| `getSecrets` | function | Fetch and validate secrets against schema |
| `getSecret` | function | Fetch single secret by key |
| `getGlobalSecrets` | function | Fetch global secrets (path: /) |
| `getProductSecrets` | function | Fetch product-specific secrets |
| `getAllSecrets` | function | Fetch all secrets combined |
| `hasSecret` | function | Check if secret exists |
| `getSecretsByKeys` | function | Fetch multiple secrets by key |
| `loadSecretsToEnv` | function | Load secrets into process.env |

### cloudflare.ts

| Export | Kind | Description |
|--------|------|-------------|
| `validateWorkerEnv` | function | Validate Worker env bindings |
| `createSecretsProxy` | function | Lazy-validating secrets proxy |
| `getEnvSecret` | function | Get single secret from Worker env |
| `hasEnvSecret` | function | Check if secret exists in Worker env |
| `getEnvSecretOrDefault` | function | Get secret with fallback |
| `withValidatedEnv` | function | Validate env for middleware |
| `hasRequiredSecrets` | function | Check all required secrets present |

## Dependencies

- `@infisical/sdk` — Infisical Node.js SDK
- `@/schemas/common` — Shared primitive schemas
- `@/schemas/core-config/secret-schemas` — Secret validation schemas
- `@/schemas/result/result` — Result pattern and error codes
- `@/utils/result/safe` — Safe parse and error conversion
