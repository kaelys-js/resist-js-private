# 06 — Rules Engine: Transform, Redirect, Origin, Configuration, Snippet, Compression Rules

## Context

Cloudflare's Rules Engine is the most flexible part of the platform, allowing per-request configuration through various rule types. Each rule type operates in a specific phase of the request/response pipeline and uses wirefilter expressions to match requests.

The rules engine encompasses six distinct rule categories:
1. **Transform Rules** — URL rewrites, request/response header modifications, managed transforms
2. **Redirect Rules** — Single redirects, bulk redirects, dynamic regex redirects
3. **Origin Rules** — Host header override, SNI override, DNS record override, destination port override
4. **Configuration Rules** — Per-request settings overrides (cache, security, performance toggles)
5. **Snippets** — Custom code executed at specific pipeline points
6. **Compression Rules** — Per-extension/content-type compression controls

Locally, all rule types are simulated via native Caddy directives. The same Valibot schema drives both:
- **Local simulation** via Caddy `rewrite`, `header`, `redir`, `reverse_proxy`, `encode` directives
- **Production deployment** via Pulumi Cloudflare Ruleset resources across multiple phases

### How Cloudflare Rules Engine Works

1. Requests flow through phases in a fixed order:
   - `http_request_transform` — URL rewrite + request header transforms
   - `http_request_redirect` — Redirect rules
   - `http_request_origin` — Origin overrides
   - `http_config_settings` — Configuration rule overrides
   - `http_request_late_transform` — Response header transforms
   - `http_response_compression` — Compression rules
2. Each phase has a ruleset with ordered rules.
3. Rules have an **expression** (wirefilter) and an **action** (rewrite, redirect, set_config, etc.).
4. Rules within a phase are evaluated in order; first match wins (unless `skip` is used).
5. **Managed Transforms** are pre-built header injection rules (True-Client-IP, CF-Connecting-IP, etc.) toggled on/off.

---

## Documentation Links

- Cloudflare Rules overview: https://developers.cloudflare.com/rules/
- Transform Rules: https://developers.cloudflare.com/rules/transform/
- URL Rewrite Rules: https://developers.cloudflare.com/rules/transform/url-rewrite/
- Request Header Modification: https://developers.cloudflare.com/rules/transform/request-header-modification/
- Response Header Modification: https://developers.cloudflare.com/rules/transform/response-header-modification/
- Managed Transforms: https://developers.cloudflare.com/rules/transform/managed-transforms/
- Redirect Rules: https://developers.cloudflare.com/rules/redirect/
- Single Redirects: https://developers.cloudflare.com/rules/redirect/create-api/
- Bulk Redirects: https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/
- Origin Rules: https://developers.cloudflare.com/rules/origin-rules/
- Configuration Rules: https://developers.cloudflare.com/rules/configuration-rules/
- Snippets: https://developers.cloudflare.com/rules/snippets/
- Compression Rules: https://developers.cloudflare.com/rules/compression-rules/
- Custom Error Responses: https://developers.cloudflare.com/rules/custom-error-responses/
- URL Normalization: https://developers.cloudflare.com/rules/normalization/
- Caddy rewrite: https://caddyserver.com/docs/caddyfile/directives/rewrite
- Caddy redir: https://caddyserver.com/docs/caddyfile/directives/redir
- Caddy header: https://caddyserver.com/docs/caddyfile/directives/header
- Caddy encode: https://caddyserver.com/docs/caddyfile/directives/encode
- Pulumi Cloudflare Ruleset: https://www.pulumi.com/registry/packages/cloudflare/api-docs/ruleset/

---

## 1. Valibot Schema: Rules Engine Config

### File: `packages/shared/schemas/core-config/src/edge-rules.ts`

```typescript
/**
 * Rules Engine Edge Config Schema
 *
 * Valibot schemas for all Cloudflare Rules Engine types:
 * Transform, Redirect, Origin, Configuration, Snippet, Compression.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Shared Primitive Schemas
// =============================================================================

/**
 * HTTP redirect status code.
 */
export const RedirectStatusCodeSchema = v.picklist([301, 302, 303, 307, 308]);

/** Inferred output type of {@link RedirectStatusCodeSchema}. */
export type RedirectStatusCode = v.InferOutput<typeof RedirectStatusCodeSchema>;

/**
 * Header operation type.
 */
export const HeaderOperationSchema = v.picklist(['set', 'add', 'remove']);

/** Inferred output type of {@link HeaderOperationSchema}. */
export type HeaderOperation = v.InferOutput<typeof HeaderOperationSchema>;

// =============================================================================
// Transform Rules
// =============================================================================

/**
 * URL rewrite rule.
 *
 * Rewrites the request URI path and/or query string.
 * Operates in `http_request_transform` phase.
 */
export const UrlRewriteRuleSchema = v.strictObject({
	/** Unique rule identifier. */
	id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
	/** Human-readable description. */
	description: v.pipe(v.string(), v.maxLength(512)),
	/** Wirefilter expression to match requests. */
	expression: v.pipe(v.string(), v.minLength(1)),
	/** Whether the rule is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),

	/** New path for the request. Leave undefined to keep original. */
	path: v.optional(v.strictObject({
		/** Rewrite type. */
		type: v.picklist(['static', 'dynamic']),
		/** Static path value or dynamic expression. */
		value: v.pipe(v.string(), v.minLength(1)),
	})),

	/** New query string for the request. Leave undefined to keep original. */
	query: v.optional(v.strictObject({
		/** Rewrite type. */
		type: v.picklist(['static', 'dynamic']),
		/** Static query value or dynamic expression. */
		value: v.string(),
	})),
});

/** Inferred output type of {@link UrlRewriteRuleSchema}. */
export type UrlRewriteRule = v.InferOutput<typeof UrlRewriteRuleSchema>;

/**
 * Request header modification rule.
 *
 * Sets, adds, or removes request headers.
 * Operates in `http_request_transform` phase.
 */
export const RequestHeaderRuleSchema = v.strictObject({
	/** Unique rule identifier. */
	id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
	/** Human-readable description. */
	description: v.pipe(v.string(), v.maxLength(512)),
	/** Wirefilter expression to match requests. */
	expression: v.pipe(v.string(), v.minLength(1)),
	/** Whether the rule is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),

	/** Header operations to perform. */
	headers: v.array(v.strictObject({
		/** Operation type: set, add, or remove. */
		operation: HeaderOperationSchema,
		/** Header name. */
		name: v.pipe(v.string(), v.minLength(1)),
		/** Header value (not needed for remove). */
		value: v.optional(v.string()),
	})),
});

/** Inferred output type of {@link RequestHeaderRuleSchema}. */
export type RequestHeaderRule = v.InferOutput<typeof RequestHeaderRuleSchema>;

/**
 * Response header modification rule.
 *
 * Sets, adds, or removes response headers.
 * Operates in `http_request_late_transform` phase.
 */
export const ResponseHeaderRuleSchema = v.strictObject({
	/** Unique rule identifier. */
	id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
	/** Human-readable description. */
	description: v.pipe(v.string(), v.maxLength(512)),
	/** Wirefilter expression to match requests. */
	expression: v.pipe(v.string(), v.minLength(1)),
	/** Whether the rule is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),

	/** Header operations to perform. */
	headers: v.array(v.strictObject({
		/** Operation type: set, add, or remove. */
		operation: HeaderOperationSchema,
		/** Header name. */
		name: v.pipe(v.string(), v.minLength(1)),
		/** Header value (not needed for remove). */
		value: v.optional(v.string()),
	})),
});

/** Inferred output type of {@link ResponseHeaderRuleSchema}. */
export type ResponseHeaderRule = v.InferOutput<typeof ResponseHeaderRuleSchema>;

/**
 * Managed Transforms configuration.
 *
 * Pre-built header injection rules that can be toggled on/off.
 * Each toggle corresponds to a specific Cloudflare managed transform.
 */
export const ManagedTransformsSchema = v.strictObject({
	/** Add `True-Client-IP` header (client IP). Default: `true`. */
	addTrueClientIp: v.optional(v.boolean(), true),
	/** Add `CF-Connecting-IP` header (client IP). Default: `true`. */
	addCfConnectingIp: v.optional(v.boolean(), true),
	/** Add `CF-IPCountry` header (client country). Default: `true`. */
	addCfIpCountry: v.optional(v.boolean(), true),
	/** Add `CF-RAY` header (unique request ID). Default: `true`. */
	addCfRay: v.optional(v.boolean(), true),
	/** Add `X-Forwarded-For` header. Default: `true`. */
	addXForwardedFor: v.optional(v.boolean(), true),
	/** Remove `X-Powered-By` response header. Default: `true`. */
	removeXPoweredBy: v.optional(v.boolean(), true),
	/** Add bot management headers. Default: `false`. */
	addBotManagementHeaders: v.optional(v.boolean(), false),
});

/** Inferred output type of {@link ManagedTransformsSchema}. */
export type ManagedTransforms = v.InferOutput<typeof ManagedTransformsSchema>;

/**
 * Complete Transform Rules configuration.
 */
export const TransformRulesConfigSchema = v.strictObject({
	/** URL rewrite rules. Default: `[]`. */
	urlRewrites: v.optional(v.array(UrlRewriteRuleSchema), []),
	/** Request header modification rules. Default: `[]`. */
	requestHeaders: v.optional(v.array(RequestHeaderRuleSchema), []),
	/** Response header modification rules. Default: `[]`. */
	responseHeaders: v.optional(v.array(ResponseHeaderRuleSchema), []),
	/** Managed transforms configuration. */
	managedTransforms: v.optional(ManagedTransformsSchema, {}),
});

/** Inferred output type of {@link TransformRulesConfigSchema}. */
export type TransformRulesConfig = v.InferOutput<typeof TransformRulesConfigSchema>;

// =============================================================================
// Redirect Rules
// =============================================================================

/**
 * Single redirect rule.
 *
 * Redirects matching requests to a new URL.
 * Operates in `http_request_redirect` phase.
 */
export const RedirectRuleSchema = v.strictObject({
	/** Unique rule identifier. */
	id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
	/** Human-readable description. */
	description: v.pipe(v.string(), v.maxLength(512)),
	/** Wirefilter expression to match requests. */
	expression: v.pipe(v.string(), v.minLength(1)),
	/** Whether the rule is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),

	/** Target URL or path. Supports `{capture_group}` for dynamic redirects. */
	target: v.pipe(v.string(), v.minLength(1)),
	/** HTTP redirect status code. Default: `301`. */
	statusCode: v.optional(RedirectStatusCodeSchema, 301),
	/** Whether to preserve the query string. Default: `true`. */
	preserveQueryString: v.optional(v.boolean(), true),
});

/** Inferred output type of {@link RedirectRuleSchema}. */
export type RedirectRule = v.InferOutput<typeof RedirectRuleSchema>;

/**
 * Bulk redirect entry (for large redirect tables).
 *
 * Each entry is a simple source → target mapping without expressions.
 */
export const BulkRedirectEntrySchema = v.strictObject({
	/** Source URL path (exact match). */
	sourcePath: v.pipe(v.string(), v.minLength(1)),
	/** Target URL (absolute or relative). */
	targetUrl: v.pipe(v.string(), v.minLength(1)),
	/** HTTP redirect status code. Default: `301`. */
	statusCode: v.optional(RedirectStatusCodeSchema, 301),
	/** Whether to preserve query string. Default: `false`. */
	preserveQueryString: v.optional(v.boolean(), false),
	/** Whether to include subpaths. Default: `false`. */
	includeSubpaths: v.optional(v.boolean(), false),
	/** Whether path matching is case-sensitive. Default: `true`. */
	subpathMatching: v.optional(v.boolean(), true),
});

/** Inferred output type of {@link BulkRedirectEntrySchema}. */
export type BulkRedirectEntry = v.InferOutput<typeof BulkRedirectEntrySchema>;

/**
 * Complete Redirect Rules configuration.
 */
export const RedirectRulesConfigSchema = v.strictObject({
	/** Single redirect rules (expression-based). Default: `[]`. */
	rules: v.optional(v.array(RedirectRuleSchema), []),
	/** Bulk redirect entries (path-based). Default: `[]`. */
	bulkRedirects: v.optional(v.array(BulkRedirectEntrySchema), []),
});

/** Inferred output type of {@link RedirectRulesConfigSchema}. */
export type RedirectRulesConfig = v.InferOutput<typeof RedirectRulesConfigSchema>;

// =============================================================================
// Origin Rules
// =============================================================================

/**
 * Origin rule.
 *
 * Overrides the origin server for matching requests.
 * Operates in `http_request_origin` phase.
 */
export const OriginRuleSchema = v.strictObject({
	/** Unique rule identifier. */
	id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
	/** Human-readable description. */
	description: v.pipe(v.string(), v.maxLength(512)),
	/** Wirefilter expression to match requests. */
	expression: v.pipe(v.string(), v.minLength(1)),
	/** Whether the rule is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),

	/** Override the Host header sent to the origin. */
	hostHeader: v.optional(v.pipe(v.string(), v.minLength(1))),
	/** Override the SNI for TLS connection to origin. */
	sniOverride: v.optional(v.pipe(v.string(), v.minLength(1))),
	/** Override the destination address (DNS record override). */
	destinationAddress: v.optional(v.pipe(v.string(), v.minLength(1))),
	/** Override the destination port. */
	destinationPort: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535))),
});

/** Inferred output type of {@link OriginRuleSchema}. */
export type OriginRule = v.InferOutput<typeof OriginRuleSchema>;

/**
 * Complete Origin Rules configuration.
 */
export const OriginRulesConfigSchema = v.strictObject({
	/** Origin override rules. Default: `[]`. */
	rules: v.optional(v.array(OriginRuleSchema), []),
});

/** Inferred output type of {@link OriginRulesConfigSchema}. */
export type OriginRulesConfig = v.InferOutput<typeof OriginRulesConfigSchema>;

// =============================================================================
// Configuration Rules
// =============================================================================

/**
 * Per-request configuration override.
 *
 * Overrides zone-level settings for matching requests.
 * Operates in `http_config_settings` phase.
 */
export const ConfigurationRuleSchema = v.strictObject({
	/** Unique rule identifier. */
	id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
	/** Human-readable description. */
	description: v.pipe(v.string(), v.maxLength(512)),
	/** Wirefilter expression to match requests. */
	expression: v.pipe(v.string(), v.minLength(1)),
	/** Whether the rule is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),

	/** Settings to override for matching requests. */
	settings: v.strictObject({
		/** Override Automatic HTTPS Rewrites. */
		automaticHttpsRewrites: v.optional(v.boolean()),
		/** Override Browser Integrity Check. */
		browserIntegrityCheck: v.optional(v.boolean()),
		/** Disable RUM (Real User Monitoring). */
		disableRum: v.optional(v.boolean()),
		/** Disable Zaraz. */
		disableZaraz: v.optional(v.boolean()),
		/** Override Email Obfuscation. */
		emailObfuscation: v.optional(v.boolean()),
		/** Override Hotlink Protection. */
		hotlinkProtection: v.optional(v.boolean()),
		/** Override Security Level. */
		securityLevel: v.optional(v.picklist([
			'off', 'essentially_off', 'low', 'medium', 'high', 'under_attack',
		])),
		/** Override Polish setting. */
		polish: v.optional(v.picklist(['off', 'lossless', 'lossy'])),
		/** Override Rocket Loader. */
		rocketLoader: v.optional(v.boolean()),
		/** Override SSL mode for this route. */
		sslMode: v.optional(v.picklist(['off', 'flexible', 'full', 'strict', 'origin_pull'])),
		/** Override max upload size (bytes). */
		maxUploadSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
		/** Override response buffering. */
		responseBuffering: v.optional(v.boolean()),
		/** Override fonts optimization. */
		fonts: v.optional(v.boolean()),
	}),
});

/** Inferred output type of {@link ConfigurationRuleSchema}. */
export type ConfigurationRule = v.InferOutput<typeof ConfigurationRuleSchema>;

/**
 * Complete Configuration Rules configuration.
 */
export const ConfigurationRulesConfigSchema = v.strictObject({
	/** Configuration override rules. Default: `[]`. */
	rules: v.optional(v.array(ConfigurationRuleSchema), []),
});

/** Inferred output type of {@link ConfigurationRulesConfigSchema}. */
export type ConfigurationRulesConfig = v.InferOutput<typeof ConfigurationRulesConfigSchema>;

// =============================================================================
// Snippets
// =============================================================================

/**
 * Snippet rule.
 *
 * Custom snippet code executed at a specific pipeline point.
 * Locally translated to equivalent Caddy directives.
 */
export const SnippetRuleSchema = v.strictObject({
	/** Unique snippet identifier. */
	id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
	/** Human-readable description. */
	description: v.pipe(v.string(), v.maxLength(512)),
	/** Wirefilter expression for when to execute the snippet. */
	expression: v.pipe(v.string(), v.minLength(1)),
	/** Whether the snippet is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),

	/**
	 * Snippet actions — translated to Caddy directives.
	 * Each action represents an observable behavior.
	 */
	actions: v.array(v.variant('type', [
		/** Set a response header. */
		v.strictObject({
			type: v.literal('set_header'),
			name: v.pipe(v.string(), v.minLength(1)),
			value: v.pipe(v.string(), v.minLength(1)),
		}),
		/** Remove a response header. */
		v.strictObject({
			type: v.literal('remove_header'),
			name: v.pipe(v.string(), v.minLength(1)),
		}),
		/** Redirect the request. */
		v.strictObject({
			type: v.literal('redirect'),
			target: v.pipe(v.string(), v.minLength(1)),
			statusCode: v.optional(RedirectStatusCodeSchema, 302),
		}),
		/** Rewrite the URI. */
		v.strictObject({
			type: v.literal('rewrite'),
			path: v.pipe(v.string(), v.minLength(1)),
		}),
	])),
});

/** Inferred output type of {@link SnippetRuleSchema}. */
export type SnippetRule = v.InferOutput<typeof SnippetRuleSchema>;

/**
 * Complete Snippets configuration.
 */
export const SnippetsConfigSchema = v.strictObject({
	/** Snippet rules. Default: `[]`. */
	rules: v.optional(v.array(SnippetRuleSchema), []),
});

/** Inferred output type of {@link SnippetsConfigSchema}. */
export type SnippetsConfig = v.InferOutput<typeof SnippetsConfigSchema>;

// =============================================================================
// Compression Rules
// =============================================================================

/**
 * Compression algorithm preference.
 */
export const CompressionAlgorithmSchema = v.picklist(['gzip', 'br', 'zstd', 'none']);

/** Inferred output type of {@link CompressionAlgorithmSchema}. */
export type CompressionAlgorithm = v.InferOutput<typeof CompressionAlgorithmSchema>;

/**
 * Compression rule.
 *
 * Controls compression behavior per content type or extension.
 * Operates in `http_response_compression` phase.
 */
export const CompressionRuleSchema = v.strictObject({
	/** Unique rule identifier. */
	id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
	/** Human-readable description. */
	description: v.pipe(v.string(), v.maxLength(512)),
	/** Wirefilter expression to match requests. */
	expression: v.pipe(v.string(), v.minLength(1)),
	/** Whether the rule is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),

	/** Compression algorithms to use (in preference order). Default: `['zstd', 'br', 'gzip']`. */
	algorithms: v.optional(v.array(CompressionAlgorithmSchema), ['zstd', 'br', 'gzip']),
});

/** Inferred output type of {@link CompressionRuleSchema}. */
export type CompressionRule = v.InferOutput<typeof CompressionRuleSchema>;

/**
 * URL normalization configuration.
 */
export const UrlNormalizationSchema = v.strictObject({
	/** Normalize incoming URLs. Default: `true`. */
	enabled: v.optional(v.boolean(), true),
	/** Normalize to lowercase. Default: `true`. */
	normalizeToLowercase: v.optional(v.boolean(), true),
	/** Merge consecutive slashes. Default: `true`. */
	mergeSlashes: v.optional(v.boolean(), true),
	/** Decode percent-encoded characters. Default: `true`. */
	decodePercentEncoding: v.optional(v.boolean(), true),
});

/** Inferred output type of {@link UrlNormalizationSchema}. */
export type UrlNormalization = v.InferOutput<typeof UrlNormalizationSchema>;

/**
 * Custom error response configuration.
 */
export const CustomErrorResponseSchema = v.strictObject({
	/** HTTP status code to handle. */
	statusCode: v.pipe(v.number(), v.integer(), v.minValue(400), v.maxValue(599)),
	/** Custom response content type. */
	contentType: v.optional(v.pipe(v.string(), v.minLength(1)), 'text/html'),
	/** Custom response body (HTML or text). */
	body: v.pipe(v.string(), v.minLength(1)),
});

/** Inferred output type of {@link CustomErrorResponseSchema}. */
export type CustomErrorResponse = v.InferOutput<typeof CustomErrorResponseSchema>;

/**
 * Complete Compression & Misc Rules configuration.
 */
export const CompressionRulesConfigSchema = v.strictObject({
	/** Compression rules. Default: `[]`. */
	rules: v.optional(v.array(CompressionRuleSchema), []),
	/** Default compression algorithms. Default: `['zstd', 'br', 'gzip']`. */
	defaultAlgorithms: v.optional(v.array(CompressionAlgorithmSchema), ['zstd', 'br', 'gzip']),
	/** URL normalization settings. */
	urlNormalization: v.optional(UrlNormalizationSchema, {}),
	/** Custom error responses. Default: `[]`. */
	customErrors: v.optional(v.array(CustomErrorResponseSchema), []),
});

/** Inferred output type of {@link CompressionRulesConfigSchema}. */
export type CompressionRulesConfig = v.InferOutput<typeof CompressionRulesConfigSchema>;

// =============================================================================
// Top-Level Rules Engine Config
// =============================================================================

/**
 * Complete Rules Engine configuration.
 *
 * Placed under `tooling.edge.rules` in `resist.config.ts`.
 *
 * @example
 * ```typescript
 * export default defineConfig({
 *   tooling: {
 *     edge: {
 *       rules: {
 *         transforms: {
 *           urlRewrites: [
 *             { id: 'api-v1', description: 'Rewrite /api/v1 to /api', expression: '(http.request.uri.path starts_with "/api/v1")', path: { type: 'static', value: '/api' } },
 *           ],
 *           managedTransforms: { addTrueClientIp: true, removeXPoweredBy: true },
 *         },
 *         redirects: {
 *           rules: [
 *             { id: 'old-blog', description: 'Redirect old blog', expression: '(http.request.uri.path eq "/blog")', target: '/articles', statusCode: 301 },
 *           ],
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const RulesEngineConfigSchema = v.strictObject({
	/** Transform rules (URL rewrites, header modifications, managed transforms). */
	transforms: v.optional(TransformRulesConfigSchema, {}),
	/** Redirect rules (single + bulk). */
	redirects: v.optional(RedirectRulesConfigSchema, {}),
	/** Origin rules (host/SNI/port overrides). */
	origin: v.optional(OriginRulesConfigSchema, {}),
	/** Configuration rules (per-request settings overrides). */
	configuration: v.optional(ConfigurationRulesConfigSchema, {}),
	/** Snippets. */
	snippets: v.optional(SnippetsConfigSchema, {}),
	/** Compression rules + URL normalization + custom errors. */
	compression: v.optional(CompressionRulesConfigSchema, {}),
});

/** Inferred output type of {@link RulesEngineConfigSchema}. */
export type RulesEngineConfig = v.InferOutput<typeof RulesEngineConfigSchema>;
```

---

## 2. Caddy Directive Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/transforms.ts`

```typescript
/**
 * Rules Engine → Caddy Directives Generator
 *
 * Generates Caddy configuration from Rules Engine config.
 * Handles all rule types: transform, redirect, origin, config, snippet, compression.
 *
 * @module
 */

import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';
import { ok, err } from '@/utils/result/helpers';
import { RulesEngineConfigSchema } from '@/schemas/core-config/src/edge-rules';
import type {
	RulesEngineConfig,
	UrlRewriteRule,
	RequestHeaderRule,
	ResponseHeaderRule,
	ManagedTransforms,
	RedirectRule,
	BulkRedirectEntry,
	OriginRule,
	ConfigurationRule,
	SnippetRule,
	CompressionRule,
	CustomErrorResponse,
} from '@/schemas/core-config/src/edge-rules';

// =============================================================================
// Transform Rules — URL Rewrites
// =============================================================================

/**
 * Generate Caddy rewrite directives from URL rewrite rules.
 *
 * @param rules - Array of URL rewrite rules.
 * @returns Result containing Caddy directive strings.
 */
export function generateUrlRewriteDirectives(
	rules: ReadonlyArray<UrlRewriteRule>,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	const directives: Array<string> = ['# URL Rewrite Rules'];

	for (const rule of rules) {
		if (!rule.enabled) continue;

		directives.push(`# ${rule.id}: ${rule.description}`);

		if (rule.path) {
			if (rule.path.type === 'static') {
				// Simple path rewrite
				directives.push(`rewrite ${rule.path.value}`);
			} else {
				// Dynamic rewrite (regex-based)
				directives.push(`rewrite * ${rule.path.value}`);
			}
		}

		if (rule.query) {
			directives.push(`# Query rewrite: ${rule.query.value}`);
		}

		directives.push('');
	}

	return ok(directives);
}

// =============================================================================
// Transform Rules — Request Headers
// =============================================================================

/**
 * Generate Caddy request header modification directives.
 *
 * Uses `header_up` in reverse_proxy block for request headers.
 *
 * @param rules - Array of request header rules.
 * @returns Result containing Caddy directive strings.
 */
export function generateRequestHeaderDirectives(
	rules: ReadonlyArray<RequestHeaderRule>,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	const directives: Array<string> = ['# Request Header Modification'];

	for (const rule of rules) {
		if (!rule.enabled) continue;

		directives.push(`# ${rule.id}: ${rule.description}`);

		for (const header of rule.headers) {
			switch (header.operation) {
				case 'set':
					directives.push(`header_up ${header.name} "${header.value ?? ''}"`);
					break;
				case 'add':
					directives.push(`header_up +${header.name} "${header.value ?? ''}"`);
					break;
				case 'remove':
					directives.push(`header_up -${header.name}`);
					break;
			}
		}

		directives.push('');
	}

	return ok(directives);
}

// =============================================================================
// Transform Rules — Response Headers
// =============================================================================

/**
 * Generate Caddy response header modification directives.
 *
 * Uses `header` directive for response headers.
 *
 * @param rules - Array of response header rules.
 * @returns Result containing Caddy directive strings.
 */
export function generateResponseHeaderDirectives(
	rules: ReadonlyArray<ResponseHeaderRule>,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	const directives: Array<string> = ['# Response Header Modification'];

	for (const rule of rules) {
		if (!rule.enabled) continue;

		directives.push(`# ${rule.id}: ${rule.description}`);

		for (const header of rule.headers) {
			switch (header.operation) {
				case 'set':
					directives.push(`header ${header.name} "${header.value ?? ''}"`);
					break;
				case 'add':
					directives.push(`header +${header.name} "${header.value ?? ''}"`);
					break;
				case 'remove':
					directives.push(`header -${header.name}`);
					break;
			}
		}

		directives.push('');
	}

	return ok(directives);
}

// =============================================================================
// Transform Rules — Managed Transforms
// =============================================================================

/**
 * Generate Caddy directives for managed transforms.
 *
 * Pre-built header injection that maps to specific Caddy directives.
 *
 * @param managed - Managed transforms configuration.
 * @returns Array of Caddy directive strings.
 */
export function generateManagedTransformDirectives(
	managed: ManagedTransforms,
): ReadonlyArray<v.InferOutput<typeof v.string>> {
	const directives: Array<string> = ['# Managed Transforms'];

	if (managed.addTrueClientIp) {
		directives.push('header_up True-Client-IP {http.request.remote.host}');
	}
	if (managed.addCfConnectingIp) {
		directives.push('header_up CF-Connecting-IP {http.request.remote.host}');
	}
	if (managed.addCfIpCountry) {
		directives.push('header_up CF-IPCountry "XX"');
	}
	if (managed.addCfRay) {
		directives.push('header_up CF-RAY {http.request.uuid}-DEV');
	}
	if (managed.addXForwardedFor) {
		directives.push('# X-Forwarded-For handled natively by Caddy reverse_proxy');
	}
	if (managed.removeXPoweredBy) {
		directives.push('header -X-Powered-By');
	}
	if (managed.addBotManagementHeaders) {
		directives.push('# Bot management headers injected by bot.ts module');
	}

	directives.push('');
	return directives;
}

// =============================================================================
// Redirect Rules
// =============================================================================

/**
 * Generate Caddy redirect directives from single redirect rules.
 *
 * @param rules - Array of redirect rules.
 * @returns Result containing Caddy directive strings.
 */
export function generateRedirectDirectives(
	rules: ReadonlyArray<RedirectRule>,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	const directives: Array<string> = ['# Redirect Rules'];

	for (const rule of rules) {
		if (!rule.enabled) continue;

		directives.push(`# ${rule.id}: ${rule.description}`);

		const queryPart = rule.preserveQueryString ? '{query}' : '';
		const target = queryPart ? `${rule.target}?${queryPart}` : rule.target;

		directives.push(`redir ${target} ${String(rule.statusCode)}`);
		directives.push('');
	}

	return ok(directives);
}

/**
 * Generate Caddy bulk redirect directives.
 *
 * Uses Caddy's `map` directive for efficient large redirect tables.
 *
 * @param entries - Array of bulk redirect entries.
 * @returns Result containing Caddy directive strings.
 */
export function generateBulkRedirectDirectives(
	entries: ReadonlyArray<BulkRedirectEntry>,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	if (entries.length === 0) {
		return ok([]);
	}

	const directives: Array<string> = [
		'# Bulk Redirects',
		'map {http.request.uri.path} {redir_target} {redir_code} {',
		'	# Default: no redirect',
		'	default "" ""',
	];

	for (const entry of entries) {
		directives.push(`	${entry.sourcePath} "${entry.targetUrl}" ${String(entry.statusCode ?? 301)}`);
	}

	directives.push('}');
	directives.push('');
	directives.push('@has_redir expression {redir_target} != ""');
	directives.push('redir @has_redir {redir_target} {redir_code}');
	directives.push('');

	return ok(directives);
}

// =============================================================================
// Origin Rules
// =============================================================================

/**
 * Generate Caddy origin override directives.
 *
 * Modifies reverse_proxy upstream configuration per matched route.
 *
 * @param rules - Array of origin rules.
 * @returns Result containing Caddy directive strings.
 */
export function generateOriginRuleDirectives(
	rules: ReadonlyArray<OriginRule>,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	const directives: Array<string> = ['# Origin Rules'];

	for (const rule of rules) {
		if (!rule.enabled) continue;

		directives.push(`# ${rule.id}: ${rule.description}`);
		directives.push('# Note: Origin rules modify reverse_proxy block');

		if (rule.hostHeader) {
			directives.push(`header_up Host "${rule.hostHeader}"`);
		}
		if (rule.sniOverride) {
			directives.push(`transport http {`);
			directives.push(`	tls_server_name "${rule.sniOverride}"`);
			directives.push(`}`);
		}
		if (rule.destinationAddress) {
			directives.push(`# Upstream override: ${rule.destinationAddress}`);
		}
		if (rule.destinationPort) {
			directives.push(`# Port override: ${String(rule.destinationPort)}`);
		}

		directives.push('');
	}

	return ok(directives);
}

// =============================================================================
// Compression Rules
// =============================================================================

/**
 * Generate Caddy encode (compression) directives.
 *
 * @param config - Compression rules configuration.
 * @returns Result containing Caddy directive strings.
 */
export function generateCompressionDirectives(
	config: {
		rules: ReadonlyArray<CompressionRule>;
		defaultAlgorithms: ReadonlyArray<string>;
	},
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	const directives: Array<string> = ['# Compression'];

	// Default compression
	const algos = config.defaultAlgorithms.filter((a) => a !== 'none').join(' ');
	if (algos.length > 0) {
		directives.push(`encode ${algos}`);
	}

	directives.push('');
	return ok(directives);
}

// =============================================================================
// Custom Error Responses
// =============================================================================

/**
 * Generate Caddy custom error response directives.
 *
 * @param errors - Array of custom error response configs.
 * @returns Caddy directive strings.
 */
export function generateCustomErrorDirectives(
	errors: ReadonlyArray<CustomErrorResponse>,
): ReadonlyArray<v.InferOutput<typeof v.string>> {
	if (errors.length === 0) {
		return [];
	}

	const directives: Array<string> = ['# Custom Error Responses', 'handle_errors {'];

	for (const error of errors) {
		directives.push(`	@error${String(error.statusCode)} expression {http.error.status_code} == ${String(error.statusCode)}`);
		directives.push(`	handle @error${String(error.statusCode)} {`);
		directives.push(`		header Content-Type "${error.contentType}"`);
		directives.push(`		respond "${error.body.replace(/"/g, '\\"')}" ${String(error.statusCode)}`);
		directives.push('	}');
	}

	directives.push('}');
	directives.push('');
	return directives;
}

// =============================================================================
// Master Generator
// =============================================================================

/**
 * Generate complete Rules Engine Caddyfile directives.
 *
 * Composes all rule types into Caddy configuration.
 *
 * @param config - Complete rules engine configuration.
 * @returns Result containing the complete rules directive block.
 */
export function generateRulesEngineDirectives(
	config: RulesEngineConfig,
): Result<v.InferOutput<typeof v.string>> {
	const configResult = safeParse(RulesEngineConfigSchema, config);
	if (!configResult.ok) return configResult;
	const validConfig = configResult.data;

	const sections: Array<string> = [];

	sections.push('# ==========================================================');
	sections.push('# Rules Engine');
	sections.push('# ==========================================================');
	sections.push('');

	// Managed transforms
	const managed = validConfig.transforms?.managedTransforms ?? {};
	sections.push(...generateManagedTransformDirectives(managed));

	// URL rewrites
	if (validConfig.transforms?.urlRewrites && validConfig.transforms.urlRewrites.length > 0) {
		const rewriteResult = generateUrlRewriteDirectives(validConfig.transforms.urlRewrites);
		if (!rewriteResult.ok) return rewriteResult;
		sections.push(...rewriteResult.data);
	}

	// Request header modifications
	if (validConfig.transforms?.requestHeaders && validConfig.transforms.requestHeaders.length > 0) {
		const reqResult = generateRequestHeaderDirectives(validConfig.transforms.requestHeaders);
		if (!reqResult.ok) return reqResult;
		sections.push(...reqResult.data);
	}

	// Redirect rules
	if (validConfig.redirects?.rules && validConfig.redirects.rules.length > 0) {
		const redirResult = generateRedirectDirectives(validConfig.redirects.rules);
		if (!redirResult.ok) return redirResult;
		sections.push(...redirResult.data);
	}

	// Bulk redirects
	if (validConfig.redirects?.bulkRedirects && validConfig.redirects.bulkRedirects.length > 0) {
		const bulkResult = generateBulkRedirectDirectives(validConfig.redirects.bulkRedirects);
		if (!bulkResult.ok) return bulkResult;
		sections.push(...bulkResult.data);
	}

	// Origin rules
	if (validConfig.origin?.rules && validConfig.origin.rules.length > 0) {
		const originResult = generateOriginRuleDirectives(validConfig.origin.rules);
		if (!originResult.ok) return originResult;
		sections.push(...originResult.data);
	}

	// Response header modifications
	if (validConfig.transforms?.responseHeaders && validConfig.transforms.responseHeaders.length > 0) {
		const respResult = generateResponseHeaderDirectives(validConfig.transforms.responseHeaders);
		if (!respResult.ok) return respResult;
		sections.push(...respResult.data);
	}

	// Compression
	const compression = validConfig.compression ?? {};
	const compressionResult = generateCompressionDirectives({
		rules: compression.rules ?? [],
		defaultAlgorithms: compression.defaultAlgorithms ?? ['zstd', 'br', 'gzip'],
	});
	if (!compressionResult.ok) return compressionResult;
	sections.push(...compressionResult.data);

	// Custom error responses
	if (compression.customErrors && compression.customErrors.length > 0) {
		sections.push(...generateCustomErrorDirectives(compression.customErrors));
	}

	return ok(sections.join('\n'));
}
```

---

## 3. Pulumi Mapping: Rules Engine to Cloudflare Rulesets

### File: `packages/products/[product]/iac/src/rules.ts`

```typescript
/**
 * Pulumi Rules Engine Resource Generator
 *
 * Maps RulesEngineConfig → Cloudflare Ruleset resources.
 * Each rule type maps to a separate Cloudflare Ruleset in its respective phase.
 *
 * @module
 */

import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import type { RulesEngineConfig } from '@resist/schemas/core-config/src/edge-rules';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';

/**
 * Create all Rules Engine Pulumi resources.
 *
 * @param zoneId - Cloudflare zone ID.
 * @param config - Rules engine configuration.
 * @param namePrefix - Resource name prefix.
 * @returns Result containing all rules resources.
 */
export function createRulesEngineResources(
	zoneId: pulumi.Input<v.InferOutput<typeof v.string>>,
	config: RulesEngineConfig,
	namePrefix: v.InferOutput<typeof v.string>,
): Result<{
	transformRuleset?: cloudflare.Ruleset;
	redirectRuleset?: cloudflare.Ruleset;
	originRuleset?: cloudflare.Ruleset;
	configRuleset?: cloudflare.Ruleset;
	compressionRuleset?: cloudflare.Ruleset;
}> {
	const resources: Record<string, cloudflare.Ruleset> = {};

	// Transform rules (URL rewrites + request headers)
	const transformRules: Array<cloudflare.types.input.RulesetRule> = [];

	if (config.transforms?.urlRewrites) {
		for (const rule of config.transforms.urlRewrites) {
			if (!rule.enabled) continue;
			transformRules.push({
				action: 'rewrite',
				expression: rule.expression,
				description: rule.description,
				enabled: true,
				actionParameters: {
					uri: {
						path: rule.path ? { value: rule.path.value } : undefined,
						query: rule.query ? { value: rule.query.value } : undefined,
					},
				},
			});
		}
	}

	if (config.transforms?.requestHeaders) {
		for (const rule of config.transforms.requestHeaders) {
			if (!rule.enabled) continue;
			const headers: Record<string, cloudflare.types.input.RulesetRuleActionParametersHeadersItem> = {};
			for (const h of rule.headers) {
				headers[h.name] = {
					operation: h.operation,
					value: h.value,
				};
			}
			transformRules.push({
				action: 'rewrite',
				expression: rule.expression,
				description: rule.description,
				enabled: true,
				actionParameters: { headers },
			});
		}
	}

	if (transformRules.length > 0) {
		resources.transformRuleset = new cloudflare.Ruleset(`${namePrefix}-transforms`, {
			zoneId,
			name: `${namePrefix} Transform Rules`,
			description: 'URL rewrites and request header modifications',
			kind: 'zone',
			phase: 'http_request_transform',
			rules: transformRules,
		});
	}

	// Redirect rules
	if (config.redirects?.rules && config.redirects.rules.length > 0) {
		resources.redirectRuleset = new cloudflare.Ruleset(`${namePrefix}-redirects`, {
			zoneId,
			name: `${namePrefix} Redirect Rules`,
			description: 'Single and dynamic redirect rules',
			kind: 'zone',
			phase: 'http_request_redirect',
			rules: config.redirects.rules
				.filter((r) => r.enabled)
				.map((r) => ({
					action: 'redirect',
					expression: r.expression,
					description: r.description,
					enabled: true,
					actionParameters: {
						fromValue: {
							targetUrl: { value: r.target },
							statusCode: r.statusCode ?? 301,
							preserveQueryString: r.preserveQueryString ?? true,
						},
					},
				})),
		});
	}

	// Origin rules
	if (config.origin?.rules && config.origin.rules.length > 0) {
		resources.originRuleset = new cloudflare.Ruleset(`${namePrefix}-origin`, {
			zoneId,
			name: `${namePrefix} Origin Rules`,
			description: 'Origin server overrides',
			kind: 'zone',
			phase: 'http_request_origin',
			rules: config.origin.rules
				.filter((r) => r.enabled)
				.map((r) => ({
					action: 'route',
					expression: r.expression,
					description: r.description,
					enabled: true,
					actionParameters: {
						hostHeader: r.hostHeader,
						sni: r.sniOverride ? { value: r.sniOverride } : undefined,
						origin: r.destinationPort ? { port: r.destinationPort } : undefined,
					},
				})),
		});
	}

	// Configuration rules
	if (config.configuration?.rules && config.configuration.rules.length > 0) {
		resources.configRuleset = new cloudflare.Ruleset(`${namePrefix}-config`, {
			zoneId,
			name: `${namePrefix} Configuration Rules`,
			description: 'Per-request settings overrides',
			kind: 'zone',
			phase: 'http_config_settings',
			rules: config.configuration.rules
				.filter((r) => r.enabled)
				.map((r) => ({
					action: 'set_config',
					expression: r.expression,
					description: r.description,
					enabled: true,
					actionParameters: {
						automaticHttpsRewrites: r.settings.automaticHttpsRewrites,
						browserIntegrityCheck: r.settings.browserIntegrityCheck,
						emailObfuscation: r.settings.emailObfuscation,
						hotlinkProtection: r.settings.hotlinkProtection,
						securityLevel: r.settings.securityLevel,
						polish: r.settings.polish,
						rocketLoader: r.settings.rocketLoader,
						ssl: r.settings.sslMode,
					},
				})),
		});
	}

	return ok(resources);
}
```

---

## 4. Mapping Table: Cloudflare Setting to Caddy Directive

| Cloudflare Rule Type | Phase | Schema Field | Caddy Directive |
|---------------------|-------|-------------|----------------|
| URL Rewrite (static) | `http_request_transform` | `transforms.urlRewrites[].path.value` | `rewrite {path}` |
| URL Rewrite (dynamic) | `http_request_transform` | `transforms.urlRewrites[].path.value` | `rewrite * {expression}` |
| Request Header Set | `http_request_transform` | `transforms.requestHeaders[].headers` | `header_up {name} "{value}"` |
| Request Header Add | `http_request_transform` | `transforms.requestHeaders[].headers` | `header_up +{name} "{value}"` |
| Request Header Remove | `http_request_transform` | `transforms.requestHeaders[].headers` | `header_up -{name}` |
| Response Header Set | `http_request_late_transform` | `transforms.responseHeaders[].headers` | `header {name} "{value}"` |
| Response Header Remove | `http_request_late_transform` | `transforms.responseHeaders[].headers` | `header -{name}` |
| Managed: True-Client-IP | `http_request_transform` | `transforms.managedTransforms.addTrueClientIp` | `header_up True-Client-IP {remote_host}` |
| Managed: CF-Connecting-IP | `http_request_transform` | `transforms.managedTransforms.addCfConnectingIp` | `header_up CF-Connecting-IP {remote_host}` |
| Managed: CF-IPCountry | `http_request_transform` | `transforms.managedTransforms.addCfIpCountry` | `header_up CF-IPCountry "XX"` |
| Managed: CF-RAY | `http_request_transform` | `transforms.managedTransforms.addCfRay` | `header_up CF-RAY {uuid}-DEV` |
| Managed: Remove X-Powered-By | `http_request_late_transform` | `transforms.managedTransforms.removeXPoweredBy` | `header -X-Powered-By` |
| Single Redirect | `http_request_redirect` | `redirects.rules[].target` | `redir {target} {code}` |
| Bulk Redirect | `http_request_redirect` | `redirects.bulkRedirects[]` | `map {path} {redir_target}` + `redir` |
| Origin Host Override | `http_request_origin` | `origin.rules[].hostHeader` | `header_up Host "{value}"` |
| Origin SNI Override | `http_request_origin` | `origin.rules[].sniOverride` | `transport http { tls_server_name }` |
| Origin Port Override | `http_request_origin` | `origin.rules[].destinationPort` | `reverse_proxy localhost:{port}` |
| Config: Security Level | `http_config_settings` | `configuration.rules[].settings.securityLevel` | Per-route challenge severity |
| Config: SSL Mode | `http_config_settings` | `configuration.rules[].settings.sslMode` | Per-route upstream TLS mode |
| Config: Rocket Loader | `http_config_settings` | `configuration.rules[].settings.rocketLoader` | Per-route `<script defer>` injection |
| Compression | `http_response_compression` | `compression.defaultAlgorithms` | `encode zstd br gzip` |
| Custom Error | — | `compression.customErrors[]` | `handle_errors { respond ... }` |
| URL Normalization | — | `compression.urlNormalization` | Caddy normalizes by default |

---

## 5. Integration into Edge Tool

### File: `packages/shared/utils/cli/src/tools/edge/utils/caddy.ts`

```typescript
// In generateEdgeCaddyDirectives():

import { generateRulesEngineDirectives } from './transforms';

/**
 * Rules Engine section of the Caddyfile.
 *
 * Ordered after security (WAF, bot, firewall) but before caching.
 */
if (edgeConfig.rules) {
	const rulesResult = generateRulesEngineDirectives(edgeConfig.rules);
	if (!rulesResult.ok) return rulesResult;

	if (rulesResult.data.length > 0) {
		sections.push(rulesResult.data);
		sections.push('');
	}
}
```

---

## 6. Verification Steps

### Schema Validation

```bash
cat <<'EOF' | npx tsx -e "
import { safeParse } from '@/utils/result/safe';
import { RulesEngineConfigSchema } from '@resist/schemas/core-config/src/edge-rules';

const config = {
  transforms: {
    urlRewrites: [
      { id: 'api-v1', description: 'Rewrite API v1', expression: 'true', path: { type: 'static', value: '/api' } },
    ],
    managedTransforms: { addTrueClientIp: true, removeXPoweredBy: true },
    responseHeaders: [
      { id: 'security-headers', description: 'Add security headers', expression: 'true', headers: [
        { operation: 'set', name: 'X-Frame-Options', value: 'DENY' },
        { operation: 'set', name: 'X-Content-Type-Options', value: 'nosniff' },
      ]},
    ],
  },
  redirects: {
    rules: [
      { id: 'old-blog', description: 'Redirect old blog', expression: 'true', target: '/articles', statusCode: 301 },
    ],
    bulkRedirects: [
      { sourcePath: '/old-page', targetUrl: '/new-page', statusCode: 301 },
    ],
  },
  compression: {
    defaultAlgorithms: ['zstd', 'br', 'gzip'],
    customErrors: [
      { statusCode: 404, body: '<h1>Not Found</h1>' },
    ],
  },
};

const result = safeParse(RulesEngineConfigSchema, config);
console.log(result.ok ? 'PASS: Schema valid' : 'FAIL: ' + result.error);
"
EOF
```

### End-to-End Curl Tests

```bash
pnpm tool edge &
sleep 3

# Test 1: URL rewrite
curl -s -o /dev/null -w "%{redirect_url}" "https://localhost:3000/api/v1/users"
# Expected: Request rewritten to /api/users (internal, no redirect)

# Test 2: Managed transforms — True-Client-IP header
curl -s -D- "https://localhost:3000/" | grep "True-Client-IP"
# Expected: Present (injected by managed transform)

# Test 3: CF-RAY header
curl -s -D- "https://localhost:3000/" | grep "CF-RAY"
# Expected: CF-RAY: {uuid}-DEV

# Test 4: X-Powered-By removed
curl -s -D- "https://localhost:3000/" | grep "X-Powered-By"
# Expected: Not present (removed)

# Test 5: Single redirect
curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "https://localhost:3000/old-blog"
# Expected: 301 https://localhost:3000/articles

# Test 6: Bulk redirect
curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "https://localhost:3000/old-page"
# Expected: 301 /new-page

# Test 7: Compression — Accept-Encoding gzip
curl -s -D- -H "Accept-Encoding: gzip, br" "https://localhost:3000/" | grep "Content-Encoding"
# Expected: Content-Encoding: br (or gzip/zstd depending on client)

# Test 8: Custom 404 error page
curl -s "https://localhost:3000/nonexistent-page"
# Expected: Custom HTML "<h1>Not Found</h1>"

# Test 9: Response header modification
curl -s -D- "https://localhost:3000/" | grep -E "X-Frame-Options|X-Content-Type-Options"
# Expected: X-Frame-Options: DENY, X-Content-Type-Options: nosniff
```

---

## 7. Known Limitations & Simulation Gaps

| Feature | Cloudflare | Local Simulation | Gap |
|---------|-----------|-----------------|-----|
| Wirefilter expressions in rules | Full wirefilter syntax per rule | Rules applied globally (expression not evaluated per-request) | Expression-based routing not fully simulated |
| Dynamic URL rewrites | Dynamic expressions with CF fields | Static rewrites only | No dynamic expression evaluation |
| Bulk Redirect Lists | Separate list resource + rule | Caddy `map` directive | Different management model |
| Snippets | JS code execution at pipeline point | Translated to Caddy directives | Complex logic not translatable |
| Configuration rules | Per-request settings override | Global Caddy settings | Per-request override limited |
| Rule ordering guarantees | Fixed phase ordering | Caddy directive ordering | Ordering may differ subtly |
| Page Rules (legacy) | Separate legacy system | Not simulated (use modern rules) | Legacy not supported |

---

## 8. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-rules.ts` | `RulesEngineConfigSchema`, `TransformRulesConfigSchema`, `RedirectRulesConfigSchema`, `OriginRulesConfigSchema`, `ConfigurationRulesConfigSchema`, `SnippetsConfigSchema`, `CompressionRulesConfigSchema` |
| `packages/shared/utils/cli/src/tools/edge/utils/transforms.ts` | `generateRulesEngineDirectives()`, `generateUrlRewriteDirectives()`, `generateRequestHeaderDirectives()`, `generateResponseHeaderDirectives()`, `generateManagedTransformDirectives()`, `generateRedirectDirectives()`, `generateBulkRedirectDirectives()`, `generateOriginRuleDirectives()`, `generateCompressionDirectives()`, `generateCustomErrorDirectives()` |
| `packages/shared/utils/cli/src/tools/edge/utils/caddy.ts` | `generateEdgeCaddyDirectives()` — calls rules engine generator |
| `packages/products/[product]/iac/src/rules.ts` | `createRulesEngineResources()` — Pulumi IaC |

---

## 9. Dependencies

- **00-foundation.md** — Edge tool rename, config inheritance, `EdgeConfigSchema`
- **02-waf.md** — `cf-expression.ts` shared for wirefilter translation (used in rule expressions)
- **04-bot-management.md** — Bot management headers referenced by managed transforms toggle
- **15-cf-fields.md** — `CF-IPCountry`, `CF-RAY` headers injected by managed transforms

---

## 10. Implementation Order

1. Add primitive schemas to `edge-rules.ts` (redirect status codes, header operations, compression algorithms)
2. Add `UrlRewriteRuleSchema`, `RequestHeaderRuleSchema`, `ResponseHeaderRuleSchema`
3. Add `ManagedTransformsSchema` and `TransformRulesConfigSchema`
4. Add `RedirectRuleSchema`, `BulkRedirectEntrySchema`, `RedirectRulesConfigSchema`
5. Add `OriginRuleSchema`, `OriginRulesConfigSchema`
6. Add `ConfigurationRuleSchema`, `ConfigurationRulesConfigSchema`
7. Add `SnippetRuleSchema`, `SnippetsConfigSchema`
8. Add `CompressionRuleSchema`, `UrlNormalizationSchema`, `CustomErrorResponseSchema`, `CompressionRulesConfigSchema`
9. Add `RulesEngineConfigSchema` composing all sub-schemas
10. Create `transforms.ts` with URL rewrite generation
11. Add request/response header generation
12. Add managed transforms generation
13. Add redirect + bulk redirect generation
14. Add origin rule generation
15. Add compression + custom error generation
16. Add `generateRulesEngineDirectives()` master function
17. Hook into `generateEdgeCaddyDirectives()` in `caddy.ts`
18. Create Pulumi mapping in `rules.ts`
19. Write schema validation tests
20. Write Caddy generation tests
21. Write curl integration test script
