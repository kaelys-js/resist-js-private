# Infisical Usage Guide

Comprehensive guide for day-to-day usage of Infisical in the resist.js monorepo.

## Table of Contents

1. [Daily Development Workflow](#daily-development-workflow)
2. [CLI Reference](#cli-reference)
3. [SDK Usage](#sdk-usage)
4. [Cloudflare Workers](#cloudflare-workers)
5. [SvelteKit Integration](#sveltekit-integration)
6. [Testing with Secrets](#testing-with-secrets)
7. [Advanced Patterns](#advanced-patterns)

---

## Daily Development Workflow

### Starting Your Day

```bash
# 1. Pull latest code
git pull origin main

# 2. Start dev server with secrets
infisical run --env=local -- pnpm dev
```

That's it. No copying `.env` files, no asking teammates for secrets.

### Working on Features

```bash
# Create feature branch
git checkout -b feature/new-payment-flow

# Secrets automatically use 'feature' environment based on branch name
infisical run -- pnpm dev
# (branch pattern feature/* maps to 'feature' environment)
```

### Checking Secret Values

```bash
# List all secrets (values hidden)
infisical secrets --env=local

# List with values shown
infisical secrets --env=local --plain

# Get specific secret
infisical secrets get JWT_SECRET --env=local --plain
```

### Adding New Secrets

**For a secret you need locally:**
```bash
# Add to local environment only
infisical secrets set MY_NEW_SECRET=value --env=local
```

**For a secret the team needs:**
1. Add to appropriate environment in Infisical dashboard
2. Or use CLI with appropriate permissions:
```bash
infisical secrets set MY_NEW_SECRET=value --env=staging
```

---

## CLI Reference

### Authentication

```bash
# Login (opens browser)
infisical login

# Check who you're logged in as
infisical user

# Logout
infisical logout
```

### Running Commands

```bash
# Basic usage
infisical run -- <command>

# Specify environment
infisical run --env=staging -- pnpm build

# With secret path (folder)
infisical run --env=local --path=/database -- pnpm db:migrate

# Multiple paths
infisical run --env=local --path=/database --path=/auth -- pnpm dev
```

### Managing Secrets

```bash
# List secrets
infisical secrets --env=local

# Get one secret
infisical secrets get DATABASE_URL --env=local

# Set a secret
infisical secrets set KEY=value --env=local

# Set secret from file
infisical secrets set PRIVATE_KEY="$(cat key.pem)" --env=local

# Delete a secret
infisical secrets delete KEY --env=local

# Set multiple secrets at once
infisical secrets set KEY1=value1 KEY2=value2 --env=local
```

### Export Secrets

```bash
# Export as shell format
infisical export --env=local

# Export as JSON
infisical export --env=local --format=json

# Export as YAML
infisical export --env=local --format=yaml

# Export to file (for debugging only, don't commit!)
infisical export --env=local > .env.debug
```

### Our Custom CLI Tools

```bash
# Health check
pnpm --filter @resist/infisical doctor

# Migrate .env files
pnpm --filter @resist/infisical migrate --dry-run
pnpm --filter @resist/infisical migrate

# Sync to Cloudflare
pnpm --filter @resist/infisical sync --env=staging

# Rotate secrets
pnpm --filter @resist/infisical rotate --env=staging --category=jwt
```

---

## SDK Usage

### Basic Secret Fetching

```typescript
import { getSecrets, getSecret } from '@resist/infisical';

// Get all secrets for an environment
const secrets = await getSecrets('local');
console.log(secrets.DATABASE_URL);

// Get a single secret
const jwtSecret = await getSecret('JWT_SECRET', 'local');
```

### With Valibot Validation

```typescript
import { getProductSecrets, getGlobalSecrets } from '@resist/infisical';

// Fetch and validate product secrets
const secrets = await getProductSecrets('my-product', 'staging');

// Now you have type-safe, validated secrets
secrets.database.url;        // string (validated as URL)
secrets.auth.jwtSecret;      // string (validated as 64+ chars)
secrets.stripe.secretKey;    // string (validated as sk_*)

// Fetch global (infrastructure) secrets
const globalSecrets = await getGlobalSecrets('staging');
globalSecrets.cloudflare.apiToken;
```

### Loading into process.env

```typescript
import { loadSecretsToEnv } from '@resist/infisical';

// Load all secrets into process.env
await loadSecretsToEnv('local');

// Now access via process.env
console.log(process.env.DATABASE_URL);
```

### Client Configuration

```typescript
import { createInfisicalClient } from '@resist/infisical/client';

// Default client (uses INFISICAL_TOKEN or machine identity)
const client = createInfisicalClient();

// Custom configuration
const client = createInfisicalClient({
  siteUrl: 'https://your-self-hosted-infisical.com',
  // Authentication is auto-detected from environment
});
```

---

## Cloudflare Workers

### Basic Validation

```typescript
// src/index.ts
import { validateEnv } from '@resist/infisical/cloudflare';
import { ProductSecretsSchema } from '@resist/infisical/schemas';

interface Env {
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  STRIPE_SECRET_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Validate at the start of each request (or use scheduled warmup)
    const secrets = validateEnv(env, ProductSecretsSchema);

    // secrets is now fully typed and validated
    return new Response(JSON.stringify({
      dbConfigured: !!secrets.database.url,
      authConfigured: !!secrets.auth.jwtSecret,
    }));
  }
};
```

### Using the Wrapper

```typescript
import { withValidatedEnv } from '@resist/infisical/cloudflare';
import { ProductSecretsSchema } from '@resist/infisical/schemas';

// Secrets are automatically validated before your handler runs
export default withValidatedEnv(ProductSecretsSchema, {
  async fetch(request, env, ctx, secrets) {
    // secrets is already validated and typed
    const db = createDbClient(secrets.database.url);

    return new Response('OK');
  },

  async scheduled(controller, env, ctx, secrets) {
    // Also works for scheduled handlers
    await runBackgroundJob(secrets);
  }
});
```

### Secrets Proxy Pattern

```typescript
import { createSecretsProxy } from '@resist/infisical/cloudflare';
import { ProductSecretsSchema } from '@resist/infisical/schemas';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Create lazy-validating proxy
    const secrets = createSecretsProxy(env, ProductSecretsSchema);

    // Validation happens on first access
    // Useful for conditional secret usage
    if (request.url.includes('/api/billing')) {
      // Only validates stripe secrets when actually needed
      const stripeKey = secrets.stripe.secretKey;
    }

    return new Response('OK');
  }
};
```

### Syncing Secrets

```bash
# Sync all product secrets to a worker
pnpm --filter @resist/infisical sync \
  --env=staging \
  --worker=my-product-api

# Sync specific folder only
pnpm --filter @resist/infisical sync \
  --env=staging \
  --worker=my-product-api \
  --path=/database

# Dry run (see what would be synced)
pnpm --filter @resist/infisical sync \
  --env=staging \
  --worker=my-product-api \
  --dry-run
```

---

## SvelteKit Integration

### Server-Side Secrets

```typescript
// src/lib/server/secrets.ts
import { getProductSecrets } from '@resist/infisical';
import { env } from '$env/dynamic/private';

// Determine environment from SvelteKit's env
const infisicalEnv = env.INFISICAL_ENV || 'local';

// Cache secrets (they don't change during runtime)
let cachedSecrets: Awaited<ReturnType<typeof getProductSecrets>> | null = null;

export async function getSecrets() {
  if (!cachedSecrets) {
    cachedSecrets = await getProductSecrets('my-product', infisicalEnv);
  }
  return cachedSecrets;
}
```

### In Server Load Functions

```typescript
// src/routes/api/users/+server.ts
import { getSecrets } from '$lib/server/secrets';
import { json } from '@sveltejs/kit';

export async function GET() {
  const secrets = await getSecrets();

  const db = createDbClient({
    url: secrets.database.url,
    authToken: secrets.database.authToken,
  });

  const users = await db.select().from(usersTable);
  return json(users);
}
```

### In Hooks

```typescript
// src/hooks.server.ts
import { getSecrets } from '$lib/server/secrets';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Load secrets once per request
  const secrets = await getSecrets();

  // Attach to locals for use in endpoints
  event.locals.secrets = secrets;

  return resolve(event);
};
```

### Development with SvelteKit

```bash
# Run SvelteKit dev with secrets
infisical run --env=local -- pnpm dev

# Or in package.json scripts
{
  "scripts": {
    "dev": "infisical run --env=local -- vite dev",
    "build": "infisical run -- vite build",
    "preview": "infisical run -- vite preview"
  }
}
```

---

## Testing with Secrets

### Unit Tests

```typescript
// tests/auth.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { loadSecretsToEnv } from '@resist/infisical';

beforeAll(async () => {
  // Load test secrets (use 'local' or a dedicated 'test' environment)
  await loadSecretsToEnv('local');
});

describe('auth', () => {
  it('should validate JWT', () => {
    const secret = process.env.JWT_SECRET;
    expect(secret).toBeDefined();
    expect(secret!.length).toBeGreaterThanOrEqual(64);
  });
});
```

### Integration Tests

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

// Run with: infisical run --env=local -- vitest run

describe('API Integration', () => {
  it('should connect to database', async () => {
    const db = createDbClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.DATABASE_AUTH_TOKEN!,
    });

    const result = await db.execute('SELECT 1');
    expect(result).toBeDefined();
  });
});
```

### Mock Secrets for Isolated Tests

```typescript
// tests/mocks/secrets.ts
import { vi } from 'vitest';

export function mockSecrets() {
  vi.stubEnv('DATABASE_URL', 'file::memory:');
  vi.stubEnv('JWT_SECRET', 'test-secret-'.padEnd(64, 'x'));
  vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-'.padEnd(64, 'x'));
}

// In test file
import { mockSecrets } from './mocks/secrets';

beforeEach(() => {
  mockSecrets();
});
```

### Running Tests in CI

```yaml
# .github/workflows/ci.yml
jobs:
  test:
    steps:
      - name: Run tests
        run: infisical run --env=${{ env.INFISICAL_ENV }} -- pnpm test
        env:
          INFISICAL_TOKEN: ${{ secrets.INFISICAL_TOKEN }}
```

---

## Advanced Patterns

### Environment Auto-Detection

```typescript
import { detectEnvironment } from '@resist/infisical/environments';

// Automatically detects environment from:
// 1. INFISICAL_ENV environment variable
// 2. Git branch name
// 3. Defaults to 'local'

const env = detectEnvironment();
console.log(env); // 'local', 'feature', 'staging', or 'prod'
```

### Secret Versioning

Access previous versions of secrets:

```typescript
// In Infisical dashboard:
// 1. Go to the secret
// 2. Click "Version History"
// 3. View or restore previous versions

// Programmatically (requires SDK v2.4+):
const secret = await client.getSecret({
  secretName: 'JWT_SECRET',
  environment: 'prod',
  version: 5, // specific version
});
```

### Bulk Operations

```typescript
import { getSecrets } from '@resist/infisical';

// Get secrets from multiple paths
const dbSecrets = await getSecrets('local', '/database');
const authSecrets = await getSecrets('local', '/auth');

// Merge them
const allSecrets = { ...dbSecrets, ...authSecrets };
```

### Watching for Changes

For long-running processes that need live secret updates:

```typescript
import { InfisicalClient } from '@infisical/sdk';

const client = new InfisicalClient();

// Poll for changes every 5 minutes
setInterval(async () => {
  const secrets = await client.listSecrets({
    environment: 'prod',
    projectId: process.env.INFISICAL_PROJECT_ID!,
  });

  // Check if any secrets changed
  // Update your application state accordingly
}, 5 * 60 * 1000);
```

### Per-Product Secrets

For multi-product monorepos:

```typescript
// Each product can have its own secret path
const productASecrets = await getSecrets('staging', '/products/product-a');
const productBSecrets = await getSecrets('staging', '/products/product-b');

// Or use our typed helper
const secrets = await getProductSecrets('product-a', 'staging');
```

### Conditional Secrets

Some secrets are only needed in certain environments:

```typescript
import * as v from 'valibot';

// Analytics only required in prod/staging
const AnalyticsSchema = v.object({
  posthogApiKey: v.optional(v.string()),
});

// Stripe only required in prod
const BillingSchema = v.object({
  stripeSecretKey: process.env.NODE_ENV === 'production'
    ? v.pipe(v.string(), v.startsWith('sk_live_'))
    : v.optional(v.string()),
});
```

### Gradual Rollout

Use feature flags in secrets for gradual rollouts:

```bash
# Set feature flag as secret
infisical secrets set FEATURE_NEW_CHECKOUT=10 --env=prod  # 10% rollout
```

```typescript
const rolloutPercentage = parseInt(process.env.FEATURE_NEW_CHECKOUT || '0');
const showNewCheckout = Math.random() * 100 < rolloutPercentage;
```

---

## Best Practices Summary

### Do

- Always use `infisical run` instead of `.env` files
- Validate secrets at startup with schemas
- Use environment inheritance (set once in prod)
- Rotate secrets regularly
- Use machine identities for CI/CD
- Cache secrets in long-running processes

### Don't

- Commit `.env` files
- Log secret values
- Pass secrets in URLs or query strings
- Use production secrets locally
- Share personal access tokens
- Skip validation in production

### Secret Naming

```
# Good
DATABASE_URL
JWT_SECRET
STRIPE_SECRET_KEY

# Bad
db_url          # inconsistent casing
MySecret        # not screaming snake case
key             # too generic
```

### Security Checklist

- [ ] All secrets > 32 characters for cryptographic use
- [ ] JWT secrets > 64 characters
- [ ] API keys scoped to minimum permissions
- [ ] Secrets rotated every 90 days
- [ ] No secrets in logs or error messages
- [ ] Audit logs reviewed monthly
