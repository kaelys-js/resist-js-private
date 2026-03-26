# 12 — Analytics & Observability: Analytics Engine, Web Analytics, Logpush, Log Explorer

## Context

Cloudflare provides comprehensive analytics and observability tools. Locally, we simulate these using:
- **ClickHouse** (`clickhouse-local` embedded mode or Docker) for Analytics Engine
- **Local log files** (`.resist/logs/`) in CF Logpush NDJSON format
- **Web Analytics script injection** via Caddy response body filter
- **CLI and web UI** for log exploration

The same schema drives both local log collection and Pulumi resource generation.

### Simulation Architecture

| CF Feature | Local Equivalent | Storage |
|-----------|-----------------|---------|
| Analytics Engine | ClickHouse (`clickhouse-local`) | `.resist/clickhouse/` |
| Web Analytics | JS script injection + local collector | `.resist/logs/web-analytics.ndjson` |
| Workers Logpush | Structured NDJSON matching CF schema | `.resist/logs/logpush/` |
| Log Explorer | CLI (`pnpm tool edge --logs`) or web UI | `.resist/logs/` |
| Tail Workers | Pipe wrangler dev output | `.resist/logs/tail.ndjson` |
| Network Analytics | Caddy access logs | `.resist/logs/network.ndjson` |
| Network Error Logging | 5xx error logs | `.resist/logs/nel.ndjson` |
| GraphQL Analytics API | Local GraphQL endpoint | ClickHouse backend |

---

## Documentation Links

- Analytics Engine: https://developers.cloudflare.com/analytics/analytics-engine/
- Analytics Engine SQL API: https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
- Web Analytics: https://developers.cloudflare.com/web-analytics/
- Logpush: https://developers.cloudflare.com/logs/logpush/
- Logpush fields: https://developers.cloudflare.com/logs/reference/log-fields/
- Log Explorer: https://developers.cloudflare.com/logs/log-explorer/
- Tail Workers: https://developers.cloudflare.com/workers/observability/tail-workers/
- Workers Logs: https://developers.cloudflare.com/workers/observability/logs/
- ClickHouse Local: https://clickhouse.com/docs/en/operations/utilities/clickhouse-local
- Pulumi Cloudflare Logpush Job: https://www.pulumi.com/registry/packages/cloudflare/api-docs/logpushjob/

---

## 1. Valibot Schema: `AnalyticsConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-analytics.ts`

```typescript
/**
 * Analytics & Observability Edge Config Schema
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Analytics Engine
// =============================================================================

/** Analytics Engine storage backend. */
export const AnalyticsEngineBackendSchema = v.picklist(['clickhouse-local', 'clickhouse-docker']);
export type AnalyticsEngineBackend = v.InferOutput<typeof AnalyticsEngineBackendSchema>;

/** Analytics Engine configuration. */
export const AnalyticsEngineConfigSchema = v.strictObject({
	/** Whether Analytics Engine is enabled. Default: `false`. */
	enabled: v.optional(v.boolean(), false),
	/** Storage backend. Default: `'clickhouse-local'`. */
	backend: v.optional(AnalyticsEngineBackendSchema, 'clickhouse-local'),
	/** Port for SQL API endpoint. Default: `9011`. */
	apiPort: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)), 9011),
	/** Data directory. Default: `'.resist/clickhouse/'`. */
	dataDir: v.optional(v.pipe(v.string(), v.minLength(1)), '.resist/clickhouse/'),
	/** Retention period in days. Default: `30`. */
	retentionDays: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 30),
});

export type AnalyticsEngineConfig = v.InferOutput<typeof AnalyticsEngineConfigSchema>;

// =============================================================================
// Web Analytics
// =============================================================================

/** Web Analytics configuration. */
export const WebAnalyticsConfigSchema = v.strictObject({
	/** Whether Web Analytics script injection is enabled. Default: `false`. */
	enabled: v.optional(v.boolean(), false),
	/** Paths to inject analytics script (empty = all HTML pages). Default: `[]`. */
	includePaths: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
	/** Paths to exclude from analytics. Default: `['/api/*']`. */
	excludePaths: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), ['/api/*']),
});

export type WebAnalyticsConfig = v.InferOutput<typeof WebAnalyticsConfigSchema>;

// =============================================================================
// Logpush
// =============================================================================

/** Logpush dataset (log type). */
export const LogpushDatasetSchema = v.picklist([
	'http_requests', 'workers_trace_events', 'firewall_events',
	'dns_logs', 'nel_reports', 'access_requests',
]);

export type LogpushDataset = v.InferOutput<typeof LogpushDatasetSchema>;

/** A Logpush job configuration. */
export const LogpushJobSchema = v.strictObject({
	/** Job name. */
	name: v.pipe(v.string(), v.minLength(1)),
	/** Dataset to push. */
	dataset: LogpushDatasetSchema,
	/** Whether the job is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),
	/** Fields to include (empty = all). */
	fields: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
	/** Filter expression (optional). */
	filter: v.optional(v.pipe(v.string(), v.minLength(1))),
});

export type LogpushJob = v.InferOutput<typeof LogpushJobSchema>;

/** Logpush configuration. */
export const LogpushConfigSchema = v.strictObject({
	/** Whether Logpush is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),
	/** Log output directory. Default: `'.resist/logs/logpush/'`. */
	outputDir: v.optional(v.pipe(v.string(), v.minLength(1)), '.resist/logs/logpush/'),
	/** Logpush jobs. Default: `[]`. */
	jobs: v.optional(v.array(LogpushJobSchema), []),
});

export type LogpushConfig = v.InferOutput<typeof LogpushConfigSchema>;

// =============================================================================
// Log Explorer
// =============================================================================

/** Log Explorer configuration. */
export const LogExplorerConfigSchema = v.strictObject({
	/** Whether Log Explorer web UI is enabled. Default: `false`. */
	enabled: v.optional(v.boolean(), false),
	/** Port for web UI. Default: `9012`. */
	uiPort: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)), 9012),
});

export type LogExplorerConfig = v.InferOutput<typeof LogExplorerConfigSchema>;

// =============================================================================
// Top-Level Config
// =============================================================================

/**
 * Complete Analytics & Observability configuration.
 *
 * Placed under `tooling.edge.analytics` in `resist.config.ts`.
 */
export const AnalyticsConfigSchema = v.strictObject({
	/** Analytics Engine (ClickHouse). */
	analyticsEngine: v.optional(AnalyticsEngineConfigSchema, {}),
	/** Web Analytics script injection. */
	webAnalytics: v.optional(WebAnalyticsConfigSchema, {}),
	/** Logpush (structured log output). */
	logpush: v.optional(LogpushConfigSchema, {}),
	/** Log Explorer UI. */
	logExplorer: v.optional(LogExplorerConfigSchema, {}),
	/**
	 * Tail Workers — pipe wrangler dev output.
	 * Default: `true`.
	 */
	tailWorkers: v.optional(v.boolean(), true),
	/**
	 * Network Error Logging — log 5xx errors.
	 * Default: `true`.
	 */
	networkErrorLogging: v.optional(v.boolean(), true),
	/**
	 * CSP violation collector.
	 * Default: `true`.
	 */
	cspViolationCollector: v.optional(v.boolean(), true),
});

export type AnalyticsConfig = v.InferOutput<typeof AnalyticsConfigSchema>;
```

---

## 2. Caddy Directive + Service Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/analytics.ts`

```typescript
/**
 * Analytics & Observability → Caddy Directives + Service Lifecycle
 *
 * @module
 */

import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';
import { AnalyticsConfigSchema } from '@/schemas/core-config/src/edge-analytics';
import type { AnalyticsConfig } from '@/schemas/core-config/src/edge-analytics';

/**
 * Generate Caddy access log directives.
 *
 * Structured JSON access logs matching CF Logpush schema.
 */
export function generateAccessLogDirectives(): ReadonlyArray<v.InferOutput<typeof v.string>> {
	return [
		'# Structured Access Logs (CF Logpush format)',
		'log access {',
		'	output file .resist/logs/access.ndjson {',
		'		roll_size 100MiB',
		'		roll_keep 10',
		'	}',
		'	format json {',
		'		time_format iso8601',
		'	}',
		'}',
		'',
	];
}

/**
 * Generate Network Error Logging directives.
 */
export function generateNelDirectives(): ReadonlyArray<v.InferOutput<typeof v.string>> {
	return [
		'# Network Error Logging',
		'header NEL `{"report_to":"default","max_age":86400,"include_subdomains":true}`',
		'header Report-To `{"group":"default","max_age":86400,"endpoints":[{"url":"/.resist/nel-report"}]}`',
		'',
		'handle /.resist/nel-report {',
		'	# Log NEL reports to file',
		'	log nel {',
		'		output file .resist/logs/nel.ndjson',
		'		format json',
		'	}',
		'	respond 204',
		'}',
		'',
	];
}

/**
 * Generate Web Analytics script injection directive.
 */
export function generateWebAnalyticsInjection(): ReadonlyArray<v.InferOutput<typeof v.string>> {
	return [
		'# Web Analytics Script Injection',
		'# Inject analytics script before </body> in HTML responses',
		'templates',
		'handle /.resist/analytics.js {',
		'	respond `(function(){',
		'		var d={url:location.href,ref:document.referrer,ua:navigator.userAgent,ts:Date.now()};',
		'		fetch("/.resist/analytics-collect",{method:"POST",body:JSON.stringify(d),keepalive:true});',
		'	})();` 200 {',
		'		header Content-Type "application/javascript"',
		'	}',
		'}',
		'',
		'handle /.resist/analytics-collect {',
		'	log web_analytics {',
		'		output file .resist/logs/web-analytics.ndjson',
		'		format json',
		'	}',
		'	respond 204',
		'}',
		'',
	];
}

/**
 * Generate CSP violation collector endpoint.
 */
export function generateCspCollector(): ReadonlyArray<v.InferOutput<typeof v.string>> {
	return [
		'# CSP Violation Collector',
		'handle /.resist/csp-report {',
		'	log csp_violations {',
		'		output file .resist/logs/csp-violations.ndjson',
		'		format json',
		'	}',
		'	respond 204',
		'}',
		'',
	];
}

/**
 * Generate complete Analytics & Observability Caddyfile directives.
 */
export function generateAnalyticsDirectives(
	config: AnalyticsConfig,
): Result<v.InferOutput<typeof v.string>> {
	const configResult = safeParse(AnalyticsConfigSchema, config);
	if (!configResult.ok) return configResult;
	const validConfig = configResult.data;

	const sections: Array<string> = [];

	sections.push('# ==========================================================');
	sections.push('# Analytics & Observability');
	sections.push('# ==========================================================');
	sections.push('');

	// Access logs (always enabled)
	sections.push(...generateAccessLogDirectives());

	// Network Error Logging
	if (validConfig.networkErrorLogging) {
		sections.push(...generateNelDirectives());
	}

	// Web Analytics
	if (validConfig.webAnalytics?.enabled) {
		sections.push(...generateWebAnalyticsInjection());
	}

	// CSP violation collector
	if (validConfig.cspViolationCollector) {
		sections.push(...generateCspCollector());
	}

	return ok(sections.join('\n'));
}

/**
 * Get companion services to start for analytics.
 *
 * @param config - Analytics configuration.
 * @returns Array of service definitions to start.
 */
export function getAnalyticsServices(
	config: AnalyticsConfig,
): ReadonlyArray<{
	name: string;
	command: string;
	port: number;
}> {
	const services: Array<{ name: string; command: string; port: number }> = [];

	if (config.analyticsEngine?.enabled) {
		const ae = config.analyticsEngine;
		const port = ae.apiPort ?? 9011;

		if (ae.backend === 'clickhouse-docker') {
			services.push({
				name: 'analytics-engine',
				command: `docker run --rm -p ${String(port)}:8123 -v ${ae.dataDir ?? '.resist/clickhouse/'}:/var/lib/clickhouse clickhouse/clickhouse-server`,
				port,
			});
		} else {
			services.push({
				name: 'analytics-engine',
				command: `clickhouse-local --http_port=${String(port)} --path=${ae.dataDir ?? '.resist/clickhouse/'}`,
				port,
			});
		}
	}

	if (config.logExplorer?.enabled) {
		services.push({
			name: 'log-explorer',
			command: `npx serve .resist/logs/ -p ${String(config.logExplorer.uiPort ?? 9012)}`,
			port: config.logExplorer.uiPort ?? 9012,
		});
	}

	return services;
}
```

---

## 3. Pulumi Mapping

### File: `packages/products/[product]/iac/src/analytics.ts`

```typescript
/**
 * Pulumi Analytics Resource Generator
 *
 * Maps AnalyticsConfig → Cloudflare Logpush/Analytics resources.
 *
 * @module
 */

import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import type { AnalyticsConfig } from '@resist/schemas/core-config/src/edge-analytics';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';

export function createAnalyticsResources(
	zoneId: pulumi.Input<v.InferOutput<typeof v.string>>,
	accountId: pulumi.Input<v.InferOutput<typeof v.string>>,
	config: AnalyticsConfig,
	namePrefix: v.InferOutput<typeof v.string>,
	r2BucketName: v.InferOutput<typeof v.string>,
): Result<{
	logpushJobs: Array<cloudflare.LogpushJob>;
}> {
	const logpushJobs: Array<cloudflare.LogpushJob> = [];

	if (config.logpush?.enabled) {
		for (const job of config.logpush.jobs ?? []) {
			if (!job.enabled) continue;

			logpushJobs.push(new cloudflare.LogpushJob(
				`${namePrefix}-logpush-${job.name}`,
				{
					zoneId,
					name: job.name,
					enabled: true,
					dataset: job.dataset,
					destinationConf: `r2://${r2BucketName}/logs/${job.dataset}/{DATE}`,
					logpullOptions: job.fields?.length
						? `fields=${job.fields.join(',')}`
						: undefined,
					filter: job.filter,
				},
			));
		}
	}

	return ok({ logpushJobs });
}
```

---

## 4. Verification Steps

```bash
pnpm tool edge &
sleep 3

# Test 1: Access logs written
curl -s "https://localhost:3000/"
sleep 1
cat .resist/logs/access.ndjson | head -1 | jq .
# Expected: Structured JSON log entry

# Test 2: Analytics Engine SQL API (if enabled)
curl -s "http://analytics.localhost:9011/?query=SELECT+1"
# Expected: 1

# Test 3: Web Analytics script injection
curl -s "https://localhost:3000/" | grep ".resist/analytics.js"
# Expected: <script> tag present in HTML

# Test 4: NEL report endpoint
curl -s -X POST "https://localhost:3000/.resist/nel-report" -d '{"type":"network-error"}'
# Expected: 204

# Test 5: CSP violation collector
curl -s -X POST "https://localhost:3000/.resist/csp-report" -d '{"csp-report":{}}'
# Expected: 204
```

---

## 5. Known Limitations & Simulation Gaps

| Feature | Cloudflare | Local Simulation | Gap |
|---------|-----------|-----------------|-----|
| Analytics Engine scale | Distributed ClickHouse cluster | Single clickhouse-local | No distributed queries |
| Web Analytics | Full RUM with beacon API | Simple event collector | Less data captured |
| Logpush destinations | R2, S3, GCS, Azure, Sumo, etc. | Local files only | Single destination |
| GraphQL Analytics API | Full GraphQL schema | Not implemented | No GraphQL locally |
| Trace sampling | Configurable trace sampling | Full capture | No sampling |

---

## 6. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-analytics.ts` | `AnalyticsConfigSchema`, `AnalyticsEngineConfigSchema`, `WebAnalyticsConfigSchema`, `LogpushConfigSchema` |
| `packages/shared/utils/cli/src/tools/edge/utils/analytics.ts` | `generateAnalyticsDirectives()`, `getAnalyticsServices()`, `generateAccessLogDirectives()`, `generateWebAnalyticsInjection()` |
| `packages/products/[product]/iac/src/analytics.ts` | `createAnalyticsResources()` — Pulumi IaC |

---

## 7. Dependencies

- **00-foundation.md** — `.resist/` directory, companion service lifecycle
- **17-notifications.md** — Alert triggers read from analytics logs

---

## 8. Implementation Order

1. Add Analytics Engine, Web Analytics, Logpush, Log Explorer schemas
2. Add `AnalyticsConfigSchema` composing all
3. Create `analytics.ts` with access log directives
4. Add NEL, Web Analytics injection, CSP collector
5. Add `getAnalyticsServices()` for ClickHouse + Log Explorer lifecycle
6. Add `generateAnalyticsDirectives()` master function
7. Hook into edge tool
8. Create Pulumi mapping
9. Write tests
