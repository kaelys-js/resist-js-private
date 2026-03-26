# Infisical Setup Guide

Complete step-by-step guide to setting up Infisical for the resist.js monorepo.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infisical Account Setup](#infisical-account-setup)
3. [Project Configuration](#project-configuration)
4. [Environment Setup](#environment-setup)
5. [Secret Structure](#secret-structure)
6. [Local Development Setup](#local-development-setup)
7. [CI/CD Configuration](#cicd-configuration)
8. [Cloudflare Integration](#cloudflare-integration)
9. [Team Onboarding](#team-onboarding)
10. [Maintenance & Operations](#maintenance--operations)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 20+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Access to the resist.js repository
- [ ] Admin access to create Infisical organization (for initial setup)

---

## Infisical Account Setup

### Step 1: Create Organization

1. Go to [Infisical Cloud](https://app.infisical.com) or your self-hosted instance
2. Sign up / Log in
3. Create a new organization: `resist` (or your org name)

### Step 2: Create Project

1. Click "New Project"
2. Name: `resist-js` (matches your monorepo)
3. Description: "resist.js monorepo secrets"

### Step 3: Note Your Project ID

1. Go to Project Settings → General
2. Copy the **Project ID** (e.g., `abc123def456...`)
3. You'll need this for `.infisical.json` and GitHub secrets

---

## Project Configuration

### Step 4: Create Environment Structure

In the Infisical dashboard, create these environments:

| Environment | Slug | Description |
|-------------|------|-------------|
| Production | `prod` | Live production secrets |
| Staging | `staging` | Pre-production testing |
| Feature | `feature` | Feature branch testing |
| Local | `local` | Local development |

**To create each environment:**
1. Go to Project Settings → Environments
2. Click "Add Environment"
3. Enter name and slug exactly as shown above

### Step 5: Configure Environment Inheritance

Set up inheritance so secrets cascade down:

1. Go to each environment's settings
2. Set "Inherits From":
   - `local` → inherits from `feature`
   - `feature` → inherits from `staging`
   - `staging` → inherits from `prod`
   - `prod` → no inheritance (root)

This means:
- Set a secret in `prod` → available everywhere
- Override in `staging` → affects staging, feature, local
- Override in `local` → only affects local development

---

## Secret Structure

### Step 6: Create Secret Folders

Organize secrets into folders for clarity:

```
/
├── cloudflare/
│   ├── CLOUDFLARE_ACCOUNT_ID
│   ├── CLOUDFLARE_API_TOKEN
│   └── CLOUDFLARE_ZONE_ID
├── database/
│   ├── DATABASE_URL
│   └── DATABASE_AUTH_TOKEN
├── auth/
│   ├── JWT_SECRET
│   ├── JWT_REFRESH_SECRET
│   ├── JWT_EXPIRES_IN
│   └── REFRESH_EXPIRES_IN
├── stripe/
│   ├── STRIPE_SECRET_KEY
│   ├── STRIPE_PUBLISHABLE_KEY
│   └── STRIPE_WEBHOOK_SECRET
├── email/
│   ├── RESEND_API_KEY
│   └── FROM_EMAIL
├── revenuecat/
│   └── REVENUECAT_API_KEY
├── analytics/
│   └── POSTHOG_API_KEY
├── storage/
│   ├── R2_ACCESS_KEY_ID
│   ├── R2_SECRET_ACCESS_KEY
│   └── R2_BUCKET_NAME
└── features/
    ├── ENABLE_ANALYTICS
    ├── ENABLE_BILLING
    └── MAINTENANCE_MODE
```

### Step 7: Add Production Secrets

Start with production environment (they'll inherit down):

1. Go to Production environment
2. Add each secret with its production value

**Required secrets (minimum):**

```
# Database
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-turso-token

# Authentication
JWT_SECRET=<generate 64+ char random string>
JWT_REFRESH_SECRET=<generate 64+ char random string>

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

**Generate secure secrets:**
```bash
# Generate a 64-character hex secret
openssl rand -hex 32

# Generate a 64-character base64 secret
openssl rand -base64 48 | tr -d '\n' | cut -c1-64
```

### Step 8: Override for Lower Environments

For staging, feature, and local, override only what's different:

**Staging overrides:**
```
DATABASE_URL=libsql://your-staging-db.turso.io
ENABLE_ANALYTICS=false
```

**Local overrides:**
```
DATABASE_URL=file:local.db
MAINTENANCE_MODE=false
ENABLE_BILLING=false
```

---

## Local Development Setup

### Step 9: Install Infisical CLI

**macOS:**
```bash
brew install infisical/get-cli/infisical
```

**Linux:**
```bash
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
sudo apt-get update && sudo apt-get install -y infisical
```

**Windows:**
```powershell
scoop bucket add infisical https://github.com/Infisical/scoop-infisical.git
scoop install infisical
```

### Step 10: Authenticate

```bash
# Login (opens browser for OAuth)
infisical login

# Verify login
infisical user
```

### Step 11: Initialize Project

```bash
# Navigate to monorepo root
cd /path/to/resist.js

# Initialize (creates .infisical.json)
infisical init

# Select your project and default environment (local)
```

This creates `.infisical.json`:
```json
{
  "workspaceId": "your-project-id",
  "defaultEnvironment": "local",
  "gitBranchToEnvironmentMapping": {
    "main": "staging",
    "staging": "staging",
    "feature/*": "feature",
    "feat/*": "feature"
  }
}
```

### Step 12: Verify Setup

```bash
# List secrets for local environment
infisical secrets --env=local

# Run a command with secrets injected
infisical run --env=local -- env | grep DATABASE
```

### Step 13: Run the Doctor

```bash
# Run our health check
pnpm --filter @resist/infisical doctor
```

Expected output:
```
Environment Management Health Check

✓ Infisical CLI installed (v0.25.0)
✓ User authenticated (you@example.com)
✓ Project configuration found
✓ Local environment accessible
✓ Secrets validated against schema
✓ No .env files found (good!)
✓ Cloudflare credentials valid
✓ GitHub Actions configured

All checks passed!
```

---

## CI/CD Configuration

### Step 14: Create Machine Identity

Machine identities allow CI/CD to access secrets without personal tokens.

1. Go to Project Settings → Machine Identities
2. Click "Create Machine Identity"
3. Name: `github-actions`
4. Copy the **Client ID** and **Client Secret**

### Step 15: Configure Access

1. Go to the machine identity you created
2. Add environment access:
   - `prod` - Read only
   - `staging` - Read only
   - `feature` - Read only

### Step 16: Add GitHub Secrets

In your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add these repository secrets:

| Secret | Value |
|--------|-------|
| `INFISICAL_CLIENT_ID` | Machine identity client ID |
| `INFISICAL_CLIENT_SECRET` | Machine identity client secret |
| `INFISICAL_PROJECT_ID` | Your project ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (for deployments) |
| `SLACK_WEBHOOK_URL` | Slack webhook (for notifications) |

### Step 17: Add GitHub Workflow

Copy the workflow templates to your repository:

```bash
# CI workflow
cp _INTEGRATE/env-management/templates/github-actions-ci.yml .github/workflows/ci.yml

# Deploy workflow
cp _INTEGRATE/env-management/templates/github-actions-deploy.yml .github/workflows/deploy.yml
```

### Step 18: Configure GitHub Environments

For production deployment protection:

1. Go to Settings → Environments
2. Create `production` environment
3. Add protection rules:
   - Required reviewers (add team leads)
   - Wait timer: 5 minutes (optional)
   - Deployment branches: `prod-*` tags only

---

## Cloudflare Integration

### Step 19: Sync Secrets to Workers

Our sync tool pushes secrets to Cloudflare Workers:

```bash
# Sync staging secrets to staging worker
pnpm --filter @resist/infisical sync --env=staging --worker=my-product-api

# Sync production secrets
pnpm --filter @resist/infisical sync --env=prod --worker=my-product-api
```

### Step 20: Use in Workers

```typescript
// src/index.ts
import { validateEnv } from '@resist/infisical/cloudflare';
import { ProductSecretsSchema } from '@resist/infisical/schemas';

export interface Env {
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN: string;
  JWT_SECRET: string;
  // ... all your secrets
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Validate all secrets at startup
    const secrets = validateEnv(env, ProductSecretsSchema);

    // Use validated, type-safe secrets
    const db = createClient({
      url: secrets.database.url,
      authToken: secrets.database.authToken,
    });

    return new Response('OK');
  }
};
```

### Step 21: Wrangler Configuration

Your `wrangler.toml` doesn't contain secrets (they come from Infisical):

```toml
name = "my-product-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
# Only non-secret configuration
ENVIRONMENT = "production"
LOG_LEVEL = "info"

# Secrets are NOT defined here
# They're synced via: pnpm --filter @resist/infisical sync
```

---

## Team Onboarding

### For New Team Members

Share this with new developers:

```markdown
## Getting Started with Secrets

1. **Get Infisical Access**
   - Ask a team admin to invite you to the Infisical project
   - Accept the invitation email

2. **Run Bootstrap**
   ```bash
   cd resist.js
   ./packages/infisical/scripts/bootstrap.sh
   ```

3. **Verify Setup**
   ```bash
   pnpm --filter @resist/infisical doctor
   ```

4. **Start Developing**
   ```bash
   # Run dev server with secrets
   infisical run --env=local -- pnpm dev
   ```

That's it! No .env files needed.
```

### Adding Team Members to Infisical

1. Go to Project Settings → Members
2. Click "Invite Member"
3. Enter their email
4. Assign role:
   - **Admin**: Full access (tech leads)
   - **Developer**: Read all, write non-prod
   - **Viewer**: Read only (contractors)

---

## Maintenance & Operations

### Rotating Secrets

**Rotate specific secret:**
```bash
pnpm --filter @resist/infisical rotate --env=prod --key=JWT_SECRET
```

**Rotate category:**
```bash
pnpm --filter @resist/infisical rotate --env=prod --category=jwt
```

**Rotate all (with confirmation):**
```bash
pnpm --filter @resist/infisical rotate --env=prod --category=all
```

### Auditing

View secret access logs in Infisical dashboard:
1. Go to Project → Audit Logs
2. Filter by:
   - User/Machine Identity
   - Environment
   - Action (read/write)
   - Date range

### Backup & Recovery

Infisical maintains secret history. To recover:
1. Go to the secret in dashboard
2. Click "Version History"
3. Select previous version
4. Click "Restore"

### Emergency Rotation

If a secret is compromised:

```bash
# 1. Immediately rotate in production
pnpm --filter @resist/infisical rotate --env=prod --key=COMPROMISED_SECRET --force

# 2. Sync to Cloudflare
pnpm --filter @resist/infisical sync --env=prod

# 3. Redeploy workers (they'll pick up new secrets)
wrangler deploy

# 4. Check audit logs for unauthorized access
# (in Infisical dashboard)
```

---

## Troubleshooting

### Common Issues

**"You are not logged in"**
```bash
infisical login
```

**"Project not found"**
```bash
# Check .infisical.json has correct workspaceId
cat .infisical.json

# Re-initialize
rm .infisical.json
infisical init
```

**"Environment not found"**
- Verify environment exists in Infisical dashboard
- Check spelling matches exactly (case-sensitive)

**"Permission denied"**
- Contact project admin for access
- Check your role has read access to the environment

**"Secret validation failed"**
- Check error message for which secret is invalid
- Verify secret value meets schema requirements
- Ensure all required secrets exist

### Getting Help

1. Run diagnostics: `pnpm --filter @resist/infisical doctor --verbose`
2. Check Infisical docs: https://infisical.com/docs
3. Ask in #dev-help Slack channel

---

## Checklist

Use this checklist when setting up a new product:

### Initial Setup (Admin)
- [ ] Create Infisical organization
- [ ] Create project
- [ ] Create all 4 environments
- [ ] Configure environment inheritance
- [ ] Create folder structure
- [ ] Add production secrets
- [ ] Add staging overrides
- [ ] Create machine identity for CI/CD
- [ ] Add GitHub secrets

### Repository Setup
- [ ] Copy workflow templates to `.github/workflows/`
- [ ] Create `.infisical.json` at repo root
- [ ] Update `.gitignore` (ensure .infisical.json is NOT ignored)
- [ ] Remove any existing `.env` files
- [ ] Update README with secrets setup instructions

### Team Setup
- [ ] Invite team members to Infisical
- [ ] Share onboarding instructions
- [ ] Test that `bootstrap.sh` works for new clone

### Verification
- [ ] `pnpm --filter @resist/infisical doctor` passes
- [ ] `infisical run --env=local -- pnpm dev` works
- [ ] CI/CD pipeline runs successfully
- [ ] Production deployment works with secrets
