# 10 — DNS: Records (All Types), CNAME Flattening, /etc/hosts Generation

## Context

DNS is the foundation layer of every Cloudflare zone. Each product in the monorepo maps to its own zone (`product.app` for prod, `product-staging.app` for staging). DNS records define how traffic routes to services.

Locally, the edge tool simulates DNS by:
- Generating Caddy virtual hosts from zone config (each record → a Caddy site block)
- Generating `/etc/hosts`-compatible entries for local name resolution (printed to terminal or written to `.resist/hosts`)
- CNAME flattening is handled natively by Caddy resolving CNAMEs internally

The same Valibot schema mirrors the Pulumi `cloudflare.Record` resource exactly, so the same config drives both local simulation and production DNS.

### How Cloudflare DNS Works

1. Each zone has DNS records that map names to destinations.
2. **Proxied records** (orange cloud) route through Cloudflare's edge — HTTP traffic gets WAF, caching, etc.
3. **DNS-only records** (grey cloud) resolve directly to the origin — no Cloudflare features.
4. CNAME flattening at the zone apex returns the CNAME target's A/AAAA records, avoiding the RFC violation of a CNAME at apex.
5. Record types span from basic (A, AAAA, CNAME) to specialized (SRV, CAA, SVCB, HTTPS, TLSA, etc.).

### Local Simulation

- Each **proxied** DNS record generates a Caddy site block with the record's name as the host.
- A records → `localhost` mapping in `/etc/hosts`.
- CNAME records → resolved to target host in Caddy.
- MX, TXT, SRV, CAA → schema-only (exist for Pulumi generation, no local HTTP behavior).

---

## Documentation Links

- Cloudflare DNS overview: https://developers.cloudflare.com/dns/
- DNS records: https://developers.cloudflare.com/dns/manage-dns-records/
- DNS record types: https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/
- CNAME flattening: https://developers.cloudflare.com/dns/cname-flattening/
- Proxied records: https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/
- Cloudflare DNS API: https://developers.cloudflare.com/api/operations/dns-records-for-a-zone-list-dns-records
- Pulumi Cloudflare Record: https://www.pulumi.com/registry/packages/cloudflare/api-docs/record/

---

## 1. Valibot Schema: `DnsConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-dns.ts`

```typescript
/**
 * DNS Edge Config Schema
 *
 * Valibot schemas for all Cloudflare DNS record types.
 * Mirrors Pulumi `cloudflare.Record` resource fields exactly.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// DNS Record Type
// =============================================================================

/** All supported DNS record types. */
export const DnsRecordTypeSchema = v.picklist([
	'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'CAA', 'NS', 'PTR',
	'LOC', 'CERT', 'DNSKEY', 'DS', 'NAPTR', 'SMIMEA', 'SSHFP',
	'SVCB', 'HTTPS', 'TLSA', 'URI',
]);

export type DnsRecordType = v.InferOutput<typeof DnsRecordTypeSchema>;

// =============================================================================
// DNS Record Schema (Discriminated Union)
// =============================================================================

/** Base fields shared by all DNS record types. */
const DnsRecordBaseSchema = {
	/** Record name (e.g., `'@'` for apex, `'www'`, `'api'`). */
	name: v.pipe(v.string(), v.minLength(1)),
	/** Whether the record is proxied through Cloudflare (orange cloud). Default: `true`. */
	proxied: v.optional(v.boolean(), true),
	/** TTL in seconds. `1` = auto. Range: 1, 60-86400. Default: `1`. */
	ttl: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(86400)), 1),
	/** Optional comment. */
	comment: v.optional(v.pipe(v.string(), v.maxLength(512))),
	/** Optional tags for grouping. */
	tags: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
};

/** A record (IPv4 address). */
export const ARecordSchema = v.strictObject({
	type: v.literal('A'),
	...DnsRecordBaseSchema,
	/** IPv4 address. */
	content: v.pipe(v.string(), v.ip('v4')),
});

/** AAAA record (IPv6 address). */
export const AAAARecordSchema = v.strictObject({
	type: v.literal('AAAA'),
	...DnsRecordBaseSchema,
	/** IPv6 address. */
	content: v.pipe(v.string(), v.ip('v6')),
});

/** CNAME record (canonical name alias). */
export const CNAMERecordSchema = v.strictObject({
	type: v.literal('CNAME'),
	...DnsRecordBaseSchema,
	/** Target hostname. */
	content: v.pipe(v.string(), v.minLength(1)),
});

/** MX record (mail exchange). */
export const MXRecordSchema = v.strictObject({
	type: v.literal('MX'),
	...DnsRecordBaseSchema,
	proxied: v.optional(v.literal(false), false),
	/** Mail server hostname. */
	content: v.pipe(v.string(), v.minLength(1)),
	/** Priority (lower = preferred). */
	priority: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(65535)),
});

/** TXT record (text data). */
export const TXTRecordSchema = v.strictObject({
	type: v.literal('TXT'),
	...DnsRecordBaseSchema,
	proxied: v.optional(v.literal(false), false),
	/** Text content. */
	content: v.pipe(v.string(), v.minLength(1)),
});

/** SRV record (service locator). */
export const SRVRecordSchema = v.strictObject({
	type: v.literal('SRV'),
	...DnsRecordBaseSchema,
	proxied: v.optional(v.literal(false), false),
	/** SRV data. */
	data: v.strictObject({
		priority: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(65535)),
		weight: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(65535)),
		port: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(65535)),
		target: v.pipe(v.string(), v.minLength(1)),
	}),
});

/** CAA record (certificate authority authorization). */
export const CAARecordSchema = v.strictObject({
	type: v.literal('CAA'),
	...DnsRecordBaseSchema,
	proxied: v.optional(v.literal(false), false),
	/** CAA data. */
	data: v.strictObject({
		flags: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255)),
		tag: v.picklist(['issue', 'issuewild', 'iodef']),
		value: v.pipe(v.string(), v.minLength(1)),
	}),
});

/** NS record (nameserver). */
export const NSRecordSchema = v.strictObject({
	type: v.literal('NS'),
	...DnsRecordBaseSchema,
	proxied: v.optional(v.literal(false), false),
	/** Nameserver hostname. */
	content: v.pipe(v.string(), v.minLength(1)),
});

/** Generic DNS record (for less common types like PTR, LOC, etc.). */
export const GenericRecordSchema = v.strictObject({
	type: v.picklist(['PTR', 'LOC', 'CERT', 'DNSKEY', 'DS', 'NAPTR', 'SMIMEA', 'SSHFP', 'SVCB', 'HTTPS', 'TLSA', 'URI']),
	...DnsRecordBaseSchema,
	proxied: v.optional(v.literal(false), false),
	/** Record content (type-specific format). */
	content: v.optional(v.pipe(v.string(), v.minLength(1))),
	/** Record-specific data object. */
	data: v.optional(v.record(v.string(), v.union([v.string(), v.number(), v.boolean()]))),
	/** Priority (for URI and similar). */
	priority: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(65535))),
});

/**
 * Discriminated union of all DNS record types.
 *
 * Uses `v.variant` for performance with the `type` discriminator field.
 */
export const DnsRecordSchema = v.variant('type', [
	ARecordSchema,
	AAAARecordSchema,
	CNAMERecordSchema,
	MXRecordSchema,
	TXTRecordSchema,
	SRVRecordSchema,
	CAARecordSchema,
	NSRecordSchema,
	GenericRecordSchema,
]);

export type DnsRecord = v.InferOutput<typeof DnsRecordSchema>;

// =============================================================================
// DNSSEC Schema (schema-only, for Pulumi)
// =============================================================================

export const DnssecSchema = v.strictObject({
	enabled: v.optional(v.boolean(), false),
});

export type Dnssec = v.InferOutput<typeof DnssecSchema>;

// =============================================================================
// Top-Level DNS Config
// =============================================================================

/**
 * Complete DNS configuration.
 *
 * Placed under `tooling.edge.dns` in `resist.config.ts`.
 */
export const DnsConfigSchema = v.strictObject({
	/** DNS records for this zone. Default: `[]`. */
	records: v.optional(v.array(DnsRecordSchema), []),
	/** DNSSEC configuration (schema-only for Pulumi). */
	dnssec: v.optional(DnssecSchema, {}),
	/**
	 * Default zone domain.
	 * Records with `name: '@'` resolve to this domain.
	 * Default: `'localhost'`.
	 */
	zoneDomain: v.optional(v.pipe(v.string(), v.minLength(1)), 'localhost'),
});

export type DnsConfig = v.InferOutput<typeof DnsConfigSchema>;
```

---

## 2. Caddy Virtual Host + /etc/hosts Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/dns.ts`

```typescript
/**
 * DNS Config → Caddy Virtual Hosts + /etc/hosts Generator
 *
 * @module
 */

import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';
import { DnsConfigSchema } from '@/schemas/core-config/src/edge-dns';
import type { DnsConfig, DnsRecord } from '@/schemas/core-config/src/edge-dns';

/**
 * Resolve a record name to a fully qualified hostname.
 *
 * @param name - Record name (`'@'` for apex, or subdomain).
 * @param zoneDomain - Zone domain.
 * @returns Fully qualified hostname.
 */
export function resolveRecordName(
	name: v.InferOutput<typeof v.string>,
	zoneDomain: v.InferOutput<typeof v.string>,
): v.InferOutput<typeof v.string> {
	if (name === '@' || name === zoneDomain) {
		return zoneDomain;
	}
	return `${name}.${zoneDomain}`;
}

/**
 * Generate /etc/hosts entries from DNS records.
 *
 * Maps all A/AAAA/CNAME records to `127.0.0.1` for local resolution.
 *
 * @param config - DNS configuration.
 * @returns Result containing hosts file content.
 */
export function generateHostsEntries(
	config: DnsConfig,
): Result<v.InferOutput<typeof v.string>> {
	const configResult = safeParse(DnsConfigSchema, config);
	if (!configResult.ok) return configResult;
	const validConfig = configResult.data;

	const lines: Array<string> = [
		'# Generated by resist.js edge tool',
		'# Add these entries to /etc/hosts for local DNS resolution',
		'# Or source from .resist/hosts',
		'',
	];

	const hosts = new Set<string>();

	for (const record of validConfig.records) {
		if (record.type === 'A' || record.type === 'AAAA' || record.type === 'CNAME') {
			const hostname = resolveRecordName(record.name, validConfig.zoneDomain);
			hosts.add(hostname);
		}
	}

	for (const host of hosts) {
		lines.push(`127.0.0.1    ${host}`);
		lines.push(`::1          ${host}`);
	}

	lines.push('');
	return ok(lines.join('\n'));
}

/**
 * Generate Caddy virtual host blocks from DNS records.
 *
 * Each proxied A/AAAA/CNAME record becomes a Caddy site block.
 *
 * @param config - DNS configuration.
 * @returns Result containing Caddy site configuration strings.
 */
export function generateDnsCaddyHosts(
	config: DnsConfig,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	const configResult = safeParse(DnsConfigSchema, config);
	if (!configResult.ok) return configResult;
	const validConfig = configResult.data;

	const directives: Array<string> = [
		'# ==========================================================',
		'# DNS-based Virtual Hosts',
		'# ==========================================================',
		'',
	];

	for (const record of validConfig.records) {
		// Only proxied A/AAAA/CNAME records generate Caddy site blocks
		if (!record.proxied) continue;
		if (record.type !== 'A' && record.type !== 'AAAA' && record.type !== 'CNAME') continue;

		const hostname = resolveRecordName(record.name, validConfig.zoneDomain);
		directives.push(`# DNS Record: ${record.type} ${record.name}`);
		directives.push(`${hostname} {`);
		directives.push('	# Edge features applied per-host');
		directives.push('	import edge_defaults');
		directives.push('}');
		directives.push('');
	}

	return ok(directives);
}

/**
 * Generate complete DNS-related Caddyfile directives.
 *
 * @param config - DNS configuration.
 * @returns Result containing the complete DNS directive block.
 */
export function generateDnsDirectives(
	config: DnsConfig,
): Result<v.InferOutput<typeof v.string>> {
	const hostsResult = generateDnsCaddyHosts(config);
	if (!hostsResult.ok) return hostsResult;

	return ok(hostsResult.data.join('\n'));
}
```

---

## 3. Pulumi Mapping

### File: `packages/products/[product]/iac/src/dns.ts`

```typescript
/**
 * Pulumi DNS Resource Generator
 *
 * Maps DnsConfig → Cloudflare Record resources.
 *
 * @module
 */

import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import type { DnsConfig, DnsRecord } from '@resist/schemas/core-config/src/edge-dns';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';

/**
 * Create Cloudflare DNS Record resources from config.
 */
export function createDnsResources(
	zoneId: pulumi.Input<v.InferOutput<typeof v.string>>,
	config: DnsConfig,
	namePrefix: v.InferOutput<typeof v.string>,
): Result<Array<cloudflare.Record>> {
	const resources: Array<cloudflare.Record> = [];

	for (const record of config.records) {
		const resourceName = `${namePrefix}-dns-${record.type}-${record.name}`.replace(/[^a-zA-Z0-9-]/g, '-');

		const baseArgs: cloudflare.RecordArgs = {
			zoneId,
			name: record.name,
			type: record.type,
			proxied: record.proxied ?? true,
			ttl: record.proxied ? 1 : (record.ttl ?? 1),
			comment: record.comment,
		};

		// Type-specific content
		switch (record.type) {
			case 'A':
			case 'AAAA':
			case 'CNAME':
			case 'NS':
			case 'TXT':
				baseArgs.content = record.content;
				break;
			case 'MX':
				baseArgs.content = record.content;
				baseArgs.priority = record.priority;
				break;
			case 'SRV':
			case 'CAA':
				baseArgs.data = record.data;
				break;
			default:
				if ('content' in record && record.content) {
					baseArgs.content = record.content;
				}
				if ('data' in record && record.data) {
					baseArgs.data = record.data;
				}
				if ('priority' in record && record.priority !== undefined) {
					baseArgs.priority = record.priority;
				}
				break;
		}

		resources.push(new cloudflare.Record(resourceName, baseArgs));
	}

	// DNSSEC
	if (config.dnssec?.enabled) {
		// DNSSEC is a zone setting, not a record
		// Created via cloudflare.ZoneDnssec
	}

	return ok(resources);
}
```

---

## 4. Verification Steps

```bash
pnpm tool edge &
sleep 3

# Test 1: /etc/hosts generation
pnpm tool edge --hosts
# Expected: Prints hosts entries like "127.0.0.1 api.myapp.localhost"

# Test 2: Virtual host responds
curl -s -o /dev/null -w "%{http_code}" --resolve "api.myapp.localhost:443:127.0.0.1" "https://api.myapp.localhost/"
# Expected: 200

# Test 3: Schema validation with all record types
cat <<'EOF' | npx tsx -e "
import { safeParse } from '@/utils/result/safe';
import { DnsConfigSchema } from '@resist/schemas/core-config/src/edge-dns';
const config = {
  zoneDomain: 'myapp.localhost',
  records: [
    { type: 'A', name: '@', content: '127.0.0.1', proxied: true },
    { type: 'AAAA', name: 'api', content: '::1', proxied: true },
    { type: 'CNAME', name: 'www', content: 'myapp.localhost', proxied: true },
    { type: 'MX', name: '@', content: 'mail.example.com', priority: 10, proxied: false },
    { type: 'TXT', name: '@', content: 'v=spf1 include:_spf.google.com ~all', proxied: false },
  ],
};
const result = safeParse(DnsConfigSchema, config);
console.log(result.ok ? 'PASS' : 'FAIL: ' + result.error);
"
EOF
```

---

## 5. Known Limitations & Simulation Gaps

| Feature | Cloudflare | Local Simulation | Gap |
|---------|-----------|-----------------|-----|
| DNS resolution | Global anycast DNS | /etc/hosts + Caddy virtual hosts | No actual DNS queries |
| DNSSEC | Cryptographic signing | Schema-only | No signing locally |
| CNAME flattening | Returns A records at apex | Caddy resolves internally | Different mechanism |
| Multi-provider DNS | Secondary DNS support | Not simulated | Single provider only |
| DNS analytics | Query volume, response codes | Not simulated | No query logging |

---

## 6. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-dns.ts` | `DnsConfigSchema`, `DnsRecordSchema` (discriminated union), all record type schemas |
| `packages/shared/utils/cli/src/tools/edge/utils/dns.ts` | `generateDnsDirectives()`, `generateHostsEntries()`, `generateDnsCaddyHosts()`, `resolveRecordName()` |
| `packages/products/[product]/iac/src/dns.ts` | `createDnsResources()` — Pulumi IaC |

---

## 7. Dependencies

- **00-foundation.md** — Edge tool rename, config inheritance, `.resist/` directory
- **11-email.md** — MX records required for email routing simulation

---

## 8. Implementation Order

1. Add DNS record type schemas to `edge-dns.ts`
2. Add discriminated union `DnsRecordSchema` with all record types
3. Add `DnsConfigSchema` with zone domain and DNSSEC
4. Create `dns.ts` with `resolveRecordName()` and `generateHostsEntries()`
5. Add `generateDnsCaddyHosts()` for virtual host generation
6. Add `generateDnsDirectives()` master function
7. Hook into edge tool's Caddyfile generation
8. Create Pulumi mapping
9. Write schema validation tests for all record types
10. Write curl integration tests
