# Cloudflare Setup Plan

> Complete Cloudflare account configuration: zones, billing alerts, email routing, security, and organization settings

## Overview

This plan covers the full Cloudflare setup for a multi-product SaaS. All configuration is managed via Pulumi (TypeScript) for reproducibility and version control.

## Account Structure

```
Cloudflare Account (Business/Pro)
├── Organization Settings
│   ├── Members & Roles
│   ├── Audit Logs
│   └── API Tokens
│
├── Zones (per product)
│   ├── tastier.app (prod)
│   ├── tastier-staging.app (staging)
│   ├── cherishall.app (prod)
│   └── cherishall-staging.app (staging)
│
├── Workers
│   ├── tastier-api
│   ├── tastier-status
│   ├── cherishall-api
│   ├── cherishall-status
│   └── alert-worker (monitoring)
│
├── Pages
│   ├── tastier-marketing
│   ├── tastier-app
│   ├── cherishall-marketing
│   └── cherishall-app
│
├── D1 Databases
│   ├── tastier-db (prod)
│   ├── tastier-staging-db
│   ├── cherishall-db (prod)
│   └── cherishall-staging-db
│
├── KV Namespaces
│   ├── tastier-sessions
│   ├── tastier-cache
│   ├── cherishall-sessions
│   └── cherishall-cache
│
├── R2 Buckets
│   ├── tastier-assets
│   ├── cherishall-assets
│   └── logs-all
│
├── Queues
│   ├── tastier-jobs
│   └── cherishall-jobs
│
└── Email Routing
    ├── tastier.app → Google Workspace
    └── cherishall.app → Google Workspace
```

---

## Part 1: Account & Organization

### Initial Setup (Manual - One Time)

1. **Create Cloudflare Account**
   - Sign up at cloudflare.com
   - Choose Pro or Business plan (for advanced features)
   - Enable 2FA immediately

2. **Organization Settings**
   ```
   Account → Members → Invite team members
   Account → Audit Log → Enable (retained 18 months on Business)
   ```

3. **API Tokens**
   Create scoped tokens (not global API key):

   | Token Name | Permissions | Use |
   |------------|-------------|-----|
   | `ci-deploy` | Workers:Edit, Pages:Edit, D1:Edit, KV:Edit, R2:Edit | GitHub Actions |
   | `pulumi-iac` | All zones:Edit, Account:Edit | Infrastructure |
   | `local-dev` | Workers:Edit (specific workers) | Local wrangler |

### Pulumi: Account Settings

```typescript
// packages/shared/iac/src/account.ts
import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const accountId = config.require('cloudflareAccountId');

// Account members (if managing via IaC)
export function addAccountMember(email: string, roles: string[]) {
  return new cloudflare.AccountMember(`member-${email.split('@')[0]}`, {
    accountId,
    emailAddress: email,
    roleIds: roles,
  });
}

// Example roles:
// - Administrator: Full access
// - Administrator Read Only: View everything
// - Analytics: View analytics only
// - Cloudflare Workers Admin: Manage Workers
```

---

## Part 2: Zone Configuration

### DNS Zones

```typescript
// packages/shared/iac/src/zones.ts
import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const accountId = config.require('cloudflareAccountId');

interface ProductZoneConfig {
  product: string;
  domain: string;
  plan: 'free' | 'pro' | 'business' | 'enterprise';
}

export function createProductZones(products: ProductZoneConfig[]) {
  const zones: Record<string, cloudflare.Zone> = {};

  for (const { product, domain, plan } of products) {
    // Production zone
    zones[`${product}-prod`] = new cloudflare.Zone(`${product}-zone`, {
      accountId,
      zone: domain,
      plan,
      type: 'full',
    });

    // Staging zone
    zones[`${product}-staging`] = new cloudflare.Zone(`${product}-staging-zone`, {
      accountId,
      zone: `${product}-staging.app`,
      plan: 'free', // Staging can be free tier
      type: 'full',
    });
  }

  return zones;
}

// Usage
const zones = createProductZones([
  { product: 'tastier', domain: 'tastier.app', plan: 'pro' },
  { product: 'cherishall', domain: 'cherishall.app', plan: 'pro' },
]);
```

### Zone Settings

```typescript
// packages/shared/iac/src/zone-settings.ts
import * as cloudflare from '@pulumi/cloudflare';

export function configureZoneSettings(zoneId: string, product: string) {
  // SSL/TLS
  new cloudflare.ZoneSettingsOverride(`${product}-ssl`, {
    zoneId,
    settings: {
      ssl: 'strict',
      alwaysUseHttps: 'on',
      minTlsVersion: '1.2',
      automaticHttpsRewrites: 'on',
      opportunisticEncryption: 'on',
    },
  });

  // Security
  new cloudflare.ZoneSettingsOverride(`${product}-security`, {
    zoneId,
    settings: {
      securityLevel: 'medium',
      browserCheck: 'on',
      challengeTtl: 1800,
      privacyPass: 'on',
      waf: 'on',
    },
  });

  // Performance
  new cloudflare.ZoneSettingsOverride(`${product}-performance`, {
    zoneId,
    settings: {
      minify: {
        css: 'on',
        html: 'on',
        js: 'on',
      },
      brotli: 'on',
      earlyHints: 'on',
      h2Prioritization: 'on',
      http3: 'on',
      zeroRtt: 'on',
      rocketLoader: 'off', // Can break JS apps
    },
  });

  // Caching
  new cloudflare.ZoneSettingsOverride(`${product}-caching`, {
    zoneId,
    settings: {
      browserCacheTtl: 14400, // 4 hours
      cacheLevel: 'aggressive',
      developmentMode: 'off',
    },
  });
}
```

---

## Part 3: Billing & Alerts

### Billing Alerts (Dashboard Setup)

1. Go to **Account → Billing → Alerts**
2. Configure alerts:

| Alert Type | Threshold | Action |
|------------|-----------|--------|
| Usage alert | 80% of plan limit | Email |
| Usage alert | 100% of plan limit | Email |
| Workers requests | 10M requests/month | Email |
| R2 storage | 10GB | Email |
| D1 reads | 5B rows/month | Email |

### Notification Policies (Pulumi)

```typescript
// packages/shared/iac/src/notifications.ts
import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const accountId = config.require('cloudflareAccountId');
const alertEmails = config.requireObject<string[]>('alertEmails');

// Webhook for Slack/Discord (optional)
const webhook = new cloudflare.NotificationPolicyWebhooks('alert-webhook', {
  accountId,
  name: 'Slack Alerts',
  url: config.get('slackWebhookUrl') || '',
  secret: config.getSecret('webhookSecret'),
});

// Health check alerts
export function createHealthCheckAlert(product: string, healthCheckIds: string[]) {
  return new cloudflare.NotificationPolicy(`${product}-health-alert`, {
    accountId,
    name: `${product} Health Check Failed`,
    enabled: true,
    alertType: 'health_check_status_notification',
    emailIntegration: alertEmails.map(email => ({ id: email })),
    webhooksIntegration: webhook.id ? [{ id: webhook.id }] : [],
    filters: {
      healthCheckId: healthCheckIds,
      status: ['Unhealthy'],
    },
  });
}

// Workers error alerts
export function createWorkersErrorAlert(product: string) {
  return new cloudflare.NotificationPolicy(`${product}-workers-error`, {
    accountId,
    name: `${product} Workers Errors`,
    enabled: true,
    alertType: 'workers_alert',
    emailIntegration: alertEmails.map(email => ({ id: email })),
    filters: {
      event: ['worker.exception'],
    },
  });
}

// SSL expiration alerts
export function createSSLExpiryAlert(product: string, zoneId: string) {
  return new cloudflare.NotificationPolicy(`${product}-ssl-expiry`, {
    accountId,
    name: `${product} SSL Expiring`,
    enabled: true,
    alertType: 'universal_ssl_event_type',
    emailIntegration: alertEmails.map(email => ({ id: email })),
    filters: {
      zones: [zoneId],
    },
  });
}

// DDoS attack alerts
export function createDDoSAlert(product: string, zoneId: string) {
  return new cloudflare.NotificationPolicy(`${product}-ddos`, {
    accountId,
    name: `${product} DDoS Attack`,
    enabled: true,
    alertType: 'dos_attack_l7',
    emailIntegration: alertEmails.map(email => ({ id: email })),
    webhooksIntegration: webhook.id ? [{ id: webhook.id }] : [],
    filters: {
      zones: [zoneId],
    },
  });
}
```

---

## Part 4: Email Routing

### Setup: Google Workspace Integration

1. **Google Workspace Setup** (manual):
   - Add domain to Google Workspace
   - Verify domain ownership
   - Note the MX records Google provides

2. **Cloudflare Email Routing**:
   - Enables catch-all and custom routing
   - Can process emails with Workers before forwarding

### Pulumi: Email Routing

```typescript
// packages/shared/iac/src/email.ts
import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

interface EmailConfig {
  product: string;
  zoneId: string;
  googleWorkspaceMx: string[]; // Google MX records
  catchAllDestination: string; // e.g., admin@company.com
  routes: Array<{
    address: string; // e.g., support
    destination: string; // e.g., support@company.com
  }>;
}

export function configureEmail(config: EmailConfig) {
  const { product, zoneId, googleWorkspaceMx, catchAllDestination, routes } = config;

  // Enable email routing on zone
  new cloudflare.EmailRoutingSettings(`${product}-email-settings`, {
    zoneId,
    enabled: true,
  });

  // MX records for Google Workspace
  googleWorkspaceMx.forEach((mx, i) => {
    new cloudflare.Record(`${product}-mx-${i}`, {
      zoneId,
      name: '@',
      type: 'MX',
      value: mx,
      priority: (i + 1) * 10,
      ttl: 3600,
    });
  });

  // SPF record
  new cloudflare.Record(`${product}-spf`, {
    zoneId,
    name: '@',
    type: 'TXT',
    value: 'v=spf1 include:_spf.google.com ~all',
    ttl: 3600,
  });

  // DKIM (Google provides this)
  // Add manually or via config

  // DMARC
  new cloudflare.Record(`${product}-dmarc`, {
    zoneId,
    name: '_dmarc',
    type: 'TXT',
    value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@' + product + '.app',
    ttl: 3600,
  });

  // Email routing rules
  for (const route of routes) {
    new cloudflare.EmailRoutingRule(`${product}-email-${route.address}`, {
      zoneId,
      name: `${route.address}@${product}.app`,
      enabled: true,
      matchers: [{
        type: 'literal',
        field: 'to',
        value: `${route.address}@${product}.app`,
      }],
      actions: [{
        type: 'forward',
        values: [route.destination],
      }],
    });
  }

  // Catch-all rule
  new cloudflare.EmailRoutingCatchAll(`${product}-email-catchall`, {
    zoneId,
    name: 'Catch-all',
    enabled: true,
    matchers: [{
      type: 'all',
    }],
    actions: [{
      type: 'forward',
      values: [catchAllDestination],
    }],
  });
}

// Usage
configureEmail({
  product: 'tastier',
  zoneId: zones['tastier-prod'].id,
  googleWorkspaceMx: [
    'aspmx.l.google.com',
    'alt1.aspmx.l.google.com',
    'alt2.aspmx.l.google.com',
    'alt3.aspmx.l.google.com',
    'alt4.aspmx.l.google.com',
  ],
  catchAllDestination: 'admin@tastier.app',
  routes: [
    { address: 'support', destination: 'support@tastier.app' },
    { address: 'hello', destination: 'hello@tastier.app' },
    { address: 'billing', destination: 'billing@tastier.app' },
    { address: 'security', destination: 'security@tastier.app' },
    { address: 'legal', destination: 'legal@tastier.app' },
  ],
});
```

### Email Worker (Optional Advanced)

For processing inbound emails before forwarding:

```typescript
// packages/shared/email-worker/src/index.ts
export default {
  async email(message: EmailMessage, env: Env, ctx: ExecutionContext) {
    const { from, to, subject } = message;

    // Log to analytics
    console.log(`Email received: ${from} -> ${to}: ${subject}`);

    // Example: Auto-respond to support
    if (to === 'support@tastier.app') {
      // Could trigger a webhook to your API
      await fetch('https://api.tastier.app/webhooks/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          subject,
          // Raw email content available via message.raw
        }),
      });
    }

    // Forward to Google Workspace
    await message.forward('support@tastier.app');
  },
};
```

---

## Part 5: Security Configuration

### WAF Rules

```typescript
// packages/shared/iac/src/security.ts
import * as cloudflare from '@pulumi/cloudflare';

export function configureWAF(zoneId: string, product: string) {
  // Rate limiting on auth endpoints
  new cloudflare.RateLimit(`${product}-auth-ratelimit`, {
    zoneId,
    threshold: 5,
    period: 60,
    action: {
      mode: 'ban',
      timeout: 300, // 5 minutes
    },
    match: {
      request: {
        urlPattern: `*api.${product}.app/auth/*`,
        methods: ['POST'],
      },
    },
    disabled: false,
  });

  // Rate limiting on API
  new cloudflare.RateLimit(`${product}-api-ratelimit`, {
    zoneId,
    threshold: 100,
    period: 60,
    action: {
      mode: 'challenge',
    },
    match: {
      request: {
        urlPattern: `*api.${product}.app/*`,
      },
    },
    disabled: false,
  });

  // Block known bad bots
  new cloudflare.Ruleset(`${product}-block-bots`, {
    zoneId,
    name: 'Block Bad Bots',
    kind: 'zone',
    phase: 'http_request_firewall_custom',
    rules: [{
      action: 'block',
      expression: '(cf.client.bot) or (cf.threat_score gt 50)',
      description: 'Block known bad bots and high threat scores',
    }],
  });

  // Managed WAF ruleset
  new cloudflare.Ruleset(`${product}-managed-waf`, {
    zoneId,
    name: 'Managed WAF',
    kind: 'zone',
    phase: 'http_request_firewall_managed',
    rules: [{
      action: 'execute',
      actionParameters: {
        id: 'efb7b8c949ac4650a09736fc376e9aee', // Cloudflare Managed Ruleset
      },
      expression: 'true',
      description: 'Execute Cloudflare Managed Ruleset',
    }],
  });
}
```

### Bot Management

```typescript
// packages/shared/iac/src/bot-management.ts
import * as cloudflare from '@pulumi/cloudflare';

export function configureBotManagement(zoneId: string, product: string) {
  // Allow good bots (Google, Bing, etc.)
  new cloudflare.Ruleset(`${product}-allow-good-bots`, {
    zoneId,
    name: 'Allow Search Bots',
    kind: 'zone',
    phase: 'http_request_firewall_custom',
    rules: [{
      action: 'skip',
      actionParameters: {
        ruleset: 'current',
      },
      expression: '(cf.client.bot) and (cf.verified_bot_category in {"Search Engine Crawler" "Search Engine Optimization" "Monitoring & Analytics"})',
      description: 'Allow verified search engine bots',
    }],
  });
}
```

---

## Part 6: Logpush Configuration

```typescript
// packages/shared/iac/src/logpush.ts
import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const accountId = config.require('cloudflareAccountId');

export function configureLogpush(logsBucket: cloudflare.R2Bucket) {
  // HTTP request logs
  new cloudflare.LogpushJob('http-logs', {
    accountId,
    name: 'http-request-logs',
    enabled: true,
    logpullOptions: 'fields=ClientIP,ClientRequestHost,ClientRequestMethod,ClientRequestPath,ClientRequestProtocol,EdgeColoCode,EdgeResponseStatus,EdgeStartTimestamp,RayID,OriginResponseTime,ClientCountry,ClientDeviceType&timestamps=rfc3339',
    dataset: 'http_requests',
    destinationConf: pulumi.interpolate`r2://${logsBucket.name}/http/{DATE}?account-id=${accountId}`,
    frequency: 'high',
  });

  // Workers trace logs
  new cloudflare.LogpushJob('workers-logs', {
    accountId,
    name: 'workers-trace-logs',
    enabled: true,
    logpullOptions: 'fields=Event,EventTimestampMs,Outcome,Exceptions,Logs,ScriptName&timestamps=rfc3339',
    dataset: 'workers_trace_events',
    destinationConf: pulumi.interpolate`r2://${logsBucket.name}/workers/{DATE}?account-id=${accountId}`,
    frequency: 'high',
  });
}
```

---

## Part 7: Health Checks

```typescript
// packages/shared/iac/src/health-checks.ts
import * as cloudflare from '@pulumi/cloudflare';

interface HealthCheckConfig {
  product: string;
  zoneId: string;
  services: Array<{
    name: string;
    subdomain: string; // '' for apex
    path: string;
  }>;
}

export function createHealthChecks(config: HealthCheckConfig) {
  const { product, zoneId, services } = config;
  const healthChecks: cloudflare.Healthcheck[] = [];

  for (const service of services) {
    const subdomain = service.subdomain ? `${service.subdomain}.` : '';
    const address = `${subdomain}${product}.app`;

    const healthCheck = new cloudflare.Healthcheck(`${product}-${service.name}-health`, {
      zoneId,
      name: `${product}-${service.name}`,
      address,
      type: 'HTTPS',
      port: 443,
      method: 'GET',
      path: service.path,
      expectedCodes: ['200'],
      timeout: 5,
      retries: 2,
      interval: 60,
      consecutiveFails: 3,
      consecutiveSuccesses: 2,
      checkRegions: ['WNAM', 'ENAM', 'WEU', 'APAC'],
      header: {
        'User-Agent': ['Cloudflare-Health-Check'],
      },
    });

    healthChecks.push(healthCheck);
  }

  return healthChecks;
}

// Usage
createHealthChecks({
  product: 'tastier',
  zoneId: zones['tastier-prod'].id,
  services: [
    { name: 'api', subdomain: 'api', path: '/health' },
    { name: 'app', subdomain: 'app', path: '/' },
    { name: 'marketing', subdomain: '', path: '/' },
    { name: 'status', subdomain: 'status', path: '/' },
  ],
});
```

---

## Part 8: Storage (R2, KV, D1)

```typescript
// packages/shared/iac/src/storage.ts
import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const accountId = config.require('cloudflareAccountId');

export function createProductStorage(product: string) {
  // R2 Buckets
  const assetsBucket = new cloudflare.R2Bucket(`${product}-assets`, {
    accountId,
    name: `${product}-assets`,
    location: 'WNAM',
  });

  // Enable CORS for assets bucket
  // Note: R2 CORS is configured via API, not Pulumi yet

  // KV Namespaces
  const sessionsKV = new cloudflare.WorkersKvNamespace(`${product}-sessions`, {
    accountId,
    title: `${product}-sessions`,
  });

  const cacheKV = new cloudflare.WorkersKvNamespace(`${product}-cache`, {
    accountId,
    title: `${product}-cache`,
  });

  // D1 Databases
  const prodDb = new cloudflare.D1Database(`${product}-db`, {
    accountId,
    name: `${product}-db`,
  });

  const stagingDb = new cloudflare.D1Database(`${product}-staging-db`, {
    accountId,
    name: `${product}-staging-db`,
  });

  // Queues
  const jobsQueue = new cloudflare.Queue(`${product}-jobs`, {
    accountId,
    name: `${product}-jobs`,
  });

  return {
    assetsBucket,
    sessionsKV,
    cacheKV,
    prodDb,
    stagingDb,
    jobsQueue,
  };
}
```

---

## Summary

| Component | Configuration |
|-----------|---------------|
| Account | Members, API tokens, audit logs |
| Zones | SSL strict, WAF, performance settings |
| Billing | Usage alerts at 80% and 100% |
| Email | Google Workspace MX, routing rules, SPF/DKIM/DMARC |
| Security | Rate limiting, managed WAF, bot management |
| Logging | Logpush to R2 |
| Health | HTTPS checks every 60s, 4 regions |
| Storage | R2, KV, D1, Queues per product |

## Implementation Order

1. **Day 1**: Account setup, API tokens, zones
2. **Day 2**: Zone settings (SSL, security, performance)
3. **Day 3**: Email routing, Google Workspace integration
4. **Day 4**: WAF rules, rate limiting
5. **Day 5**: Logpush, health checks
6. **Day 6**: Storage (R2, KV, D1, Queues)
7. **Day 7**: Billing alerts, notifications
8. **Day 8**: Testing, documentation
