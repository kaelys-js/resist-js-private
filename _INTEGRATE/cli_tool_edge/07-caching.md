# 07 — Caching: Cache Rules, Tiered Cache, Cache Reserve, Purge, Cache Deception Armor

## Context

The `edge` CLI tool (`pnpm tool edge`) simulates Cloudflare's edge caching locally using Caddy. This plan covers:

1. **Cache Rules** — per-rule cache eligibility, Edge TTL, Browser TTL, Status Code TTL, Cache Key customization, Serve Stale, Strong ETags, Origin Error Pass-through, Origin Cache Control
2. **Default Cache Behavior** — which file extensions are cached, default edge TTLs by status code
3. **Tiered Cache** — memory L1 + disk L2 simulation at `.resist/cache/`
4. **Cache Reserve** — persistent disk cache at `.resist/cache-reserve/`
5. **Purge** — purge everything, by URL, by tag, by host, by prefix via CLI and HTTP endpoint
6. **Cache Deception Armor** — extension vs Content-Type mismatch detection
7. **Cache Analytics** — HIT/MISS/EXPIRED/STALE logging to `.resist/logs/cache.ndjson`

The same `CacheConfigSchema` drives both local Caddy simulation AND Pulumi Cloudflare IaC generation.

## Documentation Links

- Cloudflare Cache overview: https://developers.cloudflare.com/cache/
- Cache Rules: https://developers.cloudflare.com/cache/how-to/cache-rules/
- Cache Rule Settings (detailed): https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
- Tiered Cache: https://developers.cloudflare.com/cache/how-to/tiered-cache/
- Cache Reserve: https://developers.cloudflare.com/cache/advanced-configuration/cache-reserve/
- Purge Cache: https://developers.cloudflare.com/cache/how-to/purge-cache/
- Purge by prefix: https://developers.cloudflare.com/cache/how-to/purge-cache/purge_by_prefix/
- Purge by tag: https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-tags/
- Cache Deception Armor: https://developers.cloudflare.com/cache/cache-security/cache-deception-armor/
- Default cache behavior: https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
- Caddy cache-handler module: https://github.com/caddyserver/cache-handler
- Caddy reverse_proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy header directive: https://caddyserver.com/docs/caddyfile/directives/header
- Caddy respond directive: https://caddyserver.com/docs/caddyfile/directives/respond

---

## 1. Valibot Schema — `CacheConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-cache.ts`

```typescript
/**
 * Cache Edge Config Schema
 *
 * Defines all Cloudflare cache settings: cache rules, tiered cache,
 * Cache Reserve, purge configuration, and Cache Deception Armor.
 * Maps 1:1 to Cloudflare zone/account settings.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Primitive Schemas
// =============================================================================

/**
 * Non-negative integer for TTL values (seconds).
 * 0 means no-cache, -1 means no-store.
 */
const TtlSecondsSchema = v.pipe(v.number(), v.integer(), v.minValue(-1));

/** Positive integer for TTL values that must be > 0. */
const PositiveTtlSecondsSchema = v.pipe(v.number(), v.integer(), v.minValue(1));

/** HTTP status code (100-599). */
const HttpStatusCodeSchema = v.pipe(v.number(), v.integer(), v.minValue(100), v.maxValue(599));

/** HTTP status code range (e.g. 200-299). */
const HttpStatusCodeRangeSchema = v.strictObject({
	/** Inclusive lower bound of the status code range. */
	from: HttpStatusCodeSchema,
	/** Inclusive upper bound of the status code range. */
	to: HttpStatusCodeSchema,
});

/** Cache-Tag header value (printable ASCII, no spaces, 1-1024 chars). */
const CacheTagSchema = v.pipe(
	v.string(),
	v.minLength(1),
	v.maxLength(1024),
	v.regex(/^[\x21-\x7E]+$/),
);

// =============================================================================
// Edge TTL Schema
// =============================================================================

/**
 * Edge TTL mode — controls how long Cloudflare edge caches a response.
 *
 * - `bypass_by_default`: Use origin Cache-Control if present, bypass cache if not.
 * - `respect_origin`: Use origin Cache-Control if present, use CF defaults if not.
 * - `override_origin`: Ignore origin Cache-Control entirely, use specified TTL.
 */
const EdgeTtlModeSchema = v.picklist([
	'bypass_by_default',
	'respect_origin',
	'override_origin',
]);

/**
 * Status Code TTL entry — per-status-code edge TTL override.
 *
 * Cloudflare allows targeting:
 * - A single status code (e.g. 200)
 * - A range (e.g. 200-299, Enterprise only)
 *
 * Special TTL values:
 * - `0` = no-cache (revalidate every request)
 * - `-1` = no-store (never cache)
 */
const StatusCodeTtlEntrySchema = v.variant('type', [
	v.strictObject({
		/** Single status code target. */
		type: v.literal('single'),
		/** The HTTP status code. */
		statusCode: HttpStatusCodeSchema,
		/** TTL in seconds. 0 = no-cache, -1 = no-store. */
		ttl: TtlSecondsSchema,
	}),
	v.strictObject({
		/** Status code range target (Enterprise only). */
		type: v.literal('range'),
		/** Inclusive range of status codes. */
		range: HttpStatusCodeRangeSchema,
		/** TTL in seconds. 0 = no-cache, -1 = no-store. */
		ttl: TtlSecondsSchema,
	}),
]);

/**
 * Edge TTL configuration — controls how long content stays in Cloudflare edge cache.
 */
const EdgeTtlSchema = v.strictObject({
	/** Edge TTL mode. Default: `respect_origin`. */
	mode: v.optional(EdgeTtlModeSchema, 'respect_origin'),
	/**
	 * Default edge TTL in seconds (used when mode is `override_origin`).
	 * Cloudflare minimum: 60 seconds (Free), 30 seconds (Business/Enterprise).
	 */
	default: v.optional(PositiveTtlSecondsSchema, 14400),
	/** Per-status-code TTL overrides. */
	statusCodeTtl: v.optional(v.array(StatusCodeTtlEntrySchema), []),
});

// =============================================================================
// Browser TTL Schema
// =============================================================================

/**
 * Browser TTL mode — controls Cache-Control max-age sent to the client browser.
 *
 * - `bypass`: Do not set browser caching headers.
 * - `respect_origin`: Pass through origin's Cache-Control to the browser.
 * - `override_origin`: Replace origin's Cache-Control max-age with a custom value.
 */
const BrowserTtlModeSchema = v.picklist([
	'bypass',
	'respect_origin',
	'override_origin',
]);

/**
 * Browser TTL configuration — controls Cache-Control max-age sent to end users.
 */
const BrowserTtlSchema = v.strictObject({
	/** Browser TTL mode. Default: `respect_origin`. */
	mode: v.optional(BrowserTtlModeSchema, 'respect_origin'),
	/**
	 * Default browser TTL in seconds (used when mode is `override_origin`).
	 * Cloudflare minimum: 0 (Free), 0 (Enterprise).
	 */
	default: v.optional(PositiveTtlSecondsSchema, 14400),
});

// =============================================================================
// Cache Key Schema
// =============================================================================

/**
 * Query string inclusion mode for cache key.
 *
 * - `all`: Include all query parameters in cache key.
 * - `none`: Exclude all query parameters (ignore query string entirely).
 * - `include`: Include only the specified parameters.
 * - `exclude`: Include all except the specified parameters.
 */
const QueryStringModeSchema = v.picklist(['all', 'none', 'include', 'exclude']);

/**
 * Query string cache key configuration.
 */
const CacheKeyQueryStringSchema = v.strictObject({
	/** Query string inclusion mode. Default: `all`. */
	mode: v.optional(QueryStringModeSchema, 'all'),
	/**
	 * List of query parameter names to include or exclude
	 * (depending on mode). Ignored when mode is `all` or `none`.
	 */
	parameters: v.optional(v.array(v.string()), []),
	/**
	 * Sort query parameters alphabetically before computing cache key.
	 * Normalizes `?b=2&a=1` and `?a=1&b=2` to the same key.
	 * Default: false.
	 */
	sort: v.optional(v.boolean(), false),
});

/**
 * Header-based cache key configuration.
 *
 * Cloudflare allows including specific headers in the cache key.
 * Restricted headers (accept, accept-charset, accept-encoding,
 * accept-datetime, accept-language, referer, user-agent)
 * require `contains` matching with 1-3 explicit values.
 */
const CacheKeyHeaderSchema = v.strictObject({
	/**
	 * Headers whose values are included in cache key.
	 * Names are case-insensitive.
	 */
	include: v.optional(v.array(v.string()), []),
	/**
	 * Headers whose presence (not value) is included in cache key.
	 * Useful for feature-detection headers (e.g. `X-Requested-With`).
	 */
	checkPresence: v.optional(v.array(v.string()), []),
	/**
	 * Restricted header matching — maps a restricted header name
	 * to 1-3 values to match against. The matching value becomes
	 * part of the cache key.
	 *
	 * Restricted headers: accept, accept-charset, accept-encoding,
	 * accept-datetime, accept-language, referer, user-agent.
	 *
	 * @example
	 * ```typescript
	 * { 'accept-encoding': ['gzip', 'br'] }
	 * ```
	 */
	contains: v.optional(v.record(v.string(), v.pipe(v.array(v.string()), v.maxLength(3))), {}),
	/**
	 * Include the origin `Host` header in cache key.
	 * Default: false.
	 */
	includeOriginHeader: v.optional(v.boolean(), false),
});

/**
 * Cookie-based cache key configuration.
 */
const CacheKeyCookieSchema = v.strictObject({
	/**
	 * Cookie names whose values are included in cache key.
	 */
	include: v.optional(v.array(v.string()), []),
	/**
	 * Cookie names whose presence (not value) is included in cache key.
	 */
	checkPresence: v.optional(v.array(v.string()), []),
});

/**
 * User-level cache key segmentation.
 */
const CacheKeyUserSchema = v.strictObject({
	/**
	 * Segment cache by device type (mobile / desktop / tablet).
	 * Adds `CF-Device-Type` header value to cache key.
	 * Default: false.
	 */
	deviceType: v.optional(v.boolean(), false),
	/**
	 * Segment cache by user's country (ISO 3166-1 alpha-2).
	 * Adds `CF-IPCountry` header value to cache key.
	 * Default: false.
	 */
	geo: v.optional(v.boolean(), false),
	/**
	 * Segment cache by user's language (Accept-Language header).
	 * Default: false.
	 */
	lang: v.optional(v.boolean(), false),
});

/**
 * Host-level cache key configuration.
 */
const CacheKeyHostSchema = v.strictObject({
	/**
	 * When true, use the resolved (DNS-level) hostname in the cache key
	 * instead of the original request hostname. Matters when origin rules
	 * rewrite the DNS destination.
	 * Default: false (use original hostname).
	 */
	resolved: v.optional(v.boolean(), false),
});

/**
 * Complete cache key customization schema.
 * Controls what makes two requests "the same" for caching purposes.
 */
const CacheKeySchema = v.strictObject({
	/** Query string configuration. */
	queryString: v.optional(CacheKeyQueryStringSchema, {}),
	/** Header-based cache key. */
	header: v.optional(CacheKeyHeaderSchema, {}),
	/** Cookie-based cache key. */
	cookie: v.optional(CacheKeyCookieSchema, {}),
	/** User segmentation. */
	user: v.optional(CacheKeyUserSchema, {}),
	/** Host configuration. */
	host: v.optional(CacheKeyHostSchema, {}),
	/**
	 * Enable Cache Deception Armor.
	 * Verifies URL extension matches response Content-Type.
	 * Default: false.
	 */
	cacheDeceptionArmor: v.optional(v.boolean(), false),
});

// =============================================================================
// Cache Rule Schema
// =============================================================================

/**
 * Cache eligibility mode.
 *
 * - `eligible`: Cloudflare attempts to cache matching requests.
 * - `bypass`: Matching requests skip the cache entirely.
 */
const CacheEligibilitySchema = v.picklist(['eligible', 'bypass']);

/**
 * A single cache rule — filter expression + cache settings.
 *
 * Rules are evaluated in order; the first matching rule wins.
 * Maximum rules per plan: Free=10, Pro=25, Business=50, Enterprise=300.
 */
const CacheRuleSchema = v.strictObject({
	/** Human-readable rule name. */
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
	/**
	 * Whether this rule is enabled.
	 * Default: true.
	 */
	enabled: v.optional(v.boolean(), true),
	/**
	 * Filter expression matching incoming requests.
	 * Uses Cloudflare Rules Language syntax.
	 *
	 * @example
	 * ```
	 * (http.request.uri.path wildcard "/api/*")
	 * (http.host eq "example.com" and http.request.uri.path contains "/static/")
	 * ```
	 */
	expression: v.pipe(v.string(), v.minLength(1)),
	/**
	 * Cache eligibility — whether matching requests are cached or bypassed.
	 * Default: `eligible`.
	 */
	eligibility: v.optional(CacheEligibilitySchema, 'eligible'),

	// ---- Settings below only apply when eligibility = 'eligible' ----

	/** Edge TTL configuration. */
	edgeTtl: v.optional(EdgeTtlSchema, {}),
	/** Browser TTL configuration. */
	browserTtl: v.optional(BrowserTtlSchema, {}),
	/** Cache key customization. */
	cacheKey: v.optional(CacheKeySchema, {}),
	/**
	 * Serve stale content while revalidating with origin.
	 *
	 * When `disableStaleWhileRevalidating` is false (default), Cloudflare
	 * serves stale content to the client while fetching a fresh copy from origin.
	 * When true, the client waits for the fresh origin response.
	 *
	 * Default: false (serve stale during revalidation).
	 */
	disableStaleWhileRevalidating: v.optional(v.boolean(), false),
	/**
	 * Respect strong ETags from origin for byte-for-byte validation.
	 * When false, Cloudflare converts strong ETags to weak ETags.
	 * Default: false.
	 */
	respectStrongEtags: v.optional(v.boolean(), false),
	/**
	 * Pass through origin error pages (5xx) instead of showing
	 * Cloudflare-generated error pages.
	 * Default: false.
	 */
	originErrorPagePassthrough: v.optional(v.boolean(), false),
	/**
	 * Respect origin Cache-Control headers strictly (RFC 7234).
	 * On Free/Pro/Business plans this is always enabled.
	 * Enterprise can toggle it off to have Cloudflare use its own defaults.
	 * Default: true.
	 */
	originCacheControl: v.optional(v.boolean(), true),
	/**
	 * Additional cacheable ports beyond 80/443 (Enterprise only).
	 * Standard ports are always cached.
	 *
	 * @example [8443, 8080]
	 */
	additionalCacheablePorts: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535))), []),
	/**
	 * Cache Reserve eligibility override for this rule.
	 * When null, inherits from zone-level Cache Reserve settings.
	 */
	cacheReserve: v.optional(
		v.nullable(
			v.strictObject({
				/** Whether content matching this rule is eligible for Cache Reserve. */
				eligible: v.boolean(),
				/** Minimum file size in bytes for Cache Reserve storage. Default: 0. */
				minimumFileSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 0),
			}),
		),
		null,
	),
});

// =============================================================================
// Tiered Cache Schema
// =============================================================================

/**
 * Tiered cache topology type.
 *
 * Cloudflare divides its network into lower-tiers (closest to visitors)
 * and upper-tiers. On a lower-tier cache miss, the request goes to an
 * upper-tier before hitting the origin, reducing origin load.
 *
 * - `smart`: Dynamically picks the closest upper-tier per origin (all plans).
 * - `generic_global`: All CF data centers act as potential upper-tiers (Enterprise).
 * - `regional`: Adds intermediate regional hub between lower and upper tiers (Enterprise).
 * - `off`: Disabled.
 *
 * Local simulation:
 * - L1 = in-memory (Caddy's default internal cache)
 * - L2 = disk at `.resist/cache/`
 */
const TieredCacheTopologySchema = v.picklist([
	'smart',
	'generic_global',
	'regional',
	'off',
]);

/**
 * Tiered cache configuration.
 */
const TieredCacheSchema = v.strictObject({
	/**
	 * Enable tiered caching.
	 * Default: true (Cloudflare enables Smart Tiered Caching by default on all plans).
	 */
	enabled: v.optional(v.boolean(), true),
	/**
	 * Tiered cache topology.
	 * Default: `smart`.
	 */
	topology: v.optional(TieredCacheTopologySchema, 'smart'),
	/**
	 * Enable regional tiered caching (adds intermediate regional hub).
	 * Only effective when topology is `smart` or `generic_global`.
	 * Enterprise only.
	 * Default: false.
	 */
	regional: v.optional(v.boolean(), false),
	/**
	 * Local simulation: maximum L1 (memory) cache size in megabytes.
	 * Default: 256 MB.
	 */
	localL1MaxSizeMb: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 256),
	/**
	 * Local simulation: maximum L2 (disk) cache size in megabytes.
	 * Stored at `.resist/cache/`.
	 * Default: 1024 MB (1 GB).
	 */
	localL2MaxSizeMb: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1024),
});

// =============================================================================
// Cache Reserve Schema
// =============================================================================

/**
 * Cache Reserve configuration.
 *
 * Cache Reserve is persistent large-scale storage (backed by R2 in production)
 * that extends cache lifetimes for less-popular content.
 *
 * Eligibility requirements:
 * - Content must have a freshness TTL of at least 10 hours.
 * - Response must include a Content-Length header.
 *
 * Local simulation: disk cache at `.resist/cache-reserve/`.
 */
const CacheReserveSchema = v.strictObject({
	/**
	 * Enable Cache Reserve.
	 * Default: false.
	 */
	enabled: v.optional(v.boolean(), false),
	/**
	 * Default minimum file size in bytes for Cache Reserve eligibility.
	 * Files smaller than this threshold are not stored in Cache Reserve.
	 * Default: 0 (no minimum).
	 */
	minimumFileSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 0),
	/**
	 * Minimum freshness TTL in seconds for Cache Reserve eligibility.
	 * Cloudflare requires at least 36000 seconds (10 hours).
	 * Default: 36000.
	 */
	minimumFreshnessTtl: v.optional(v.pipe(v.number(), v.integer(), v.minValue(36000)), 36000),
	/**
	 * Local simulation: maximum Cache Reserve disk size in megabytes.
	 * Stored at `.resist/cache-reserve/`.
	 * Default: 2048 MB (2 GB).
	 */
	localMaxSizeMb: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 2048),
	/**
	 * Local simulation: retention period in seconds.
	 * Cloudflare default: 30 days. Items not accessed within this
	 * period are evicted.
	 * Default: 2592000 (30 days).
	 */
	localRetentionSeconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 2592000),
});

// =============================================================================
// Purge Schema
// =============================================================================

/**
 * Purge configuration for cache invalidation.
 *
 * Production API endpoint: POST /zones/{zone_id}/purge_cache
 * Local simulation: CLI command + `/__purge` HTTP endpoint.
 */
const PurgeConfigSchema = v.strictObject({
	/**
	 * Enable the local `/__purge` HTTP endpoint on the edge proxy.
	 * Accepts POST requests to purge local cache.
	 * Default: true.
	 */
	enableEndpoint: v.optional(v.boolean(), true),
	/**
	 * Path for the local purge endpoint.
	 * Default: `/__purge`.
	 */
	endpointPath: v.optional(v.pipe(v.string(), v.startsWith('/')), '/__purge'),
	/**
	 * Restrict purge endpoint access to these IP addresses.
	 * Empty array means allow all (local dev only).
	 * Default: [] (allow all).
	 */
	allowedIps: v.optional(v.array(v.string()), []),
});

// =============================================================================
// Cache Deception Armor Schema
// =============================================================================

/**
 * Cache Deception Armor configuration.
 *
 * Protects against Web Cache Deception attacks by verifying that a URL's
 * file extension matches the response Content-Type. If they don't match,
 * the response is NOT cached.
 *
 * Exceptions:
 * - `application/octet-stream` Content-Type is always exempt (download signal).
 * - Benign cross-format pairs are allowed (e.g. `.jpg` → `image/webp`).
 *
 * WARNING: A Cache-Control header from origin or an Edge Cache TTL rule
 * can override this protection.
 */
const CacheDeceptionArmorSchema = v.strictObject({
	/**
	 * Enable Cache Deception Armor globally.
	 * Can also be toggled per-rule via `cacheKey.cacheDeceptionArmor`.
	 * Default: false.
	 */
	enabled: v.optional(v.boolean(), false),
	/**
	 * Additional extension-to-Content-Type mappings considered "benign"
	 * (will NOT trigger deception armor block).
	 *
	 * Built-in benign mappings include:
	 * - `.jpg` → `image/webp`
	 * - `.gif` → `video/webm`
	 * - `.png` → `image/webp`
	 *
	 * @example
	 * ```typescript
	 * { '.svg': ['image/svg+xml', 'application/xml'] }
	 * ```
	 */
	additionalBenignMappings: v.optional(v.record(v.string(), v.array(v.string())), {}),
});

// =============================================================================
// Cache Analytics Schema
// =============================================================================

/**
 * Cache analytics configuration — logging for cache events.
 */
const CacheAnalyticsSchema = v.strictObject({
	/**
	 * Enable cache analytics logging.
	 * Logs HIT/MISS/EXPIRED/STALE/BYPASS/DYNAMIC per request.
	 * Written to `.resist/logs/cache.ndjson`.
	 * Default: true.
	 */
	enabled: v.optional(v.boolean(), true),
	/**
	 * Include request/response headers in log entries.
	 * Useful for debugging Cache-Control and Vary issues.
	 * Default: false.
	 */
	includeHeaders: v.optional(v.boolean(), false),
	/**
	 * Maximum log file size in megabytes before rotation.
	 * Default: 50 MB.
	 */
	maxFileSizeMb: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 50),
	/**
	 * Number of rotated log files to keep.
	 * Default: 3.
	 */
	maxFiles: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 3),
});

// =============================================================================
// Default Cache Behavior Schema
// =============================================================================

/**
 * Default cache behavior configuration.
 *
 * Cloudflare caches responses by file extension (not MIME type).
 * HTML and JSON are NOT cached by default. `robots.txt` IS cached.
 */
const DefaultCacheBehaviorSchema = v.strictObject({
	/**
	 * File extensions to cache by default (case-insensitive, without leading dot).
	 * These are checked against the URL path extension.
	 *
	 * Default: Cloudflare's full default set.
	 */
	cachedExtensions: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), [
		'7z', 'apk', 'avi', 'avif', 'bin', 'bmp', 'bz2',
		'class', 'css', 'csv',
		'dmg', 'doc', 'docx',
		'ejs', 'eot', 'eps', 'exe',
		'flac',
		'gif', 'gz',
		'ico',
		'jar', 'jpg', 'jpeg', 'js',
		'mid', 'midi', 'mkv', 'mp3', 'mp4',
		'ogg', 'otf',
		'pdf', 'pict', 'pls', 'png', 'ppt', 'pptx', 'ps',
		'rar',
		'svg', 'svgz', 'swf',
		'tar', 'tif', 'tiff', 'ttf',
		'webm', 'webp', 'woff', 'woff2',
		'xls', 'xlsx',
		'zip', 'zst',
	]),
	/**
	 * Additional file extensions to cache beyond the defaults.
	 * Appended to `cachedExtensions`.
	 * Default: [].
	 */
	additionalExtensions: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
	/**
	 * Default edge TTLs by status code when no Cache-Control header is present.
	 *
	 * Cloudflare defaults:
	 * - 200, 206, 301: 120 minutes (7200s)
	 * - 302, 303: 20 minutes (1200s)
	 * - 404, 410: 3 minutes (180s)
	 * - All others: not cached
	 */
	defaultEdgeTtlByStatus: v.optional(
		v.record(v.string(), TtlSecondsSchema),
		{
			'200': 7200,
			'206': 7200,
			'301': 7200,
			'302': 1200,
			'303': 1200,
			'404': 180,
			'410': 180,
		},
	),
	/**
	 * Maximum cacheable response body size in bytes.
	 * Cloudflare: 512 MB (Free/Pro/Business), 5 GB (Enterprise).
	 * Local simulation default: 512 MB.
	 */
	maxCacheableBodySize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 536870912),
	/**
	 * Do NOT cache responses with these Cache-Control directives present.
	 * Cloudflare skips caching when: private, no-store, no-cache, max-age=0.
	 * Also skips when Set-Cookie header is present or method is not GET.
	 *
	 * This array controls which Cache-Control directives trigger bypass.
	 * Default: Cloudflare's standard set.
	 */
	bypassCacheControlDirectives: v.optional(v.array(v.string()), [
		'private',
		'no-store',
		'no-cache',
		'max-age=0',
	]),
});

// =============================================================================
// Root Cache Config Schema
// =============================================================================

/**
 * Complete cache configuration schema.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CacheConfigSchema } from '@/schemas/core-config/edge-cache';
 *
 * const result = safeParse(CacheConfigSchema, {
 *   enabled: true,
 *   rules: [{
 *     name: 'Cache static assets',
 *     expression: '(http.request.uri.path.extension in {"css" "js" "png" "jpg"})',
 *     eligibility: 'eligible',
 *     edgeTtl: { mode: 'override_origin', default: 86400 },
 *     browserTtl: { mode: 'override_origin', default: 3600 },
 *   }],
 *   tieredCache: { enabled: true, topology: 'smart' },
 * });
 * if (!result.ok) return result;
 * ```
 */
export const CacheConfigSchema = v.strictObject({
	/**
	 * Enable cache simulation.
	 * When false, no caching is performed — all responses pass through.
	 * Default: false.
	 */
	enabled: v.optional(v.boolean(), false),
	/** Default cache behavior (extensions, TTLs, limits). */
	defaults: v.optional(DefaultCacheBehaviorSchema, {}),
	/**
	 * Ordered cache rules. Evaluated top-to-bottom; first match wins.
	 * Maximum rules: Free=10, Pro=25, Business=50, Enterprise=300.
	 * Default: [] (use only default cache behavior).
	 */
	rules: v.optional(v.array(CacheRuleSchema), []),
	/** Tiered cache configuration. */
	tieredCache: v.optional(TieredCacheSchema, {}),
	/** Cache Reserve (persistent storage) configuration. */
	cacheReserve: v.optional(CacheReserveSchema, {}),
	/** Purge configuration (local endpoint + CLI). */
	purge: v.optional(PurgeConfigSchema, {}),
	/** Cache Deception Armor configuration. */
	cacheDeceptionArmor: v.optional(CacheDeceptionArmorSchema, {}),
	/** Cache analytics logging. */
	analytics: v.optional(CacheAnalyticsSchema, {}),
});

/** Inferred output type of {@link CacheConfigSchema}. */
export type CacheConfig = v.InferOutput<typeof CacheConfigSchema>;

/** Inferred output type of {@link CacheRuleSchema}. */
export type CacheRule = v.InferOutput<typeof CacheRuleSchema>;

/** Inferred output type of {@link CacheKeySchema}. */
export type CacheKey = v.InferOutput<typeof CacheKeySchema>;

/** Inferred output type of {@link TieredCacheSchema}. */
export type TieredCacheConfig = v.InferOutput<typeof TieredCacheSchema>;

/** Inferred output type of {@link CacheReserveSchema}. */
export type CacheReserveConfig = v.InferOutput<typeof CacheReserveSchema>;

/** Inferred output type of {@link PurgeConfigSchema}. */
export type PurgeConfig = v.InferOutput<typeof PurgeConfigSchema>;
```

---

## 2. Cache Rule to Caddy Cache-Control Header Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/cache.ts`

This file generates Caddy directives that simulate Cloudflare cache behavior. Caddy does not have a built-in CDN cache, so the strategy is:

1. **Default caching**: Caddy acts as a reverse proxy and manipulates `Cache-Control` headers to simulate CF edge + browser TTL behavior.
2. **With `cache-handler` module** (from xcaddy build): actual L1/L2 caching is performed.

### Core function signature

```typescript
/**
 * Generates Caddy directives for cache simulation based on the
 * resolved cache configuration.
 *
 * @param config - Validated CacheConfig (output of CacheConfigSchema).
 * @returns Caddy directive block string, or Err on generation failure.
 */
export function generateCacheCaddyDirectives(config: CacheConfig): Result<Str> {
	if (!config.enabled) {
		return okUnchecked('' as Str);
	}

	const sections: Array<Str> = [];

	// 1. Default cache behavior matcher
	const defaultsResult: Result<Str> = generateDefaultCacheDirectives(config.defaults);
	if (!defaultsResult.ok) return defaultsResult;
	sections.push(defaultsResult.data);

	// 2. Cache rules (ordered, first match wins)
	for (const rule of config.rules) {
		const ruleResult: Result<Str> = generateCacheRuleDirectives(rule);
		if (!ruleResult.ok) return ruleResult;
		sections.push(ruleResult.data);
	}

	// 3. Cache Deception Armor
	if (config.cacheDeceptionArmor.enabled) {
		const armorResult: Result<Str> = generateDeceptionArmorDirectives(config.cacheDeceptionArmor);
		if (!armorResult.ok) return armorResult;
		sections.push(armorResult.data);
	}

	// 4. Purge endpoint
	if (config.purge.enableEndpoint) {
		const purgeResult: Result<Str> = generatePurgeEndpointDirectives(config.purge);
		if (!purgeResult.ok) return purgeResult;
		sections.push(purgeResult.data);
	}

	// 5. Cache analytics logging
	if (config.analytics.enabled) {
		const analyticsResult: Result<Str> = generateCacheAnalyticsDirectives(config.analytics);
		if (!analyticsResult.ok) return analyticsResult;
		sections.push(analyticsResult.data);
	}

	return okUnchecked(sections.join('\n\n') as Str);
}
```

### Default cache behavior (extension matching)

```typescript
/**
 * Generates Caddy matchers and header directives for default cache behavior.
 * Matches requests by file extension and applies default TTLs.
 *
 * @param defaults - Default cache behavior config.
 * @returns Caddy directive string.
 */
function generateDefaultCacheDirectives(defaults: DefaultCacheBehavior): Result<Str> {
	const allExtensions: Array<Str> = [
		...defaults.cachedExtensions,
		...defaults.additionalExtensions,
	] as Array<Str>;

	// Named matcher for cacheable file extensions
	// @cacheable_ext path *.css *.js *.png ...
	const extensionList: Str = allExtensions
		.map((ext: Str) => `*.${ext}` as Str)
		.join(' ') as Str;

	const directives: Str = `# Default cache behavior — extension-based caching
@cacheable_ext {
	path_regexp ext \\.(${allExtensions.join('|')})$
}

# Apply default Cache-Control for matched extensions (only if origin doesn't set one)
header @cacheable_ext ?Cache-Control "public, max-age=7200"

# Inject CF-Cache-Status header for cache analytics
header @cacheable_ext CF-Cache-Status "HIT"

# Non-cacheable: strip any accidental caching on dynamic content
@not_cacheable_ext {
	not path_regexp \\.(${allExtensions.join('|')})$
}
header @not_cacheable_ext CF-Cache-Status "DYNAMIC"` as Str;

	return okUnchecked(directives);
}
```

### Per-rule directives

```typescript
/**
 * Generates Caddy directives for a single cache rule.
 *
 * Translates the Cloudflare rules language expression to a Caddy named matcher,
 * then applies Edge TTL (via cache-handler or Cache-Control manipulation),
 * Browser TTL (via Cache-Control max-age), and Vary headers for cache key.
 *
 * @param rule - A single validated CacheRule.
 * @returns Caddy directive block.
 */
function generateCacheRuleDirectives(rule: CacheRule): Result<Str> {
	if (!rule.enabled) {
		return okUnchecked('' as Str);
	}

	const matcherName: Str = `cache_rule_${sanitizeName(rule.name)}` as Str;
	const lines: Array<Str> = [];

	// Step 1: Generate named matcher from expression
	const matcherResult: Result<Str> = expressionToCaddyMatcher(rule.expression, matcherName);
	if (!matcherResult.ok) return matcherResult;
	lines.push(matcherResult.data);

	if (rule.eligibility === 'bypass') {
		// Bypass cache: strip caching headers, set CF-Cache-Status: BYPASS
		lines.push(`header @${matcherName} Cache-Control "no-store, no-cache"` as Str);
		lines.push(`header @${matcherName} CF-Cache-Status "BYPASS"` as Str);
		return okUnchecked(lines.join('\n') as Str);
	}

	// Step 2: Edge TTL → Cache-Control s-maxage (simulates edge retention)
	const edgeTtlResult: Result<Str> = generateEdgeTtlDirectives(rule.edgeTtl, matcherName);
	if (!edgeTtlResult.ok) return edgeTtlResult;
	lines.push(edgeTtlResult.data);

	// Step 3: Browser TTL → Cache-Control max-age
	const browserTtlResult: Result<Str> = generateBrowserTtlDirectives(rule.browserTtl, matcherName);
	if (!browserTtlResult.ok) return browserTtlResult;
	lines.push(browserTtlResult.data);

	// Step 4: Cache key → Vary header
	const varyResult: Result<Str> = generateVaryDirectives(rule.cacheKey, matcherName);
	if (!varyResult.ok) return varyResult;
	lines.push(varyResult.data);

	// Step 5: Serve stale / strong ETags / origin error pass-through
	const miscResult: Result<Str> = generateMiscCacheDirectives(rule, matcherName);
	if (!miscResult.ok) return miscResult;
	lines.push(miscResult.data);

	return okUnchecked(lines.filter((l: Str) => l.length > 0).join('\n') as Str);
}
```

### Edge TTL directives

```typescript
/**
 * Generates Caddy directives for edge TTL simulation.
 *
 * Edge TTL in production controls how long CF edge servers cache content.
 * Locally, we simulate this with the cache-handler module's TTL settings
 * or by manipulating CDN-Cache-Control / s-maxage headers.
 *
 * @param edgeTtl - Edge TTL configuration.
 * @param matcherName - Caddy named matcher to scope the directive.
 * @returns Caddy directive block.
 */
function generateEdgeTtlDirectives(edgeTtl: EdgeTtl, matcherName: Str): Result<Str> {
	const lines: Array<Str> = [];

	switch (edgeTtl.mode) {
		case 'bypass_by_default':
			// Use origin Cache-Control if present; if not, do not cache
			// No action needed — Caddy respects origin headers by default
			lines.push(`# Edge TTL: bypass_by_default — respect origin or skip` as Str);
			break;

		case 'respect_origin':
			// Use origin Cache-Control if present; if not, use CF defaults
			// Caddy: set s-maxage only if origin doesn't provide Cache-Control
			lines.push(`header @${matcherName} ?CDN-Cache-Control "s-maxage=${edgeTtl.default}"` as Str);
			break;

		case 'override_origin':
			// Ignore origin Cache-Control entirely, use specified TTL
			// Force s-maxage regardless of origin
			lines.push(`header @${matcherName} CDN-Cache-Control "s-maxage=${edgeTtl.default}"` as Str);
			break;
	}

	// Status-code-specific TTLs handled in the response handler (see Section 2.1)

	return okUnchecked(lines.join('\n') as Str);
}
```

### Browser TTL directives

```typescript
/**
 * Generates Caddy directives for browser TTL simulation.
 *
 * Controls the Cache-Control max-age sent to the end-user browser.
 *
 * @param browserTtl - Browser TTL configuration.
 * @param matcherName - Caddy named matcher.
 * @returns Caddy directive block.
 */
function generateBrowserTtlDirectives(browserTtl: BrowserTtl, matcherName: Str): Result<Str> {
	const lines: Array<Str> = [];

	switch (browserTtl.mode) {
		case 'bypass':
			// Do not send browser caching headers
			lines.push(`header @${matcherName} -Cache-Control` as Str);
			lines.push(`header @${matcherName} Cache-Control "no-cache, no-store"` as Str);
			break;

		case 'respect_origin':
			// Pass through origin Cache-Control to browser (no modification)
			lines.push(`# Browser TTL: respect_origin — pass-through` as Str);
			break;

		case 'override_origin':
			// Replace max-age in Cache-Control
			lines.push(`header @${matcherName} Cache-Control "public, max-age=${browserTtl.default}"` as Str);
			break;
	}

	return okUnchecked(lines.join('\n') as Str);
}
```

---

## 3. Cache Key to Vary Header Generation

### Mapping strategy

Cloudflare cache keys are internal identifiers. Locally, we simulate cache key variation using the HTTP `Vary` header, which tells the cache-handler to store separate versions per header value.

| Cache Key Setting | Vary Header Mapping | Local Implementation |
|---|---|---|
| `user.deviceType` | `Vary: CF-Device-Type` | Inject `CF-Device-Type` request header from User-Agent parsing |
| `user.geo` | `Vary: CF-IPCountry` | Inject `CF-IPCountry: XX` (fixed for local dev) |
| `user.lang` | `Vary: Accept-Language` | Already present from browser |
| `header.include` | `Vary: <header-name>` | Direct mapping |
| `header.checkPresence` | `Vary: X-Has-<header-name>` | Inject presence marker header |
| `cookie.include` | `Vary: X-Cache-Cookie-<name>` | Extract cookie value into request header |
| `cookie.checkPresence` | `Vary: X-Cache-Cookie-Presence-<name>` | Inject presence marker |
| `queryString.sort` | (handled by URL normalization) | Sort query params before proxy pass |
| `queryString.mode=include/exclude` | (handled by URL rewrite) | Strip excluded params before proxy pass |
| `host.resolved` | `Vary: X-Resolved-Host` | Inject resolved hostname |

### Implementation

```typescript
/**
 * Generates Caddy Vary header directives to simulate cache key segmentation.
 *
 * Cloudflare uses internal cache keys. Locally, we translate cache key
 * dimensions into Vary headers so the cache-handler stores separate
 * versions per key dimension.
 *
 * @param cacheKey - Cache key configuration.
 * @param matcherName - Caddy named matcher.
 * @returns Caddy directive block for Vary header manipulation.
 */
function generateVaryDirectives(cacheKey: CacheKey, matcherName: Str): Result<Str> {
	const varyValues: Array<Str> = [];
	const requestHeaderInjections: Array<Str> = [];

	// Device type segmentation
	if (cacheKey.user.deviceType) {
		varyValues.push('CF-Device-Type' as Str);
		// Inject CF-Device-Type based on User-Agent (see cf-fields injection plan 15)
	}

	// Geo segmentation
	if (cacheKey.user.geo) {
		varyValues.push('CF-IPCountry' as Str);
		// CF-IPCountry already injected by cf-fields module
	}

	// Language segmentation
	if (cacheKey.user.lang) {
		varyValues.push('Accept-Language' as Str);
	}

	// Explicit headers
	for (const header of cacheKey.header.include) {
		varyValues.push(header as Str);
	}

	// Header presence checks
	for (const header of cacheKey.header.checkPresence) {
		varyValues.push(`X-Has-${header}` as Str);
		requestHeaderInjections.push(
			`request_header @${matcherName} X-Has-${header} "present"` as Str,
		);
	}

	// Cookie value inclusion (extract to request header for Vary)
	for (const cookieName of cacheKey.cookie.include) {
		const headerName: Str = `X-Cache-Cookie-${cookieName}` as Str;
		varyValues.push(headerName);
		// Cookie extraction handled by Caddy's `map` directive or custom handler
	}

	// Cookie presence checks
	for (const cookieName of cacheKey.cookie.checkPresence) {
		const headerName: Str = `X-Cache-Cookie-Presence-${cookieName}` as Str;
		varyValues.push(headerName);
	}

	const lines: Array<Str> = [];

	// Add request header injections (for presence checks)
	lines.push(...requestHeaderInjections);

	// Add Vary header
	if (varyValues.length > 0) {
		lines.push(`header @${matcherName} +Vary "${varyValues.join(', ')}"` as Str);
	}

	// Query string sorting (via rewrite before proxy pass)
	if (cacheKey.queryString.sort) {
		lines.push(`# Query string sorting: normalize ?b=2&a=1 to ?a=1&b=2` as Str);
		lines.push(`rewrite @${matcherName} {re.sort_query_string}` as Str);
	}

	return okUnchecked(lines.join('\n') as Str);
}
```

### Query string handling

```typescript
/**
 * Generates Caddy `uri` directive to manipulate query strings
 * for cache key simulation.
 *
 * - mode=none: Strip all query parameters.
 * - mode=include: Keep only listed parameters.
 * - mode=exclude: Remove listed parameters.
 * - mode=all: No modification (default).
 * - sort=true: Sort parameters alphabetically.
 *
 * @param queryConfig - Query string cache key config.
 * @param matcherName - Caddy named matcher.
 * @returns Caddy directive for query string manipulation.
 */
function generateQueryStringDirectives(
	queryConfig: CacheKeyQueryString,
	matcherName: Str,
): Result<Str> {
	const lines: Array<Str> = [];

	switch (queryConfig.mode) {
		case 'all':
			// No modification
			break;

		case 'none':
			// Strip all query parameters
			lines.push(`uri @${matcherName} query -` as Str);
			break;

		case 'include':
			// Keep only specified parameters — handled by custom Caddy handler
			// or route through a CEL expression that strips unmatched params
			lines.push(`# Query key include: keep only [${queryConfig.parameters.join(', ')}]` as Str);
			break;

		case 'exclude':
			// Remove specified parameters
			for (const param of queryConfig.parameters) {
				lines.push(`uri @${matcherName} query -${param}` as Str);
			}
			break;
	}

	return okUnchecked(lines.join('\n') as Str);
}
```

---

## 4. Tiered Cache — Caddy `cache-handler` Configuration

### Architecture

Local tiered cache simulation uses the `caddyserver/cache-handler` module (Souin HTTP cache):

| CF Tier | Local Simulation | Implementation |
|---|---|---|
| Lower-tier (edge) | L1: in-memory | cache-handler `badger` provider |
| Upper-tier | L2: disk | cache-handler `badger` with disk storage at `.resist/cache/` |
| Cache Reserve | L3: separate disk | Separate disk store at `.resist/cache-reserve/` |

### xcaddy build addition

The custom Caddy binary (from 00-foundation) must include the cache-handler module:

```diff
# mise.toml build-caddy task
xcaddy build v{{versions.systemTools.caddy}} \
  --with github.com/corazawaf/coraza-caddy/v2 \
  --with github.com/mholt/caddy-ratelimit \
+ --with github.com/caddyserver/cache-handler \
  --output .resist/bin/caddy-edge
```

### Caddy JSON config generation for cache-handler

The cache-handler uses Caddy's JSON config, not Caddyfile directives. We generate a JSON block that is injected into the Caddyfile via the `cache` global option:

```typescript
/**
 * Generates the cache-handler configuration block for tiered cache simulation.
 *
 * @param tieredCache - Tiered cache configuration.
 * @param cacheReserve - Cache Reserve configuration.
 * @returns Caddyfile `cache` directive block.
 */
function generateTieredCacheDirectives(
	tieredCache: TieredCacheConfig,
	cacheReserve: CacheReserveConfig,
): Result<Str> {
	if (!tieredCache.enabled) {
		return okUnchecked('' as Str);
	}

	// cache-handler Caddyfile directive
	const cacheDirective: Str = `{
	# Tiered cache simulation via cache-handler (Souin)
	order cache before rewrite
	cache {
		# L1: in-memory (simulates lower-tier edge)
		badger {
			path .resist/cache/l1
		}
		# L2: disk (simulates upper-tier)
		badger {
			path .resist/cache/l2
		}
		ttl ${tieredCache.localL1MaxSizeMb > 0 ? '7200s' : '0s'}
		stale ${tieredCache.localL1MaxSizeMb > 0 ? '3600s' : '0s'}
		# Maximum body size to cache
		max_cacheable_body_bytes 536870912
	}
}` as Str;

	return okUnchecked(cacheDirective);
}
```

### Response header injection for tiered cache status

```typescript
/**
 * Generates Caddy header directives to inject CF-Cache-Status
 * based on whether the response was served from L1, L2, or origin.
 *
 * The cache-handler sets `Cache-Status` header with cache provider info.
 * We translate this to `CF-Cache-Status` for Cloudflare compatibility.
 *
 * @returns Caddy header directive block.
 */
function generateCacheStatusHeaderDirectives(): Result<Str> {
	const directives: Str = `# Translate cache-handler status to CF-Cache-Status
@cache_hit header Cache-Status "Souin; hit"
header @cache_hit CF-Cache-Status "HIT"
header @cache_hit -Cache-Status

@cache_miss header Cache-Status "Souin; fwd=miss"
header @cache_miss CF-Cache-Status "MISS"
header @cache_miss -Cache-Status

@cache_stale header Cache-Status "Souin; fwd=stale"
header @cache_stale CF-Cache-Status "EXPIRED"
header @cache_stale -Cache-Status` as Str;

	return okUnchecked(directives);
}
```

---

## 5. Cache Reserve — Disk Cache Configuration

### Local simulation strategy

Cache Reserve in production is backed by R2. Locally, we simulate it with a separate disk-backed cache at `.resist/cache-reserve/`. Content is eligible for Cache Reserve if:

1. The response has a freshness TTL of at least `minimumFreshnessTtl` (default: 10 hours / 36000s).
2. The response includes a `Content-Length` header.
3. The body size is at least `minimumFileSize` bytes.

### Implementation

```typescript
/**
 * Generates Caddy directives for Cache Reserve simulation.
 *
 * Cache Reserve is a persistent store for content with long TTLs.
 * Locally, we simulate it with a separate disk cache path.
 * Content is promoted from L2 to Cache Reserve when its TTL
 * exceeds the configured minimum freshness threshold.
 *
 * @param cacheReserve - Cache Reserve configuration.
 * @returns Caddy directive block for Cache Reserve, or empty string if disabled.
 */
function generateCacheReserveDirectives(cacheReserve: CacheReserveConfig): Result<Str> {
	if (!cacheReserve.enabled) {
		return okUnchecked('' as Str);
	}

	// Cache Reserve is implemented as an additional cache-handler storer
	// with a longer TTL and separate disk path
	const directives: Str = `# Cache Reserve simulation (persistent storage)
# Content with TTL >= ${cacheReserve.minimumFreshnessTtl}s is stored here
# Separate from tiered cache, survives cache purge of L1/L2
# Storage path: .resist/cache-reserve/
# Retention: ${cacheReserve.localRetentionSeconds}s
# Min file size: ${cacheReserve.minimumFileSize} bytes` as Str;

	return okUnchecked(directives);
}
```

### Cache Reserve promotion logic

Cache Reserve promotion happens in a response handler that checks eligibility:

```typescript
/**
 * Determines whether a response is eligible for Cache Reserve storage.
 *
 * @param responseHeaders - Map of response headers.
 * @param config - Cache Reserve configuration.
 * @returns Ok(true) if eligible, Ok(false) if not, Err on parse failure.
 */
function isCacheReserveEligible(
	responseHeaders: Map<Str, Str>,
	config: CacheReserveConfig,
): Result<Bool> {
	// 1. Must have Content-Length header
	const contentLength: Str | undefined = responseHeaders.get('Content-Length' as Str);
	if (contentLength === undefined) {
		return okUnchecked(false as Bool);
	}

	// 2. Content-Length must be >= minimumFileSize
	const sizeResult: Result<NonNegativeInteger> = safeParse(
		v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(0)),
		contentLength,
	);
	if (!sizeResult.ok) return okUnchecked(false as Bool);
	if (sizeResult.data < config.minimumFileSize) {
		return okUnchecked(false as Bool);
	}

	// 3. TTL must be >= minimumFreshnessTtl
	const ttl: Result<NonNegativeInteger> = parseTtlFromHeaders(responseHeaders);
	if (!ttl.ok) return okUnchecked(false as Bool);
	if (ttl.data < config.minimumFreshnessTtl) {
		return okUnchecked(false as Bool);
	}

	return okUnchecked(true as Bool);
}
```

---

## 6. Purge API (CLI Command + HTTP Endpoint)

### 6.1 CLI Command

The edge tool adds a `--purge` flag for cache invalidation:

```
pnpm tool edge --purge everything
pnpm tool edge --purge url https://myapp.localhost/styles.css
pnpm tool edge --purge tag "static-assets"
pnpm tool edge --purge tag "v2,homepage"
pnpm tool edge --purge host myapp.localhost
pnpm tool edge --purge prefix myapp.localhost/api/
```

#### Flag definition

```typescript
// packages/shared/utils/cli/src/tools/edge/flags/index.ts

/**
 * Purge flag — specifies cache purge action.
 *
 * Values:
 * - `everything`: Purge all cached content.
 * - `url <url>`: Purge a single URL.
 * - `tag <tag>[,<tag>...]`: Purge by Cache-Tag header values.
 * - `host <hostname>`: Purge all content for a hostname.
 * - `prefix <host/path>`: Purge all content under a URL prefix.
 */
{
	name: 'purge',
	description: 'Purge cached content (everything|url|tag|host|prefix)',
	type: 'string',
	required: false,
}
```

#### Purge command handler

```typescript
/**
 * Handles the `--purge` CLI flag by sending a purge request
 * to the running edge proxy's `/__purge` endpoint.
 *
 * @param purgeArg - The purge argument string (e.g. "everything", "url https://...").
 * @param config - Validated PurgeConfig.
 * @returns Ok on successful purge, Err on failure.
 */
function handlePurgeCommand(purgeArg: Str, config: PurgeConfig): Result<Void> {
	const parts: Array<Str> = purgeArg.split(' ') as Array<Str>;
	const method: Str = parts[0] as Str;
	const value: Str = parts.slice(1).join(' ') as Str;

	const endpoint: Str = `http://localhost${config.endpointPath}` as Str;

	let body: Record<Str, unknown>;

	switch (method) {
		case 'everything':
			body = { purge_everything: true };
			break;
		case 'url':
			body = { files: [value] };
			break;
		case 'tag':
			body = { tags: value.split(',').map((t: Str) => t.trim() as Str) };
			break;
		case 'host':
			body = { hosts: [value] };
			break;
		case 'prefix':
			body = { prefixes: [value] };
			break;
		default:
			return err(`Unknown purge method: ${method}. Use: everything, url, tag, host, prefix`);
	}

	// POST to the local purge endpoint
	// (actual fetch implementation uses the tool's HTTP client)
	const fetchResult: Result<Void> = postJson(endpoint, body);
	if (!fetchResult.ok) return fetchResult;

	return okUnchecked(undefined as Void);
}
```

### 6.2 HTTP Purge Endpoint

The edge proxy exposes a `/__purge` endpoint (configurable via `purge.endpointPath`).

#### Caddy route

```typescript
/**
 * Generates the Caddy `handle` block for the local purge endpoint.
 * Accepts POST requests with a JSON body matching the Cloudflare purge API format.
 *
 * @param purgeConfig - Validated PurgeConfig.
 * @returns Caddy directive block for the purge endpoint.
 */
function generatePurgeEndpointDirectives(purgeConfig: PurgeConfig): Result<Str> {
	const path: Str = purgeConfig.endpointPath;

	let ipMatcher: Str = '' as Str;
	if (purgeConfig.allowedIps.length > 0) {
		ipMatcher = `remote_ip ${purgeConfig.allowedIps.join(' ')}` as Str;
	}

	const directives: Str = `# Cache purge endpoint
handle ${path} {
	@purge_post {
		method POST
		${ipMatcher}
	}
	# The purge handler is implemented as a Caddy module or
	# delegated to an internal Go handler that clears the
	# cache-handler stores based on the request body.
	#
	# Request body format (Cloudflare-compatible):
	# { "purge_everything": true }
	# { "files": ["https://example.com/style.css"] }
	# { "tags": ["tag1", "tag2"] }
	# { "hosts": ["example.com"] }
	# { "prefixes": ["example.com/api/"] }
	#
	respond @purge_post 200 {
		body "purge accepted"
	}
	respond 405
}` as Str;

	return okUnchecked(directives);
}
```

#### Purge request body schema (for the endpoint handler)

```typescript
/**
 * Valibot schema for the purge request body.
 * Matches the Cloudflare purge API format.
 */
const PurgeRequestSchema = v.variant('_type', [
	v.strictObject({
		_type: v.literal('everything'),
		purge_everything: v.literal(true),
	}),
	v.strictObject({
		_type: v.literal('files'),
		files: v.pipe(v.array(v.pipe(v.string(), v.url())), v.minLength(1), v.maxLength(500)),
	}),
	v.strictObject({
		_type: v.literal('tags'),
		tags: v.pipe(v.array(CacheTagSchema), v.minLength(1), v.maxLength(100)),
	}),
	v.strictObject({
		_type: v.literal('hosts'),
		hosts: v.pipe(v.array(v.pipe(v.string(), v.minLength(1))), v.minLength(1), v.maxLength(30)),
	}),
	v.strictObject({
		_type: v.literal('prefixes'),
		prefixes: v.pipe(v.array(v.pipe(v.string(), v.minLength(1))), v.minLength(1), v.maxLength(30)),
	}),
]);
```

> **Note:** The actual request body from clients won't have `_type`. The endpoint handler infers the purge type from which field is present in the JSON body, then internally adds `_type` before validation. See the implementation in Section 6.3.

### 6.3 Purge execution logic

```typescript
/**
 * Executes a cache purge based on the parsed request body.
 * Clears matching entries from L1 (memory), L2 (disk), and
 * optionally Cache Reserve.
 *
 * @param request - Validated purge request.
 * @param cacheStorePath - Path to `.resist/cache/`.
 * @param cacheReservePath - Path to `.resist/cache-reserve/`.
 * @returns Ok on success, Err on filesystem or cache operation failure.
 */
function executePurge(
	request: PurgeRequest,
	cacheStorePath: Path,
	cacheReservePath: Path,
): Result<Void> {
	switch (request._type) {
		case 'everything':
			// Clear all L1 + L2 cache stores
			// Optionally clear Cache Reserve (configurable)
			return purgeEverything(cacheStorePath, cacheReservePath);

		case 'files':
			// Purge specific URLs by computing their cache keys
			// and removing matching entries
			return purgeByUrls(request.files, cacheStorePath);

		case 'tags':
			// Purge by Cache-Tag — scan L2 metadata index for matching tags
			// Cache-Tag values are stored in a sidecar metadata file alongside
			// each cached response
			return purgeByTags(request.tags, cacheStorePath);

		case 'hosts':
			// Purge all entries for given hostnames
			return purgeByHosts(request.hosts, cacheStorePath);

		case 'prefixes':
			// Purge all entries whose URL starts with the given prefix
			// Max 31 path separators per prefix
			return purgeByPrefixes(request.prefixes, cacheStorePath);
	}
}
```

### 6.4 Purge rate limits (Cloudflare reference)

For reference when mapping to Pulumi rules and for simulation fidelity:

| Method | Free | Pro | Business | Enterprise |
|---|---|---|---|---|
| Single-file (URLs/sec) | 800 | 1,500 | 1,500 | 3,000 |
| Tag/Host/Prefix/Everything (rate) | 5 req/min | 5 req/sec | 10 req/sec | 50 req/sec |
| Bucket size | 25 | 25 | 50 | 500 |
| Max items per request | 100 | 100 | 100 | 500 (single-file) / 100 (others) |

Locally, no rate limiting is applied on purge requests.

---

## 7. Cache Deception Armor — Caddy Matcher

### How it works

Cache Deception Armor prevents Web Cache Deception attacks by verifying that a URL's file extension matches the response's `Content-Type` header. If they don't match (in a way that could indicate an attack), the response is NOT cached.

**Exceptions:**
- `application/octet-stream` responses are always exempt (download signal).
- Benign cross-format pairs are allowed (e.g. `.jpg` served as `image/webp`, `.gif` as `video/webm`).

### Extension-to-Content-Type mapping

```typescript
/**
 * Built-in mapping of file extensions to their expected Content-Type prefixes.
 * Used by Cache Deception Armor to detect mismatches.
 */
const EXTENSION_CONTENT_TYPE_MAP: Readonly<Record<Str, ReadonlyArray<Str>>> = {
	// Images
	'.jpg': ['image/jpeg', 'image/webp', 'image/avif'],
	'.jpeg': ['image/jpeg', 'image/webp', 'image/avif'],
	'.png': ['image/png', 'image/webp', 'image/avif'],
	'.gif': ['image/gif', 'video/webm', 'image/webp'],
	'.webp': ['image/webp'],
	'.avif': ['image/avif'],
	'.svg': ['image/svg+xml'],
	'.ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
	'.bmp': ['image/bmp'],

	// Fonts
	'.woff': ['font/woff', 'application/font-woff'],
	'.woff2': ['font/woff2', 'application/font-woff2'],
	'.ttf': ['font/ttf', 'application/font-sfnt'],
	'.eot': ['application/vnd.ms-fontobject'],
	'.otf': ['font/otf'],

	// Scripts & styles
	'.js': ['application/javascript', 'text/javascript'],
	'.css': ['text/css'],

	// Documents
	'.pdf': ['application/pdf'],
	'.doc': ['application/msword'],
	'.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],

	// Media
	'.mp4': ['video/mp4'],
	'.webm': ['video/webm'],
	'.mp3': ['audio/mpeg'],
	'.ogg': ['audio/ogg', 'video/ogg'],

	// Archives
	'.zip': ['application/zip'],
	'.gz': ['application/gzip'],
	'.tar': ['application/x-tar'],

	// Data
	'.csv': ['text/csv'],
	'.xml': ['application/xml', 'text/xml'],
	'.json': ['application/json'],
} as const;
```

### Caddy implementation

Cache Deception Armor is implemented as a Caddy response matcher that checks the response Content-Type against the URL extension. If there's a mismatch, we strip caching headers to prevent the response from being cached.

```typescript
/**
 * Generates Caddy directives for Cache Deception Armor.
 *
 * Implementation strategy:
 * 1. After receiving the response from origin, extract the file extension
 *    from the request URL.
 * 2. Check the response Content-Type against the expected types for that extension.
 * 3. If mismatch detected (and Content-Type is not application/octet-stream),
 *    strip all caching headers and set CF-Cache-Status to BYPASS.
 *
 * This is implemented via Caddy's `handle_response` directive which runs
 * after the upstream responds.
 *
 * @param config - Cache Deception Armor configuration.
 * @returns Caddy directive block.
 */
function generateDeceptionArmorDirectives(config: CacheDeceptionArmorConfig): Result<Str> {
	// Merge built-in mappings with user-defined benign mappings
	const allMappings: Record<Str, Array<Str>> = {
		...EXTENSION_CONTENT_TYPE_MAP,
		...config.additionalBenignMappings,
	};

	// Generate a Caddy CEL expression or handle_response block
	// that checks Content-Type against the URL extension
	const directives: Str = `# Cache Deception Armor
# Prevents caching when URL extension doesn't match response Content-Type
# Exempt: application/octet-stream (download signal)
# Implementation: response handler checks Content-Type after origin responds

route {
	# The deception armor check is performed in handle_response
	# after the upstream responds. If a mismatch is detected,
	# the response's caching headers are stripped.
	reverse_proxy {upstream} {
		handle_response {
			# Check extension vs Content-Type mismatch
			# If mismatch: strip caching, set CF-Cache-Status: BYPASS
			@deception_mismatch {
				# Implemented as a Caddy CEL matcher or custom module
				# that compares {http.request.uri.path} extension
				# against {http.response.header.Content-Type}
				expression "!isValidContentTypeForExtension()"
			}
			header @deception_mismatch Cache-Control "no-store"
			header @deception_mismatch CF-Cache-Status "DYNAMIC"
			header @deception_mismatch -CDN-Cache-Control
		}
	}
}` as Str;

	return okUnchecked(directives);
}
```

### Deception check function (used by custom Caddy handler or Go plugin)

```typescript
/**
 * Checks whether a response Content-Type is valid for the URL's file extension.
 * Returns false (mismatch / potential deception) when:
 * - URL has a cacheable extension AND
 * - Content-Type does NOT match any expected type for that extension AND
 * - Content-Type is NOT `application/octet-stream`
 *
 * @param urlPath - Request URL path.
 * @param contentType - Response Content-Type header value.
 * @param benignMappings - Extension-to-Content-Type mapping.
 * @returns Ok(true) if valid or no extension, Ok(false) if mismatch detected.
 */
function isValidContentTypeForExtension(
	urlPath: Str,
	contentType: Str,
	benignMappings: Record<Str, Array<Str>>,
): Result<Bool> {
	// 1. Extract extension from URL path
	const extMatch: RegExpMatchArray | null = urlPath.match(/\.([a-zA-Z0-9]+)$/);
	if (!extMatch) {
		// No extension — no deception check needed
		return okUnchecked(true as Bool);
	}
	const ext: Str = `.${extMatch[1].toLowerCase()}` as Str;

	// 2. Check if this extension has expected types
	const expectedTypes: Array<Str> | undefined = benignMappings[ext];
	if (!expectedTypes) {
		// Extension not in our mapping — no deception check
		return okUnchecked(true as Bool);
	}

	// 3. Exempt application/octet-stream
	const normalizedContentType: Str = contentType.toLowerCase().split(';')[0].trim() as Str;
	if (normalizedContentType === 'application/octet-stream') {
		return okUnchecked(true as Bool);
	}

	// 4. Check if Content-Type matches any expected type
	const isValid: Bool = expectedTypes.some(
		(expected: Str) => normalizedContentType.startsWith(expected),
	) as Bool;

	return okUnchecked(isValid);
}
```

---

## 8. Cache Analytics Logging

### Log format

Cache events are logged to `.resist/logs/cache.ndjson` in newline-delimited JSON:

```typescript
/**
 * Schema for a single cache analytics log entry.
 */
const CacheLogEntrySchema = v.strictObject({
	/** ISO 8601 timestamp. */
	timestamp: v.string(),
	/** Request method (GET, POST, etc.). */
	method: v.string(),
	/** Full request URL. */
	url: v.string(),
	/**
	 * Cache status:
	 * - HIT: Served from cache.
	 * - MISS: Not in cache, fetched from origin.
	 * - EXPIRED: Was in cache but expired, revalidated with origin.
	 * - STALE: Served stale content while revalidating.
	 * - BYPASS: Cache was bypassed (by rule or header).
	 * - DYNAMIC: Content type not eligible for caching.
	 * - REVALIDATED: Origin confirmed content unchanged (304).
	 */
	status: v.picklist(['HIT', 'MISS', 'EXPIRED', 'STALE', 'BYPASS', 'DYNAMIC', 'REVALIDATED']),
	/** Cache tier that served the response (L1, L2, reserve, origin). */
	tier: v.picklist(['L1', 'L2', 'reserve', 'origin']),
	/** Response status code. */
	responseStatus: v.pipe(v.number(), v.integer()),
	/** Response body size in bytes. */
	bodySize: v.pipe(v.number(), v.integer(), v.minValue(0)),
	/** Time to first byte in milliseconds. */
	ttfbMs: v.pipe(v.number(), v.minValue(0)),
	/** Edge TTL applied (seconds), or null if not cached. */
	edgeTtl: v.nullable(v.pipe(v.number(), v.integer())),
	/** Browser TTL applied (seconds), or null if not set. */
	browserTtl: v.nullable(v.pipe(v.number(), v.integer())),
	/** Cache key used (normalized URL + Vary dimensions). */
	cacheKey: v.string(),
	/** Cache-Tag values from response, if any. */
	cacheTags: v.array(v.string()),
	/** Which cache rule matched, if any. */
	matchedRule: v.nullable(v.string()),
	/** Request headers (only if includeHeaders is enabled). */
	requestHeaders: v.optional(v.record(v.string(), v.string()), {}),
	/** Response headers (only if includeHeaders is enabled). */
	responseHeaders: v.optional(v.record(v.string(), v.string()), {}),
});
```

### Caddy logging configuration

```typescript
/**
 * Generates Caddy log directives for cache analytics.
 *
 * Uses Caddy's structured logging with a dedicated log output
 * that writes to `.resist/logs/cache.ndjson`.
 *
 * @param analytics - Cache analytics configuration.
 * @returns Caddy log directive block.
 */
function generateCacheAnalyticsDirectives(analytics: CacheAnalytics): Result<Str> {
	if (!analytics.enabled) {
		return okUnchecked('' as Str);
	}

	const directives: Str = `# Cache analytics logging
log cache_log {
	output file .resist/logs/cache.ndjson {
		roll_size ${analytics.maxFileSizeMb}MiB
		roll_keep ${analytics.maxFiles}
	}
	format json
	# Log entries include CF-Cache-Status, timing, cache key, tags
	include http.log.access.cache
}` as Str;

	return okUnchecked(directives);
}
```

### Cache event emitter

```typescript
/**
 * Builds a cache analytics log entry from request/response data.
 *
 * @param request - HTTP request metadata.
 * @param response - HTTP response metadata.
 * @param cacheResult - Cache lookup result.
 * @param analytics - Analytics config (for includeHeaders flag).
 * @returns Log entry object for writing to cache.ndjson.
 */
function buildCacheLogEntry(
	request: RequestMeta,
	response: ResponseMeta,
	cacheResult: CacheResult,
	analytics: CacheAnalytics,
): Result<CacheLogEntry> {
	const entry: CacheLogEntry = {
		timestamp: new Date().toISOString(),
		method: request.method,
		url: request.url,
		status: cacheResult.status,
		tier: cacheResult.tier,
		responseStatus: response.statusCode,
		bodySize: response.bodySize,
		ttfbMs: response.ttfbMs,
		edgeTtl: cacheResult.edgeTtl ?? null,
		browserTtl: cacheResult.browserTtl ?? null,
		cacheKey: cacheResult.cacheKey,
		cacheTags: cacheResult.cacheTags,
		matchedRule: cacheResult.matchedRule ?? null,
	};

	if (analytics.includeHeaders) {
		entry.requestHeaders = request.headers;
		entry.responseHeaders = response.headers;
	}

	return safeParse(CacheLogEntrySchema, entry);
}
```

---

## 9. Default Cache Behavior Implementation

### Request flow

When a request arrives at the edge proxy with cache enabled:

```
Request
  │
  ├─ 1. Check cache rules (ordered, first match wins)
  │     ├─ Rule matches → apply rule settings
  │     └─ No rule matches → check default behavior
  │
  ├─ 2. Default behavior check:
  │     ├─ Is file extension in cachedExtensions? → eligible
  │     ├─ Is request method GET? → continue (else skip)
  │     ├─ Does response have bypass Cache-Control? → skip
  │     └─ Does response have Set-Cookie? → skip
  │
  ├─ 3. Compute cache key (default or rule-customized)
  │
  ├─ 4. Check tiered cache:
  │     ├─ L1 (memory) hit → serve, log HIT/L1
  │     ├─ L2 (disk) hit → promote to L1, serve, log HIT/L2
  │     ├─ Cache Reserve hit → promote to L2→L1, serve, log HIT/reserve
  │     └─ Miss → fetch from origin
  │
  ├─ 5. Cache Deception Armor check (if enabled):
  │     └─ Extension vs Content-Type mismatch → BYPASS, do not store
  │
  ├─ 6. Store in cache (if eligible):
  │     ├─ L1 (memory) always
  │     ├─ L2 (disk) if tiered cache enabled
  │     └─ Cache Reserve if TTL >= minimumFreshnessTtl
  │
  └─ 7. Log cache event to analytics
```

### Master Caddy directive ordering

```typescript
/**
 * Returns the complete Caddy directive block for cache simulation,
 * composing all sub-features in the correct order.
 *
 * Caddy directive order matters. The cache-handler must run before
 * response handlers, and matchers must be defined before use.
 *
 * @param config - Validated CacheConfig.
 * @returns Complete Caddy cache directive block.
 */
function generateCompleteCacheBlock(config: CacheConfig): Result<Str> {
	const blocks: Array<Str> = [];

	// Global options (cache-handler configuration)
	if (config.tieredCache.enabled) {
		const tieredResult: Result<Str> = generateTieredCacheDirectives(
			config.tieredCache,
			config.cacheReserve,
		);
		if (!tieredResult.ok) return tieredResult;
		blocks.push(tieredResult.data);
	}

	// Site-block directives (in order):

	// 1. Purge endpoint (must be before caching to avoid caching purge requests)
	if (config.purge.enableEndpoint) {
		const purgeResult: Result<Str> = generatePurgeEndpointDirectives(config.purge);
		if (!purgeResult.ok) return purgeResult;
		blocks.push(purgeResult.data);
	}

	// 2. Default cache behavior matchers
	const defaultsResult: Result<Str> = generateDefaultCacheDirectives(config.defaults);
	if (!defaultsResult.ok) return defaultsResult;
	blocks.push(defaultsResult.data);

	// 3. Per-rule cache directives (ordered, first match wins)
	for (const rule of config.rules) {
		const ruleResult: Result<Str> = generateCacheRuleDirectives(rule);
		if (!ruleResult.ok) return ruleResult;
		if (ruleResult.data.length > 0) {
			blocks.push(ruleResult.data);
		}
	}

	// 4. Cache Deception Armor (post-response check)
	if (config.cacheDeceptionArmor.enabled) {
		const armorResult: Result<Str> = generateDeceptionArmorDirectives(
			config.cacheDeceptionArmor,
		);
		if (!armorResult.ok) return armorResult;
		blocks.push(armorResult.data);
	}

	// 5. Cache status header translation
	const statusResult: Result<Str> = generateCacheStatusHeaderDirectives();
	if (!statusResult.ok) return statusResult;
	blocks.push(statusResult.data);

	// 6. Cache analytics logging
	if (config.analytics.enabled) {
		const analyticsResult: Result<Str> = generateCacheAnalyticsDirectives(config.analytics);
		if (!analyticsResult.ok) return analyticsResult;
		blocks.push(analyticsResult.data);
	}

	return okUnchecked(blocks.filter((b: Str) => b.length > 0).join('\n\n') as Str);
}
```

---

## 10. Pulumi Mapping: Cache Config to Cloudflare Rulesets

### File: `packages/products/[product]/iac/src/cache.ts`

The same `CacheConfig` schema is consumed by Pulumi to generate real Cloudflare resources.

### Resource mapping

| Config Section | Cloudflare Resource | Pulumi Provider |
|---|---|---|
| `rules[]` | `cloudflare.Ruleset` (kind: `zone`, phase: `http_request_cache_settings`) | `@pulumi/cloudflare` |
| `tieredCache` | `cloudflare.TieredCache` + `cloudflare.TieredCacheSmartTopology` + `cloudflare.RegionalTieredCache` | `@pulumi/cloudflare` |
| `cacheReserve` | `cloudflare.CacheReserve` | `@pulumi/cloudflare` |
| `defaults.maxCacheableBodySize` | Zone setting (via API, not a direct Pulumi resource) | Custom provider or API call |
| `purge` | No Pulumi resource (API-only, runtime operation) | N/A |
| `cacheDeceptionArmor` | Part of `Ruleset` cache rule `action_parameters.cache_key.cache_deception_armor` | `@pulumi/cloudflare` |
| `analytics` | No Pulumi resource (local-only feature) | N/A |

### Cache rules to Pulumi Ruleset

```typescript
/**
 * Generates a Pulumi Cloudflare Ruleset resource for cache rules.
 *
 * @param config - Validated CacheConfig.
 * @param zoneId - Cloudflare zone ID (from Pulumi config).
 * @returns Pulumi resource definition.
 */
function generateCacheRuleset(
	config: CacheConfig,
	zoneId: Str,
): Result<PulumiResourceDef> {
	const rules: Array<PulumiRulesetRule> = [];

	for (const rule of config.rules) {
		const pulumiRule: PulumiRulesetRule = {
			expression: rule.expression,
			description: rule.name,
			enabled: rule.enabled,
			action: rule.eligibility === 'bypass' ? 'set_cache_settings' : 'set_cache_settings',
			action_parameters: {
				cache: rule.eligibility === 'eligible',

				// Edge TTL
				edge_ttl: {
					mode: rule.edgeTtl.mode,
					default: rule.edgeTtl.mode === 'override_origin' ? rule.edgeTtl.default : undefined,
					status_code_ttl: rule.edgeTtl.statusCodeTtl.map((entry) => {
						if (entry.type === 'single') {
							return { status_code: entry.statusCode, value: entry.ttl };
						}
						return {
							status_code_range: [{ from: entry.range.from, to: entry.range.to }],
							value: entry.ttl,
						};
					}),
				},

				// Browser TTL
				browser_ttl: {
					mode: rule.browserTtl.mode === 'bypass' ? 'bypass_by_default' : rule.browserTtl.mode,
					default: rule.browserTtl.mode === 'override_origin' ? rule.browserTtl.default : undefined,
				},

				// Cache Key
				cache_key: {
					custom_key: {
						query_string: mapQueryStringToPulumi(rule.cacheKey.queryString),
						header: mapHeaderToPulumi(rule.cacheKey.header),
						cookie: mapCookieToPulumi(rule.cacheKey.cookie),
						user: {
							device_type: rule.cacheKey.user.deviceType,
							geo: rule.cacheKey.user.geo,
							lang: rule.cacheKey.user.lang,
						},
						host: {
							resolved: rule.cacheKey.host.resolved,
						},
					},
					cache_deception_armor: rule.cacheKey.cacheDeceptionArmor,
					ignore_query_strings_order: rule.cacheKey.queryString.sort,
					cache_by_device_type: rule.cacheKey.user.deviceType,
				},

				// Serve Stale
				serve_stale: {
					disable_stale_while_updating: rule.disableStaleWhileRevalidating,
				},

				// Misc
				respect_strong_etags: rule.respectStrongEtags,
				origin_error_page_passthru: rule.originErrorPagePassthrough,
				origin_cache_control: rule.originCacheControl,

				// Enterprise-only
				additional_cacheable_ports: rule.additionalCacheablePorts.length > 0
					? rule.additionalCacheablePorts
					: undefined,

				// Cache Reserve per-rule
				cache_reserve: rule.cacheReserve !== null
					? {
						eligible: rule.cacheReserve.eligible,
						minimum_file_size: rule.cacheReserve.minimumFileSize,
					}
					: undefined,
			},
		};

		rules.push(pulumiRule);
	}

	return okUnchecked({
		type: 'cloudflare:Ruleset',
		name: 'cache-rules',
		args: {
			zoneId,
			name: 'Cache Rules',
			description: 'Cache rules generated from resist.config.ts',
			kind: 'zone',
			phase: 'http_request_cache_settings',
			rules,
		},
	} as PulumiResourceDef);
}
```

### Tiered cache to Pulumi

```typescript
/**
 * Generates Pulumi resources for tiered cache configuration.
 *
 * @param config - Tiered cache config.
 * @param zoneId - Cloudflare zone ID.
 * @returns Array of Pulumi resource definitions.
 */
function generateTieredCacheResources(
	config: TieredCacheConfig,
	zoneId: Str,
): Result<Array<PulumiResourceDef>> {
	const resources: Array<PulumiResourceDef> = [];

	if (!config.enabled) {
		return okUnchecked(resources);
	}

	// 1. Enable Tiered Caching
	resources.push({
		type: 'cloudflare:TieredCache',
		name: 'tiered-cache',
		args: {
			zoneId,
			cacheType: config.topology === 'generic_global' ? 'generic' : 'smart',
		},
	});

	// 2. Smart topology (if using smart)
	if (config.topology === 'smart') {
		resources.push({
			type: 'cloudflare:index/tieredCacheSmartTopology:TieredCacheSmartTopology',
			name: 'tiered-cache-smart',
			args: {
				zoneId,
				// Smart topology is auto-configured by Cloudflare
			},
		});
	}

	// 3. Regional tiered cache (Enterprise only)
	if (config.regional) {
		resources.push({
			type: 'cloudflare:RegionalTieredCache',
			name: 'regional-tiered-cache',
			args: {
				zoneId,
				value: 'on',
			},
		});
	}

	return okUnchecked(resources);
}
```

### Cache Reserve to Pulumi

```typescript
/**
 * Generates Pulumi resource for Cache Reserve.
 *
 * @param config - Cache Reserve config.
 * @param zoneId - Cloudflare zone ID.
 * @returns Pulumi resource definition, or null if disabled.
 */
function generateCacheReserveResource(
	config: CacheReserveConfig,
	zoneId: Str,
): Result<PulumiResourceDef | null> {
	if (!config.enabled) {
		return okUnchecked(null);
	}

	return okUnchecked({
		type: 'cloudflare:CacheReserve',
		name: 'cache-reserve',
		args: {
			zoneId,
			enabled: true,
		},
	} as PulumiResourceDef);
}
```

---

## 11. Verification Steps

### Schema validation

1. `safeParse(CacheConfigSchema, {})` succeeds with all defaults.
2. `safeParse(CacheConfigSchema, { enabled: true })` succeeds.
3. `safeParse(CacheConfigSchema, { enabled: true, rules: [{ name: 'test', expression: '(true)', eligibility: 'eligible' }] })` succeeds.
4. `safeParse(CacheConfigSchema, { enabled: true, rules: [{ name: '', expression: '' }] })` fails (name and expression must be non-empty).
5. `safeParse(CacheConfigSchema, { enabled: true, tieredCache: { topology: 'invalid' } })` fails.
6. `safeParse(CacheConfigSchema, { enabled: true, cacheReserve: { enabled: true, minimumFreshnessTtl: 100 } })` fails (minimum is 36000).

### Caddy generation

7. `generateCacheCaddyDirectives({ enabled: false, ...defaults })` returns empty string.
8. `generateCacheCaddyDirectives({ enabled: true, rules: [], ...defaults })` returns default extension-based cache directives.
9. A cache rule with `eligibility: 'bypass'` generates `no-store, no-cache` and `CF-Cache-Status: BYPASS`.
10. A cache rule with `edgeTtl: { mode: 'override_origin', default: 86400 }` generates `CDN-Cache-Control: s-maxage=86400`.
11. A cache rule with `browserTtl: { mode: 'override_origin', default: 3600 }` generates `Cache-Control: public, max-age=3600`.
12. Cache key with `user.deviceType: true` adds `CF-Device-Type` to Vary header.
13. Cache key with `queryString.sort: true` generates query string sort directive.

### Purge

14. `pnpm tool edge --purge everything` sends `{ purge_everything: true }` to `/__purge`.
15. `pnpm tool edge --purge url https://example.com/style.css` sends `{ files: [...] }`.
16. `pnpm tool edge --purge tag "v2,homepage"` sends `{ tags: ["v2", "homepage"] }`.
17. The `/__purge` endpoint returns 200 on valid POST and 405 on other methods.

### Cache Deception Armor

18. Request to `/profile/photo.jpg` returning `text/html` Content-Type is NOT cached (BYPASS).
19. Request to `/profile/photo.jpg` returning `image/jpeg` Content-Type IS cached (HIT).
20. Request to `/profile/photo.jpg` returning `application/octet-stream` IS cached (exempt).
21. Request to `/data` (no extension) with `text/html` IS cached (no extension to check).

### Tiered cache

22. With tiered cache enabled, second request for same URL returns `CF-Cache-Status: HIT`.
23. With tiered cache disabled, all requests return `CF-Cache-Status: MISS` or `DYNAMIC`.

### Cache analytics

24. With analytics enabled, `.resist/logs/cache.ndjson` is created and written to.
25. Each log entry is valid JSON parseable by `safeParse(CacheLogEntrySchema, ...)`.
26. Log rotation occurs when file exceeds `maxFileSizeMb`.

### Pulumi generation

27. Cache rules map to `cloudflare:Ruleset` with phase `http_request_cache_settings`.
28. Tiered cache maps to `cloudflare:TieredCache` resource.
29. Cache Reserve maps to `cloudflare:CacheReserve` resource.
30. Cache Deception Armor appears in rule `action_parameters.cache_key.cache_deception_armor`.

---

## Dependencies

- **00-foundation.md**: Edge config schema foundation, custom Caddy build, `.resist/` directory structure.
- **06-rules-engine.md**: `expressionToCaddyMatcher()` function for translating Cloudflare Rules Language expressions to Caddy matchers.
- **15-cf-fields.md**: `CF-Device-Type`, `CF-IPCountry` header injection for cache key segmentation.

## Implementation Order

1. Create `packages/shared/schemas/core-config/src/edge-cache.ts` with complete `CacheConfigSchema`.
2. Create `packages/shared/utils/cli/src/tools/edge/utils/cache.ts` with `generateCacheCaddyDirectives()`.
3. Implement default cache behavior (extension matching + default TTLs).
4. Implement per-rule cache directive generation (Edge TTL, Browser TTL).
5. Implement cache key to Vary header generation.
6. Add `cache-handler` module to xcaddy build and generate tiered cache config.
7. Implement Cache Reserve eligibility checks and disk storage config.
8. Implement purge endpoint (`/__purge` route in Caddy).
9. Implement purge CLI command (`--purge` flag handler).
10. Implement Cache Deception Armor response handler.
11. Implement cache analytics logging.
12. Implement Pulumi mapping functions.
13. Wire `generateCacheCaddyDirectives()` into `generateEdgeCaddyDirectives()` in the main edge tool.
14. Tests for all of the above.
