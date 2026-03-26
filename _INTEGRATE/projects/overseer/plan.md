# Overseer Product Plan

> **Purpose:** Business operations dashboard that orchestrates the entire SaaS setup and ongoing management
> **Role:** Non-developer-facing UI for business configuration, infrastructure status, compliance tracking, and operational workflows

---

## Overview

Overseer is the first product in the monorepo. It serves as the central hub for managing the entire business end-to-end:

1. **Business Planning** - Templates and guidance for business model, naming, GTM strategy
2. **Initial Setup** - Guided workflow through all business setup steps
3. **Infrastructure Status** - Real-time view of all Cloudflare resources, GitHub repos, external services
4. **Compliance Tracking** - Legal docs, policy versions, renewal dates
5. **Operations Dashboard** - Health checks, alerts, key metrics aggregation
6. **Configuration Management** - UI for editing business/product configs that drive IaC
7. **Marketing Automation** - Content pipeline, social publishing, directory management
8. **Email Marketing** - Trigger-based sequences, templates, analytics
9. **Customer Support** - Chatwoot integration, AI triage settings, knowledge base sync

**Goal:** Allow the founder to focus on product/code while Overseer handles everything else through automation and a single unified dashboard.

---

## Architecture

```
Overseer runs as a Cloudflare Pages + Workers app:

┌─────────────────────────────────────────────────────────────┐
│                        Overseer UI                          │
│                   (SvelteKit on CF Pages)                   │
├─────────────────────────────────────────────────────────────┤
│                      Overseer API                           │
│                   (CF Worker + D1 + KV)                     │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ CF API   │ GitHub   │ Lemon    │ Revenue  │ PostHog        │
│          │ API      │ Squeezy  │ Cat      │ API            │
│          │          │ API      │ API      │                │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

**Key Principle:** Overseer reads state from external systems (Cloudflare, GitHub, payment providers) rather than being the source of truth. The source of truth is:
- **Config files** in the repo (for infrastructure definitions)
- **External systems** (for runtime state like health, revenue, users)

---

## Data Model

### D1 Database Schema

```sql
-- Business planning: core business model
CREATE TABLE business_model (
  id TEXT PRIMARY KEY DEFAULT 'main',
  company_name TEXT,
  value_proposition TEXT,
  target_customer TEXT,
  differentiation TEXT,
  revenue_model TEXT, -- JSON: pricing tiers, value metrics
  key_metrics TEXT, -- JSON: north star, leading, lagging
  gtm_strategy TEXT, -- JSON: channels, tactics, first 100 plan
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Business planning: name candidates
CREATE TABLE name_candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- company, product
  domain_available INTEGER, -- 0, 1, NULL (unchecked)
  domain_checked_at TEXT,
  social_handles TEXT, -- JSON: { twitter: true, linkedin: false, ... }
  trademark_notes TEXT,
  google_conflict INTEGER, -- 0, 1, NULL
  selected INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Business planning: competitors
CREATE TABLE competitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- direct, indirect, alternative
  url TEXT,
  pricing TEXT, -- JSON or description
  features TEXT, -- JSON array
  target_market TEXT,
  strengths TEXT,
  weaknesses TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Setup progress tracking
CREATE TABLE setup_steps (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, skipped
  completed_at TEXT,
  completed_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- External account registry
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- critical, financial, dev, social, marketing
  url TEXT,
  username TEXT,
  email TEXT,
  status TEXT DEFAULT 'not_created', -- not_created, pending, active, suspended
  secret_ref TEXT, -- Infisical path reference
  renewal_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Product registry
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning', -- planning, development, staging, production, deprecated
  domain TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Infrastructure resources (synced from Cloudflare)
CREATE TABLE infrastructure (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  resource_type TEXT NOT NULL, -- zone, worker, pages, d1, kv, r2, queue
  resource_id TEXT NOT NULL,
  name TEXT NOT NULL,
  environment TEXT NOT NULL, -- production, staging, preview
  status TEXT,
  last_synced_at TEXT,
  metadata TEXT, -- JSON blob
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Health check results (aggregated)
CREATE TABLE health_snapshots (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  timestamp TEXT NOT NULL,
  overall_status TEXT NOT NULL, -- healthy, degraded, down
  checks TEXT NOT NULL, -- JSON array of individual checks
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT, -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Reminders (synced with GitHub Issues)
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  due_date TEXT NOT NULL,
  github_issue_number INTEGER,
  status TEXT DEFAULT 'pending', -- pending, acknowledged, completed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Marketing: Content items (synced with content-pipeline)
CREATE TABLE content_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- changelog, blog, social, email
  title TEXT NOT NULL,
  source_id TEXT, -- reference to source content if repurposed
  status TEXT DEFAULT 'draft', -- draft, ai_pending, review, approved, published
  scheduled_for TEXT,
  published_at TEXT,
  platforms TEXT, -- JSON array of target platforms
  content TEXT, -- JSON: { body, excerpt, meta }
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Marketing: Social accounts
CREATE TABLE social_accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL, -- twitter, linkedin, devto, hashnode, discord
  account_name TEXT NOT NULL,
  account_id TEXT, -- platform's user ID
  status TEXT DEFAULT 'active', -- active, disconnected, error
  credentials_ref TEXT, -- Infisical path
  last_posted_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Marketing: Social posts queue
CREATE TABLE social_posts (
  id TEXT PRIMARY KEY,
  content_id TEXT REFERENCES content_items(id),
  account_id TEXT REFERENCES social_accounts(id),
  platform TEXT NOT NULL,
  content TEXT NOT NULL, -- platform-specific formatted content
  scheduled_for TEXT,
  published_at TEXT,
  status TEXT DEFAULT 'draft', -- draft, scheduled, published, failed
  platform_post_id TEXT, -- ID returned after publishing
  engagement TEXT, -- JSON: { likes, retweets, comments, clicks }
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Marketing: Directory submissions
CREATE TABLE directory_submissions (
  id TEXT PRIMARY KEY,
  directory_id TEXT NOT NULL,
  directory_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, submitted, approved, rejected, live
  submitted_at TEXT,
  approved_at TEXT,
  listing_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Marketing: Canonical product info (single source of truth)
CREATE TABLE product_info (
  id TEXT PRIMARY KEY DEFAULT 'main',
  name TEXT NOT NULL,
  tagline TEXT,
  description_short TEXT,
  description_long TEXT,
  features TEXT, -- JSON array
  pricing_summary TEXT,
  screenshots TEXT, -- JSON array of URLs
  logo_url TEXT,
  website_url TEXT,
  categories TEXT, -- JSON array
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Support: AI configuration
CREATE TABLE support_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  auto_reply_enabled INTEGER DEFAULT 1,
  confidence_threshold REAL DEFAULT 0.85, -- auto-send above this
  review_threshold REAL DEFAULT 0.6, -- queue for review above this, escalate below
  persona TEXT, -- JSON: { name, tone, style }
  escalation_email TEXT,
  business_hours TEXT, -- JSON: { timezone, hours }
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Support: Knowledge base sync status
CREATE TABLE knowledge_sync (
  id TEXT PRIMARY KEY,
  doc_path TEXT NOT NULL,
  doc_title TEXT NOT NULL,
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'pending', -- pending, synced, error
  chatwoot_article_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### KV Namespaces

```
OVERSEER_CACHE:
  - cf:account:status -> Cloudflare account health
  - cf:zones -> Zone list with status
  - gh:repos -> Repository list
  - revenue:daily -> Daily revenue snapshot
  - health:current -> Current health status for all products
```

---

## Features

### 1. Business Planning Module

Before setup begins, guide users through business conception:

**Business Model Canvas:**
- Value proposition definition
- Target customer segments
- Revenue model (pricing tiers, value metrics)
- Key metrics (north star, leading/lagging indicators)

**Competitive Analysis:**
- Competitor registry (direct, indirect, alternatives)
- Feature comparison matrix
- Pricing comparison
- Strengths/weaknesses notes

**Name Validation Workflow:**
- Name candidate list (5-10 options)
- Automated checks:
  - Domain availability (Cloudflare API)
  - Social handle availability (link to check)
  - Trademark search links (USPTO, CIPO, EUIPO)
  - Google search for conflicts
- Final selection with rationale

**GTM Strategy:**
- Launch channel selection
- Marketing tactic priorities
- First 100 customers plan
- Content calendar skeleton

**Data stored in D1, exportable as markdown for documentation.**

### 2. Setup Wizard

Guided workflow through all setup steps from PLAN.md. Each step can:
- Show instructions
- Link to external service (open in new tab)
- Provide form inputs (for config values)
- Mark as complete/skipped
- Add notes

**Sections:**
1. Entity Formation (manual, tracking only)
2. Domain & Branding (tracking + DNS config UI)
3. Account Creation (checklist with status)
4. Infrastructure Setup (triggers Pulumi, shows status)
5. Financial Setup (tracking + webhook config)
6. Legal Documents (generates from templates)
7. Pre-Launch Checklist

### 3. Dashboard

**Overview cards:**
- Setup progress (X/Y steps complete)
- Infrastructure health (all green / X issues)
- Revenue (today, this week, this month)
- Active users (from PostHog)
- Upcoming reminders

**Quick actions:**
- Deploy to staging
- Create new product
- View logs
- Check health

### 3. Infrastructure View

**Per-product breakdown:**
- Workers (name, routes, last deploy, status)
- Pages (name, domain, last deploy, status)
- D1 databases (name, size, last migration)
- KV namespaces (name, key count)
- R2 buckets (name, object count, size)
- Queues (name, pending messages)

**Actions:**
- View logs (link to CF dashboard)
- Rollback deployment
- Run migration
- Clear KV namespace

### 4. Accounts Registry

Track all external accounts:
- Status (active, pending, needs attention)
- Renewal dates with warnings
- Quick links to dashboards
- Infisical reference for credentials

**Categories:**
- Critical (Cloudflare, GitHub, Google Workspace)
- Financial (Mercury, Wise, Lemon Squeezy, RevenueCat)
- Development (Apple Developer, Google Play, PostHog)
- Social (Twitter, LinkedIn, etc.)
- Marketing (Search Console, Analytics, etc.)

### 5. Legal & Compliance

**Policy Management:**
- View all generated policies
- Regenerate from templates
- Track version history
- View acceptance logs (from app)

**Compliance Dashboard:**
- GDPR status
- CCPA status
- App Store compliance
- Data processing agreements

### 6. Reminders & Tasks

Display upcoming tasks from `_INTEGRATE/reminders/plan.md`:
- Domain renewals
- Certificate expirations
- Tax deadlines
- Policy review dates
- Security audit schedule

Sync with GitHub Issues for tracking.

### 7. Configuration UI

Edit business config values that drive infrastructure:
- Product definitions
- DNS records
- Feature flags
- Pricing tiers

Changes create PRs via GitHub API (not direct commits).

### 8. Marketing & Content Hub

Central management for all marketing automation (see individual plans for implementation details):

**Content Pipeline** (per `content-pipeline/plan.md`):
- Content calendar view (calendar + list modes)
- AI draft generation triggers
- Approval queue for AI-generated content
- Repurposing workflow (changelog → blog → social)
- Template management

**Social Publishing** (per `social-publishing/plan.md`):
- Connected accounts management (Twitter, LinkedIn, DEV.to, etc.)
- Post queue with scheduling
- Analytics dashboard (engagement, reach, clicks)
- Thread composer for Twitter
- Cross-platform preview

**Directory Management** (per `directory-management/plan.md`):
- Single source of truth for product info
- Directory submission tracker
- Sync status for each directory
- Traffic attribution from UTM params

### 9. Customer Support Integration

Support management through Chatwoot (per `customer-support/plan.md`):

**Dashboard:**
- Ticket volume and resolution metrics
- AI confidence distribution
- Response time tracking
- Customer satisfaction scores

**Knowledge Base:**
- Sync status from Starlight docs
- Gap analysis (common questions without docs)
- Article performance metrics

**AI Settings:**
- Confidence thresholds (auto-send vs queue)
- Persona configuration
- Escalation rules

### 10. Email Marketing

Email sequence management (per `email-automation/plan.md`):

**Sequences:**
- Active sequences list (Welcome, Trial, Onboarding, etc.)
- Sequence builder/editor
- A/B test configuration
- Performance metrics (open, click, conversion)

**Subscribers:**
- Segment management
- Preference center config
- Unsubscribe/bounce monitoring

**Templates:**
- Template library
- AI generation triggers
- Preview across email clients

---

## Pages Structure

```
/                       → Dashboard
/planning               → Business planning hub
/planning/model         → Business model canvas
/planning/competitors   → Competitor analysis
/planning/naming        → Name validation workflow
/planning/gtm           → GTM strategy

/setup                  → Setup wizard
/setup/[section]        → Section detail

/infrastructure         → All products overview
/infrastructure/[product] → Product detail

/accounts               → Account registry
/accounts/[id]          → Account detail

/products               → Product list
/products/new           → Create product
/products/[slug]        → Product detail
/products/[slug]/config → Product config

/legal                  → Legal documents
/legal/[policy]         → Policy viewer
/legal/generate         → Regenerate policies

/reminders              → Upcoming tasks

/marketing              → Marketing hub
/marketing/content      → Content calendar
/marketing/content/new  → Create content
/marketing/content/[id] → Content editor
/marketing/social       → Social publishing
/marketing/social/compose → Compose post
/marketing/social/queue → Scheduled posts
/marketing/social/analytics → Social analytics
/marketing/directories  → Directory management
/marketing/email        → Email sequences
/marketing/email/[id]   → Sequence editor
/marketing/email/templates → Email templates

/support                → Support dashboard
/support/tickets        → Ticket overview (Chatwoot embed/API)
/support/knowledge      → Knowledge base sync
/support/ai-settings    → AI configuration

/settings               → Overseer settings
```

---

## API Endpoints

### Business Planning
- `GET /api/planning/model` - Get business model
- `PUT /api/planning/model` - Update business model
- `GET /api/planning/competitors` - List competitors
- `POST /api/planning/competitors` - Add competitor
- `DELETE /api/planning/competitors/:id` - Remove competitor
- `GET /api/planning/names` - List name candidates
- `POST /api/planning/names` - Add name candidate
- `POST /api/planning/names/:id/check` - Run availability checks
- `POST /api/planning/names/:id/select` - Mark as selected
- `GET /api/planning/export` - Export as markdown

### Setup
- `GET /api/setup` - Get all setup steps with status
- `PATCH /api/setup/:id` - Update step status
- `POST /api/setup/:id/complete` - Mark step complete

### Infrastructure
- `GET /api/infrastructure` - Get all resources
- `GET /api/infrastructure/:product` - Get product resources
- `POST /api/infrastructure/sync` - Trigger sync from Cloudflare

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account record
- `PATCH /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account record

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product (triggers template)
- `GET /api/products/:slug` - Get product detail
- `PATCH /api/products/:slug` - Update product

### Health
- `GET /api/health` - Aggregated health status
- `GET /api/health/:product` - Product health

### Legal
- `GET /api/legal/policies` - List policies
- `POST /api/legal/generate` - Regenerate policies
- `GET /api/legal/:policy` - Get policy content

### Config
- `GET /api/config` - Get current config
- `POST /api/config/propose` - Create PR with config changes

### Content Pipeline
- `GET /api/content` - List content items
- `POST /api/content` - Create content item
- `GET /api/content/:id` - Get content detail
- `PATCH /api/content/:id` - Update content
- `POST /api/content/:id/generate` - Trigger AI generation
- `POST /api/content/:id/approve` - Approve for publishing
- `GET /api/content/calendar` - Get calendar view
- `GET /api/content/templates` - List templates

### Social Publishing
- `GET /api/social/accounts` - List connected accounts
- `POST /api/social/accounts` - Connect new account
- `DELETE /api/social/accounts/:id` - Disconnect account
- `GET /api/social/posts` - List posts (scheduled, published)
- `POST /api/social/posts` - Create/schedule post
- `PATCH /api/social/posts/:id` - Update scheduled post
- `DELETE /api/social/posts/:id` - Cancel scheduled post
- `GET /api/social/analytics` - Get engagement analytics

### Directory Management
- `GET /api/directories` - List directories with submission status
- `POST /api/directories/:id/submit` - Submit to directory
- `GET /api/directories/product-info` - Get canonical product info
- `PUT /api/directories/product-info` - Update product info (triggers sync)

### Email Automation
- `GET /api/email/sequences` - List sequences
- `POST /api/email/sequences` - Create sequence
- `GET /api/email/sequences/:id` - Get sequence detail
- `PATCH /api/email/sequences/:id` - Update sequence
- `GET /api/email/templates` - List templates
- `POST /api/email/templates` - Create template
- `GET /api/email/analytics` - Get email metrics

### Customer Support
- `GET /api/support/stats` - Get support statistics
- `GET /api/support/knowledge` - Get knowledge base sync status
- `POST /api/support/knowledge/sync` - Trigger knowledge base sync
- `GET /api/support/ai-config` - Get AI settings
- `PUT /api/support/ai-config` - Update AI settings

---

## External API Integrations

### Cloudflare API
```typescript
// Sync infrastructure state
async function syncCloudflareResources(accountId: string) {
  const zones = await cf.zones.list({ account: { id: accountId } });
  const workers = await cf.workers.scripts.list({ account_id: accountId });
  const d1Databases = await cf.d1.database.list({ account_id: accountId });
  const kvNamespaces = await cf.kv.namespaces.list({ account_id: accountId });
  const r2Buckets = await cf.r2.buckets.list({ account_id: accountId });
  // ... store in D1
}
```

### GitHub API
```typescript
// Create config change PR
async function proposeConfigChange(changes: ConfigChanges) {
  const branch = `config-update-${Date.now()}`;
  await gh.git.createRef({ ref: `refs/heads/${branch}`, sha: mainSha });
  await gh.repos.createOrUpdateFileContents({
    path: 'config/business.config.ts',
    message: 'chore: update business config',
    content: Buffer.from(newContent).toString('base64'),
    branch,
  });
  await gh.pulls.create({
    title: 'Update business configuration',
    head: branch,
    base: 'main',
    body: generatePRDescription(changes),
  });
}
```

### Lemon Squeezy API
```typescript
// Fetch revenue metrics
async function getRevenueMetrics() {
  const orders = await ls.orders.list({
    filter: { created_at: { gte: startOfMonth } }
  });
  return {
    revenue: orders.reduce((sum, o) => sum + o.total, 0),
    orders: orders.length,
    mrr: calculateMRR(orders),
  };
}
```

### RevenueCat API
```typescript
// Fetch mobile revenue
async function getMobileRevenue() {
  const stats = await rc.charts.overview({
    start_date: startOfMonth,
    end_date: today,
  });
  return {
    revenue: stats.revenue,
    activeSubscribers: stats.active_subscribers,
    mrr: stats.mrr,
  };
}
```

### PostHog API
```typescript
// Fetch user metrics
async function getUserMetrics() {
  const insights = await posthog.insights.retrieve({
    events: [{ id: 'user_signed_up' }, { id: 'user_active' }],
    date_from: '-7d',
  });
  return {
    signups: insights.user_signed_up,
    activeUsers: insights.user_active,
  };
}
```

### Claude API (Content Generation)
```typescript
// Generate content from template
async function generateContent(template: string, context: ContentContext) {
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Fast, cheap for drafts
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: compileTemplate(template, context),
    }],
  });
  return response.content[0].text;
}
```

### Twitter API v2
```typescript
// Post tweet
async function postTweet(text: string, credentials: TwitterCredentials) {
  const client = new TwitterApi({
    appKey: credentials.apiKey,
    appSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessSecret: credentials.accessSecret,
  });
  return client.v2.tweet(text);
}
```

### LinkedIn API
```typescript
// Post to LinkedIn
async function postToLinkedIn(content: LinkedInPost, credentials: LinkedInCredentials) {
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: `urn:li:person:${credentials.personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content.text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  return response.json();
}
```

### Chatwoot API
```typescript
// Get conversation stats
async function getSupportStats(chatwootUrl: string, apiKey: string) {
  const response = await fetch(`${chatwootUrl}/api/v1/accounts/1/reports/summary`, {
    headers: { 'api_access_token': apiKey },
  });
  return response.json();
}

// Sync knowledge base article
async function syncKnowledgeArticle(article: Article, chatwootUrl: string, apiKey: string) {
  const response = await fetch(`${chatwootUrl}/api/v1/accounts/1/portals/1/articles`, {
    method: 'POST',
    headers: {
      'api_access_token': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: article.title,
      content: article.content,
      category_id: article.categoryId,
      status: 'published',
    }),
  });
  return response.json();
}
```

### Resend API (Email Sequences)
```typescript
// Send sequence email
async function sendSequenceEmail(email: SequenceEmail, subscriber: Subscriber) {
  const resend = new Resend(env.RESEND_API_KEY);
  return resend.emails.send({
    from: 'hello@yourcompany.com',
    to: subscriber.email,
    subject: compileTemplate(email.subject, subscriber),
    html: compileTemplate(email.body, subscriber),
    tags: [
      { name: 'sequence', value: email.sequenceId },
      { name: 'step', value: email.stepNumber.toString() },
    ],
  });
}
```

---

## Authentication

Overseer is protected by **Cloudflare Access**:

```toml
# wrangler.toml
[access]
required = true
team_name = "your-team"
```

Access policies defined in `_INTEGRATE/cf-setup/plan.md`:
- Email domain: `@yourcompany.com`
- Or specific email addresses
- Optional: GitHub OAuth for team access

---

## Deployment

### Domain
```
overseer.yourcompany.com (production)
overseer-staging.yourcompany.com (staging)
```

### CI/CD

Overseer follows the same deployment pattern as other products:
1. PR → Preview deployment
2. Merge to main → Staging deployment
3. Release tag → Production deployment

### Initial Bootstrap

Overseer has a chicken-and-egg problem: it needs to exist to help set up infrastructure, but it needs infrastructure to run.

**Bootstrap sequence:**
1. Run `pnpm onboard` for local dev setup
2. Manually create Cloudflare account (first time only)
3. Run Pulumi for minimal Overseer infrastructure
4. Deploy Overseer to Cloudflare
5. Use Overseer to complete remaining setup

---

## Implementation Order

### Phase 1: Core Structure (Week 1)
- [ ] Create `products/overseer/` from template
- [ ] Set up D1 schema and migrations
- [ ] Implement basic auth (Cloudflare Access)
- [ ] Build dashboard layout and navigation

### Phase 2: Setup Wizard (Week 2)
- [ ] Import setup steps from PLAN.md
- [ ] Build step completion tracking
- [ ] Implement external links and instructions
- [ ] Add notes and skip functionality

### Phase 3: Infrastructure View (Week 3)
- [ ] Cloudflare API integration
- [ ] Resource sync and caching
- [ ] Health status aggregation
- [ ] Basic actions (view logs, rollback)

### Phase 4: Accounts & Products (Week 4)
- [ ] Account registry CRUD
- [ ] Product management
- [ ] Renewal tracking
- [ ] Infisical integration for secret references

### Phase 5: Legal & Compliance (Week 5)
- [ ] Policy viewer
- [ ] Template regeneration trigger
- [ ] Version history
- [ ] Compliance dashboard

### Phase 6: Configuration UI (Week 6)
- [ ] Config file parser
- [ ] Edit forms with validation
- [ ] GitHub PR creation
- [ ] Change preview

### Phase 7: Marketing Hub - Content (Week 7)
- [ ] Content calendar view
- [ ] Content item CRUD
- [ ] AI generation trigger (Claude API)
- [ ] Approval workflow

### Phase 8: Marketing Hub - Social (Week 8)
- [ ] Social account connection
- [ ] Post composer and scheduler
- [ ] Queue management
- [ ] Analytics dashboard

### Phase 9: Marketing Hub - Directories & Email (Week 9)
- [ ] Product info management
- [ ] Directory submission tracker
- [ ] Email sequence management
- [ ] Template library

### Phase 10: Customer Support Integration (Week 10)
- [ ] Chatwoot integration
- [ ] Support stats dashboard
- [ ] Knowledge base sync
- [ ] AI settings management

### Phase 11: Polish & Launch (Week 11-12)
- [ ] Mobile-responsive design
- [ ] Error handling and loading states
- [ ] Audit logging
- [ ] Documentation
- [ ] End-to-end testing

---

## Relationship to Other Plans

| Plan | Relationship |
|------|--------------|
| `cf-setup` | Overseer displays status, can trigger Pulumi |
| `gh-setup` | Overseer shows repo status, creates PRs |
| `dns` | Overseer shows DNS records, edits via config PR |
| `payments` | Overseer displays revenue metrics |
| `policies` | Overseer triggers regeneration, shows versions |
| `reminders` | Overseer displays upcoming tasks |
| `monitoring` | Overseer aggregates health status |
| `github-workflows` | Overseer can trigger workflows |
| `content-pipeline` | Overseer manages content calendar, approves AI drafts |
| `social-publishing` | Overseer queues posts, views analytics, manages accounts |
| `directory-management` | Overseer tracks submissions, syncs product info |
| `email-automation` | Overseer configures sequences, monitors metrics |
| `customer-support` | Overseer shows ticket stats, manages knowledge base |

---

## Non-Goals

Overseer does **NOT**:
- Replace CLI tools for developers
- Store actual secrets (references only, actual secrets in Infisical)
- Directly modify infrastructure (creates PRs or triggers automation)
- Handle customer-facing operations (that's the product apps)
- Replace Cloudflare/GitHub dashboards (links to them instead)

---

## Future Enhancements

### V2 Features
- Multi-user support with roles
- Slack/Discord notifications
- Custom dashboards
- API for external tools
- Changelog generation
- Cost tracking and budgets

### V3 Features
- AI assistant for setup guidance
- Automated issue detection and remediation
- Customer health scores
- Churn prediction alerts
