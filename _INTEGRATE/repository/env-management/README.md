# @resist/infisical

Turn-key secret management for the resist.js monorepo using [Infisical](https://infisical.com).

## Documentation

| Document | Description |
|----------|-------------|
| **README.md** (this file) | Quick start and overview |
| [**docs/SETUP.md**](./docs/SETUP.md) | Complete setup guide for admins |
| [**docs/USAGE.md**](./docs/USAGE.md) | Day-to-day usage patterns |

## Why Infisical?

- **No more `.env` files** - Secrets live in one secure place, not scattered across machines
- **Environment inheritance** - Production secrets cascade down to staging, feature, and local
- **Audit logging** - Track who accessed what secret and when
- **Automatic rotation** - CLI tools for rotating secrets without manual updates
- **CI/CD native** - First-class GitHub Actions integration
- **Team-friendly** - New developers get secrets in one command

## Quick Start

### For Developers

```bash
# One command setup (installs CLI, authenticates, initializes)
./scripts/bootstrap.sh

# Or step by step:
pnpm --filter @resist/infisical setup
```

### Verify Setup

```bash
pnpm --filter @resist/infisical doctor
```

## Environments

| Environment | Slug | Branch Pattern | Description |
|-------------|------|----------------|-------------|
| **Production** | `prod` | `prod-*` tags | Live production environment |
| **Staging** | `staging` | `main`, `staging` | Pre-production testing |
| **Feature** | `feature` | `feature/*`, `feat/*` | Ephemeral feature branches |
| **Local** | `local` | - | Developer machines |

### Inheritance Chain

```
production
    ↓
staging (inherits from production)
    ↓
feature (inherits from staging)
    ↓
local (inherits from feature)
```

Secrets set in production automatically cascade down. Override at any level.

## Usage

### In Application Code

```typescript
import { getProductSecrets } from '@resist/infisical';

// Fetch and validate secrets for current environment
const secrets = await getProductSecrets('my-product', 'staging');

// Access type-safe secrets
console.log(secrets.database.url);
console.log(secrets.auth.jwtSecret);
```

### In Cloudflare Workers

```typescript
import { validateEnv, withValidatedEnv } from '@resist/infisical/cloudflare';
import { ProductSecretsSchema } from '@resist/infisical/schemas';

export default {
  async fetch(request: Request, env: Env) {
    // Validate all secrets at startup
    const secrets = validateEnv(env, ProductSecretsSchema);

    // Use validated secrets
    return new Response(`DB: ${secrets.database.url}`);
  }
};

// Or use the wrapper for automatic validation
export default withValidatedEnv(ProductSecretsSchema, {
  async fetch(request, env, ctx, secrets) {
    // secrets is already validated
    return new Response('OK');
  }
});
```

### Running Commands with Secrets

```bash
# Run any command with secrets injected
infisical run --env=local -- pnpm dev

# Build with staging secrets
infisical run --env=staging -- pnpm build

# Run tests with secrets
infisical run --env=local -- pnpm test
```

## CLI Commands

### Setup & Diagnostics

```bash
# Interactive first-time setup
pnpm --filter @resist/infisical setup

# Health check (8 diagnostic checks)
pnpm --filter @resist/infisical doctor

# Verbose diagnostics
pnpm --filter @resist/infisical doctor --verbose
```

### Secret Management

```bash
# Sync secrets to Cloudflare Workers
pnpm --filter @resist/infisical sync --env=staging

# Rotate secrets (with confirmation)
pnpm --filter @resist/infisical rotate --env=staging --category=jwt

# Rotate specific secret
pnpm --filter @resist/infisical rotate --env=staging --key=JWT_SECRET

# Dry run rotation (preview changes)
pnpm --filter @resist/infisical rotate --env=staging --category=all --dry-run
```

### Migration

```bash
# Migrate .env files to Infisical
pnpm --filter @resist/infisical migrate

# Migrate specific file
pnpm --filter @resist/infisical migrate --file=.env.staging

# Dry run (preview without changes)
pnpm --filter @resist/infisical migrate --dry-run

# Force overwrite existing secrets
pnpm --filter @resist/infisical migrate --force
```

## Secret Categories

For bulk rotation, secrets are organized into categories:

| Category | Secrets |
|----------|---------|
| `jwt` | `JWT_SECRET`, `JWT_REFRESH_SECRET` |
| `api` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `REVENUECAT_API_KEY` |
| `database` | `DATABASE_AUTH_TOKEN` |
| `all` | All secrets in the environment |

## Project Structure

```
env-management/
├── config/
│   ├── environments.ts    # Environment definitions & branch mapping
│   ├── schemas.ts         # Valibot schemas for secret validation
│   └── projects.ts        # Infisical project configuration
├── sdk/
│   ├── index.ts           # Main exports
│   ├── client.ts          # Infisical client factory
│   ├── secrets.ts         # Secret fetching utilities
│   └── cloudflare.ts      # Cloudflare Workers integration
├── cli/
│   ├── index.ts           # CLI entry point
│   ├── setup.ts           # First-time setup wizard
│   ├── doctor.ts          # Health diagnostics
│   ├── migrate.ts         # .env migration tool
│   ├── sync.ts            # Cloudflare sync
│   └── rotate.ts          # Secret rotation
├── scripts/
│   └── bootstrap.sh       # One-command setup script
└── templates/
    ├── .infisical.json.hbs       # Project config template
    ├── secrets.example.json      # Example secrets structure
    ├── github-actions-ci.yml     # CI workflow template
    └── github-actions-deploy.yml # Deploy workflow template
```

## GitHub Actions Integration

### CI Workflow

The CI workflow automatically:
1. Detects environment from branch name
2. Injects secrets using machine identity
3. Runs build, test, and deploy-preview

```yaml
# .github/workflows/ci.yml
env:
  INFISICAL_TOKEN: ${{ secrets.INFISICAL_TOKEN }}
  INFISICAL_PROJECT_ID: ${{ secrets.INFISICAL_PROJECT_ID }}

steps:
  - name: Build
    run: infisical run --env=${{ env.INFISICAL_ENV }} -- pnpm build
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `INFISICAL_TOKEN` | Machine identity token for CI/CD |
| `INFISICAL_PROJECT_ID` | Your Infisical project ID |
| `CLOUDFLARE_API_TOKEN` | For deploying to Cloudflare |
| `SLACK_WEBHOOK_URL` | For deployment notifications |

### Production Deploys

Production deploys are triggered by git tags:

```bash
# Deploy to production
git tag prod-2024-01-27
git push origin prod-2024-01-27
```

## Schema Validation

All secrets are validated at runtime using Valibot schemas:

```typescript
// config/schemas.ts
export const ProductSecretsSchema = v.object({
  database: v.object({
    url: v.pipe(v.string(), v.url()),
    authToken: v.pipe(v.string(), v.minLength(32)),
  }),
  auth: v.object({
    jwtSecret: v.pipe(v.string(), v.minLength(64)),
    jwtRefreshSecret: v.pipe(v.string(), v.minLength(64)),
    jwtExpiresIn: v.optional(v.string(), '15m'),
    refreshExpiresIn: v.optional(v.string(), '7d'),
  }),
  // ... more schemas
});
```

Invalid secrets fail fast with detailed error messages:

```
Secret validation failed:

  DATABASE_URL: Invalid URL format
    Received: "not-a-url"
    Expected: Valid URL starting with http:// or https://

  JWT_SECRET: String must be at least 64 characters
    Received: "too-short" (9 characters)
    Expected: Minimum 64 characters for security
```

## Security Best Practices

### Do

- Use machine identities for CI/CD (not personal tokens)
- Rotate secrets regularly (`pnpm --filter @resist/infisical rotate`)
- Use environment inheritance (set once in prod, inherit down)
- Validate secrets at startup with schemas
- Audit secret access in Infisical dashboard

### Don't

- Commit `.env` files (they should not exist)
- Share personal access tokens
- Skip schema validation
- Store secrets in code or config files
- Use production secrets locally (use local environment)

## Troubleshooting

### "Not authenticated"

```bash
# Re-authenticate
infisical login

# Verify authentication
infisical user
```

### "Project not found"

```bash
# Check .infisical.json exists and has correct projectId
cat .infisical.json

# Re-run setup
pnpm --filter @resist/infisical setup
```

### "Secret validation failed"

Check the error message for which secret is invalid. Common issues:
- Missing required secrets (check `secrets.example.json` for required keys)
- Invalid format (URLs must be valid, tokens must meet length requirements)
- Wrong environment (staging secrets won't have all production values)

### "Cannot connect to Infisical"

```bash
# Check network connectivity
curl -I https://app.infisical.com

# Run diagnostics
pnpm --filter @resist/infisical doctor --verbose
```

## Migration from .env Files

1. **Backup existing .env files**
   ```bash
   mkdir -p .env-backup
   cp .env* .env-backup/
   ```

2. **Run migration (dry run first)**
   ```bash
   pnpm --filter @resist/infisical migrate --dry-run
   ```

3. **Review and run migration**
   ```bash
   pnpm --filter @resist/infisical migrate
   ```

4. **Verify secrets in Infisical dashboard**

5. **Delete .env files**
   ```bash
   rm .env .env.local .env.staging .env.production
   ```

6. **Update .gitignore** (remove .env entries, they shouldn't exist anymore)

## Adding New Secrets

1. **Add to Infisical** (via dashboard or CLI)
   ```bash
   infisical secrets set NEW_SECRET=value --env=prod
   ```

2. **Update schema** (`config/schemas.ts`)
   ```typescript
   export const ProductSecretsSchema = v.object({
     // ... existing
     newSecret: v.pipe(v.string(), v.minLength(1)),
   });
   ```

3. **Update example** (`templates/secrets.example.json`)

4. **Sync to Cloudflare** (if needed)
   ```bash
   pnpm --filter @resist/infisical sync --env=staging
   ```

## License

MIT
