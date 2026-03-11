# PLAN.md — Complete SaaS Launch Roadmap

> **Purpose:** End-to-end guide from zero to launched SaaS business
> **Audience:** Solo founder (Canadian resident, US Delaware LLC)
> **First Product:** Overseer — business operations dashboard that guides entire setup
> **Principle:** Cloudflare-first, automate everything possible

---

## Table of Contents

1. [Developer Setup (pnpm onboard)](#1-developer-setup-pnpm-onboard)
2. [Overseer Product](#2-overseer-product)
3. [Entity Formation & Legal Foundation](#3-entity-formation--legal-foundation)
4. [Account Creation](#4-account-creation)
5. [Infrastructure Setup (Automated)](#5-infrastructure-setup-automated)
6. [Financial Infrastructure](#6-financial-infrastructure)
7. [Legal Documents (Automated)](#7-legal-documents-automated)
8. [Product Development](#8-product-development)
9. [Pre-Launch Preparation](#9-pre-launch-preparation)
10. [Launch](#10-launch)
11. [Post-Launch Operations](#11-post-launch-operations)

---

## Key Decisions Reference

| Category | Decision |
|----------|----------|
| Entity | Delaware LLC (convert to C-Corp if raising) |
| Banking | Mercury (US) + Wise (international/CAD) |
| Payments (web) | Lemon Squeezy (Merchant of Record) |
| Payments (mobile) | RevenueCat |
| Infrastructure | Cloudflare (Pages, Workers, D1, KV, R2, Queues) |
| IaC | Pulumi (TypeScript) |
| Analytics | PostHog |
| Email (business) | Google Workspace |
| Email (transactional) | Resend (via CF Email Workers for routing) |
| Support | Email → Chatwoot (later) |
| Project management | GitHub Projects |
| Team chat | Discord |
| Secrets | Infisical |
| Desktop apps | Tauri |
| Mobile apps | Capacitor + Fastlane |
| CI/CD | GitHub Actions, release-please |
| i18n | GitLocalize |

---

## Automation Summary

Many steps that were manual are now automated via plans in `_INTEGRATE/`:

| Area | Plan | Automation Level |
|------|------|------------------|
| GitHub Setup | `gh-setup/plan.md` | Full (Pulumi) |
| Cloudflare Setup | `cf-setup/plan.md` | Full (Pulumi) |
| DNS Management | `dns/plan.md` | Full (Pulumi) |
| Legal Policies | `policies/plan.md` | Full (templates + CI) |
| SEO Submission | `seo/plan.md` | Full (GitHub Actions) |
| Payments Integration | `payments/plan.md` | Full (webhooks + entitlements) |
| Monitoring | `monitoring/plan.md` | Full (Logpush + cron worker) |
| Testing | `test-harness/plan.md` | Full (Vitest + Playwright + Maestro) |
| Documentation | `docs/plan.md` | Full (Starlight + Histoire) |
| Database | `db/plan.md` | Full (migrations + CI) |
| CI/CD Workflows | `github-workflows/plan.md` | Full |
| Reminders | `reminders/plan.md` | Full (scheduled issues) |
| Architecture Diagrams | `arch-diagram/plan.md` | Full (auto-generation) |
| Content Pipeline | `content-pipeline/plan.md` | Full (AI generation + scheduling) |
| Social Publishing | `social-publishing/plan.md` | Full (multi-platform auto-post) |
| Directory Management | `directory-management/plan.md` | Partial (auto-submit where API, assisted otherwise) |
| Email Automation | `email-automation/plan.md` | Full (trigger-based sequences) |
| Customer Support | `customer-support/plan.md` | Partial (AI triage, human escalation) |
| Secrets | `infisical-setup/plan.md` | Partial (manual account, CLI automation) |
| PostHog | `posthog-setup/plan.md` | Partial (manual account, API automation) |
| Google Workspace | `google-workspace/plan.md` | Manual (tracking in Overseer) |
| App Stores | `app-store-setup/plan.md` | Partial (Fastlane automation) |

---

## 1. Developer Setup (pnpm onboard)

> Developer-focused repository setup. Run `pnpm onboard` for guided setup.

This is handled by the CLI onboarding script, not Overseer. See `scripts/onboard.ts`.

### What `pnpm onboard` Does

1. **Verifies prerequisites**
   - Node.js 20+
   - pnpm installed
   - Git configured

2. **Installs dependencies**
   - `pnpm install`

3. **Sets up local environment**
   - Creates `.env.local` from template
   - Configures Infisical CLI (optional)
   - Sets up git hooks (Lefthook)

4. **Validates monorepo structure**
   - Verifies shared packages
   - Verifies product template
   - Runs type check

5. **Optional: Local SSL setup**
   - mkcert for local HTTPS
   - Caddy proxy configuration

### Prerequisites Checklist

- [ ] Node.js 20+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Git configured (name, email)
- [ ] GitHub CLI authenticated (`gh auth login`)
- [ ] Infisical CLI installed (optional)

---

## 2. Overseer Product

> Business operations dashboard. Guides non-technical setup and provides ongoing management.

See `_INTEGRATE/overseer/plan.md` for full details.

### Overseer Responsibilities

1. **Business Planning** (Guided by Overseer)
   - Business model canvas
   - Competitive analysis
   - Name validation workflow
   - GTM strategy

2. **Setup Progress Tracking**
   - Checklist for all manual steps
   - Status tracking per section
   - Notes and documentation

3. **Infrastructure Dashboard**
   - Cloudflare resource status
   - GitHub repository status
   - Health check aggregation
   - Deployment status

4. **Account Registry**
   - Track all external accounts
   - Renewal date reminders
   - Infisical secret references

5. **Legal & Compliance**
   - Policy generation triggers
   - Version tracking
   - Compliance dashboard

6. **Operations**
   - Revenue metrics (LS + RC)
   - User metrics (PostHog)
   - Reminder display

### Implementation

- [ ] Create Overseer product from template
- [ ] Implement D1 schema
- [ ] Build setup wizard UI
- [ ] Integrate with Cloudflare API
- [ ] Integrate with GitHub API
- [ ] Deploy to `overseer.yourcompany.com`

---

## 3. Entity Formation & Legal Foundation

> Manual steps requiring human action. Tracked in Overseer.

### 3.1 Gather Required Documents

- [ ] Passport (scan)
- [ ] Government-issued ID (scan)
- [ ] Proof of address
- [ ] SSN or ITIN (for US tax purposes)
- [ ] Canadian SIN (for Canadian tax reporting)

### 3.2 Form Delaware LLC

- [ ] Sign up for Firstbase.io
- [ ] Select Delaware LLC
- [ ] Submit company name
- [ ] Provide registered agent address (Firstbase)
- [ ] Submit formation documents
- [ ] Pay filing fees (~$300-500)
- [ ] Receive Certificate of Formation
- [ ] Receive EIN

### 3.3 Post-Formation Tasks

- [ ] Store documents securely (R2 bucket, encrypted)
- [ ] Note annual renewal dates
- [ ] Create Operating Agreement (single-member LLC)
- [ ] Understand tax obligations:
  - US: Form 5472 (foreign-owned LLC)
  - US: Delaware franchise tax (~$300/year, due March 1)
  - Canada: T1135 (if >$100K CAD foreign assets)

### 3.4 Trademark Filing (Optional - Can Defer)

- [ ] Decide on trademark scope (US, Canada, international)
- [ ] File via USPTO (Classes 9, 35, 42)
- [ ] Budget: $500-1500 per class

---

## 4. Account Creation

> Manual account creation. Status tracked in Overseer.

### 4.1 Critical Accounts

| Account | Status | Plan Reference |
|---------|--------|----------------|
| Infisical | Manual | `infisical-setup/plan.md` |
| Google Workspace | Manual | `google-workspace/plan.md` |
| GitHub (org) | **Automated** | `gh-setup/plan.md` |
| Cloudflare | **Automated** | `cf-setup/plan.md` |

**Infisical:**
- [ ] Create account at infisical.com
- [ ] Enable 2FA
- [ ] Create organization
- [ ] Set up projects per `infisical-setup/plan.md`

**Google Workspace:**
- [ ] Sign up with company domain
- [ ] Verify domain (TXT record)
- [ ] Create admin account
- [ ] Set up email addresses per `google-workspace/plan.md`
- [ ] Configure DKIM, SPF, DMARC
- [ ] Enable 2FA

### 4.2 Financial Accounts

| Account | Status | Notes |
|---------|--------|-------|
| Mercury | Manual | US banking |
| Wise | Manual | International/CAD |
| Lemon Squeezy | Manual | Integration automated |
| RevenueCat | Manual | Integration automated |

**Mercury:**
- [ ] Apply for business account
- [ ] Provide EIN, formation docs
- [ ] Wait for approval (1-3 days)
- [ ] Set up sub-accounts (Operating, Taxes, Savings)
- [ ] Order debit card

**Wise:**
- [ ] Create business account
- [ ] Verify identity
- [ ] Add USD and CAD balances
- [ ] Link to Mercury

**Lemon Squeezy:**
- [ ] Create account
- [ ] Connect business entity
- [ ] Add payout method (Mercury)
- [ ] Configure tax settings
- [ ] Product setup per `payments/plan.md`

**RevenueCat:**
- [ ] Create account
- [ ] Create project
- [ ] Connect to Apple/Google per `payments/plan.md`

### 4.3 Development & Analytics Accounts

| Account | Status | Plan Reference |
|---------|--------|----------------|
| PostHog | Manual | `posthog-setup/plan.md` |
| Apple Developer | Manual | `app-store-setup/plan.md` |
| Google Play Developer | Manual | `app-store-setup/plan.md` |
| Resend | Manual | Transactional email |

**PostHog:**
- [ ] Create account (Cloud)
- [ ] Create organization
- [ ] Per-product setup per `posthog-setup/plan.md`

**Apple Developer:**
- [ ] Get D-U-N-S number (if needed)
- [ ] Enroll as organization ($99/year)
- [ ] Wait for approval (1-2 weeks)
- [ ] Set up App Store Connect per `app-store-setup/plan.md`

**Google Play Developer:**
- [ ] Create account ($25 one-time)
- [ ] Complete verification
- [ ] Set up Play Console per `app-store-setup/plan.md`

**Resend:**
- [ ] Create account
- [ ] Add sending domain
- [ ] Verify DNS records
- [ ] Get API key → Infisical

### 4.4 Social Media Accounts

Reserve usernames for brand protection. Tracked in Overseer.

**Tier 1 (Active use):**
- [ ] Twitter/X
- [ ] LinkedIn (company page)
- [ ] Product Hunt

**Tier 2 (Create when relevant):**
- [ ] YouTube
- [ ] Discord (community)
- [ ] Reddit (subreddit)

**Tier 3 (Reserve username):**
- [ ] Instagram, TikTok, Facebook, Threads, Bluesky
- [ ] DEV.to, Hashnode, Medium
- [ ] G2, Capterra, TrustPilot

**SEO/Marketing:**
- [ ] Google Search Console
- [ ] Bing Webmaster Tools

---

## 5. Infrastructure Setup (Automated)

> Fully automated via Pulumi. See `cf-setup/plan.md` and `gh-setup/plan.md`.

### 5.1 Run Pulumi Stacks

```bash
# GitHub organization and repos
cd bac/pulumi/github
pulumi up

# Cloudflare account, zones, resources
cd bac/pulumi/cloudflare
pulumi up

# DNS records
cd bac/pulumi/dns
pulumi up
```

### 5.2 What Gets Created

**GitHub (automated):**
- Organization with settings
- Repositories with branch protection
- Teams and permissions
- Labels, issue templates, PR templates
- Dependabot configuration
- Environment secrets

**Cloudflare (automated):**
- Zones for all domains
- DNS records from config
- Workers, Pages projects
- D1 databases, KV namespaces, R2 buckets
- Security settings (WAF, rate limiting)
- Email routing
- Health checks
- Logpush to R2

### 5.3 Verification

- [ ] `pulumi stack output` shows expected resources
- [ ] Cloudflare dashboard shows zones active
- [ ] GitHub org shows repos with protections
- [ ] DNS propagation verified (`dig` or online tools)
- [ ] SSL Labs test: A+ rating
- [ ] Security headers test: A+ rating

---

## 6. Financial Infrastructure

> Account setup is manual. Integration is automated per `payments/plan.md`.

### 6.1 Configure Mercury

- [ ] Set up account structure (Operating, Taxes, Savings)
- [ ] Configure transaction notifications
- [ ] Link to accounting (Pilot.com or alternative)

### 6.2 Configure Lemon Squeezy

- [ ] Complete merchant verification
- [ ] Configure payout schedule
- [ ] Create products/subscriptions
- [ ] Set up webhooks to your API
- [ ] Test checkout flow

### 6.3 Configure RevenueCat

- [ ] Connect Apple App Store (API key)
- [ ] Connect Google Play (service account)
- [ ] Create entitlements
- [ ] Create offerings matching LS tiers
- [ ] Set up webhooks to your API

### 6.4 Unified Entitlements

See `payments/plan.md` for:
- Database schema for entitlements
- Webhook handlers for both providers
- Unified API for checking access

### 6.5 Accounting Setup

- [ ] Choose accounting method (cash basis for simplicity)
- [ ] Set up Pilot.com (or alternative)
- [ ] Connect Mercury, LS, RC
- [ ] Set up tax calendar reminders (in `reminders/plan.md`)

---

## 7. Legal Documents (Automated)

> Fully automated via `policies/plan.md`.

### 7.1 Policy Generation

Policies are generated from Handlebars templates using config values:

```bash
pnpm policies:generate
```

**Generated policies:**
- Terms of Service
- Privacy Policy
- Cookie Policy
- Acceptable Use Policy
- DMCA/Copyright Policy
- Refund Policy
- SLA
- Data Processing Agreement
- Security Policy
- DSAR Procedure
- Cancellation Policy
- Chargeback Policy

### 7.2 Deployment

- [ ] Policies auto-published to marketing site
- [ ] CI/CD regenerates on config change
- [ ] Versioning tracked in git

### 7.3 Compliance Features (In App)

- [ ] Cookie consent banner
- [ ] Terms acceptance at signup
- [ ] Data export functionality
- [ ] Account deletion functionality
- [ ] Privacy nutrition labels (App Store)
- [ ] Data safety form (Play Store)

---

## 8. Product Development

> Build products using the established infrastructure.

### 8.1 Create Product from Template

```bash
pnpm product:create <product-name>
```

This creates:
- `products/<name>/config/`
- `products/<name>/iac/`
- `products/<name>/assets/`
- `products/<name>/api/`
- `products/<name>/status/`
- `products/<name>/marketing/`
- `products/<name>/app/`
- `products/<name>/tester/`

### 8.2 Core Feature Implementation

**Authentication:**
- [ ] Sign up flow
- [ ] Login flow
- [ ] Password reset
- [ ] Email verification
- [ ] JWT tokens (access + refresh)

**User Management:**
- [ ] Profile settings
- [ ] Account deletion (GDPR)
- [ ] Data export (GDPR)

**Payments Integration:**
- [ ] Lemon Squeezy checkout (web)
- [ ] RevenueCat paywalls (mobile)
- [ ] Subscription management
- [ ] Usage limits/quotas

**Analytics:**
- [ ] PostHog SDK integration
- [ ] Standard events per `posthog-setup/plan.md`
- [ ] Feature flags

### 8.3 Marketing Site

- [ ] Homepage
- [ ] Features page
- [ ] Pricing page
- [ ] Legal pages (auto-generated)
- [ ] Blog structure

**SEO (automated per `seo/plan.md`):**
- [ ] Sitemap generation
- [ ] robots.txt
- [ ] Meta tags, Open Graph
- [ ] IndexNow integration
- [ ] Search Console submission

### 8.4 Testing

Per `test-harness/plan.md`:
- [ ] Unit tests (Vitest)
- [ ] Integration tests (Vitest)
- [ ] E2E tests (Playwright)
- [ ] Mobile tests (Maestro)
- [ ] Accessibility tests
- [ ] Performance tests (Lighthouse CI)

---

## 9. Pre-Launch Preparation

### 9.1 App Store Preparation

Per `app-store-setup/plan.md`:

**Apple App Store:**
- [ ] Create app in App Store Connect
- [ ] Complete app information
- [ ] Upload screenshots (all device sizes)
- [ ] Write description
- [ ] Configure IAP/subscriptions
- [ ] Complete privacy nutrition labels
- [ ] Submit for review (allow 1-2 weeks)

**Google Play Store:**
- [ ] Create app in Play Console
- [ ] Complete store listing
- [ ] Upload screenshots
- [ ] Complete data safety form
- [ ] Complete content rating
- [ ] Configure subscriptions
- [ ] Submit for review

### 9.2 SEO Submission (Automated)

Per `seo/plan.md`, on deploy:
- [ ] Sitemap submitted to Google
- [ ] IndexNow pings Bing/Yandex
- [ ] Search Console indexing requested

### 9.3 Final Checklist

- [ ] All tests passing
- [ ] Payments work (test mode verified)
- [ ] Emails send correctly
- [ ] Mobile apps approved
- [ ] Legal docs deployed
- [ ] Health checks green

---

## 10. Launch

### 10.1 Deployment

```bash
# Create release (triggers deploy)
git tag v1.0.0
git push origin v1.0.0

# Or via release-please PR merge
```

**Automated by `github-workflows/plan.md`:**
- Web deploys to Cloudflare
- Mobile submits to stores (Fastlane)
- GitHub Release created
- Changelog generated

### 10.2 Enable Live Payments

- [ ] Switch Lemon Squeezy to live mode
- [ ] Verify webhooks work
- [ ] Make test purchase
- [ ] Release mobile apps from review

### 10.3 Launch Announcements

- [ ] Product Hunt post
- [ ] Twitter/X announcement
- [ ] LinkedIn post
- [ ] Email to waitlist
- [ ] Hacker News (Show HN)
- [ ] Reddit (relevant subreddits)
- [ ] Discord communities

### 10.4 Monitor Launch

- [ ] Watch PostHog for traffic, signups
- [ ] Monitor Cloudflare for errors
- [ ] Respond to support emails
- [ ] Engage on social media
- [ ] Fix critical bugs immediately

---

## 11. Post-Launch Operations

### 11.1 Automated Monitoring

Per `monitoring/plan.md`:
- Health checks run continuously
- Errors aggregated from Logpush
- Alerts sent to Slack/Discord + email
- Overseer dashboard shows status

### 11.2 Automated Reminders

Per `reminders/plan.md`, GitHub Issues created for:
- Domain renewals
- Apple/Google developer renewals
- Tax deadlines (March 1 Delaware, April 15 Form 5472)
- Security audits (quarterly)
- Policy reviews (annual)
- Dependency updates (weekly via Dependabot)

### 11.3 Marketing Automation

Per `content-pipeline/plan.md`, `social-publishing/plan.md`, `directory-management/plan.md`:

**Automated flows:**
- Changelog releases → blog post draft → social posts (auto-approved)
- Content calendar scheduling
- Multi-platform social publishing
- Directory submission tracking
- Product info sync across directories

**Managed via Overseer:**
- Approval queue for AI-generated content
- Social analytics dashboard
- Directory submission status

### 11.4 Email Automation

Per `email-automation/plan.md`:
- Welcome sequence (triggered on signup)
- Trial conversion sequence (triggered on trial start)
- Onboarding sequence (triggered on first action)
- Re-engagement sequence (triggered after 7 days inactive)
- Win-back sequence (triggered on churn)

### 11.5 Customer Support

Per `customer-support/plan.md`:
- AI triage with confidence scoring
- High-confidence auto-replies
- Low-confidence queued for review
- Knowledge base synced from docs
- Escalation to human for complex issues

### 11.6 Regular Operations

**Daily (mostly automated):**
- Check Overseer dashboard for alerts
- Review support queue (most auto-resolved)
- Approve any queued content

**Weekly:**
- Review metrics in PostHog
- Review GitHub Issues
- Plan next release
- Review social engagement

**Monthly:**
- Financial review (revenue, expenses)
- Set aside tax reserves (25-30%)
- Security dependency review
- Marketing performance review

**Quarterly:**
- Estimated tax payments (if required)
- Business strategy review
- Infrastructure cost review
- Content strategy review

**Annually:**
- Delaware franchise tax (March 1)
- Form 5472 (April 15)
- Canadian T1135 (if applicable)
- Apple Developer renewal
- Domain renewals
- Legal document review

---

## Appendix A: Service Reference

| Service | Purpose | Cost | URL |
|---------|---------|------|-----|
| Cloudflare | Infrastructure | Free-$25/mo | cloudflare.com |
| GitHub | Code hosting | Free | github.com |
| Google Workspace | Email | $7/user/mo | workspace.google.com |
| Mercury | US banking | Free | mercury.com |
| Wise | International banking | Low fees | wise.com |
| Lemon Squeezy | Payments (web) | 5% + 50¢ | lemonsqueezy.com |
| RevenueCat | Payments (mobile) | Free-$99/mo | revenuecat.com |
| PostHog | Analytics | Free tier | posthog.com |
| Infisical | Secrets | Free tier | infisical.com |
| Resend | Transactional email | Free tier | resend.com |
| Firstbase.io | Incorporation | ~$400 | firstbase.io |
| Apple Developer | iOS publishing | $99/year | developer.apple.com |
| Google Play | Android publishing | $25 one-time | play.google.com/console |
| Pilot.com | Accounting | ~$200/mo | pilot.com |
| Discord | Team chat | Free | discord.com |

---

## Appendix B: Important Dates

| Date | Task |
|------|------|
| March 1 | Delaware franchise tax due |
| April 15 | Form 5472 due (with tax return) |
| April 30 | Canadian T1135 due (if applicable) |
| Ongoing | Domain renewals (annual) |
| Ongoing | Apple Developer renewal (annual) |
| Ongoing | Registered agent renewal (annual) |

---

## Appendix C: Emergency Procedures

### Site Down

1. Check Cloudflare status: https://www.cloudflarestatus.com/
2. Check health check alerts in Overseer
3. Review recent deployments in GitHub
4. Rollback if needed: `wrangler rollback`
5. Update status page
6. Post-incident review

### Security Incident

1. Assess severity
2. Contain (revoke tokens via Infisical, disable accounts)
3. Investigate
4. Remediate
5. Notify affected users (if required)
6. Post-incident review
7. Update security procedures

### Data Breach

1. Follow security incident procedure
2. Document everything
3. Assess legal notification requirements (GDPR 72h, CCPA)
4. Notify users within required timeframe
5. Report to authorities if required
6. Engage legal counsel if significant

---

## Appendix D: Plan Files Reference

All detailed implementation plans are in `_INTEGRATE/`:

| File | Purpose |
|------|---------|
| `overseer/plan.md` | Overseer product specification |
| `cf-setup/plan.md` | Cloudflare account/resources (Pulumi) |
| `gh-setup/plan.md` | GitHub org/repos (Pulumi) |
| `dns/plan.md` | DNS management (Pulumi) |
| `payments/plan.md` | Lemon Squeezy + RevenueCat integration |
| `policies/plan.md` | Legal document generation |
| `monitoring/plan.md` | Health checks, Logpush, alerts |
| `seo/plan.md` | Sitemap, IndexNow, Search Console |
| `reminders/plan.md` | Scheduled GitHub Issues |
| `github-workflows/plan.md` | All CI/CD workflows |
| `test-harness/plan.md` | Vitest, Playwright, Maestro |
| `docs/plan.md` | Starlight, Histoire |
| `db/plan.md` | D1 migrations |
| `arch-diagram/plan.md` | Auto-generated diagrams |
| `infisical-setup/plan.md` | Secrets management |
| `posthog-setup/plan.md` | Analytics configuration |
| `google-workspace/plan.md` | Email setup |
| `app-store-setup/plan.md` | iOS/Android publishing |
| `content-pipeline/plan.md` | AI content generation + repurposing |
| `social-publishing/plan.md` | Multi-platform social posting |
| `directory-management/plan.md` | Directory submissions + sync |
| `email-automation/plan.md` | Trigger-based email sequences |
| `customer-support/plan.md` | Chatwoot + AI triage |

---

*Last updated: 2025-01-30*
*Version: 2.1.0*
