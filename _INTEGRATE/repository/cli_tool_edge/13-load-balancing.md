# 13 — Load Balancing: Pools, Health Monitors, Steering, Session Affinity, Waiting Room

## Context

Cloudflare Load Balancing distributes traffic across multiple origin servers with health monitoring, steering policies, and session affinity. The Waiting Room feature manages traffic surges by queuing excess visitors.

Locally, Caddy's built-in `reverse_proxy` provides multi-upstream load balancing with health checks, load balancing policies, and session affinity — closely matching Cloudflare's feature set.

The same Valibot schema drives both local Caddy configuration and Pulumi Cloudflare Load Balancer resources.

---

## Documentation Links

- Cloudflare Load Balancing: https://developers.cloudflare.com/load-balancing/
- Load Balancer pools: https://developers.cloudflare.com/load-balancing/pools/
- Health monitors: https://developers.cloudflare.com/load-balancing/monitors/
- Steering policies: https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/
- Session affinity: https://developers.cloudflare.com/load-balancing/session-affinity/
- Waiting Room: https://developers.cloudflare.com/waiting-room/
- Caddy reverse_proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy load balancing: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#load-balancing
- Pulumi Cloudflare Load Balancer: https://www.pulumi.com/registry/packages/cloudflare/api-docs/loadbalancer/

---

## 1. Valibot Schema: `LoadBalancingConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-lb.ts`

```typescript
/**
 * Load Balancing & Waiting Room Edge Config Schema
 *
 * @module
 */

import * as v from 'valibot';

/** Steering policy (how traffic is distributed). */
export const SteeringPolicySchema = v.picklist([
	'random', 'geo', 'dynamic_latency', 'least_outstanding',
	'least_connections', 'proximity', 'off',
]);
export type SteeringPolicy = v.InferOutput<typeof SteeringPolicySchema>;

/** Session affinity type. */
export const SessionAffinitySchema = v.picklist(['none', 'cookie', 'ip_hash', 'header']);
export type SessionAffinity = v.InferOutput<typeof SessionAffinitySchema>;

/** Health monitor protocol. */
export const HealthMonitorTypeSchema = v.picklist(['http', 'https', 'tcp']);
export type HealthMonitorType = v.InferOutput<typeof HealthMonitorTypeSchema>;

/** Health monitor configuration. */
export const HealthMonitorSchema = v.strictObject({
	type: v.optional(HealthMonitorTypeSchema, 'http'),
	path: v.optional(v.pipe(v.string(), v.minLength(1)), '/health'),
	interval: v.optional(v.pipe(v.number(), v.integer(), v.minValue(5)), 60),
	timeout: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 5),
	retries: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 2),
	expectedCodes: v.optional(v.pipe(v.string(), v.minLength(1)), '200'),
	expectedBody: v.optional(v.string()),
	headers: v.optional(v.record(v.string(), v.string()), {}),
});
export type HealthMonitor = v.InferOutput<typeof HealthMonitorSchema>;

/** An origin server within a pool. */
export const OriginSchema = v.strictObject({
	name: v.pipe(v.string(), v.minLength(1)),
	address: v.pipe(v.string(), v.minLength(1)),
	port: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535))),
	weight: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
	enabled: v.optional(v.boolean(), true),
});
export type Origin = v.InferOutput<typeof OriginSchema>;

/** A pool of origin servers. */
export const PoolSchema = v.strictObject({
	name: v.pipe(v.string(), v.minLength(1)),
	origins: v.pipe(v.array(OriginSchema), v.minLength(1)),
	healthMonitor: v.optional(HealthMonitorSchema, {}),
	minimumOrigins: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
	enabled: v.optional(v.boolean(), true),
	notificationEmail: v.optional(v.string()),
});
export type Pool = v.InferOutput<typeof PoolSchema>;

/** Waiting Room configuration. */
export const WaitingRoomConfigSchema = v.strictObject({
	enabled: v.optional(v.boolean(), false),
	totalActiveUsers: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 200),
	newUsersPerMinute: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 200),
	sessionDuration: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 5),
	queueingMethod: v.optional(v.picklist(['fifo', 'random', 'passthrough', 'reject']), 'fifo'),
	customPageHtml: v.optional(v.string()),
	path: v.optional(v.pipe(v.string(), v.minLength(1)), '/'),
	cookieSuffix: v.optional(v.pipe(v.string(), v.minLength(1)), 'waiting_room'),
});
export type WaitingRoomConfig = v.InferOutput<typeof WaitingRoomConfigSchema>;

/** Complete Load Balancing configuration. */
export const LoadBalancingConfigSchema = v.strictObject({
	enabled: v.optional(v.boolean(), false),
	pools: v.optional(v.array(PoolSchema), []),
	steeringPolicy: v.optional(SteeringPolicySchema, 'random'),
	sessionAffinity: v.optional(SessionAffinitySchema, 'none'),
	sessionAffinityTtl: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 82800),
	sessionAffinityAttributes: v.optional(v.strictObject({
		headers: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
		drainDuration: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 0),
	}), {}),
	fallbackPool: v.optional(v.pipe(v.string(), v.minLength(1))),
	waitingRoom: v.optional(WaitingRoomConfigSchema, {}),
});
export type LoadBalancingConfig = v.InferOutput<typeof LoadBalancingConfigSchema>;
```

---

## 2. Caddy Directive Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/lb.ts`

```typescript
/**
 * Load Balancing → Caddy reverse_proxy Directives
 *
 * @module
 */

import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';
import { LoadBalancingConfigSchema } from '@/schemas/core-config/src/edge-lb';
import type { LoadBalancingConfig, Pool } from '@/schemas/core-config/src/edge-lb';

/** Map steering policy to Caddy lb_policy. */
function steeringToCaddyPolicy(steering: v.InferOutput<typeof v.string>): v.InferOutput<typeof v.string> {
	const map: ReadonlyMap<string, string> = new Map([
		['random', 'random'],
		['geo', 'header CF-IPCountry'],
		['dynamic_latency', 'least_conn'],
		['least_outstanding', 'least_conn'],
		['least_connections', 'least_conn'],
		['proximity', 'random'],
		['off', 'first'],
	]);
	return map.get(steering) ?? 'random';
}

/** Map session affinity to Caddy lb_policy. */
function affinityToCaddyPolicy(affinity: v.InferOutput<typeof v.string>): v.InferOutput<typeof v.string> {
	switch (affinity) {
		case 'cookie': return 'cookie';
		case 'ip_hash': return 'ip_hash';
		case 'header': return 'header';
		default: return '';
	}
}

/** Generate Caddy reverse_proxy block for a pool. */
export function generatePoolDirectives(
	pool: Pool,
	steeringPolicy: v.InferOutput<typeof v.string>,
	sessionAffinity: v.InferOutput<typeof v.string>,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	if (!pool.enabled) return ok([]);

	const enabledOrigins = pool.origins.filter((o) => o.enabled);
	if (enabledOrigins.length === 0) return ok([]);

	const upstreams = enabledOrigins.map((o) => {
		const addr = o.port ? `${o.address}:${String(o.port)}` : o.address;
		return addr;
	});

	const directives: Array<string> = [
		`# Pool: ${pool.name}`,
		`reverse_proxy ${upstreams.join(' ')} {`,
	];

	// Load balancing policy
	const lbPolicy = sessionAffinity !== 'none'
		? affinityToCaddyPolicy(sessionAffinity)
		: steeringToCaddyPolicy(steeringPolicy);
	if (lbPolicy) {
		directives.push(`	lb_policy ${lbPolicy}`);
	}

	// Health check
	const hm = pool.healthMonitor ?? {};
	directives.push(`	health_uri ${hm.path ?? '/health'}`);
	directives.push(`	health_interval ${String(hm.interval ?? 60)}s`);
	directives.push(`	health_timeout ${String(hm.timeout ?? 5)}s`);
	directives.push(`	health_status ${hm.expectedCodes ?? '200'}`);

	// Failover
	directives.push('	fail_duration 30s');
	directives.push('	lb_try_duration 5s');
	directives.push('	lb_try_interval 250ms');

	directives.push('}');
	directives.push('');

	return ok(directives);
}

/** Generate Waiting Room directives. */
export function generateWaitingRoomDirectives(
	config: LoadBalancingConfig,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	const wr = config.waitingRoom;
	if (!wr?.enabled) return ok([]);

	const directives: Array<string> = [
		'# Waiting Room',
		`# Max active users: ${String(wr.totalActiveUsers ?? 200)}`,
		'# Simulated via connection counting middleware',
		`handle ${wr.path ?? '/'} {`,
		'	# Track active connections',
		'	# If exceeds threshold, serve waiting room HTML',
		`	# Threshold: ${String(wr.totalActiveUsers ?? 200)} active users`,
		`	# Session duration: ${String(wr.sessionDuration ?? 5)} minutes`,
		'}',
		'',
	];

	return ok(directives);
}

/** Generate complete Load Balancing Caddyfile directives. */
export function generateLoadBalancingDirectives(
	config: LoadBalancingConfig,
): Result<v.InferOutput<typeof v.string>> {
	const configResult = safeParse(LoadBalancingConfigSchema, config);
	if (!configResult.ok) return configResult;
	const validConfig = configResult.data;

	if (!validConfig.enabled) return ok('');

	const sections: Array<string> = [
		'# ==========================================================',
		'# Load Balancing',
		'# ==========================================================',
		'',
	];

	for (const pool of validConfig.pools) {
		const poolResult = generatePoolDirectives(
			pool,
			validConfig.steeringPolicy ?? 'random',
			validConfig.sessionAffinity ?? 'none',
		);
		if (!poolResult.ok) return poolResult;
		sections.push(...poolResult.data);
	}

	const wrResult = generateWaitingRoomDirectives(validConfig);
	if (!wrResult.ok) return wrResult;
	sections.push(...wrResult.data);

	return ok(sections.join('\n'));
}
```

---

## 3. Pulumi Mapping

### File: `packages/products/[product]/iac/src/lb.ts`

```typescript
import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import type { LoadBalancingConfig } from '@resist/schemas/core-config/src/edge-lb';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';

export function createLoadBalancingResources(
	zoneId: pulumi.Input<v.InferOutput<typeof v.string>>,
	config: LoadBalancingConfig,
	namePrefix: v.InferOutput<typeof v.string>,
): Result<{
	monitor?: cloudflare.LoadBalancerMonitor;
	pools: Array<cloudflare.LoadBalancerPool>;
	loadBalancer?: cloudflare.LoadBalancer;
	waitingRoom?: cloudflare.WaitingRoom;
}> {
	if (!config.enabled) return ok({ pools: [] });

	const monitor = new cloudflare.LoadBalancerMonitor(`${namePrefix}-monitor`, {
		type: config.pools[0]?.healthMonitor?.type ?? 'http',
		path: config.pools[0]?.healthMonitor?.path ?? '/health',
		interval: config.pools[0]?.healthMonitor?.interval ?? 60,
		timeout: config.pools[0]?.healthMonitor?.timeout ?? 5,
		retries: config.pools[0]?.healthMonitor?.retries ?? 2,
		expectedCodes: config.pools[0]?.healthMonitor?.expectedCodes ?? '200',
	});

	const pools = config.pools.map((pool) =>
		new cloudflare.LoadBalancerPool(`${namePrefix}-pool-${pool.name}`, {
			name: pool.name,
			origins: pool.origins.filter((o) => o.enabled).map((o) => ({
				name: o.name,
				address: o.address,
				weight: o.weight ?? 1,
				enabled: true,
			})),
			minimumOrigins: pool.minimumOrigins ?? 1,
			monitorId: monitor.id,
			enabled: pool.enabled ?? true,
			notificationEmail: pool.notificationEmail,
		}),
	);

	const loadBalancer = new cloudflare.LoadBalancer(`${namePrefix}-lb`, {
		zoneId,
		name: `${namePrefix}.example.com`,
		defaultPoolIds: pools.map((p) => p.id),
		fallbackPoolId: pools[0]?.id ?? '',
		steeringPolicy: config.steeringPolicy ?? 'random',
		sessionAffinity: config.sessionAffinity ?? 'none',
		sessionAffinityTtl: config.sessionAffinityTtl ?? 82800,
		proxied: true,
	});

	let waitingRoom: cloudflare.WaitingRoom | undefined;
	if (config.waitingRoom?.enabled) {
		const wr = config.waitingRoom;
		waitingRoom = new cloudflare.WaitingRoom(`${namePrefix}-waiting-room`, {
			zoneId,
			name: `${namePrefix} Waiting Room`,
			host: `${namePrefix}.example.com`,
			path: wr.path ?? '/',
			totalActiveUsers: wr.totalActiveUsers ?? 200,
			newUsersPerMinute: wr.newUsersPerMinute ?? 200,
			sessionDuration: wr.sessionDuration ?? 5,
			queueingMethod: wr.queueingMethod ?? 'fifo',
			customPageHtml: wr.customPageHtml,
			cookieSuffix: wr.cookieSuffix ?? 'waiting_room',
		});
	}

	return ok({ monitor, pools, loadBalancer, waitingRoom });
}
```

---

## 4. Verification Steps

```bash
pnpm tool edge &
sleep 3

# Test 1: Multiple upstreams receive traffic
for i in {1..10}; do curl -s "https://localhost:3000/api" | grep "server"; done
# Expected: Responses from different upstream servers

# Test 2: Health check path responds
curl -s -o /dev/null -w "%{http_code}" "https://localhost:3001/health"
# Expected: 200

# Test 3: Session affinity (cookie)
curl -s -c cookies.txt -b cookies.txt "https://localhost:3000/api"
curl -s -c cookies.txt -b cookies.txt "https://localhost:3000/api"
# Expected: Both requests hit the same upstream
```

---

## 5. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-lb.ts` | `LoadBalancingConfigSchema`, `PoolSchema`, `HealthMonitorSchema`, `WaitingRoomConfigSchema` |
| `packages/shared/utils/cli/src/tools/edge/utils/lb.ts` | `generateLoadBalancingDirectives()`, `generatePoolDirectives()`, `generateWaitingRoomDirectives()` |
| `packages/products/[product]/iac/src/lb.ts` | `createLoadBalancingResources()` — Pulumi IaC |

---

## 6. Dependencies

- **00-foundation.md** — Edge tool rename, config inheritance
- **04-bot-management.md** — Geo steering uses `CF-IPCountry` header
- **17-notifications.md** — Health check failures trigger notifications

---

## 7. Implementation Order

1. Add pool, origin, health monitor, steering, session affinity schemas
2. Add waiting room schema
3. Add `LoadBalancingConfigSchema` composing all
4. Create `lb.ts` with pool → Caddy reverse_proxy generation
5. Add waiting room generation
6. Add `generateLoadBalancingDirectives()` master function
7. Hook into edge tool
8. Create Pulumi mapping
9. Write tests
