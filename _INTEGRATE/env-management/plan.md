# Infisical Setup Plan

> **Purpose:** Centralized secrets management for all environments and services
> **Replaces:** 1Password for application secrets (keep 1Password for personal/team passwords if desired)

---

## Overview

Infisical provides:
- **Secret Storage** - Encrypted secrets with versioning
- **Environment Management** - Dev, staging, production isolation
- **Secret Injection** - CLI, SDK, and native integrations
- **Access Control** - Role-based permissions per project
- **Audit Logs** - Track secret access and changes
- **Rotation** - Automatic secret rotation (enterprise)

---

## Deployment Decision

### Cloud vs Self-Hosted

| Aspect | Infisical Cloud | Self-Hosted |
|--------|----------------|-------------|
| Cost | Free tier (3 users), then $6/user/mo | Free (open source) |
| Setup | Instant | Requires infrastructure |
| Maintenance | Managed | You manage |
| Compliance | SOC 2 Type II | You ensure |
| Data Location | US/EU options | Your choice |

**Recommendation:** Start with Infisical Cloud, migrate to self-hosted later if needed.

For self-hosted on Cloudflare, options:
- Docker on a VPS (not Cloudflare-native)
- Infisical doesn't have a Cloudflare Workers deployment

---

## Initial Setup (Manual)

### 1. Create Account

1. Go to [app.infisical.com](https://app.infisical.com)
2. Sign up with email or SSO
3. Enable 2FA immediately
4. Create organization matching company name

### 2. Organization Settings

**General:**
- Organization name
- Billing plan (start with free tier)

**Security:**
- Require 2FA for all members
- Set up SSO with Google Workspace (optional)
- Configure IP allowlist (optional)

**Members:**
- Add team members
- Assign roles:
  - Admin - Full access
  - Member - Project access based on assignments
  - No Access - Revoked but not deleted

### 3. Project Structure

Create projects to match monorepo structure:

```
Organization: [Company Name]
├── Project: global
│   ├── Environment: development
│   ├── Environment: staging
│   └── Environment: production
│
├── Project: overseer
│   ├── Environment: development
│   ├── Environment: staging
│   └── Environment: production
│
├── Project: [product-1]
│   ├── Environment: development
│   ├── Environment: staging
│   └── Environment: production
│
└── Project: [product-2]
    └── ...
```

**Global project** holds shared secrets (Cloudflare API tokens, GitHub tokens, etc.)

---

## Secret Organization

### Folder Structure per Project

```
/
├── api/                    # API-specific secrets
│   ├── JWT_SECRET
│   ├── ENCRYPTION_KEY
│   └── WEBHOOK_SECRET
│
├── database/               # Database credentials
│   ├── D1_DATABASE_ID
│   └── D1_DATABASE_NAME
│
├── external/               # Third-party service credentials
│   ├── POSTHOG_API_KEY
│   ├── RESEND_API_KEY
│   ├── LEMON_SQUEEZY_API_KEY
│   └── REVENUECAT_API_KEY
│
├── cloudflare/            # Cloudflare-specific
│   ├── ACCOUNT_ID
│   ├── ZONE_ID
│   ├── KV_NAMESPACE_ID
│   └── R2_BUCKET_NAME
│
└── app/                   # Client-side public keys
    ├── PUBLIC_POSTHOG_KEY
    └── PUBLIC_STRIPE_KEY
```

### Global Project Secrets

```
/
├── cloudflare/
│   ├── API_TOKEN           # Scoped for all operations
│   ├── ACCOUNT_ID
│   └── ZONE_IDS            # JSON map of domain -> zone ID
│
├── github/
│   ├── PAT                 # Personal access token
│   └── APP_PRIVATE_KEY     # GitHub App key (if using)
│
├── posthog/
│   ├── PERSONAL_API_KEY    # Admin access
│   └── ORG_ID
│
├── payments/
│   ├── LEMON_SQUEEZY_API_KEY
│   ├── LEMON_SQUEEZY_STORE_ID
│   ├── LEMON_SQUEEZY_WEBHOOK_SECRET
│   ├── REVENUECAT_API_KEY
│   └── REVENUECAT_WEBHOOK_SECRET
│
├── email/
│   ├── RESEND_API_KEY
│   └── GOOGLE_WORKSPACE_ADMIN_EMAIL
│
└── app-stores/
    ├── APPLE_API_KEY_ID
    ├── APPLE_API_KEY_ISSUER
    ├── APPLE_API_KEY_CONTENT
    ├── APPLE_TEAM_ID
    ├── MATCH_PASSWORD
    ├── GOOGLE_PLAY_JSON_KEY
    └── ANDROID_KEYSTORE_PASSWORD
```

---

## CLI Setup

### Installation

```bash
# macOS
brew install infisical/get-cli/infisical

# npm (cross-platform)
npm install -g @infisical/cli

# Direct download
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
sudo apt-get update && sudo apt-get install -y infisical
```

### Authentication

```bash
# Interactive login (stores token locally)
infisical login

# Service token for CI/CD (create in Infisical dashboard)
export INFISICAL_TOKEN=st.xxx.xxx

# Machine identity (recommended for production)
infisical login --method=universal-auth \
  --client-id=xxx \
  --client-secret=xxx
```

### Basic Usage

```bash
# Run command with secrets injected
infisical run --env=development -- pnpm dev

# Export secrets to .env file (don't commit!)
infisical export --env=development > .env.local

# View secrets
infisical secrets --env=production

# Set a secret
infisical secrets set API_KEY=xxx --env=production

# Get specific secret
infisical secrets get API_KEY --env=production
```

---

## Integration Patterns

### Local Development

```bash
# package.json script
{
  "scripts": {
    "dev": "infisical run --env=development -- turbo dev",
    "dev:staging": "infisical run --env=staging -- turbo dev"
  }
}
```

Or use `.infisical.json` in project root:

```json
{
  "workspaceId": "xxx",
  "defaultEnvironment": "development",
  "gitBranchToEnvironmentMapping": {
    "main": "staging",
    "production": "production"
  }
}
```

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Infisical CLI
        run: |
          curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
          sudo apt-get update && sudo apt-get install -y infisical

      - name: Deploy with secrets
        env:
          INFISICAL_TOKEN: ${{ secrets.INFISICAL_TOKEN }}
        run: |
          infisical run --env=production --projectId=xxx -- pnpm deploy
```

Or export to GitHub environment:

```yaml
      - name: Export secrets
        env:
          INFISICAL_TOKEN: ${{ secrets.INFISICAL_TOKEN }}
        run: |
          infisical export --env=production --format=dotenv > .env
          # Source into environment
          set -a && source .env && set +a
```

### Cloudflare Workers

**Option 1: Build-time injection**

```yaml
# In CI/CD
- name: Deploy Worker
  env:
    INFISICAL_TOKEN: ${{ secrets.INFISICAL_TOKEN }}
  run: |
    # Export secrets
    infisical export --env=production --format=json > secrets.json

    # Deploy with wrangler (reads from wrangler.toml vars or --var)
    wrangler deploy \
      --var API_KEY:$(jq -r '.API_KEY' secrets.json) \
      --var DB_SECRET:$(jq -r '.DB_SECRET' secrets.json)
```

**Option 2: Wrangler secrets**

```bash
# Set secrets in Cloudflare (one-time or in CI)
infisical export --env=production --format=dotenv | while IFS='=' read -r key value; do
  echo "$value" | wrangler secret put "$key"
done
```

**Option 3: Runtime fetch (not recommended for Workers)**

Workers should not fetch secrets at runtime due to cold start impact. Use build-time injection.

### SvelteKit Environment Variables

```typescript
// packages/products/[product]/app/src/lib/env.ts
import { env } from '$env/dynamic/private';
import { PUBLIC_POSTHOG_KEY } from '$env/static/public';

// Private (server-side only)
export const API_SECRET = env.API_SECRET;

// Public (available in browser)
export { PUBLIC_POSTHOG_KEY };
```

In development, Infisical injects these when running:
```bash
infisical run --env=development -- pnpm dev
```

---

## Service Tokens vs Machine Identities

### Service Tokens (Simple)

- Created per project
- Scoped to specific environments
- Good for CI/CD

```bash
# Create in Infisical dashboard or CLI
infisical service-token create \
  --name="github-actions" \
  --scopes="production:read,staging:read"
```

### Machine Identities (Recommended)

- Organization-level
- More granular permissions
- Supports token rotation
- Better for production

```bash
# Authenticate with machine identity
infisical login --method=universal-auth \
  --client-id=$CLIENT_ID \
  --client-secret=$CLIENT_SECRET
```

---

## SDK Integration

### Node.js SDK

```typescript
// packages/shared/utils/src/secrets.ts
import InfisicalClient from '@infisical/sdk';

let client: InfisicalClient | null = null;

export async function getSecretsClient(): Promise<InfisicalClient> {
  if (!client) {
    client = new InfisicalClient({
      clientId: process.env.INFISICAL_CLIENT_ID,
      clientSecret: process.env.INFISICAL_CLIENT_SECRET,
    });
  }
  return client;
}

export async function getSecret(
  key: string,
  options?: {
    environment?: string;
    projectId?: string;
    path?: string;
  }
): Promise<string> {
  const infisical = await getSecretsClient();

  const secret = await infisical.getSecret({
    secretName: key,
    environment: options?.environment || 'production',
    projectId: options?.projectId || process.env.INFISICAL_PROJECT_ID!,
    path: options?.path || '/',
  });

  return secret.secretValue;
}

export async function getAllSecrets(
  environment: string,
  path?: string
): Promise<Record<string, string>> {
  const infisical = await getSecretsClient();

  const secrets = await infisical.listSecrets({
    environment,
    projectId: process.env.INFISICAL_PROJECT_ID!,
    path: path || '/',
  });

  return secrets.reduce((acc, s) => {
    acc[s.secretKey] = s.secretValue;
    return acc;
  }, {} as Record<string, string>);
}
```

**Note:** For Cloudflare Workers, prefer build-time injection over SDK usage.

---

## Secret Rotation

### Manual Rotation

1. Generate new secret value
2. Update in Infisical
3. Deploy affected services
4. Verify functionality
5. Old secret is versioned (can rollback)

### Rotation Workflow

```typescript
// scripts/rotate-secret.ts
import { execSync } from 'child_process';

async function rotateJwtSecret() {
  // Generate new secret
  const newSecret = crypto.randomBytes(32).toString('hex');

  // Update in Infisical
  execSync(
    `infisical secrets set JWT_SECRET=${newSecret} --env=production --path=/api`,
    { stdio: 'inherit' }
  );

  // Trigger redeploy
  execSync('gh workflow run deploy-prod.yml', { stdio: 'inherit' });

  console.log('JWT_SECRET rotated. New deployments will use new secret.');
  console.log('Existing tokens will be invalid after deployment.');
}
```

---

## Overseer Integration

Overseer displays secret status (not values) from Infisical:

```typescript
// In Overseer API
import InfisicalClient from '@infisical/sdk';

async function getSecretHealth(projectId: string, env: string) {
  const client = new InfisicalClient({ /* ... */ });

  const secrets = await client.listSecrets({
    projectId,
    environment: env,
  });

  return secrets.map(s => ({
    key: s.secretKey,
    path: s.path,
    lastUpdated: s.updatedAt,
    version: s.version,
    // Never expose actual values!
  }));
}
```

Dashboard shows:
- Secret count per project/environment
- Last rotation dates
- Missing secrets (expected but not set)
- Access audit summary

---

## Migration from Other Systems

### From Environment Variables

```bash
# Export current env vars
env | grep -E '^(API_|DB_|SECRET_)' > current-secrets.env

# Import to Infisical
while IFS='=' read -r key value; do
  infisical secrets set "$key=$value" --env=production
done < current-secrets.env

# Clean up
rm current-secrets.env
```

### From 1Password

1. Export relevant vault items
2. Convert to key-value format
3. Import via CLI
4. Update CI/CD to use Infisical instead of 1Password CLI

---

## Security Best Practices

1. **Least Privilege** - Service tokens only get required scopes
2. **Environment Isolation** - Production secrets separate from dev
3. **No Local Secrets** - Don't store production secrets locally
4. **Audit Regularly** - Review access logs monthly
5. **Rotate on Compromise** - If any secret might be exposed, rotate all
6. **Version Control** - Infisical tracks versions, use for rollback
7. **Never Log Secrets** - Ensure secrets aren't in CI logs

---

## Environment Variable Naming

### Convention

```
# External services (third-party APIs)
POSTHOG_API_KEY
RESEND_API_KEY
LEMON_SQUEEZY_API_KEY

# Internal secrets
JWT_SECRET
ENCRYPTION_KEY
WEBHOOK_SECRET

# Cloudflare resources
CLOUDFLARE_ACCOUNT_ID
D1_DATABASE_ID
KV_NAMESPACE_ID

# Public (client-safe)
PUBLIC_POSTHOG_KEY
PUBLIC_APP_URL
```

### Required Secrets Checklist

Per Product:
- [ ] JWT_SECRET
- [ ] ENCRYPTION_KEY (if encrypting user data)
- [ ] WEBHOOK_SECRET (for payment webhooks)
- [ ] POSTHOG_API_KEY
- [ ] REVENUECAT_PUBLIC_KEY (mobile only)
- [ ] D1_DATABASE_ID
- [ ] KV_NAMESPACE_ID

Global:
- [ ] CLOUDFLARE_API_TOKEN
- [ ] CLOUDFLARE_ACCOUNT_ID
- [ ] GITHUB_PAT
- [ ] RESEND_API_KEY
- [ ] LEMON_SQUEEZY_API_KEY
- [ ] LEMON_SQUEEZY_WEBHOOK_SECRET
- [ ] REVENUECAT_API_KEY
- [ ] REVENUECAT_WEBHOOK_SECRET

---

## Implementation Checklist

### Initial Setup
- [ ] Create Infisical account
- [ ] Enable 2FA
- [ ] Create organization
- [ ] Configure SSO (optional)
- [ ] Create `global` project
- [ ] Create project per product
- [ ] Set up environments (dev, staging, prod)

### CLI & CI/CD
- [ ] Install CLI locally
- [ ] Create service token for GitHub Actions
- [ ] Store INFISICAL_TOKEN in GitHub Secrets
- [ ] Update CI/CD workflows
- [ ] Test secret injection

### Migration
- [ ] Document all existing secrets
- [ ] Import to Infisical
- [ ] Update local dev scripts
- [ ] Update deployment scripts
- [ ] Remove old secret storage
- [ ] Update PLAN.md references from 1Password to Infisical

### Documentation
- [ ] Document secret naming conventions
- [ ] Document rotation procedures
- [ ] Update onboarding docs
- [ ] Add Infisical to account registry (Overseer)
