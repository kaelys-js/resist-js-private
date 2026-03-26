# 17 — Notifications: Alert Policies, Event Bus, Email/Webhook/Terminal Alerts

## Context

Cloudflare Notifications alert operators when infrastructure conditions are met — health check failures, high error rates, SSL expiry, DDoS detection, Workers errors, etc. The edge tool simulates this with a local event bus that monitors Caddy logs, health check results, and companion service states, then dispatches alerts via Mailpit (email), HTTP webhooks, and terminal output.

### Notification Flow

```
Event Sources → Event Bus → Alert Rules → Dispatch
   │                │             │            │
   ├─ Caddy logs    │   Match     │   ├─ Mailpit (email)
   ├─ Health checks │   against   │   ├─ Webhook (HTTP POST)
   ├─ Error rates   │   policies  │   └─ Terminal (colored output)
   ├─ SSL state     │             │
   ├─ Workers stderr│             │
   └─ Rate limits   │             │
```

### Alert Types (from master plan section M)

| Alert Type | Trigger | Local Detection |
|------------|---------|-----------------|
| Health check failure | Caddy health check fails for upstream | Caddy health_check log events |
| High error rate | >10% 5xx responses in 1 minute | Sliding window on Caddy access log |
| SSL expiry | mkcert cert expires within 7 days | Periodic cert file check |
| DDoS detection | >1000 req/s from single IP | Rate counter on access log |
| Workers error | `wrangler dev` stderr output | Pipe wrangler stderr to event bus |
| Rate limit hit | Too many 429 responses | Rate limit log events |
| WAF block spike | Unusual WAF block rate | Coraza log events |
| Cache purge | Manual or automated purge | Purge API events |

---

## Documentation Links

- CF Notifications overview: https://developers.cloudflare.com/notifications/
- Notification types: https://developers.cloudflare.com/notifications/notification-available/
- Webhooks: https://developers.cloudflare.com/notifications/get-started/configure-webhooks/
- Alert policies API: https://developers.cloudflare.com/api/operations/notification-policies-list-notification-policies
- Mailpit (local email): https://mailpit.axllent.org/
- Caddy log directive: https://caddyserver.com/docs/caddyfile/directives/log

---

## 1. Valibot Schema: `NotificationsConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-notifications.ts`

```typescript
/**
 * Notifications Edge Config Schema
 *
 * Valibot schemas for notification policies and alert dispatch.
 * Drives local event bus + Mailpit/webhook/terminal alerting.
 *
 * @module
 */

import * as v from 'valibot';

// ─── Alert Destination ───────────────────────────────────────────────────────

/**
 * Schema for an alert destination (where to send notifications).
 */
export const AlertDestinationSchema = v.variant('type', [
  v.strictObject({
    /** @description Destination type: email via Mailpit */
    type: v.literal('email'),
    /** @description Email address to send to (via Mailpit in dev) */
    address: v.pipe(v.string(), v.email()),
    /** @description Display name for the recipient */
    name: v.optional(v.pipe(v.string(), v.minLength(1))),
  }),
  v.strictObject({
    /** @description Destination type: HTTP webhook */
    type: v.literal('webhook'),
    /** @description Webhook URL to POST alert payloads to */
    url: v.pipe(v.string(), v.url()),
    /** @description Optional secret for HMAC signature (X-Webhook-Signature header) */
    secret: v.optional(v.pipe(v.string(), v.minLength(1))),
  }),
  v.strictObject({
    /** @description Destination type: terminal output */
    type: v.literal('terminal'),
    /** @description Whether to use colored output */
    color: v.optional(v.boolean(), true),
    /** @description Whether to play a bell/sound on alert */
    bell: v.optional(v.boolean(), false),
  }),
]);
export type AlertDestination = v.InferOutput<typeof AlertDestinationSchema>;

// ─── Alert Type ──────────────────────────────────────────────────────────────

/**
 * Supported alert types — each maps to a specific event bus event.
 */
export const AlertTypeSchema = v.picklist([
  'health_check_failure',
  'health_check_recovery',
  'high_error_rate',
  'ssl_expiry_warning',
  'ddos_detection',
  'workers_error',
  'rate_limit_spike',
  'waf_block_spike',
  'cache_purge',
  'origin_unreachable',
  'certificate_renewal',
  'dns_change',
]);
export type AlertType = v.InferOutput<typeof AlertTypeSchema>;

// ─── Notification Policy ─────────────────────────────────────────────────────

/**
 * Schema for a notification policy — matches events to destinations.
 *
 * Maps to: Cloudflare Notifications → Policies
 */
export const NotificationPolicySchema = v.strictObject({
  /** @description Human-readable policy name */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  /** @description Whether this policy is enabled */
  enabled: v.optional(v.boolean(), true),
  /** @description Alert types that trigger this policy */
  alertTypes: v.pipe(v.array(AlertTypeSchema), v.minLength(1)),
  /** @description Where to send alerts */
  destinations: v.pipe(v.array(AlertDestinationSchema), v.minLength(1)),
  /** @description Optional filter expression (e.g., specific pool, zone, service) */
  filters: v.optional(v.strictObject({
    /** @description Only alert for these upstream pool names */
    pools: v.optional(v.array(v.pipe(v.string(), v.minLength(1)))),
    /** @description Only alert for these services */
    services: v.optional(v.array(v.pipe(v.string(), v.minLength(1)))),
    /** @description Only alert when error rate exceeds this threshold (0-100) */
    errorRateThreshold: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 10),
    /** @description Only alert when request rate exceeds this (req/s) */
    requestRateThreshold: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1000),
    /** @description SSL expiry warning days */
    sslExpiryDays: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(90)), 7),
  })),
  /** @description Cooldown period in seconds (suppress duplicate alerts) */
  cooldownSeconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(86400)), 300),
  /** @description Description of what this policy monitors */
  description: v.optional(v.pipe(v.string(), v.maxLength(512))),
});
export type NotificationPolicy = v.InferOutput<typeof NotificationPolicySchema>;

// ─── Event Bus Configuration ─────────────────────────────────────────────────

/**
 * Schema for the local event bus configuration.
 */
export const EventBusConfigSchema = v.strictObject({
  /** @description Whether the event bus is enabled */
  enabled: v.optional(v.boolean(), true),
  /** @description Max events to buffer before dropping oldest */
  maxBufferSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(100), v.maxValue(100000)), 10000),
  /** @description Event log file (for debugging) */
  logFile: v.optional(v.pipe(v.string(), v.minLength(1)), 'logs/events.ndjson'),
  /** @description Sliding window size in seconds for rate calculations */
  windowSeconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(600)), 60),
});
export type EventBusConfig = v.InferOutput<typeof EventBusConfigSchema>;

// ─── Top-Level Notifications Config ──────────────────────────────────────────

/**
 * Complete notifications configuration schema.
 *
 * Maps to: Cloudflare Notifications (all sub-features)
 *
 * @example
 * ```typescript
 * const config: NotificationsConfig = {
 *   policies: [
 *     {
 *       name: 'ops-alerts',
 *       alertTypes: ['health_check_failure', 'high_error_rate', 'workers_error'],
 *       destinations: [
 *         { type: 'email', address: 'ops@example.com' },
 *         { type: 'terminal', color: true, bell: true },
 *       ],
 *       cooldownSeconds: 300,
 *     },
 *     {
 *       name: 'security-alerts',
 *       alertTypes: ['ddos_detection', 'waf_block_spike'],
 *       destinations: [
 *         { type: 'webhook', url: 'http://localhost:8080/alerts' },
 *         { type: 'terminal', color: true },
 *       ],
 *     },
 *   ],
 * };
 * ```
 */
export const NotificationsConfigSchema = v.strictObject({
  /** @description Notification policies */
  policies: v.optional(v.array(NotificationPolicySchema), []),
  /** @description Event bus configuration */
  eventBus: v.optional(EventBusConfigSchema),
});
export type NotificationsConfig = v.InferOutput<typeof NotificationsConfigSchema>;
```

---

## 2. Event Bus Implementation

### File: `packages/shared/utils/cli/src/tools/edge/utils/event-bus.ts`

```typescript
/**
 * Local Event Bus — receives events from Caddy, health checks,
 * and companion services, then dispatches to notification policies.
 *
 * @module
 */

import { EventEmitter } from 'node:events';
import type { Result } from '@/utils/result/types';
import { ok, err } from '@/utils/result/helpers';
import type {
  NotificationsConfig,
  NotificationPolicy,
  AlertType,
  AlertDestination,
} from '@resist/schemas/core-config/edge-notifications';

// ─── Event Types ─────────────────────────────────────────────────────────────

/**
 * Event payload emitted on the bus.
 */
interface AlertEvent {
  /** @description Alert type identifier */
  type: AlertType;
  /** @description ISO 8601 timestamp */
  timestamp: string;
  /** @description Human-readable summary */
  summary: string;
  /** @description Structured event data */
  data: Record<string, unknown>;
  /** @description Source that generated the event */
  source: string;
}

// ─── Event Bus ───────────────────────────────────────────────────────────────

/**
 * Local event bus singleton.
 *
 * Receives events from monitoring sources, evaluates them against
 * notification policies, and dispatches alerts to destinations.
 */
export class EdgeEventBus {
  private emitter = new EventEmitter();
  private policies: NotificationPolicy[] = [];
  private cooldowns = new Map<string, number>(); // policy name → last alert timestamp
  private buffer: AlertEvent[] = [];
  private maxBufferSize: number;

  /**
   * Create event bus from notification config.
   *
   * @param config - Notifications configuration
   */
  constructor(config: NotificationsConfig) {
    this.policies = (config.policies ?? []).filter((p) => p.enabled);
    this.maxBufferSize = config.eventBus?.maxBufferSize ?? 10000;

    // Wire up event handler
    this.emitter.on('alert', (event: AlertEvent) => {
      this.handleEvent(event);
    });
  }

  /**
   * Emit an alert event onto the bus.
   *
   * @param event - The alert event to emit
   */
  emit(event: AlertEvent): void {
    // Buffer event
    this.buffer.push(event);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift(); // Drop oldest
    }

    this.emitter.emit('alert', event);
  }

  /**
   * Process an event against all policies.
   *
   * @param event - Alert event to process
   */
  private handleEvent(event: AlertEvent): void {
    for (const policy of this.policies) {
      // Check if policy matches this alert type
      if (!policy.alertTypes.includes(event.type)) continue;

      // Check cooldown
      const lastAlert = this.cooldowns.get(policy.name) ?? 0;
      const cooldown = (policy.cooldownSeconds ?? 300) * 1000;
      const now = Date.now();
      if (now - lastAlert < cooldown) continue;

      // Check filters
      if (!this.matchesFilters(event, policy)) continue;

      // Dispatch to all destinations
      this.cooldowns.set(policy.name, now);
      for (const dest of policy.destinations) {
        this.dispatch(event, dest, policy.name);
      }
    }
  }

  /**
   * Check if an event matches a policy's filters.
   *
   * @param event - Alert event
   * @param policy - Notification policy
   * @returns Whether the event matches
   */
  private matchesFilters(event: AlertEvent, policy: NotificationPolicy): boolean {
    const filters = policy.filters;
    if (!filters) return true;

    // Pool filter
    if (filters.pools && filters.pools.length > 0) {
      const eventPool = event.data['pool'] as string | undefined;
      if (eventPool && !filters.pools.includes(eventPool)) return false;
    }

    // Service filter
    if (filters.services && filters.services.length > 0) {
      const eventService = event.data['service'] as string | undefined;
      if (eventService && !filters.services.includes(eventService)) return false;
    }

    // Error rate threshold
    if (event.type === 'high_error_rate') {
      const rate = event.data['errorRate'] as number | undefined;
      if (rate !== undefined && rate < (filters.errorRateThreshold ?? 10)) return false;
    }

    // Request rate threshold (DDoS)
    if (event.type === 'ddos_detection') {
      const rate = event.data['requestRate'] as number | undefined;
      if (rate !== undefined && rate < (filters.requestRateThreshold ?? 1000)) return false;
    }

    return true;
  }

  /**
   * Dispatch an alert to a specific destination.
   *
   * @param event - Alert event
   * @param dest - Destination to send to
   * @param policyName - Name of the triggering policy
   */
  private dispatch(event: AlertEvent, dest: AlertDestination, policyName: string): void {
    switch (dest.type) {
      case 'email':
        this.dispatchEmail(event, dest, policyName);
        break;
      case 'webhook':
        this.dispatchWebhook(event, dest, policyName);
        break;
      case 'terminal':
        this.dispatchTerminal(event, dest, policyName);
        break;
    }
  }

  /**
   * Send alert via Mailpit.
   *
   * @param event - Alert event
   * @param dest - Email destination
   * @param policyName - Policy name
   */
  private dispatchEmail(
    event: AlertEvent,
    dest: Extract<AlertDestination, { type: 'email' }>,
    policyName: string,
  ): void {
    const mailpitSmtp = 'localhost:1025'; // Default Mailpit SMTP port

    // Build email payload for Mailpit's API
    const payload = {
      From: { Email: 'alerts@edge.local', Name: 'Edge Alerts' },
      To: [{ Email: dest.address, Name: dest.name ?? dest.address }],
      Subject: `[${event.type}] ${event.summary}`,
      Text: [
        `Alert: ${event.type}`,
        `Policy: ${policyName}`,
        `Time: ${event.timestamp}`,
        `Source: ${event.source}`,
        '',
        event.summary,
        '',
        'Event Data:',
        JSON.stringify(event.data, null, 2),
      ].join('\n'),
    };

    // Fire and forget — POST to Mailpit API
    fetch('http://localhost:8025/api/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Mailpit not running — silently ignore
    });
  }

  /**
   * Send alert via HTTP webhook.
   *
   * @param event - Alert event
   * @param dest - Webhook destination
   * @param policyName - Policy name
   */
  private dispatchWebhook(
    event: AlertEvent,
    dest: Extract<AlertDestination, { type: 'webhook' }>,
    policyName: string,
  ): void {
    const payload = JSON.stringify({
      policy: policyName,
      alert_type: event.type,
      timestamp: event.timestamp,
      summary: event.summary,
      source: event.source,
      data: event.data,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'resist-edge-alerts/1.0',
    };

    // HMAC signature if secret is configured
    if (dest.secret) {
      // In implementation: compute HMAC-SHA256(secret, payload)
      headers['X-Webhook-Signature'] = `sha256=${computeHmac(dest.secret, payload)}`;
    }

    fetch(dest.url, {
      method: 'POST',
      headers,
      body: payload,
    }).catch(() => {
      // Webhook unreachable — silently ignore
    });
  }

  /**
   * Print alert to terminal.
   *
   * @param event - Alert event
   * @param dest - Terminal destination
   * @param policyName - Policy name
   */
  private dispatchTerminal(
    event: AlertEvent,
    dest: Extract<AlertDestination, { type: 'terminal' }>,
    policyName: string,
  ): void {
    const bell = dest.bell ? '\x07' : '';
    const timestamp = new Date(event.timestamp).toLocaleTimeString();

    if (dest.color) {
      // Severity-based coloring
      const color = getAlertColor(event.type);
      const reset = '\x1b[0m';
      const bold = '\x1b[1m';

      process.stderr.write(
        `${bell}${color}${bold}[ALERT]${reset} ${color}${timestamp} [${policyName}] ${event.type}: ${event.summary}${reset}\n`,
      );
    } else {
      process.stderr.write(
        `${bell}[ALERT] ${timestamp} [${policyName}] ${event.type}: ${event.summary}\n`,
      );
    }
  }

  /**
   * Get buffered events (for debugging/inspection).
   *
   * @returns Copy of event buffer
   */
  getEvents(): AlertEvent[] {
    return [...this.buffer];
  }

  /**
   * Shut down the event bus.
   */
  destroy(): void {
    this.emitter.removeAllListeners();
    this.buffer = [];
    this.cooldowns.clear();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get ANSI color code based on alert severity.
 *
 * @param type - Alert type
 * @returns ANSI color escape code
 */
function getAlertColor(type: AlertType): string {
  switch (type) {
    case 'health_check_failure':
    case 'origin_unreachable':
    case 'ddos_detection':
    case 'workers_error':
      return '\x1b[31m'; // Red — critical
    case 'high_error_rate':
    case 'waf_block_spike':
    case 'rate_limit_spike':
      return '\x1b[33m'; // Yellow — warning
    case 'ssl_expiry_warning':
    case 'certificate_renewal':
      return '\x1b[35m'; // Magenta — security
    case 'health_check_recovery':
    case 'cache_purge':
    case 'dns_change':
      return '\x1b[36m'; // Cyan — informational
    default:
      return '\x1b[37m'; // White — default
  }
}

/**
 * Compute HMAC-SHA256 signature for webhook payloads.
 *
 * @param secret - HMAC secret
 * @param payload - Request body
 * @returns Hex-encoded HMAC signature
 */
function computeHmac(secret: string, payload: string): string {
  const { createHmac } = require('node:crypto');
  return createHmac('sha256', secret).update(payload).digest('hex');
}
```

---

## 3. Event Source Monitors

### File: `packages/shared/utils/cli/src/tools/edge/utils/monitors.ts`

```typescript
/**
 * Event source monitors — read Caddy logs and companion service
 * state to emit events onto the event bus.
 *
 * @module
 */

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { EdgeEventBus } from './event-bus';

/**
 * Monitor Caddy access logs for error rate spikes.
 *
 * Reads the access log file in follow mode (like tail -f)
 * and computes sliding-window error rates.
 *
 * @param bus - Event bus to emit alerts to
 * @param logFile - Path to Caddy access log (ndjson)
 * @param windowSeconds - Sliding window size
 */
export function monitorErrorRate(
  bus: EdgeEventBus,
  logFile: string,
  windowSeconds: number = 60,
): void {
  const window: Array<{ timestamp: number; status: number }> = [];

  // Tail the log file
  const stream = createReadStream(logFile, { flags: 'r', encoding: 'utf-8' });
  const rl = createInterface({ input: stream });

  rl.on('line', (line) => {
    try {
      const entry = JSON.parse(line);
      const status = entry.status as number;
      const timestamp = Date.now();

      window.push({ timestamp, status });

      // Prune old entries
      const cutoff = timestamp - (windowSeconds * 1000);
      while (window.length > 0 && window[0].timestamp < cutoff) {
        window.shift();
      }

      // Calculate error rate
      if (window.length >= 10) { // Minimum sample size
        const errors = window.filter((e) => e.status >= 500).length;
        const errorRate = (errors / window.length) * 100;

        if (errorRate > 10) {
          bus.emit({
            type: 'high_error_rate',
            timestamp: new Date().toISOString(),
            summary: `Error rate ${errorRate.toFixed(1)}% (${errors}/${window.length} requests in ${windowSeconds}s)`,
            data: { errorRate, totalRequests: window.length, errorCount: errors },
            source: 'caddy-access-log',
          });
        }
      }
    } catch {
      // Malformed log line — skip
    }
  });
}

/**
 * Monitor for DDoS-like traffic patterns (high req/s from single IP).
 *
 * @param bus - Event bus to emit alerts to
 * @param logFile - Path to Caddy access log
 * @param thresholdRps - Requests per second threshold per IP
 * @param windowSeconds - Measurement window
 */
export function monitorDdos(
  bus: EdgeEventBus,
  logFile: string,
  thresholdRps: number = 1000,
  windowSeconds: number = 1,
): void {
  const ipCounts = new Map<string, number[]>(); // IP → timestamps

  const stream = createReadStream(logFile, { flags: 'r', encoding: 'utf-8' });
  const rl = createInterface({ input: stream });

  rl.on('line', (line) => {
    try {
      const entry = JSON.parse(line);
      const ip = entry.request?.remote_ip ?? entry.remote_ip ?? 'unknown';
      const now = Date.now();

      const timestamps = ipCounts.get(ip) ?? [];
      timestamps.push(now);

      // Prune old
      const cutoff = now - (windowSeconds * 1000);
      const recent = timestamps.filter((t) => t >= cutoff);
      ipCounts.set(ip, recent);

      if (recent.length >= thresholdRps) {
        bus.emit({
          type: 'ddos_detection',
          timestamp: new Date().toISOString(),
          summary: `${recent.length} req/s from IP ${ip} (threshold: ${thresholdRps})`,
          data: { ip, requestRate: recent.length, windowSeconds },
          source: 'caddy-access-log',
        });
      }
    } catch {
      // Skip malformed lines
    }
  });
}

/**
 * Monitor SSL certificate expiry.
 *
 * Periodically checks mkcert certificate files for approaching expiry.
 *
 * @param bus - Event bus to emit alerts to
 * @param certPath - Path to certificate file
 * @param warningDays - Days before expiry to alert
 * @param checkIntervalMs - How often to check (default: 1 hour)
 */
export function monitorSslExpiry(
  bus: EdgeEventBus,
  certPath: string,
  warningDays: number = 7,
  checkIntervalMs: number = 3600000,
): NodeJS.Timeout {
  const check = async () => {
    try {
      const { readFile } = await import('node:fs/promises');
      const { X509Certificate } = await import('node:crypto');

      const pem = await readFile(certPath, 'utf-8');
      const cert = new X509Certificate(pem);
      const expiryDate = new Date(cert.validTo);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / 86400000);

      if (daysUntilExpiry <= warningDays) {
        bus.emit({
          type: 'ssl_expiry_warning',
          timestamp: new Date().toISOString(),
          summary: `SSL certificate expires in ${daysUntilExpiry} days (${expiryDate.toISOString()})`,
          data: { certPath, expiryDate: expiryDate.toISOString(), daysUntilExpiry },
          source: 'ssl-monitor',
        });
      }
    } catch {
      // Can't read cert — not critical
    }
  };

  // Check immediately, then periodically
  check();
  return setInterval(check, checkIntervalMs);
}

/**
 * Monitor wrangler dev stderr for Workers errors.
 *
 * @param bus - Event bus to emit alerts to
 * @param stderrStream - Readable stream from wrangler dev stderr
 */
export function monitorWorkersErrors(
  bus: EdgeEventBus,
  stderrStream: NodeJS.ReadableStream,
): void {
  const rl = createInterface({ input: stderrStream });

  rl.on('line', (line) => {
    // Filter out normal wrangler output (startup messages, etc.)
    const isError = line.includes('Error') ||
                    line.includes('error') ||
                    line.includes('FATAL') ||
                    line.includes('Uncaught');

    if (isError) {
      bus.emit({
        type: 'workers_error',
        timestamp: new Date().toISOString(),
        summary: line.slice(0, 200),
        data: { stderr: line, fullLine: line },
        source: 'wrangler-dev',
      });
    }
  });
}

/**
 * Monitor Caddy health check results.
 *
 * @param bus - Event bus to emit alerts to
 * @param logFile - Path to Caddy health check log
 */
export function monitorHealthChecks(
  bus: EdgeEventBus,
  logFile: string,
): void {
  const stream = createReadStream(logFile, { flags: 'r', encoding: 'utf-8' });
  const rl = createInterface({ input: stream });
  const upstreamState = new Map<string, boolean>(); // upstream → healthy

  rl.on('line', (line) => {
    try {
      const entry = JSON.parse(line);
      const upstream = entry.upstream ?? entry.address ?? 'unknown';
      const healthy = entry.healthy ?? entry.status === 'healthy';
      const wasHealthy = upstreamState.get(upstream);

      upstreamState.set(upstream, healthy);

      // Transition: healthy → unhealthy
      if (wasHealthy === true && !healthy) {
        bus.emit({
          type: 'health_check_failure',
          timestamp: new Date().toISOString(),
          summary: `Upstream ${upstream} failed health check`,
          data: { upstream, status: entry.status, error: entry.error },
          source: 'caddy-health-check',
        });
      }

      // Transition: unhealthy → healthy
      if (wasHealthy === false && healthy) {
        bus.emit({
          type: 'health_check_recovery',
          timestamp: new Date().toISOString(),
          summary: `Upstream ${upstream} recovered`,
          data: { upstream },
          source: 'caddy-health-check',
        });
      }
    } catch {
      // Skip malformed lines
    }
  });
}
```

---

## 4. Caddy Log Configuration — Directives for Event Sources

```typescript
/**
 * Generate Caddy log directives needed for notification event sources.
 *
 * Ensures access logs, health check logs, and error logs are written
 * in structured NDJSON format for the monitors to consume.
 *
 * @param config - Notifications configuration
 * @returns Caddy directive lines
 */
export function generateNotificationLogDirectives(
  config: NotificationsConfig,
): Result<string[]> {
  const hasAnyPolicy = (config.policies ?? []).some((p) => p.enabled);
  if (!hasAnyPolicy) return ok([]);

  const lines: string[] = [];
  lines.push('# Notification Event Source Logs');
  lines.push('');

  // Access log for error rate + DDoS monitoring
  lines.push('log access_monitor {');
  lines.push('  output file logs/access.ndjson {');
  lines.push('    roll_size 100MiB');
  lines.push('    roll_keep 5');
  lines.push('  }');
  lines.push('  format json {');
  lines.push('    time_format iso8601');
  lines.push('  }');
  lines.push('}');
  lines.push('');

  // Event log for the bus itself
  const eventLog = config.eventBus?.logFile ?? 'logs/events.ndjson';
  lines.push(`# Event bus log: ${eventLog}`);
  lines.push('');

  return ok(lines);
}
```

---

## 5. Pulumi Mapping

### File: `packages/products/[product]/iac/notifications.ts`

```typescript
/**
 * Pulumi IaC generation for Notification Policies.
 *
 * Maps NotificationsConfigSchema → Cloudflare Notification resources.
 *
 * @module
 */

import * as pulumi from '@pulumi/pulumi';
import * as cf from '@pulumi/cloudflare';
import type { NotificationsConfig, NotificationPolicy } from '@resist/schemas/core-config/edge-notifications';

/**
 * Map local alert type to Cloudflare notification type.
 *
 * @param localType - Local alert type string
 * @returns CF notification type string
 */
function mapAlertType(localType: string): string {
  const mapping: Record<string, string> = {
    'health_check_failure': 'health_check_status_notification',
    'health_check_recovery': 'health_check_status_notification',
    'high_error_rate': 'http_alert_edge_error',
    'ssl_expiry_warning': 'expiring_service_token_alert',
    'ddos_detection': 'dos_attack_l7',
    'workers_error': 'workers_alert',
    'rate_limit_spike': 'advanced_http_alert_error',
    'waf_block_spike': 'clickhouse_alert_fw_anomaly',
    'cache_purge': 'zone_aop_custom_certificate_expiration_type',
    'origin_unreachable': 'failing_logpush_job_disabled_alert',
    'certificate_renewal': 'dedicated_ssl_certificate_event_type',
    'dns_change': 'secondary_dns_zone_successfully_updated',
  };
  return mapping[localType] ?? localType;
}

/**
 * Create Cloudflare notification policy resources.
 *
 * @param config - Notifications configuration
 * @param accountId - Cloudflare account ID
 * @param opts - Pulumi resource options
 * @returns Created Pulumi resources
 */
export function createNotificationResources(
  config: NotificationsConfig,
  accountId: pulumi.Input<string>,
  opts?: pulumi.ComponentResourceOptions,
) {
  const resources: Record<string, pulumi.Resource> = {};

  for (const [index, policy] of (config.policies ?? []).entries()) {
    if (!policy.enabled) continue;

    // Separate email and webhook destinations
    const emailDests = policy.destinations.filter((d) => d.type === 'email');
    const webhookDests = policy.destinations.filter((d) => d.type === 'webhook');
    // Terminal destinations are local-only — not created in Pulumi

    // Create webhook integrations first
    const webhookIds: pulumi.Output<string>[] = [];
    for (const [whIdx, wh] of webhookDests.entries()) {
      if (wh.type !== 'webhook') continue;
      const webhook = new cf.NotificationPolicyWebhooks(
        `notification-webhook-${policy.name}-${whIdx}`,
        {
          accountId,
          name: `${policy.name}-webhook-${whIdx}`,
          url: wh.url,
          secret: wh.secret,
        },
        opts,
      );
      webhookIds.push(webhook.id);
      resources[`webhook_${index}_${whIdx}`] = webhook;
    }

    // Create the notification policy
    resources[`policy_${index}`] = new cf.NotificationPolicy(
      `notification-policy-${policy.name}`,
      {
        accountId,
        name: policy.name,
        description: policy.description ?? '',
        enabled: policy.enabled,
        alertType: mapAlertType(policy.alertTypes[0]),
        emailIntegrations: emailDests
          .filter((d): d is Extract<typeof d, { type: 'email' }> => d.type === 'email')
          .map((d) => ({ id: '', name: d.name ?? d.address, email: d.address })),
        webhooksIntegrations: webhookIds.map((id) => ({
          id,
          name: '',
        })),
        filters: policy.filters ? {
          // Map local filter keys to CF filter keys
          ...(policy.filters.pools ? { pool_id: policy.filters.pools } : {}),
          ...(policy.filters.services ? { services: policy.filters.services } : {}),
        } : undefined,
      },
      opts,
    );
  }

  return resources;
}
```

---

## 6. Mapping Table

| CF Notification Feature | Edge Tool Simulation | Pulumi Resource |
|---|---|---|
| Notification Policy | Local event bus → dispatch to destinations | `cf.NotificationPolicy` |
| Email destination | Mailpit SMTP/API | `emailIntegrations` in policy |
| Webhook destination | HTTP POST to configured URL | `cf.NotificationPolicyWebhooks` |
| PagerDuty | Not simulated (terminal alerts instead) | `pagerdutyIntegrations` in policy |
| Health check alerts | Caddy health check log monitor | `alertType: health_check_status_notification` |
| Error rate alerts | Sliding window on access log | `alertType: http_alert_edge_error` |
| SSL expiry alerts | Periodic cert file check | `alertType: expiring_service_token_alert` |
| DDoS alerts | Rate counter on access log per IP | `alertType: dos_attack_l7` |
| Workers error alerts | Wrangler stderr pipe | `alertType: workers_alert` |
| Cooldown (dedup) | In-memory cooldown map | CF handles dedup server-side |

---

## 7. Verification Steps

### Email Alerts

```bash
# Start edge tool with notifications
pnpm tool edge

# Trigger a health check failure (stop an upstream)
kill $(pgrep -f "wrangler dev")

# Check Mailpit for alert email
curl http://localhost:8025/api/v2/messages | jq '.messages[0].Subject'
# → "[health_check_failure] Upstream localhost:8787 failed health check"
```

### Webhook Alerts

```bash
# Start a webhook receiver
npx http-echo-server 8080 &

# Generate high error rate (send many requests to non-existent path)
for i in $(seq 1 100); do curl -s https://localhost:9000/nonexistent > /dev/null; done

# Check webhook receiver for alert payload
# → POST with {"alert_type":"high_error_rate","summary":"Error rate 100.0%..."}
```

### Terminal Alerts

```bash
# With terminal destination configured, alerts appear in edge tool stderr:
# [ALERT] 14:23:45 [ops-alerts] high_error_rate: Error rate 15.2% (23/151 requests in 60s)
# [ALERT] 14:24:01 [ops-alerts] health_check_failure: Upstream localhost:8787 failed health check
```

### Cooldown Verification

```bash
# Trigger same alert type rapidly
for i in $(seq 1 10); do
  curl -s https://localhost:9000/nonexistent
done
# Only 1 alert should fire (5min cooldown default), not 10
```

---

## 8. Known Limitations & Simulation Gaps

| Feature | CF Behavior | Local Simulation | Gap |
|---|---|---|---|
| PagerDuty integration | Native integration | Not simulated (use webhook) | Must use generic webhook |
| Notification history | 30-day history in dashboard | In-memory only (lost on restart) | No persistent history |
| Alert aggregation | CF aggregates across all edge nodes | Single-node only | No distributed aggregation |
| Custom alert types | CF has 40+ alert types | 12 simulated types | Missing: billing, registrar, tunnel, spectrum |
| Mute windows | Scheduled mute periods | Not implemented | Must disable policies manually |
| Escalation policies | CF supports escalation chains | Flat dispatch only | No escalation tiers |
| Alert deduplication | CF deduplicates globally | Per-process cooldown only | May duplicate across restarts |

---

## 9. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-notifications.ts` | Valibot schemas for notification policies and event bus |
| `packages/shared/utils/cli/src/tools/edge/utils/event-bus.ts` | Event bus class — receives events, evaluates policies, dispatches alerts |
| `packages/shared/utils/cli/src/tools/edge/utils/monitors.ts` | Event source monitors — error rate, DDoS, SSL, Workers, health checks |
| `packages/products/[product]/iac/notifications.ts` | Pulumi notification policy resource creation |

---

## 10. Dependencies

| Dependency | Plan | Relationship |
|------------|------|-------------|
| `11-email.md` | Mailpit | Email alerts sent via Mailpit |
| `13-load-balancing.md` | Health monitors | Health check events feed into notifications |
| `01-ssl-tls.md` | SSL certificates | Certificate expiry monitoring |
| `02-waf.md` | WAF block events | WAF block spike alerts |
| `03-rate-limiting.md` | Rate limit events | Rate limit spike alerts |
| `12-analytics.md` | Access logs | Error rate and DDoS detection from access logs |

---

## 11. Implementation Order

1. **Schema layer**: Create `edge-notifications.ts` with all Valibot schemas
2. **Event bus**: Implement `EdgeEventBus` class with policy evaluation and dispatch
3. **Email dispatch**: Implement Mailpit SMTP/API integration
4. **Webhook dispatch**: HTTP POST with HMAC signature
5. **Terminal dispatch**: Colored terminal output with severity-based coloring
6. **Error rate monitor**: Sliding window on Caddy access log
7. **DDoS monitor**: Per-IP rate counter
8. **Health check monitor**: Caddy health check log tailer
9. **SSL expiry monitor**: Periodic certificate file check
10. **Workers error monitor**: Wrangler stderr pipe
11. **Pulumi mapping**: Create CF notification policy resources
12. **Integration**: Wire event bus into edge tool lifecycle (start/stop)
