# Google Workspace Setup Plan

> **Purpose:** Configure Google Workspace for business email, collaboration, and SSO
> **Scope:** Domain verification, email setup, security configuration, integration with other services

---

## Overview

Google Workspace provides:
- **Business Email** - Professional email at your domain
- **SSO** - Sign in with Google for other services
- **Collaboration** - Drive, Docs, Meet (if needed)
- **Admin** - Centralized user and security management

---

## Plan Selection

| Plan | Cost | Storage | Features |
|------|------|---------|----------|
| Business Starter | $7/user/mo | 30 GB | Basic email, Meet |
| Business Standard | $14/user/mo | 2 TB | + Recording, shared drives |
| Business Plus | $22/user/mo | 5 TB | + Vault, advanced security |

**Recommendation:** Business Starter for solo founder. Upgrade when team grows.

---

## Initial Setup (Manual)

### 1. Sign Up

1. Go to [workspace.google.com](https://workspace.google.com)
2. Click "Get Started"
3. Enter business name
4. Select number of employees (including yourself)
5. Enter your name and current email
6. Choose your domain (or purchase new)

### 2. Domain Verification

**Option A: If domain is on Cloudflare (recommended)**

Google provides a TXT record to add:

```
Type: TXT
Name: @ (or domain.com)
Content: google-site-verification=xxxxxxxxxxxx
```

Add via Cloudflare dashboard or update `dns/plan.md` config.

**Option B: Alternative verification methods**
- HTML file upload (not ideal for static sites)
- Meta tag (requires deployed site)
- Google Analytics (if already using)

### 3. Initial Admin Account

Your first account is the super admin:
- Use `admin@yourcompany.com` or `founder@yourcompany.com`
- Enable 2FA immediately
- This account manages all settings

---

## Email Addresses Structure

### Required Addresses

| Address | Purpose | Type |
|---------|---------|------|
| `founder@` | Primary owner/admin | User |
| `admin@` | Google admin (alias or separate) | User/Alias |
| `hello@` | General contact | Alias → founder |
| `support@` | Customer support | Alias → founder (or group later) |
| `billing@` | Financial communications | Alias → founder |
| `legal@` | Legal matters | Alias → founder |
| `security@` | Security reports | Alias → founder |
| `privacy@` | Privacy requests (GDPR) | Alias → founder |
| `abuse@` | Abuse reports | Alias → founder |
| `postmaster@` | Email delivery issues | Alias → founder |
| `noreply@` | Transactional sends | Alias (use with Resend) |

### Creating Aliases

1. Admin Console → Users → Select user
2. Add alternate email addresses
3. User receives all alias emails in same inbox

### Groups (For Later)

When you have a team:
- `team@` - All employees
- `engineering@` - Engineering team
- `support@` - Support team (routes to ticketing)

---

## DNS Configuration

### MX Records

Add to Cloudflare DNS (see `dns/plan.md`):

```typescript
// In config/dns.config.ts
export const googleWorkspaceMx: DnsRecord[] = [
  { type: 'MX', name: '@', content: 'aspmx.l.google.com', priority: 1 },
  { type: 'MX', name: '@', content: 'alt1.aspmx.l.google.com', priority: 5 },
  { type: 'MX', name: '@', content: 'alt2.aspmx.l.google.com', priority: 5 },
  { type: 'MX', name: '@', content: 'alt3.aspmx.l.google.com', priority: 10 },
  { type: 'MX', name: '@', content: 'alt4.aspmx.l.google.com', priority: 10 },
];
```

### SPF Record

```typescript
{
  type: 'TXT',
  name: '@',
  content: 'v=spf1 include:_spf.google.com ~all',
}
```

If also using Resend or Cloudflare Email Workers:
```typescript
{
  type: 'TXT',
  name: '@',
  content: 'v=spf1 include:_spf.google.com include:amazonses.com ~all',
}
```

### DKIM Record

1. Admin Console → Apps → Google Workspace → Gmail
2. Authenticate email → Generate new record
3. Add the provided TXT record:

```typescript
{
  type: 'TXT',
  name: 'google._domainkey',
  content: 'v=DKIM1; k=rsa; p=MIIBIjANBg...', // From Google
}
```

### DMARC Record

Start with monitoring, then enforce:

```typescript
// Week 1-2: Monitor
{
  type: 'TXT',
  name: '_dmarc',
  content: 'v=DMARC1; p=none; rua=mailto:dmarc@yourcompany.com',
}

// Week 3+: Quarantine
{
  type: 'TXT',
  name: '_dmarc',
  content: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@yourcompany.com',
}

// Later: Reject
{
  type: 'TXT',
  name: '_dmarc',
  content: 'v=DMARC1; p=reject; rua=mailto:dmarc@yourcompany.com',
}
```

---

## Security Configuration

### Admin Console Settings

**Security → Authentication:**
- [ ] Enforce 2-Step Verification
- [ ] Allow less secure apps: OFF
- [ ] Password requirements: Strong (12+ chars)

**Security → API Controls:**
- [ ] Third-party app access: Restrict to trusted apps
- [ ] Add trusted apps (PostHog, Infisical if using SSO)

**Security → Login Challenges:**
- [ ] Enable login challenges for suspicious activity

### Gmail Security

**Admin Console → Apps → Google Workspace → Gmail → Safety:**

**Spoofing and authentication:**
- [ ] Protect against spoofing: ON
- [ ] Enable DMARC checking: ON
- [ ] Protect against any unauthenticated emails: Quarantine

**Attachments:**
- [ ] Protect against encrypted attachments: ON
- [ ] Protect against attachments with scripts: ON

---

## SSO Configuration

### Enable OAuth for Third-Party Apps

For services that support "Sign in with Google":

1. Users can authenticate with their Workspace account
2. Reduces password fatigue
3. Centralized access control

**Common integrations:**
- Slack
- Notion
- Linear
- Most SaaS tools

### API Access for Automation

If automating Workspace tasks:

1. Admin Console → Security → API Controls → Manage Domain-wide Delegation
2. Create service account in Google Cloud Console
3. Grant required scopes

**Use cases:**
- Automated user provisioning
- Group management via API
- Calendar/email automation

---

## Cloudflare Email Routing Integration

Cloudflare Email Routing can work alongside Google Workspace:

**Use Case:** Route specific addresses differently

```
# In Cloudflare Email Routing:
noreply@yourcompany.com → Drop (handled by Resend)
catchall@yourcompany.com → Forward to founder@yourcompany.com

# MX records still point to Google for main email
```

**Configuration:**
1. Cloudflare → Email → Email Routing
2. Add custom addresses for special routing
3. MX records remain pointed to Google

---

## Resend Integration

For transactional email (password resets, notifications):

### Sending Domain Setup

1. Add sending domain in Resend
2. Add DNS records Resend provides
3. Verify domain

### Sending from Workspace Addresses

```typescript
// Use noreply@ or system@ address
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'notifications@yourcompany.com', // Or noreply@
  to: user.email,
  subject: 'Password Reset',
  html: passwordResetTemplate,
});
```

**Note:** Don't send marketing/transactional from founder@ — keep it professional for human conversations.

---

## Mobile Device Management (Optional)

For company-owned devices later:

1. Admin Console → Devices → Mobile & endpoints
2. Enable basic management
3. Set policies (screen lock, encryption)

---

## Backup Strategy

### Google Vault (Business Plus)

If on Business Plus:
- Automatic email retention
- Legal hold capability
- eDiscovery tools

### Third-Party Backup

For cheaper plans, consider:
- Backupify
- Spanning
- CloudAlly

Or manual export:
- Google Takeout for periodic exports
- Store in R2 bucket

---

## Cost Optimization

### Single-User Strategies

- Use aliases liberally (free)
- One user can manage multiple roles
- Upgrade only when adding team members

### When to Upgrade

- **Business Standard:** Need shared drives, longer Meet recordings
- **Business Plus:** Need Vault for compliance, advanced security

---

## Overseer Integration

Overseer tracks Google Workspace as an account:

```typescript
// In accounts table
{
  id: 'google-workspace',
  name: 'Google Workspace',
  category: 'critical',
  url: 'https://admin.google.com',
  email: 'admin@yourcompany.com',
  status: 'active',
  renewal_date: null, // Monthly billing
  notes: 'Business Starter plan',
}
```

Dashboard can show:
- Domain verification status (manual check)
- DNS record configuration status (via Cloudflare API)
- Link to Admin Console

---

## Implementation Checklist

### Account Setup
- [ ] Sign up for Google Workspace
- [ ] Choose plan (Business Starter recommended)
- [ ] Verify domain ownership
- [ ] Create admin account
- [ ] Enable 2FA

### DNS Configuration
- [ ] Add MX records
- [ ] Add SPF record
- [ ] Generate and add DKIM record
- [ ] Add DMARC record (start with p=none)

### Email Setup
- [ ] Create primary user (founder@)
- [ ] Add aliases (hello@, support@, billing@, etc.)
- [ ] Test sending and receiving
- [ ] Verify email authentication (use mail-tester.com)

### Security
- [ ] Enforce 2FA for all users
- [ ] Configure password policy
- [ ] Review API access settings
- [ ] Configure Gmail security settings
- [ ] Set up login alerts

### Integration
- [ ] Configure Resend for transactional email
- [ ] Test email routing with Cloudflare (if using)
- [ ] Set up SSO for other services
- [ ] Store credentials in Infisical

### Documentation
- [ ] Document email address structure
- [ ] Add to Overseer account registry
- [ ] Update team onboarding docs (when applicable)

---

## Email Signature Template

```html
<table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  <tr>
    <td style="padding-right: 15px; vertical-align: top;">
      <img src="https://yourcompany.com/logo-small.png" alt="Company" width="60" height="60">
    </td>
    <td style="vertical-align: top;">
      <strong style="color: #000;">Your Name</strong><br>
      <span style="color: #666;">Founder</span><br>
      <a href="https://yourcompany.com" style="color: #0066cc; text-decoration: none;">yourcompany.com</a>
    </td>
  </tr>
</table>
```

Set in Gmail → Settings → Signature.

---

## Secrets to Store (Infisical)

```
google-workspace/
├── admin-email          # admin@yourcompany.com
├── recovery-email       # Personal email for account recovery
└── service-account-key  # If using API automation (JSON)
```

**Note:** Unlike other services, Google Workspace doesn't have a simple API key. Access is via OAuth or service accounts.
