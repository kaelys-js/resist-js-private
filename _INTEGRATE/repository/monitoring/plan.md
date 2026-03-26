# Monitoring Plan

> Cloudflare-native monitoring with Logpush to R2, cron-based alerting, and Pulumi IaC

## Overview

All monitoring stays within Cloudflare ecosystem. No external services (except Sentry for error tracking, which you already have). Logs go to R2, a cron Worker analyzes them and sends alerts.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Cloudflare                                     │
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  Workers │    │  Pages   │    │   D1     │    │   KV     │          │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘          │
│       │               │               │               │                  │
│       └───────────────┴───────────────┴───────────────┘                  │
│                              │                                           │
│                              ▼                                           │
│                    ┌─────────────────┐                                   │
│                    │    Logpush      │                                   │
│                    │  (HTTP Logs)    │                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
│                             ▼                                            │
│                    ┌─────────────────┐                                   │
│                    │   R2 Bucket     │                                   │
│                    │   (logs-*)      │                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
│                             ▼                                            │
│                    ┌─────────────────┐      ┌─────────────────┐         │
│                    │  Alert Worker   │─────▶│  Notifications  │         │
│                    │  (cron: 5min)   │      │  (Email/Slack)  │         │
│                    └─────────────────┘      └─────────────────┘         │
│                                                                          │
│  ┌─────────────────┐                                                    │
│  │  Health Checks  │───────▶ CF Notifications                           │
│  └─────────────────┘                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Part 1: Logpush Configuration

### What Gets Logged

| Log Type | Source | Fields |
|----------|--------|--------|
| HTTP Requests | Workers | timestamp, method, path, status, duration, cf-ray |
| Worker Errors | Workers | timestamp, error, stack, script |
| D1 Queries | D1 | timestamp, query, duration, rows |

### R2 Bucket Structure

```
logs-{product}/
├── http/
│   ├── 2024/01/27/
│   │   ├── 00/
│   │   │   ├── 0000.json.gz
│   │   │   ├── 0001.json.gz
│   │   │   └── ...
│   │   └── 01/
│   └── ...
├── errors/
│   └── 2024/01/27/
└── d1/
    └── 2024/01/27/
```

### Pulumi Configuration

```typescript
// packages/shared/iac/src/monitoring.ts
import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const accountId = config.require('cloudflareAccountId');

// Create R2 bucket for logs
export function createLogsBucket(product: string) {
  return new cloudflare.R2Bucket(`${product}-logs`, {
    accountId,
    name: `logs-${product}`,
    location: 'WNAM', // West North America
  });
}

// Create Logpush job for HTTP logs
export function createLogpushJob(
  product: string,
  zoneId: string,
  bucketName: string
) {
  return new cloudflare.LogpushJob(`${product}-http-logs`, {
    accountId,
    name: `${product}-http-logs`,
    enabled: true,
    logpullOptions: 'fields=ClientIP,ClientRequestHost,ClientRequestMethod,ClientRequestPath,ClientRequestProtocol,ClientRequestReferer,ClientRequestURI,EdgeColoCode,EdgeResponseStatus,EdgeStartTimestamp,RayID,OriginResponseTime&timestamps=rfc3339',
    dataset: 'http_requests',
    destinationConf: `r2://${bucketName}/http/{DATE}?account-id=${accountId}`,
    frequency: 'high', // Every 5 minutes
    filter: JSON.stringify({
      where: {
        and: [
          { key: 'ClientRequestHost', operator: 'contains', value: product },
        ],
      },
    }),
  });
}

// Create health check
export function createHealthCheck(
  product: string,
  service: string,
  url: string
) {
  return new cloudflare.Healthcheck(`${product}-${service}-health`, {
    zoneId: config.require(`${product}ZoneId`),
    name: `${product}-${service}`,
    address: url,
    type: 'HTTPS',
    port: 443,
    method: 'GET',
    path: '/health',
    expectedCodes: ['200'],
    timeout: 5,
    retries: 2,
    interval: 60,
    consecutiveFails: 3,
    consecutiveSuccesses: 2,
    checkRegions: ['WNAM', 'ENAM', 'WEU'],
  });
}

// Create notification policy for health checks
export function createNotificationPolicy(
  product: string,
  webhookUrl?: string,
  emails?: string[]
) {
  const mechanisms: any = {};

  if (emails && emails.length > 0) {
    mechanisms.email = emails.map(email => ({ id: email }));
  }

  if (webhookUrl) {
    const webhook = new cloudflare.NotificationPolicyWebhooks(`${product}-webhook`, {
      accountId,
      name: `${product}-alerts`,
      url: webhookUrl,
      secret: config.requireSecret('webhookSecret'),
    });

    mechanisms.webhooks = [{ id: webhook.id }];
  }

  return new cloudflare.NotificationPolicy(`${product}-health-alerts`, {
    accountId,
    name: `${product} Health Alerts`,
    enabled: true,
    alertType: 'health_check_status_notification',
    ...mechanisms,
    filters: {
      healthCheckId: [], // Will be populated with health check IDs
      status: ['Unhealthy'],
    },
  });
}
```

### Pulumi Index

```typescript
// packages/shared/iac/src/index.ts
import * as pulumi from '@pulumi/pulumi';
import {
  createLogsBucket,
  createLogpushJob,
  createHealthCheck,
  createNotificationPolicy,
} from './monitoring';

const config = new pulumi.Config();
const products = ['tastier', 'cherishall'];

// Create monitoring resources for each product
for (const product of products) {
  // Logs bucket
  const logsBucket = createLogsBucket(product);

  // Logpush job
  const zoneId = config.require(`${product}ZoneId`);
  createLogpushJob(product, zoneId, logsBucket.name);

  // Health checks
  const services = ['api', 'app', 'marketing', 'status'];
  for (const service of services) {
    const subdomain = service === 'marketing' ? '' : `${service}.`;
    createHealthCheck(
      product,
      service,
      `https://${subdomain}${product}.app`
    );
  }

  // Notification policy
  createNotificationPolicy(
    product,
    config.get('slackWebhookUrl'),
    config.getObject<string[]>('alertEmails')
  );
}

export { };
```

---

## Part 2: Alert Worker

The cron Worker that analyzes logs and sends alerts.

### Alert Types

| Alert | Condition | Severity |
|-------|-----------|----------|
| Error Rate Spike | >5% 5xx in 5 min | Critical |
| High Latency | p95 > 2s | Warning |
| Traffic Anomaly | >200% normal | Warning |
| D1 Slow Queries | >500ms | Warning |
| Worker Exception | Any unhandled | Critical |

### Alert Destinations

Since you want no external services, alerts can go to:

1. **Email** - Cloudflare Notifications (built-in)
2. **Slack/Discord** - Webhook from Worker
3. **Custom Webhook** - Your own endpoint
4. **KV Store** - For dashboard display

For Slack/Discord, the Worker sends a POST to webhook URL. No external "service" needed, just a webhook URL.

### Worker Implementation

```typescript
// packages/shared/monitoring/src/alert-worker/index.ts
import { Hono } from 'hono';

interface Env {
  LOGS_BUCKET: R2Bucket;
  ALERTS_KV: KVNamespace;
  SLACK_WEBHOOK_URL?: string;
  DISCORD_WEBHOOK_URL?: string;
  ALERT_EMAIL?: string;
  RESEND_API_KEY?: string; // If using Resend for email
}

interface LogEntry {
  EdgeStartTimestamp: string;
  EdgeResponseStatus: number;
  OriginResponseTime: number;
  ClientRequestPath: string;
  RayID: string;
}

interface Alert {
  id: string;
  type: 'error_rate' | 'latency' | 'traffic' | 'slow_query' | 'exception';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
  product: string;
  acknowledged: boolean;
}

const app = new Hono<{ Bindings: Env }>();

// Cron handler - runs every 5 minutes
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Get recent logs from R2
    const logs = await getRecentLogs(env.LOGS_BUCKET, fiveMinutesAgo, now);

    // Analyze logs
    const alerts: Alert[] = [];

    // Check error rate
    const errorRate = calculateErrorRate(logs);
    if (errorRate > 0.05) {
      alerts.push({
        id: `error_rate_${Date.now()}`,
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate spike: ${(errorRate * 100).toFixed(1)}% (threshold: 5%)`,
        details: {
          errorRate,
          totalRequests: logs.length,
          errorCount: logs.filter(l => l.EdgeResponseStatus >= 500).length,
        },
        timestamp: now.toISOString(),
        product: 'all',
        acknowledged: false,
      });
    }

    // Check latency
    const p95Latency = calculateP95Latency(logs);
    if (p95Latency > 2000) {
      alerts.push({
        id: `latency_${Date.now()}`,
        type: 'latency',
        severity: 'warning',
        message: `High latency: p95 = ${p95Latency}ms (threshold: 2000ms)`,
        details: {
          p95Latency,
          p50Latency: calculateP50Latency(logs),
          sampleSize: logs.length,
        },
        timestamp: now.toISOString(),
        product: 'all',
        acknowledged: false,
      });
    }

    // Check traffic anomaly
    const trafficAnomaly = await checkTrafficAnomaly(env.ALERTS_KV, logs.length);
    if (trafficAnomaly) {
      alerts.push({
        id: `traffic_${Date.now()}`,
        type: 'traffic',
        severity: 'warning',
        message: `Traffic anomaly: ${trafficAnomaly.percentChange}% change from baseline`,
        details: trafficAnomaly,
        timestamp: now.toISOString(),
        product: 'all',
        acknowledged: false,
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await sendAlert(env, alert);
      await storeAlert(env.ALERTS_KV, alert);
    }

    // Update baseline for traffic anomaly detection
    await updateBaseline(env.ALERTS_KV, logs.length, now);
  },

  // HTTP handler for manual queries and dashboard
  fetch: app.fetch,
};

// Get recent logs from R2
async function getRecentLogs(
  bucket: R2Bucket,
  start: Date,
  end: Date
): Promise<LogEntry[]> {
  const logs: LogEntry[] = [];

  // List objects in the time range
  const prefix = `http/${formatDatePath(start)}`;
  const listed = await bucket.list({ prefix, limit: 100 });

  for (const object of listed.objects) {
    const obj = await bucket.get(object.key);
    if (!obj) continue;

    const text = await obj.text();
    // Logs are newline-delimited JSON
    const entries = text
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as LogEntry);

    logs.push(...entries);
  }

  return logs;
}

// Calculate error rate (5xx responses)
function calculateErrorRate(logs: LogEntry[]): number {
  if (logs.length === 0) return 0;

  const errors = logs.filter(l => l.EdgeResponseStatus >= 500).length;
  return errors / logs.length;
}

// Calculate p95 latency
function calculateP95Latency(logs: LogEntry[]): number {
  if (logs.length === 0) return 0;

  const latencies = logs
    .map(l => l.OriginResponseTime)
    .filter(l => l != null)
    .sort((a, b) => a - b);

  const index = Math.floor(latencies.length * 0.95);
  return latencies[index] || 0;
}

// Calculate p50 latency
function calculateP50Latency(logs: LogEntry[]): number {
  if (logs.length === 0) return 0;

  const latencies = logs
    .map(l => l.OriginResponseTime)
    .filter(l => l != null)
    .sort((a, b) => a - b);

  const index = Math.floor(latencies.length * 0.5);
  return latencies[index] || 0;
}

// Check for traffic anomaly
async function checkTrafficAnomaly(
  kv: KVNamespace,
  currentCount: number
): Promise<{ baseline: number; percentChange: number } | null> {
  const baseline = await kv.get('traffic_baseline', 'json') as { avg: number } | null;

  if (!baseline) return null;

  const percentChange = ((currentCount - baseline.avg) / baseline.avg) * 100;

  if (Math.abs(percentChange) > 200) {
    return { baseline: baseline.avg, percentChange };
  }

  return null;
}

// Update traffic baseline (rolling average)
async function updateBaseline(
  kv: KVNamespace,
  count: number,
  timestamp: Date
): Promise<void> {
  const key = 'traffic_baseline';
  const existing = await kv.get(key, 'json') as { counts: number[]; avg: number } | null;

  const counts = existing?.counts || [];
  counts.push(count);

  // Keep last 24 hours (288 five-minute intervals)
  while (counts.length > 288) {
    counts.shift();
  }

  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

  await kv.put(key, JSON.stringify({ counts, avg }));
}

// Send alert to configured destinations
async function sendAlert(env: Env, alert: Alert): Promise<void> {
  const promises: Promise<void>[] = [];

  // Slack
  if (env.SLACK_WEBHOOK_URL) {
    promises.push(sendSlackAlert(env.SLACK_WEBHOOK_URL, alert));
  }

  // Discord
  if (env.DISCORD_WEBHOOK_URL) {
    promises.push(sendDiscordAlert(env.DISCORD_WEBHOOK_URL, alert));
  }

  // Email via Resend
  if (env.ALERT_EMAIL && env.RESEND_API_KEY) {
    promises.push(sendEmailAlert(env.RESEND_API_KEY, env.ALERT_EMAIL, alert));
  }

  await Promise.allSettled(promises);
}

// Send to Slack
async function sendSlackAlert(webhookUrl: string, alert: Alert): Promise<void> {
  const color = alert.severity === 'critical' ? '#dc2626' : '#f59e0b';
  const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${emoji} ${alert.type.replace('_', ' ').toUpperCase()}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: alert.message,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Product:* ${alert.product} | *Severity:* ${alert.severity} | *Time:* ${alert.timestamp}`,
                },
              ],
            },
          ],
        },
      ],
    }),
  });
}

// Send to Discord
async function sendDiscordAlert(webhookUrl: string, alert: Alert): Promise<void> {
  const color = alert.severity === 'critical' ? 0xdc2626 : 0xf59e0b;
  const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: `${emoji} ${alert.type.replace('_', ' ').toUpperCase()}`,
          description: alert.message,
          color,
          fields: [
            { name: 'Product', value: alert.product, inline: true },
            { name: 'Severity', value: alert.severity, inline: true },
          ],
          timestamp: alert.timestamp,
        },
      ],
    }),
  });
}

// Send email via Resend
async function sendEmailAlert(
  apiKey: string,
  email: string,
  alert: Alert
): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'alerts@yourdomain.com',
      to: email,
      subject: `[${alert.severity.toUpperCase()}] ${alert.type.replace('_', ' ')} - ${alert.product}`,
      html: `
        <h2>${alert.message}</h2>
        <p><strong>Product:</strong> ${alert.product}</p>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Time:</strong> ${alert.timestamp}</p>
        <h3>Details</h3>
        <pre>${JSON.stringify(alert.details, null, 2)}</pre>
      `,
    }),
  });
}

// Store alert in KV
async function storeAlert(kv: KVNamespace, alert: Alert): Promise<void> {
  // Store individual alert
  await kv.put(`alert:${alert.id}`, JSON.stringify(alert), {
    expirationTtl: 60 * 60 * 24 * 7, // 7 days
  });

  // Update recent alerts list
  const recentKey = 'recent_alerts';
  const recent = await kv.get(recentKey, 'json') as string[] || [];
  recent.unshift(alert.id);

  // Keep last 100
  while (recent.length > 100) {
    recent.pop();
  }

  await kv.put(recentKey, JSON.stringify(recent));
}

// Helper: format date for R2 path
function formatDatePath(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');

  return `${year}/${month}/${day}/${hour}`;
}

// HTTP Routes for dashboard/manual access
app.get('/alerts', async (c) => {
  const recent = await c.env.ALERTS_KV.get('recent_alerts', 'json') as string[] || [];
  const alerts: Alert[] = [];

  for (const id of recent.slice(0, 20)) {
    const alert = await c.env.ALERTS_KV.get(`alert:${id}`, 'json') as Alert;
    if (alert) alerts.push(alert);
  }

  return c.json(alerts);
});

app.post('/alerts/:id/acknowledge', async (c) => {
  const id = c.req.param('id');
  const alert = await c.env.ALERTS_KV.get(`alert:${id}`, 'json') as Alert;

  if (!alert) {
    return c.json({ error: 'Alert not found' }, 404);
  }

  alert.acknowledged = true;
  await c.env.ALERTS_KV.put(`alert:${id}`, JSON.stringify(alert));

  return c.json({ success: true });
});

app.get('/stats', async (c) => {
  const baseline = await c.env.ALERTS_KV.get('traffic_baseline', 'json') as { counts: number[]; avg: number } | null;

  return c.json({
    trafficBaseline: baseline?.avg || 0,
    recentDataPoints: baseline?.counts.length || 0,
  });
});
```

### Wrangler Configuration

```toml
# packages/shared/monitoring/wrangler.toml
name = "alert-worker"
main = "src/alert-worker/index.ts"
compatibility_date = "2024-01-01"

# Cron trigger - every 5 minutes
[triggers]
crons = ["*/5 * * * *"]

[[r2_buckets]]
binding = "LOGS_BUCKET"
bucket_name = "logs-all"

[[kv_namespaces]]
binding = "ALERTS_KV"
id = "xxx"
preview_id = "xxx"

[vars]
# Add webhook URLs via secrets
# SLACK_WEBHOOK_URL = ""
# DISCORD_WEBHOOK_URL = ""
# ALERT_EMAIL = ""
# RESEND_API_KEY = ""
```

---

## Part 3: Health Checks (via Pulumi)

Health checks are configured in Part 1's Pulumi code. They:

1. Ping `/health` endpoint every 60 seconds
2. Check from 3 regions (WNAM, ENAM, WEU)
3. Alert after 3 consecutive failures
4. Send to Cloudflare Notifications

### Health Endpoint

Each service should expose `/health`:

```typescript
// packages/products/tastier/api/src/routes/health.ts
export async function healthCheck(env: Env): Promise<Response> {
  const checks: Record<string, boolean> = {};

  // Check D1
  try {
    await env.DB.prepare('SELECT 1').first();
    checks.d1 = true;
  } catch {
    checks.d1 = false;
  }

  // Check KV
  try {
    await env.KV.get('health-check-key');
    checks.kv = true;
  } catch {
    checks.kv = false;
  }

  const healthy = Object.values(checks).every(Boolean);

  return new Response(
    JSON.stringify({
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      status: healthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

---

## Part 4: Alert Dashboard (Optional)

A simple Svelte dashboard to view alerts:

```svelte
<!-- packages/shared/monitoring/src/dashboard/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  interface Alert {
    id: string;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }

  let alerts = $state<Alert[]>([]);
  let loading = $state(true);

  onMount(async () => {
    const res = await fetch('/api/alerts');
    alerts = await res.json();
    loading = false;
  });

  async function acknowledge(id: string) {
    await fetch(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
    const alert = alerts.find(a => a.id === id);
    if (alert) alert.acknowledged = true;
  }

  const severityColors = {
    critical: 'bg-red-100 border-red-500 text-red-900',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-900',
    info: 'bg-blue-100 border-blue-500 text-blue-900',
  };
</script>

<div class="max-w-4xl mx-auto p-6">
  <h1 class="text-2xl font-bold mb-6">Alerts</h1>

  {#if loading}
    <p>Loading...</p>
  {:else if alerts.length === 0}
    <p class="text-gray-500">No alerts</p>
  {:else}
    <div class="space-y-4">
      {#each alerts as alert}
        <div
          class="border-l-4 p-4 rounded {severityColors[alert.severity]} {alert.acknowledged ? 'opacity-50' : ''}"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="font-semibold">{alert.type.replace('_', ' ')}</span>
              <span class="text-sm ml-2">({alert.severity})</span>
              <p class="mt-1">{alert.message}</p>
              <p class="text-sm text-gray-600 mt-2">
                {new Date(alert.timestamp).toLocaleString()}
              </p>
            </div>
            {#if !alert.acknowledged}
              <button
                onclick={() => acknowledge(alert.id)}
                class="px-3 py-1 bg-white border rounded hover:bg-gray-50"
              >
                Acknowledge
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
```

---

## Part 5: Pulumi Setup

### Directory Structure

```
packages/shared/iac/
├── package.json
├── Pulumi.yaml
├── Pulumi.staging.yaml
├── Pulumi.prod.yaml
├── src/
│   ├── index.ts
│   ├── monitoring.ts
│   ├── dns.ts
│   └── workers.ts
└── tsconfig.json
```

### Pulumi.yaml

```yaml
name: resist-iac
runtime:
  name: nodejs
  options:
    typescript: true
description: Infrastructure as Code for resist.js
```

### Pulumi.staging.yaml

```yaml
config:
  cloudflare:apiToken:
    secure: xxx
  resist-iac:cloudflareAccountId: xxx
  resist-iac:tastierZoneId: xxx
  resist-iac:cherishallZoneId: xxx
  resist-iac:alertEmails:
    - alerts@yourdomain.com
  resist-iac:slackWebhookUrl: https://hooks.slack.com/services/xxx
```

### package.json

```json
{
  "name": "@resist/iac",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "preview": "pulumi preview",
    "up": "pulumi up",
    "up:staging": "pulumi up --stack staging",
    "up:prod": "pulumi up --stack prod",
    "destroy": "pulumi destroy"
  },
  "dependencies": {
    "@pulumi/cloudflare": "^5.0.0",
    "@pulumi/pulumi": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

---

## Summary

| Component | Tool | Purpose |
|-----------|------|---------|
| Log Storage | R2 | Cheap, queryable storage |
| Log Ingestion | Logpush | HTTP request logs |
| Health Checks | CF Health Checks | Uptime monitoring |
| Alerting | Cron Worker | Analyze logs, send alerts |
| Alert Destinations | Slack/Discord/Email | Webhooks + Resend |
| IaC | Pulumi | TypeScript-first |

### Alert Flow

```
Logs → R2 → Cron Worker (every 5 min) → Analyze → Alert?
                                              ↓
                              ┌───────────────┼───────────────┐
                              ↓               ↓               ↓
                           Slack          Discord          Email
                         (webhook)       (webhook)        (Resend)
```

### Alert Destinations Recap

1. **Slack** - Webhook URL (no external service, just a URL)
2. **Discord** - Webhook URL (same concept)
3. **Email** - Via Resend (you already have this as external service)
4. **CF Notifications** - For health check failures (built into Cloudflare)

## Implementation Order

1. **Day 1**: Pulumi setup, R2 bucket creation
2. **Day 2**: Logpush configuration
3. **Day 3**: Health checks + CF notifications
4. **Day 4**: Alert Worker (basic error rate check)
5. **Day 5**: Alert Worker (latency, traffic anomaly)
6. **Day 6**: Alert destinations (Slack, Discord, email)
7. **Day 7**: Dashboard (optional), testing
