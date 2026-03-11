# 15 — `cf.*` Request Fields: Header Injection for Bot, WAF, Geo, TLS, Timing, Ray ID

## Context

Workers access Cloudflare-specific request metadata via the `request.cf` object. This includes bot scores, WAF scores, geolocation, TLS info, timing data, and ray IDs. Since these fields don't exist locally, the edge tool injects them as HTTP headers that a local middleware in wrangler dev translates into the `request.cf` object.

This is the **critical glue layer** — without it, Workers code that reads `request.cf.botManagement.score` or `request.cf.country` would get `undefined` locally.

### Injection Flow

```
Client Request → Caddy (injects CF-* headers) → wrangler dev (middleware translates headers → request.cf) → Worker
```

The Caddy edge tool adds `header_up CF-*` directives for each field group. A companion wrangler dev middleware reads these headers and populates `request.cf`.

---

## Documentation Links

- `request.cf` object: https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
- Bot management fields: https://developers.cloudflare.com/bots/reference/fields/
- WAF fields: https://developers.cloudflare.com/waf/about/waf-attack-score/
- Geolocation: https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
- MaxMind GeoLite2: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data

---

## 1. Valibot Schema: `CfFieldsConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-cf-fields.ts`

```typescript
import * as v from 'valibot';

/** Geolocation configuration. */
export const GeoConfigSchema = v.strictObject({
	/** Whether to inject geo headers. Default: `true`. */
	enabled: v.optional(v.boolean(), true),
	/**
	 * Use MaxMind GeoLite2 database for real IP→geo mapping.
	 * If false, uses static defaults.
	 * Default: `false`.
	 */
	useGeoDb: v.optional(v.boolean(), false),
	/** Path to MaxMind GeoLite2 database file. */
	geoDbPath: v.optional(v.pipe(v.string(), v.minLength(1)), '.resist/geo/GeoLite2-City.mmdb'),
	/** Default country code when geo DB is not used. Default: `'US'`. */
	defaultCountry: v.optional(v.pipe(v.string(), v.minLength(2), v.maxLength(2)), 'US'),
	/** Default city. Default: `'San Francisco'`. */
	defaultCity: v.optional(v.pipe(v.string(), v.minLength(1)), 'San Francisco'),
	/** Default latitude. Default: `'37.7749'`. */
	defaultLatitude: v.optional(v.pipe(v.string(), v.minLength(1)), '37.7749'),
	/** Default longitude. Default: `'-122.4194'`. */
	defaultLongitude: v.optional(v.pipe(v.string(), v.minLength(1)), '-122.4194'),
	/** Default timezone. Default: `'America/Los_Angeles'`. */
	defaultTimezone: v.optional(v.pipe(v.string(), v.minLength(1)), 'America/Los_Angeles'),
	/** Default continent. Default: `'NA'`. */
	defaultContinent: v.optional(v.pipe(v.string(), v.minLength(2), v.maxLength(2)), 'NA'),
	/** Default ASN. Default: `13335` (Cloudflare). */
	defaultAsn: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 13335),
	/** Default isEU. Default: `false`. */
	defaultIsEu: v.optional(v.boolean(), false),
});
export type GeoConfig = v.InferOutput<typeof GeoConfigSchema>;

/** Timing simulation configuration. */
export const TimingConfigSchema = v.strictObject({
	/** Whether to inject timing headers. Default: `true`. */
	enabled: v.optional(v.boolean(), true),
	/** Simulated edge processing time (ms). Default: `1`. */
	edgeMsec: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 1),
	/** Simulated client TCP RTT (ms). Default: `5`. */
	clientTcpRttMsec: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 5),
});
export type TimingConfig = v.InferOutput<typeof TimingConfigSchema>;

/** Complete cf.* fields injection configuration. */
export const CfFieldsConfigSchema = v.strictObject({
	/** Geolocation fields. */
	geo: v.optional(GeoConfigSchema, {}),
	/** Timing fields. */
	timing: v.optional(TimingConfigSchema, {}),
	/** Inject Ray ID (`CF-RAY`). Default: `true`. */
	rayId: v.optional(v.boolean(), true),
	/** Inject TLS fields from actual Caddy connection. Default: `true`. */
	tls: v.optional(v.boolean(), true),
	/** Inject bot management fields (from bot.ts). Default: `true`. */
	botManagement: v.optional(v.boolean(), true),
	/** Inject WAF score fields (from waf.ts). Default: `true`. */
	wafScores: v.optional(v.boolean(), true),
	/** Inject client auth fields (when mTLS enabled). Default: `true`. */
	clientAuth: v.optional(v.boolean(), true),
	/** Inject LLM/AI fields. Default: `false`. */
	llmFields: v.optional(v.boolean(), false),
});
export type CfFieldsConfig = v.InferOutput<typeof CfFieldsConfigSchema>;
```

---

## 2. Caddy Header Injection Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/cf-fields.ts`

```typescript
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';
import { CfFieldsConfigSchema } from '@/schemas/core-config/src/edge-cf-fields';
import type { CfFieldsConfig } from '@/schemas/core-config/src/edge-cf-fields';

/**
 * Generate Caddy header directives for all cf.* field injection.
 *
 * Each header maps to a `request.cf` property in Workers:
 * - `CF-IPCountry` → `request.cf.country`
 * - `CF-Bot-Score` → `request.cf.botManagement.score`
 * - `CF-WAF-Score` → `request.cf.waf.score`
 * - etc.
 */
export function generateCfFieldsDirectives(
	config: CfFieldsConfig,
): Result<v.InferOutput<typeof v.string>> {
	const configResult = safeParse(CfFieldsConfigSchema, config);
	if (!configResult.ok) return configResult;
	const validConfig = configResult.data;

	const sections: Array<string> = [
		'# ==========================================================',
		'# cf.* Request Field Header Injection',
		'# ==========================================================',
		'',
	];

	// Geolocation
	if (validConfig.geo?.enabled !== false) {
		const geo = validConfig.geo ?? {};
		sections.push('# Geolocation (ip.src.country, .city, .lat, .lon, etc.)');

		if (geo.useGeoDb) {
			sections.push('# Using MaxMind GeoLite2 database for real IP→geo mapping');
			sections.push(`# DB path: ${geo.geoDbPath ?? '.resist/geo/GeoLite2-City.mmdb'}`);
			sections.push('# Note: Requires maxminddb Caddy module or external lookup');
		} else {
			sections.push(`header_up CF-IPCountry "${geo.defaultCountry ?? 'US'}"`);
			sections.push(`header_up CF-IPCity "${geo.defaultCity ?? 'San Francisco'}"`);
			sections.push(`header_up CF-IPLatitude "${geo.defaultLatitude ?? '37.7749'}"`);
			sections.push(`header_up CF-IPLongitude "${geo.defaultLongitude ?? '-122.4194'}"`);
			sections.push(`header_up CF-IPRegion "CA"`);
			sections.push(`header_up CF-IPTimezone "${geo.defaultTimezone ?? 'America/Los_Angeles'}"`);
			sections.push(`header_up CF-IPPostalCode "94102"`);
			sections.push(`header_up CF-IPContinent "${geo.defaultContinent ?? 'NA'}"`);
			sections.push(`header_up CF-IPASN "${String(geo.defaultAsn ?? 13335)}"`);
			sections.push(`header_up CF-IPIsEU "${String(geo.defaultIsEu ?? false)}"`);
		}
		sections.push('');
	}

	// Ray ID
	if (validConfig.rayId) {
		sections.push('# Ray ID (cf.ray_id)');
		sections.push('header_up CF-RAY {http.request.uuid}-DEV');
		sections.push('');
	}

	// TLS fields
	if (validConfig.tls) {
		sections.push('# TLS fields (cf.tls_version, cf.tls_cipher)');
		sections.push('header_up CF-TLS-Version {tls_version}');
		sections.push('header_up CF-TLS-Cipher {tls_cipher}');
		sections.push('');
	}

	// Timing
	if (validConfig.timing?.enabled !== false) {
		const timing = validConfig.timing ?? {};
		sections.push('# Timing fields (cf.timings.*)');
		sections.push(`header_up CF-Edge-Msec "${String(timing.edgeMsec ?? 1)}"`);
		sections.push('header_up CF-Origin-TTFB-Msec {http.reverse_proxy.upstream.latency_ms}');
		sections.push(`header_up CF-Client-TCP-RTT-Msec "${String(timing.clientTcpRttMsec ?? 5)}"`);
		sections.push('');
	}

	// Bot management fields (injected by bot.ts, referenced here for completeness)
	if (validConfig.botManagement) {
		sections.push('# Bot management fields — injected by bot.ts module');
		sections.push('# CF-Bot-Score, CF-Is-Bot, CF-Verified-Bot, CF-Verified-Bot-Category, CF-Threat-Score');
		sections.push('');
	}

	// WAF score fields (injected by waf.ts, referenced here for completeness)
	if (validConfig.wafScores) {
		sections.push('# WAF score fields — injected by waf.ts module');
		sections.push('# CF-WAF-Score, CF-WAF-Score-SQLI, CF-WAF-Score-XSS, CF-WAF-Score-RCE');
		sections.push('');
	}

	// Client auth fields (when mTLS is enabled)
	if (validConfig.clientAuth) {
		sections.push('# Client auth fields (cf.tls_client_auth.*)');
		sections.push('# Injected from actual mkcert client cert when client certs enabled');
		sections.push('header_up CF-Client-Cert-Verified {tls_client_subject}');
		sections.push('header_up CF-Client-Cert-Issuer-DN {tls_client_issuer}');
		sections.push('header_up CF-Client-Cert-Serial {tls_client_serial}');
		sections.push('header_up CF-Client-Cert-Fingerprint-SHA256 {tls_client_fingerprint}');
		sections.push('');
	}

	// LLM fields
	if (validConfig.llmFields) {
		sections.push('# LLM fields (cf.llm.prompt.*)');
		sections.push('# CF-LLM-Injection-Score — pattern-based prompt injection detection');
		sections.push('header_up CF-LLM-Injection-Score "0"');
		sections.push('');
	}

	return ok(sections.join('\n'));
}
```

---

## 3. Wrangler Dev Middleware

The companion middleware that reads `CF-*` headers and populates `request.cf`:

```typescript
/**
 * Wrangler dev middleware to translate CF-* headers → request.cf
 *
 * This runs in the wrangler dev Worker environment, intercepting
 * requests before they reach the user's Worker code.
 *
 * File: packages/shared/utils/cli/src/tools/edge/middleware/cf-fields-middleware.ts
 */

/** Header → request.cf property mapping. */
const HEADER_TO_CF_FIELD: ReadonlyArray<[string, string]> = [
	['CF-IPCountry', 'country'],
	['CF-IPCity', 'city'],
	['CF-IPLatitude', 'latitude'],
	['CF-IPLongitude', 'longitude'],
	['CF-IPRegion', 'region'],
	['CF-IPTimezone', 'timezone'],
	['CF-IPPostalCode', 'postalCode'],
	['CF-IPContinent', 'continent'],
	['CF-IPASN', 'asn'],
	['CF-IPIsEU', 'isEUCountry'],
	['CF-RAY', 'ray_id'],
	['CF-TLS-Version', 'tlsVersion'],
	['CF-TLS-Cipher', 'tlsCipher'],
	['CF-Edge-Msec', 'edgeRequestKeepAliveStatus'],
	['CF-Bot-Score', 'botManagement.score'],
	['CF-Is-Bot', 'botManagement.ja3Hash'],  // simplified mapping
	['CF-Verified-Bot', 'botManagement.verifiedBot'],
	['CF-Threat-Score', 'threatScore'],
	['CF-WAF-Score', 'waf.score'],
	['CF-WAF-Score-SQLI', 'waf.score.sqli'],
	['CF-WAF-Score-XSS', 'waf.score.xss'],
	['CF-WAF-Score-RCE', 'waf.score.rce'],
];
```

---

## 4. Mapping Table: CF Field → Header → `request.cf` Property

| CF Field | Injected Header | `request.cf` Property |
|----------|----------------|----------------------|
| `ip.src.country` | `CF-IPCountry` | `request.cf.country` |
| `ip.src.city` | `CF-IPCity` | `request.cf.city` |
| `ip.src.lat` | `CF-IPLatitude` | `request.cf.latitude` |
| `ip.src.lon` | `CF-IPLongitude` | `request.cf.longitude` |
| `ip.src.region` | `CF-IPRegion` | `request.cf.region` |
| `ip.src.timezone` | `CF-IPTimezone` | `request.cf.timezone` |
| `ip.src.postalCode` | `CF-IPPostalCode` | `request.cf.postalCode` |
| `ip.src.continent` | `CF-IPContinent` | `request.cf.continent` |
| `ip.src.asn` | `CF-IPASN` | `request.cf.asn` |
| `ip.src.isEU` | `CF-IPIsEU` | `request.cf.isEUCountry` |
| `cf.ray_id` | `CF-RAY` | (response header) |
| `cf.tls_version` | `CF-TLS-Version` | `request.cf.tlsVersion` |
| `cf.tls_cipher` | `CF-TLS-Cipher` | `request.cf.tlsCipher` |
| `cf.bot_management.score` | `CF-Bot-Score` | `request.cf.botManagement.score` |
| `cf.client.bot` | `CF-Is-Bot` | `request.cf.botManagement.ja3Hash` |
| `cf.verified_bot` | `CF-Verified-Bot` | `request.cf.botManagement.verifiedBot` |
| `cf.threat_score` | `CF-Threat-Score` | `request.cf.threatScore` |
| `cf.waf.score` | `CF-WAF-Score` | `request.cf.waf.score` |
| `cf.waf.score.sqli` | `CF-WAF-Score-SQLI` | `request.cf.waf.score.sqli` |
| `cf.waf.score.xss` | `CF-WAF-Score-XSS` | `request.cf.waf.score.xss` |
| `cf.waf.score.rce` | `CF-WAF-Score-RCE` | `request.cf.waf.score.rce` |
| `cf.timings.edge_msec` | `CF-Edge-Msec` | (timing data) |
| `cf.tls_client_auth.*` | `CF-Client-Cert-*` | `request.cf.tlsClientAuth.*` |

---

## 5. Verification Steps

```bash
pnpm tool edge &
sleep 3

# Test 1: Geo headers present
curl -s -D- "https://localhost:3000/" | grep "CF-IPCountry"
# Expected: CF-IPCountry: US

# Test 2: Ray ID header
curl -s -D- "https://localhost:3000/" | grep "CF-RAY"
# Expected: CF-RAY: {hex}-DEV

# Test 3: TLS headers
curl -s -D- "https://localhost:3000/" | grep "CF-TLS"
# Expected: CF-TLS-Version: TLSv1.3

# Test 4: Bot score header
curl -s -D- "https://localhost:3000/" | grep "CF-Bot-Score"
# Expected: CF-Bot-Score: 85 (or appropriate score)

# Test 5: Worker reads request.cf.country
# (requires wrangler dev middleware)
```

---

## 6. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-cf-fields.ts` | `CfFieldsConfigSchema`, `GeoConfigSchema`, `TimingConfigSchema` |
| `packages/shared/utils/cli/src/tools/edge/utils/cf-fields.ts` | `generateCfFieldsDirectives()` |
| `packages/shared/utils/cli/src/tools/edge/middleware/cf-fields-middleware.ts` | Wrangler dev middleware for header → `request.cf` translation |

---

## 7. Dependencies

- **02-waf.md** — WAF score headers (`CF-WAF-Score-*`)
- **04-bot-management.md** — Bot management headers (`CF-Bot-Score`, `CF-Is-Bot`, etc.)
- **01-ssl-tls.md** — Client cert headers (`CF-Client-Cert-*`)

---

## 8. Implementation Order

1. Add geo, timing, cf.* fields schemas
2. Add `CfFieldsConfigSchema`
3. Create `cf-fields.ts` with header injection generation
4. Create wrangler dev middleware for header → `request.cf` translation
5. Hook into edge tool
6. Write tests
