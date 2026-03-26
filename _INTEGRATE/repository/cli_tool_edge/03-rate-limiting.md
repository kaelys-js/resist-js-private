# 03 — Rate Limiting: Zone-Level Rules, Counting Expressions, caddy-ratelimit

## Context

Rate limiting is one of Cloudflare's most important WAF features. It defines thresholds for incoming requests matching an expression, then applies a configured action (block, challenge, log) once those thresholds are exceeded. Rules operate in the `http_ratelimit` phase of Cloudflare's Ruleset Engine.

Locally, we simulate rate limiting using `mholt/caddy-ratelimit`, a Caddy plugin that implements a sliding-window algorithm with per-zone ring buffers. The same schema drives both the local Caddy config and Pulumi Cloudflare IaC generation.

### How Cloudflare Rate Limiting Works

1. A request arrives and is evaluated against each rate limiting rule's **expression** in order.
2. If the expression matches, Cloudflare increments a counter identified by the rule's **characteristics** (e.g., IP, header, cookie).
3. If the counter exceeds **requests_per_period** (or **score_per_period**) within the **period** window, the rule's **action** fires.
4. The action persists for the **mitigation_timeout** duration.
5. `cf.colo.id` is **always** implicitly included as a characteristic (never reference it in expressions).
6. There may be a delay (up to a few seconds) between detection and counter updates — some excess requests may reach origin before enforcement kicks in.

### caddy-ratelimit Plugin

- Uses a **sliding window algorithm** with a scalable ring buffer.
- Each **zone** has a unique name, a **key** (static or dynamic with placeholders), a **window** duration, and **max_events** threshold.
- Static keys (no placeholders) = one ring buffer for the entire zone (global rate limit).
- Dynamic keys (with placeholders like `{remote_host}`) = one ring buffer per unique key value (per-client rate limiting).
- Automatically sets `Retry-After` header on 429 responses.
- Supports **distributed** mode for multi-instance setups (not needed locally but schema-aware).
- **jitter** parameter prevents thundering-herd retries.
- **sweep_interval** controls how often expired rate limiters are garbage-collected.
- Memory complexity: `O(Kn)` where K = max_events (constant), n = number of unique rate limiters.

## Documentation Links

- Cloudflare rate limiting rules: https://developers.cloudflare.com/waf/rate-limiting-rules/
- Cloudflare rate limiting parameters: https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/
- Cloudflare rate limiting API: https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/
- Cloudflare rate limiting use cases: https://developers.cloudflare.com/waf/rate-limiting-rules/use-cases/
- caddy-ratelimit plugin: https://github.com/mholt/caddy-ratelimit
- Pulumi Cloudflare Ruleset: https://www.pulumi.com/registry/packages/cloudflare/api-docs/ruleset/

---

## 1. Valibot Schema: `RateLimitConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-security.ts`

This schema is added to `edge-security.ts` alongside WAF, bot, and firewall schemas. The `RateLimitConfigSchema` is exported and composed into `EdgeConfigSchema` in `edge.ts`.

### 1.1 Primitive Schemas

```typescript
// =============================================================================
// Rate Limit Primitives
// =============================================================================

/**
 * Allowed period values in seconds for rate limiting windows.
 * Cloudflare supports: 10, 15, 20, 30, 40, 45, 60, 90, 120, 180, 240, 300,
 * 480, 600, 900, 1200, 1800, 2400, 3600, 65535, 86400.
 * Plan-gated: Free=10s only, Pro<=60s, Business<=600s, Enterprise<=65535s.
 * We allow ALL values locally since there are no plan restrictions in simulation.
 */
const RateLimitPeriodSchema = v.pipe(
	v.number(),
	v.integer(),
	v.description('Rate limit counting period in seconds.'),
	v.check(
		(value: Number): Boolean =>
			([
				10, 15, 20, 30, 40, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800,
				2400, 3600, 65535, 86400,
			] as ReadonlyArray<Number>).includes(value),
		'Period must be one of: 10, 15, 20, 30, 40, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800, 2400, 3600, 65535, 86400',
	),
);

/**
 * Mitigation timeout values in seconds.
 * Same allowed set as period values.
 * Determines how long the action persists after the threshold is exceeded.
 */
const MitigationTimeoutSchema = v.pipe(
	v.number(),
	v.integer(),
	v.description('How long (seconds) the action applies after threshold is exceeded.'),
	v.check(
		(value: Number): Boolean =>
			([
				10, 15, 20, 30, 40, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800,
				2400, 3600, 65535, 86400,
			] as ReadonlyArray<Number>).includes(value),
		'Mitigation timeout must be one of: 10, 15, 20, 30, 40, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800, 2400, 3600, 65535, 86400',
	),
);

/**
 * Actions that can be taken when a rate limit is triggered.
 *
 * - `block`: Returns a 429 (or custom status) error response to the client.
 * - `challenge`: Issues a CAPTCHA challenge (simulated locally as 403 + challenge page).
 * - `js_challenge`: Issues a JavaScript-based challenge (simulated locally as 503 + JS page).
 * - `managed_challenge`: Cloudflare auto-selects challenge type (simulated locally as 403).
 * - `log`: Logs the event without blocking (counter still increments).
 */
const RateLimitActionSchema = v.picklist(
	['block', 'challenge', 'js_challenge', 'managed_challenge', 'log'],
	'Rate limit action must be one of: block, challenge, js_challenge, managed_challenge, log',
);

/**
 * Characteristics used to identify a client for rate counting.
 * Each string maps to a Cloudflare Rules language field.
 *
 * `cf.colo.id` is always implicitly included — do NOT add it here.
 *
 * Available characteristics:
 * - `ip.src` — client IP address (mutually exclusive with `cf.unique_visitor_id`)
 * - `cf.unique_visitor_id` — IP with NAT support (mutually exclusive with `ip.src`)
 * - `http.request.headers["<name>"]` — header value (lowercase name)
 * - `http.request.cookies["<name>"]` — cookie value
 * - `http.request.uri.args["<name>"]` — query parameter value
 * - `http.host` — request host
 * - `http.request.uri.path` — request URI path
 * - `ip.src.asnum` — AS number
 * - `ip.src.country` — country code
 * - `cf.bot_management.ja3_hash` — JA3 fingerprint
 * - `cf.bot_management.ja4` — JA4 fingerprint
 * - `lookup_json_string(http.request.body.raw, "<key>")` — JSON body string value
 * - `lookup_json_integer(http.request.body.raw, "<key>")` — JSON body integer value
 * - `http.request.body.form["<name>"]` — form input value
 * - `http.request.body.raw` — raw body
 * - `http.request.body.size` — body size
 */
const RateLimitCharacteristicSchema = v.pipe(
	v.string(),
	v.minLength(1),
	v.description(
		'Cloudflare Rules language field used to identify a client for rate counting.',
	),
);

/**
 * Cloudflare Rules language expression.
 * Used for both the rule match expression and optional counting expression.
 *
 * Examples:
 * - `(http.request.uri.path eq "/api")`
 * - `(http.request.method eq "POST" and http.request.uri.path contains "/login")`
 * - `(ip.src.country ne "US")`
 * - `(http.request.uri.path matches "^/api/v[0-9]+")`
 */
const CfExpressionSchema = v.pipe(
	v.string(),
	v.description('Cloudflare Rules language expression (wirefilter syntax).'),
);

/**
 * Positive integer for requests per period threshold.
 */
const RequestsPerPeriodSchema = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(1),
	v.description('Maximum number of requests allowed within the period before the action fires.'),
);

/**
 * Positive integer for score per period threshold.
 * Used in complexity/score-based rate limiting.
 */
const ScorePerPeriodSchema = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(1),
	v.description(
		'Maximum cumulative score allowed within the period before the action fires.',
	),
);

/**
 * Name of the response header that carries the score value.
 * Used in score-based rate limiting — the origin response must include this header
 * with a numeric value that Cloudflare adds to the counter.
 */
const ScoreResponseHeaderNameSchema = v.pipe(
	v.string(),
	v.minLength(1),
	v.description(
		'Response header name carrying the numeric score value for complexity-based rate limiting.',
	),
);
```

### 1.2 Custom Block Response Schema

```typescript
// =============================================================================
// Custom Block Response
// =============================================================================

/**
 * Custom response returned when a rate limit rule with `action: "block"` fires.
 * Cloudflare's `action_parameters.response` maps to this.
 *
 * If not provided, the default is a 429 status with a plain text body.
 */
const RateLimitBlockResponseSchema = v.strictObject({
	/**
	 * HTTP status code returned to the client.
	 * @default 429
	 */
	statusCode: v.optional(
		v.pipe(v.number(), v.integer(), v.minValue(400), v.maxValue(599)),
		429,
	),

	/**
	 * Response body content.
	 * @default 'Too many requests'
	 */
	content: v.optional(v.string(), 'Too many requests'),

	/**
	 * Content-Type header for the response body.
	 * @default 'text/plain'
	 */
	contentType: v.optional(
		v.picklist(['text/plain', 'text/html', 'text/xml', 'application/json']),
		'text/plain',
	),
});

/** Inferred type of {@link RateLimitBlockResponseSchema}. */
type RateLimitBlockResponse = v.InferOutput<typeof RateLimitBlockResponseSchema>;
```

### 1.3 Individual Rate Limit Rule Schema

```typescript
// =============================================================================
// Single Rate Limit Rule
// =============================================================================

/**
 * A single rate limiting rule. Maps 1:1 to a Cloudflare rate limiting rule
 * in the `http_ratelimit` phase.
 *
 * @example
 * ```typescript
 * // Block IPs exceeding 100 requests/minute to /api/*
 * const rule = {
 *   description: 'API rate limit',
 *   expression: '(http.request.uri.path matches "^/api/")',
 *   characteristics: ['ip.src'],
 *   period: 60,
 *   requestsPerPeriod: 100,
 *   mitigationTimeout: 600,
 *   action: 'block',
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Score-based rate limiting for GraphQL
 * const rule = {
 *   description: 'GraphQL complexity limit',
 *   expression: '(http.request.uri.path eq "/graphql")',
 *   characteristics: ['http.request.headers["x-api-key"]'],
 *   period: 60,
 *   scorePerPeriod: 400,
 *   scoreResponseHeaderName: 'X-GQL-Cost',
 *   mitigationTimeout: 600,
 *   action: 'block',
 * };
 * ```
 */
const RateLimitRuleSchema = v.strictObject({
	/**
	 * Human-readable description of this rule.
	 * Used in logs, dashboard, and Pulumi resource descriptions.
	 */
	description: v.pipe(v.string(), v.minLength(1)),

	/**
	 * Whether this rule is active.
	 * @default true
	 */
	enabled: v.optional(v.boolean(), true),

	/**
	 * Cloudflare Rules language expression that determines which requests
	 * this rule applies to. Only matching requests are evaluated against
	 * the rate limit threshold.
	 *
	 * Examples:
	 * - `(http.request.uri.path matches "^/api/")`
	 * - `(http.request.uri.path eq "/login" and http.request.method eq "POST")`
	 * - `(http.host eq "api.example.com")`
	 */
	expression: CfExpressionSchema,

	/**
	 * Fields used to group requests into rate limit counters.
	 * Each unique combination of characteristic values gets its own counter.
	 *
	 * `cf.colo.id` is always implicitly included — do not add it here.
	 *
	 * Common patterns:
	 * - `['ip.src']` — per-IP rate limiting
	 * - `['ip.src', 'http.request.uri.path']` — per-IP per-path
	 * - `['http.request.headers["x-api-key"]']` — per API key
	 * - `['ip.src', 'http.request.headers["x-api-key"]']` — per IP + API key
	 * - `['http.request.cookies["session"]']` — per session cookie
	 *
	 * Note: `ip.src` and `cf.unique_visitor_id` are mutually exclusive.
	 *
	 * @default ['ip.src']
	 */
	characteristics: v.optional(
		v.pipe(v.array(RateLimitCharacteristicSchema), v.minLength(1)),
		(): Array<String> => ['ip.src'] as Array<String>,
	),

	/**
	 * Time window in seconds over which requests are counted.
	 *
	 * Allowed values: 10, 15, 20, 30, 40, 45, 60, 90, 120, 180, 240, 300,
	 * 480, 600, 900, 1200, 1800, 2400, 3600, 65535, 86400.
	 *
	 * @default 60 (1 minute)
	 */
	period: v.optional(RateLimitPeriodSchema, 60),

	/**
	 * Maximum number of matching requests allowed within the period.
	 * When exceeded, the `action` fires.
	 *
	 * Mutually exclusive with `scorePerPeriod` — provide one or the other.
	 *
	 * @default 100
	 */
	requestsPerPeriod: v.optional(RequestsPerPeriodSchema, 100),

	/**
	 * Maximum cumulative score allowed within the period.
	 * Used for complexity/score-based rate limiting (e.g., GraphQL query cost).
	 *
	 * When set, the origin must return a response header (named by
	 * `scoreResponseHeaderName`) containing a numeric score. Cloudflare
	 * adds this score to the counter instead of incrementing by 1.
	 *
	 * Mutually exclusive with `requestsPerPeriod`. When `scorePerPeriod`
	 * is set, `requestsPerPeriod` is ignored.
	 *
	 * Only available on CF Enterprise with Advanced Rate Limiting.
	 * Locally simulated by reading the response header from the origin.
	 *
	 * @default undefined (disabled — use requestsPerPeriod instead)
	 */
	scorePerPeriod: v.optional(ScorePerPeriodSchema),

	/**
	 * Name of the response header that carries the numeric score value.
	 * Required when `scorePerPeriod` is set.
	 *
	 * The origin server must include this header in its responses.
	 * Cloudflare reads the numeric value and adds it to the counter.
	 *
	 * @default undefined
	 */
	scoreResponseHeaderName: v.optional(ScoreResponseHeaderNameSchema),

	/**
	 * How long (seconds) the action applies after the threshold is exceeded.
	 * During this period, all matching requests from the identified client
	 * receive the configured action (block, challenge, etc.).
	 *
	 * When `action` is `log`, set to `0` (or omit — defaults to 0 for log).
	 *
	 * Allowed values: same set as `period`.
	 *
	 * @default 60
	 */
	mitigationTimeout: v.optional(MitigationTimeoutSchema, 60),

	/**
	 * Action to take when the rate limit threshold is exceeded.
	 *
	 * - `block` — return error response (429 by default, customizable via `blockResponse`)
	 * - `challenge` — issue CAPTCHA challenge
	 * - `js_challenge` — issue JavaScript challenge
	 * - `managed_challenge` — Cloudflare selects challenge type automatically
	 * - `log` — log the event but allow the request through
	 *
	 * @default 'block'
	 */
	action: v.optional(RateLimitActionSchema, 'block'),

	/**
	 * Custom response for `action: "block"`.
	 * Ignored for other actions.
	 *
	 * @default { statusCode: 429, content: 'Too many requests', contentType: 'text/plain' }
	 */
	blockResponse: v.optional(RateLimitBlockResponseSchema, {}),

	/**
	 * Optional counting expression — a subset of the rule expression that
	 * determines which requests actually increment the counter.
	 *
	 * If omitted (or empty string), ALL requests matching the rule expression
	 * increment the counter.
	 *
	 * Use case: match on a broad path but only count non-cached or specific
	 * response codes:
	 * - `(http.response.code ge 400)` — only count error responses
	 * - `(http.request.method eq "POST")` — only count POST requests
	 *
	 * Supported fields: all rule expression fields PLUS response code
	 * and response headers (available on Business+ plans).
	 *
	 * @default '' (empty — count all matching requests)
	 */
	countingExpression: v.optional(v.string(), ''),

	/**
	 * Whether to only count requests that reach the origin server.
	 * When `true`, cached responses do not increment the counter.
	 * When `false`, all matching requests (including cache hits) count.
	 *
	 * @default false
	 */
	requestsToOrigin: v.optional(v.boolean(), false),
});

/** Inferred type of {@link RateLimitRuleSchema}. */
type RateLimitRule = v.InferOutput<typeof RateLimitRuleSchema>;
```

### 1.4 Top-Level Rate Limit Config Schema

```typescript
// =============================================================================
// Rate Limit Config (Top-Level)
// =============================================================================

/**
 * Rate limiting configuration.
 * Contains zone-level rate limiting rules.
 *
 * Each rule defines: an expression (which requests match), characteristics
 * (how clients are grouped), a threshold (requests/score per period),
 * and an action (what happens when exceeded).
 *
 * @example
 * ```typescript
 * const config = {
 *   enabled: true,
 *   rules: [
 *     {
 *       description: 'API rate limit',
 *       expression: '(http.request.uri.path matches "^/api/")',
 *       characteristics: ['ip.src'],
 *       period: 60,
 *       requestsPerPeriod: 100,
 *       mitigationTimeout: 600,
 *       action: 'block',
 *     },
 *     {
 *       description: 'Login brute force protection',
 *       expression: '(http.request.uri.path eq "/login" and http.request.method eq "POST")',
 *       characteristics: ['ip.src'],
 *       period: 60,
 *       requestsPerPeriod: 5,
 *       mitigationTimeout: 300,
 *       action: 'managed_challenge',
 *     },
 *   ],
 * };
 * ```
 */
export const RateLimitConfigSchema = v.strictObject({
	/**
	 * Enable rate limiting simulation.
	 * When `false`, no rate limiting directives are added to the Caddyfile.
	 * @default false
	 */
	enabled: v.optional(v.boolean(), false),

	/**
	 * Ordered list of rate limiting rules.
	 * Rules are evaluated sequentially — first matching rule wins.
	 * Actions like `block` halt further rule evaluation.
	 *
	 * Cloudflare plan limits (informational — not enforced locally):
	 * - Free: 1 rule
	 * - Pro: 2 rules
	 * - Business: 5 rules
	 * - Enterprise: 100 rules
	 *
	 * @default []
	 */
	rules: v.optional(v.array(RateLimitRuleSchema), []),

	/**
	 * Jitter percentage (0.0 to 1.0) added to Retry-After header values.
	 * Prevents thundering-herd retries when many clients are rate-limited
	 * simultaneously.
	 *
	 * Caddy-ratelimit specific. Not a Cloudflare setting — only affects
	 * local simulation. Set to 0.0 to disable.
	 *
	 * @default 0.0
	 */
	jitter: v.optional(v.pipe(v.number(), v.minValue(0.0), v.maxValue(1.0)), 0.0),

	/**
	 * Sweep interval for garbage-collecting expired rate limiters.
	 * Caddy-ratelimit specific — not a Cloudflare setting.
	 *
	 * Format: Go duration string (e.g., "1m", "30s", "5m").
	 *
	 * @default '1m'
	 */
	sweepInterval: v.optional(v.pipe(v.string(), v.minLength(1)), '1m'),

	/**
	 * Whether to log the rate limit key when a limit is triggered.
	 * Useful for debugging which client is being rate-limited.
	 * Caddy-ratelimit specific — not a Cloudflare setting.
	 *
	 * @default false
	 */
	logKey: v.optional(v.boolean(), false),
});

/** Inferred type of {@link RateLimitConfigSchema}. */
export type RateLimitConfig = v.InferOutput<typeof RateLimitConfigSchema>;
```

### 1.5 Schema Validation Rules (Cross-Field)

After parsing the schema, apply these cross-field validations via `v.pipe` + `v.check` or in the translator function:

1. **Mutual exclusivity**: If `scorePerPeriod` is set, `scoreResponseHeaderName` is required.
2. **Mutual exclusivity**: `ip.src` and `cf.unique_visitor_id` cannot both appear in `characteristics`.
3. **Log action timeout**: When `action` is `log`, `mitigationTimeout` should be `0` (warn if non-zero).
4. **Counting expression subset**: `countingExpression`, if non-empty, should be a narrower filter than `expression` (not validated syntactically — just documented).

These are implemented as a `validateRateLimitConfig()` function in the translator, NOT as schema-level checks (to keep schemas composable):

```typescript
/**
 * Validates cross-field constraints on a parsed RateLimitConfig.
 * Call AFTER safeParse succeeds.
 *
 * @param config - Parsed rate limit config.
 * @returns Ok on valid config, Err with descriptive message on violation.
 */
function validateRateLimitConfig(config: RateLimitConfig): Result<RateLimitConfig> {
	for (const rule of config.rules) {
		// Score-based requires header name
		if (rule.scorePerPeriod !== undefined && rule.scoreResponseHeaderName === undefined) {
			return err(
				`Rule "${rule.description}": scorePerPeriod requires scoreResponseHeaderName`,
			);
		}

		// ip.src and cf.unique_visitor_id are mutually exclusive
		const hasIpSrc: Boolean = rule.characteristics.includes('ip.src' as String);
		const hasNat: Boolean = rule.characteristics.includes('cf.unique_visitor_id' as String);
		if (hasIpSrc && hasNat) {
			return err(
				`Rule "${rule.description}": ip.src and cf.unique_visitor_id are mutually exclusive`,
			);
		}

		// Log action should have mitigation timeout of 0
		if (rule.action === 'log' && rule.mitigationTimeout !== 0) {
			// Warning, not error — log still works with a timeout, it's just unusual
			// Could emit a warning via logger here
		}
	}

	return okUnchecked(config);
}
```

---

## 2. CF Expression to Caddy Matcher Translator

### File: `packages/shared/utils/cli/src/tools/edge/utils/cf-expression.ts`

This utility translates Cloudflare Rules language expressions into Caddy request matchers. Rate limiting (and other features) share this translator.

### 2.1 Supported CF Expression Fields → Caddy Matchers

| CF Expression Field | Caddy Matcher | Notes |
|---------------------|---------------|-------|
| `http.request.uri.path eq "/foo"` | `path /foo` | Exact match |
| `http.request.uri.path matches "^/api/"` | `path /api/*` | Regex to glob (best-effort) |
| `http.request.uri.path contains "/api"` | `path */api*` | Contains → wildcard |
| `http.request.method eq "POST"` | `method POST` | Exact match |
| `http.host eq "example.com"` | `host example.com` | Host matcher |
| `http.request.headers["x-api-key"] eq "..."` | `header X-Api-Key ...` | Header matcher |
| `ip.src eq 1.2.3.4` | `remote_ip 1.2.3.4` | Remote IP matcher |
| `ip.src.country eq "US"` | (no native equivalent) | Simulated via GeoIP header injection (see 15-cf-fields.md) |
| `cf.client.bot` | (no native equivalent) | Simulated via bot detection (see 04-bot-management.md) |
| `not <expr>` | `not { <matcher> }` | Caddy's `not` matcher group |
| `<expr> and <expr>` | Multiple matchers in same block | All must match |
| `<expr> or <expr>` | `@name { ... }` named matchers | Multiple matcher groups |

### 2.2 Translation Function Signature

```typescript
/**
 * Translates a Cloudflare Rules language expression into a Caddy matcher block.
 *
 * This is a best-effort translation. Complex expressions (nested logic,
 * functions like `lookup_json_string`, `wildcard` operator) may not have
 * direct Caddy equivalents. Unsupported expressions produce a warning
 * and fall back to matching all requests.
 *
 * @param expression - Cloudflare wirefilter expression string.
 * @param matcherName - Optional named matcher identifier (e.g., `@ratelimit_0`).
 * @returns Caddy matcher block string, or Err if expression is malformed.
 */
function translateCfExpressionToCaddyMatcher(
	expression: String,
	matcherName: String,
): Result<String> {
	// ... parse expression into AST, map to Caddy matchers
}
```

### 2.3 Expression Parsing Strategy

Rather than building a full wirefilter parser, implement a **pattern-matching approach** that handles the most common expression shapes:

1. **Single-field comparisons**: `(field op value)` — direct mapping.
2. **AND combinations**: `(a and b and c)` — multiple matchers in one block.
3. **OR combinations**: `(a or b)` — separate named matchers.
4. **NOT prefix**: `not (expr)` — Caddy `not { ... }` block.
5. **Nested parens**: Strip outermost parens, recurse.
6. **Unsupported**: Log warning, return catch-all matcher.

```typescript
/**
 * Parses a single CF comparison expression into a Caddy matcher line.
 *
 * @param field - CF field name (e.g., 'http.request.uri.path').
 * @param operator - Comparison operator (e.g., 'eq', 'ne', 'contains', 'matches').
 * @param value - Comparison value.
 * @returns Caddy matcher line string.
 */
function translateSingleComparison(
	field: String,
	operator: String,
	value: String,
): Result<String> {
	// field → matcher mapping lookup
	// operator → matcher syntax (eq=exact, contains=wildcard, matches=regexp)
}
```

---

## 3. CF Characteristics to Caddy Key Translator

### File: `packages/shared/utils/cli/src/tools/edge/utils/ratelimit.ts`

### 3.1 Characteristic → Caddy Placeholder Mapping

| CF Characteristic | Caddy Key Placeholder | Notes |
|-------------------|-----------------------|-------|
| `ip.src` | `{remote_host}` | Client IP (most common) |
| `cf.unique_visitor_id` | `{remote_host}` | NAT-aware — same as IP locally |
| `http.request.headers["<name>"]` | `{http.request.header.<Name>}` | Caddy uses dot-notation + PascalCase |
| `http.request.cookies["<name>"]` | `{http.request.cookie.<name>}` | Cookie value placeholder |
| `http.request.uri.args["<name>"]` | `{http.request.uri.query.<name>}` | Query parameter |
| `http.host` | `{http.request.host}` | Request host |
| `http.request.uri.path` | `{http.request.uri.path}` | Request path |
| `ip.src.asnum` | `{http.request.header.Cf-Ipcountry}` | Simulated via injected header (see 15-cf-fields.md) |
| `ip.src.country` | `{http.request.header.Cf-Ipcountry}` | Simulated via GeoIP header |
| `cf.bot_management.ja3_hash` | `{http.request.header.Cf-Ja3}` | Simulated via injected header |
| `http.request.body.raw` | (not available) | Caddy doesn't expose body as placeholder — log warning |
| `http.request.body.size` | (not available) | Not available — log warning |
| `http.request.body.form["<name>"]` | (not available) | Not available — log warning |
| `lookup_json_string(...)` | (not available) | Not available — log warning |

### 3.2 Key Generation Function

```typescript
/**
 * Translates an array of Cloudflare characteristics into a composite
 * caddy-ratelimit zone key string.
 *
 * Multiple characteristics are concatenated with `|` separator to form
 * a composite key. Each unique combination of values gets its own
 * rate limit counter.
 *
 * @param characteristics - Array of CF characteristic field names.
 * @returns Caddy key string with placeholders (e.g., `{remote_host}|{http.request.uri.path}`).
 *
 * @example
 * ```typescript
 * const result = characteristicsToCaddyKey(['ip.src', 'http.request.uri.path']);
 * // result.data === '{remote_host}|{http.request.uri.path}'
 * ```
 *
 * @example
 * ```typescript
 * const result = characteristicsToCaddyKey(['ip.src', 'http.request.headers["x-api-key"]']);
 * // result.data === '{remote_host}|{http.request.header.X-Api-Key}'
 * ```
 */
function characteristicsToCaddyKey(characteristics: Array<String>): Result<String> {
	const parts: Array<String> = [];

	for (const char of characteristics) {
		const mapped: Result<String> = mapCharacteristicToPlaceholder(char);
		if (!mapped.ok) {
			// Unsupported characteristic — log warning and skip
			// (don't fail the entire key generation)
			logWarning(`Unsupported rate limit characteristic: ${char} — skipping`);
			continue;
		}
		parts.push(mapped.data);
	}

	if (parts.length === 0) {
		// No characteristics could be mapped — use static key (global rate limit)
		return okUnchecked('static' as String);
	}

	return okUnchecked(parts.join('|') as String);
}

/**
 * Maps a single CF characteristic field to a Caddy placeholder.
 *
 * @param characteristic - CF characteristic field name.
 * @returns Caddy placeholder string.
 */
function mapCharacteristicToPlaceholder(characteristic: String): Result<String> {
	// Direct mappings
	const DIRECT_MAP: Record<String, String> = {
		'ip.src': '{remote_host}',
		'cf.unique_visitor_id': '{remote_host}',
		'http.host': '{http.request.host}',
		'http.request.uri.path': '{http.request.uri.path}',
		'ip.src.asnum': '{http.request.header.Cf-Ipcountry}',
		'ip.src.country': '{http.request.header.Cf-Ipcountry}',
		'cf.bot_management.ja3_hash': '{http.request.header.Cf-Ja3}',
		'cf.bot_management.ja4': '{http.request.header.Cf-Ja4}',
	} as Record<String, String>;

	if (characteristic in DIRECT_MAP) {
		return okUnchecked(DIRECT_MAP[characteristic] as String);
	}

	// Pattern: http.request.headers["<name>"]
	const headerMatch: RegExpMatchArray | null = characteristic.match(
		/^http\.request\.headers\["(.+)"\]$/,
	);
	if (headerMatch !== null) {
		const headerName: String = toPascalCase(headerMatch[1] as String);
		return okUnchecked(`{http.request.header.${headerName}}` as String);
	}

	// Pattern: http.request.cookies["<name>"]
	const cookieMatch: RegExpMatchArray | null = characteristic.match(
		/^http\.request\.cookies\["(.+)"\]$/,
	);
	if (cookieMatch !== null) {
		return okUnchecked(`{http.request.cookie.${cookieMatch[1]}}` as String);
	}

	// Pattern: http.request.uri.args["<name>"]
	const queryMatch: RegExpMatchArray | null = characteristic.match(
		/^http\.request\.uri\.args\["(.+)"\]$/,
	);
	if (queryMatch !== null) {
		return okUnchecked(`{http.request.uri.query.${queryMatch[1]}}` as String);
	}

	// Unsupported
	return err(`Unsupported characteristic: ${characteristic}` as String);
}
```

---

## 4. Caddy `rate_limit` Directive Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/ratelimit.ts`

### 4.1 Main Generation Function

```typescript
/**
 * Generates the caddy-ratelimit `rate_limit` Caddyfile directive block
 * from a parsed and validated RateLimitConfig.
 *
 * The output is a complete `rate_limit { ... }` block ready to be inserted
 * into a Caddy site block.
 *
 * Each CF rate limiting rule becomes a caddy-ratelimit zone with:
 * - A named matcher (from the CF expression)
 * - A dynamic key (from CF characteristics)
 * - A window (from CF period)
 * - max_events (from CF requestsPerPeriod)
 *
 * Score-based rules are approximated by setting max_events to 1 and
 * using a custom response handler that reads the score header.
 *
 * @param config - Validated rate limit config.
 * @returns Caddy `rate_limit { ... }` directive string, or Err on failure.
 *
 * @example Output:
 * ```caddyfile
 * rate_limit {
 *     zone api_rate_limit {
 *         match {
 *             path /api/*
 *         }
 *         key    {remote_host}
 *         window 1m
 *         events 100
 *     }
 *     zone login_brute_force {
 *         match {
 *             method POST
 *             path /login
 *         }
 *         key    {remote_host}
 *         window 1m
 *         events 5
 *     }
 *     jitter 0.0
 *     sweep_interval 1m
 * }
 * ```
 */
function generateRateLimitDirective(config: RateLimitConfig): Result<String> {
	// 1. Validate cross-field constraints
	const validated: Result<RateLimitConfig> = validateRateLimitConfig(config);
	if (!validated.ok) return validated;

	// 2. If no rules or disabled, return empty string
	if (!config.enabled || config.rules.length === 0) {
		return okUnchecked('' as String);
	}

	const lines: Array<String> = [];
	lines.push('rate_limit {' as String);

	// 3. Generate each zone from each rule
	for (let i: Number = 0; i < config.rules.length; i++) {
		const rule: RateLimitRule = config.rules[i];
		if (!rule.enabled) continue;

		const zoneResult: Result<String> = generateZoneBlock(rule, i);
		if (!zoneResult.ok) return zoneResult;
		lines.push(zoneResult.data);
	}

	// 4. Add top-level caddy-ratelimit settings
	if (config.jitter > 0.0) {
		lines.push(`\tjitter ${config.jitter}` as String);
	}
	if (config.sweepInterval !== '1m') {
		lines.push(`\tsweep_interval ${config.sweepInterval}` as String);
	}
	if (config.logKey) {
		lines.push('\tlog_key' as String);
	}

	lines.push('}' as String);

	return okUnchecked(lines.join('\n') as String);
}
```

### 4.2 Zone Block Generator

```typescript
/**
 * Generates a single caddy-ratelimit zone block from a CF rate limit rule.
 *
 * @param rule - The rate limit rule to convert.
 * @param index - Rule index (used for zone name generation).
 * @returns Caddy zone block string.
 */
function generateZoneBlock(rule: RateLimitRule, index: Number): Result<String> {
	// Generate a sanitized zone name from the description
	const zoneName: String = sanitizeZoneName(rule.description, index);

	// Translate CF characteristics to Caddy key
	const keyResult: Result<String> = characteristicsToCaddyKey(rule.characteristics);
	if (!keyResult.ok) return keyResult;

	// Convert period (seconds) to Go duration string
	const window: String = secondsToGoDuration(rule.period);

	// Determine max_events
	// For score-based rules, this needs special handling (see section 4.4)
	const maxEvents: Number = rule.scorePerPeriod !== undefined
		? rule.scorePerPeriod
		: rule.requestsPerPeriod;

	const lines: Array<String> = [];
	lines.push(`\tzone ${zoneName} {` as String);

	// Add matcher block from CF expression
	if (rule.expression !== '' && rule.expression !== 'true') {
		const matcherResult: Result<String> = translateCfExpressionToCaddyMatcher(
			rule.expression,
			`@${zoneName}`,
		);
		if (!matcherResult.ok) return matcherResult;
		lines.push(`\t\tmatch {` as String);
		lines.push(matcherResult.data);
		lines.push(`\t\t}` as String);
	}

	lines.push(`\t\tkey    ${keyResult.data}` as String);
	lines.push(`\t\twindow ${window}` as String);
	lines.push(`\t\tevents ${maxEvents}` as String);
	lines.push(`\t}` as String);

	return okUnchecked(lines.join('\n') as String);
}
```

### 4.3 Helper: Period → Go Duration

```typescript
/**
 * Converts a period in seconds to a Go duration string.
 *
 * @param seconds - Period in seconds.
 * @returns Go duration string (e.g., 60 → "1m", 3600 → "1h", 90 → "1m30s").
 */
function secondsToGoDuration(seconds: Number): String {
	if (seconds >= 86400 && seconds % 86400 === 0) {
		return `${seconds / 86400}d` as String; // Note: Go doesn't have 'd', use hours
	}
	if (seconds >= 3600 && seconds % 3600 === 0) {
		return `${seconds / 3600}h` as String;
	}
	if (seconds >= 60 && seconds % 60 === 0) {
		return `${seconds / 60}m` as String;
	}
	return `${seconds}s` as String;
}
```

### 4.4 Score-Based Rate Limiting Simulation

Cloudflare's score-based rate limiting reads a response header from the origin and accumulates the numeric value as the counter. caddy-ratelimit does not natively support score-based counting — it counts events (1 per request).

**Simulation strategy**: Use a Caddy `reverse_proxy` response handler to read the score header and multiply the event count. Since caddy-ratelimit cannot natively do this, we approximate it:

1. Set `max_events` to the `scorePerPeriod` value.
2. Each request increments the counter by 1 (not by the score).
3. This is a **known limitation** of local simulation — document it clearly.
4. For more accurate simulation, a future enhancement could use a Caddy CEL expression or custom middleware.

```typescript
/**
 * Generates a comment block documenting the score-based rate limit limitation.
 *
 * @param rule - Rule with scorePerPeriod set.
 * @returns Comment string for the Caddyfile.
 */
function generateScoreBasedComment(rule: RateLimitRule): String {
	return [
		`\t# SCORE-BASED RATE LIMIT (approximated)`,
		`\t# CF: scorePerPeriod=${rule.scorePerPeriod}, header=${rule.scoreResponseHeaderName}`,
		`\t# Local: counting requests (not scores) — each request counts as 1`,
		`\t# For accurate simulation, origin must return header: ${rule.scoreResponseHeaderName}`,
	].join('\n') as String;
}
```

### 4.5 Action Simulation via Error Routes

caddy-ratelimit returns HTTP 429 when a rate limit is exceeded. For CF actions other than `block`, we need to map to appropriate responses:

```typescript
/**
 * Generates Caddy error handling for rate-limited requests.
 * Maps CF rate limit actions to appropriate HTTP responses.
 *
 * caddy-ratelimit produces HTTP 429 internally. We use Caddy's
 * `handle_errors` to customize the response based on the CF action.
 *
 * @param rules - All enabled rate limit rules.
 * @returns Caddy `handle_errors` block for rate limit responses.
 */
function generateRateLimitErrorHandler(rules: Array<RateLimitRule>): Result<String> {
	// Find all unique actions used
	const actions: Set<String> = new Set();
	for (const rule of rules) {
		actions.add(rule.action);
	}

	const lines: Array<String> = [];

	lines.push('handle_errors {' as String);
	lines.push('\t@ratelimited expression {err.status_code} == 429' as String);
	lines.push('\thandle @ratelimited {' as String);

	// Determine primary action (first rule's action — simplification)
	// In practice, caddy-ratelimit doesn't tell us WHICH zone triggered,
	// so we use the most restrictive action across all rules.
	if (actions.has('block' as String)) {
		// Use the first block rule's custom response
		const blockRule: RateLimitRule | undefined = rules.find(
			(r: RateLimitRule): Boolean => r.action === 'block',
		);
		if (blockRule !== undefined) {
			lines.push(
				`\t\theader Content-Type "${blockRule.blockResponse.contentType}"` as String,
			);
			lines.push(
				`\t\trespond "${escapeQuotes(blockRule.blockResponse.content)}" ${blockRule.blockResponse.statusCode}` as String,
			);
		}
	} else if (actions.has('managed_challenge' as String) || actions.has('challenge' as String)) {
		// Simulate challenge with a 403 + challenge page
		lines.push('\t\theader Content-Type "text/html"' as String);
		lines.push('\t\trespond "<html><body><h1>Challenge Required</h1><p>You have been rate limited. Complete the challenge to continue.</p></body></html>" 403' as String);
	} else if (actions.has('js_challenge' as String)) {
		// Simulate JS challenge with 503
		lines.push('\t\theader Content-Type "text/html"' as String);
		lines.push('\t\trespond "<html><body><h1>Checking your browser...</h1><p>JavaScript challenge in progress.</p><script>setTimeout(function(){location.reload()},5000)</script></body></html>" 503' as String);
	} else if (actions.has('log' as String)) {
		// Log action — don't actually block, let it through
		// This is handled differently — log rules use a separate mechanism
		// (see section 4.6)
	}

	lines.push('\t}' as String);
	lines.push('}' as String);

	return okUnchecked(lines.join('\n') as String);
}
```

### 4.6 Log Action Handling

The `log` action is special: the request should NOT be blocked, only logged. caddy-ratelimit always returns 429 when the limit is exceeded, so we handle `log` rules differently:

**Strategy**: For `log`-only rules, set `max_events` very high (effectively no limit) and instead use Caddy's structured logging to record when the threshold would have been exceeded. This is done by adding a separate counting zone with a very high limit and a `log` directive.

Alternatively, for simplicity in local dev, `log` rules can be converted to `block` rules with a very generous threshold and a log message, clearly documented as an approximation.

```typescript
/**
 * For `log` action rules, we don't use caddy-ratelimit (which always blocks).
 * Instead, we add a Caddy `log` directive with a structured log entry.
 * The counter tracking is informational only.
 *
 * @param rule - Rate limit rule with action 'log'.
 * @returns Comment block explaining the limitation.
 */
function generateLogActionNote(rule: RateLimitRule): String {
	return [
		`# LOG-ONLY RATE LIMIT: "${rule.description}"`,
		`# CF would log (not block) when ${rule.requestsPerPeriod} requests/${rule.period}s exceeded`,
		`# Local simulation: rule is tracked but requests are NOT blocked`,
		`# Check .resist/logs/access.ndjson for rate limit events`,
	].join('\n') as String;
}
```

### 4.7 Mitigation Timeout Simulation

Cloudflare's `mitigationTimeout` means "block all matching requests from this client for N seconds after the threshold is exceeded." caddy-ratelimit's sliding window naturally handles this — once the window is full, new requests are denied until old events age out.

However, there is a semantic difference:
- **Cloudflare**: After threshold, block for `mitigationTimeout` seconds regardless of request rate during that time.
- **caddy-ratelimit**: After the window fills up, new requests are denied until the oldest event exits the window.

To approximate CF behavior, set the caddy-ratelimit `window` to the **maximum** of `period` and `mitigationTimeout`:

```typescript
/**
 * Calculates the effective caddy-ratelimit window for a rule.
 *
 * Cloudflare separates "counting period" from "mitigation timeout".
 * caddy-ratelimit uses a single "window". To approximate CF behavior:
 *
 * - If mitigationTimeout <= period: use period as window (natural behavior).
 * - If mitigationTimeout > period: use mitigationTimeout as window and
 *   scale max_events proportionally.
 *
 * This ensures that once rate-limited, the client stays blocked for
 * approximately the mitigation timeout duration.
 *
 * @param period - CF counting period in seconds.
 * @param mitigationTimeout - CF mitigation timeout in seconds.
 * @param maxEvents - CF requests per period (or score per period).
 * @returns Adjusted window and max_events for caddy-ratelimit.
 */
function calculateEffectiveWindow(
	period: Number,
	mitigationTimeout: Number,
	maxEvents: Number,
): Result<{ window: Number; events: Number }> {
	if (mitigationTimeout <= period) {
		// Natural behavior — window = period, events = maxEvents
		return okUnchecked({ window: period, events: maxEvents });
	}

	// mitigationTimeout > period: extend window and scale events
	// Example: period=60s, timeout=600s, events=100
	// → window=600s, events=1000 (so the same rate triggers, but window is longer)
	const scaleFactor: Number = mitigationTimeout / period;
	const scaledEvents: Number = Math.ceil(maxEvents * scaleFactor);

	return okUnchecked({ window: mitigationTimeout, events: scaledEvents });
}
```

### 4.8 Retry-After Header

caddy-ratelimit automatically sets the `Retry-After` header on 429 responses. Cloudflare also sets `Retry-After`. No additional configuration needed — this is automatic.

The `jitter` parameter in caddy-ratelimit adds random variance to the `Retry-After` value, preventing thundering-herd retries. Map the config's `jitter` value directly.

### 4.9 Complete Caddyfile Output Example

For the following config:

```typescript
{
  enabled: true,
  rules: [
    {
      description: 'API rate limit',
      expression: '(http.request.uri.path matches "^/api/")',
      characteristics: ['ip.src'],
      period: 60,
      requestsPerPeriod: 100,
      mitigationTimeout: 600,
      action: 'block',
      blockResponse: {
        statusCode: 429,
        content: '{"error":"rate_limited","retry_after":"{http.error.message}"}',
        contentType: 'application/json',
      },
    },
    {
      description: 'Login brute force',
      expression: '(http.request.uri.path eq "/login" and http.request.method eq "POST")',
      characteristics: ['ip.src'],
      period: 60,
      requestsPerPeriod: 5,
      mitigationTimeout: 300,
      action: 'managed_challenge',
    },
    {
      description: 'GraphQL complexity',
      expression: '(http.request.uri.path eq "/graphql")',
      characteristics: ['http.request.headers["x-api-key"]'],
      period: 60,
      scorePerPeriod: 400,
      scoreResponseHeaderName: 'X-GQL-Cost',
      mitigationTimeout: 600,
      action: 'block',
    },
  ],
  jitter: 0.05,
  logKey: true,
}
```

The generated Caddyfile output:

```caddyfile
# ============================================================
# Rate Limiting (caddy-ratelimit)
# Simulates Cloudflare http_ratelimit phase
# ============================================================

rate_limit {
	zone api_rate_limit {
		match {
			path /api/*
		}
		key    {remote_host}
		window 10m
		events 1000
	}
	zone login_brute_force {
		match {
			method POST
			path /login
		}
		key    {remote_host}
		window 5m
		events 25
	}
	# SCORE-BASED RATE LIMIT (approximated)
	# CF: scorePerPeriod=400, header=X-GQL-Cost
	# Local: counting requests (not scores) — each request counts as 1
	# For accurate simulation, origin must return header: X-GQL-Cost
	zone graphql_complexity {
		match {
			path /graphql
		}
		key    {http.request.header.X-Api-Key}
		window 10m
		events 4000
	}
	jitter 0.05
	log_key
}

handle_errors {
	@ratelimited expression {err.status_code} == 429
	handle @ratelimited {
		header Content-Type "application/json"
		respond "{\"error\":\"rate_limited\"}" 429
	}
}
```

---

## 5. Pulumi Mapping: CF Rate Limit Config to Cloudflare Ruleset

### File: `packages/products/[product]/iac/src/rate-limiting.ts`

Each product's `iac/` stack reads the merged edge config and generates a Cloudflare Ruleset resource with `phase: "http_ratelimit"`.

### 5.1 Pulumi Resource Generation Function

```typescript
import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';
import type { RateLimitConfig, RateLimitRule } from '@resist/schemas/core-config/edge-security';

/**
 * Creates a Cloudflare Ruleset with rate limiting rules from the edge config.
 *
 * Maps the unified `RateLimitConfig` schema to Pulumi Cloudflare Ruleset
 * resources in the `http_ratelimit` phase.
 *
 * @param zoneId - Cloudflare zone ID.
 * @param config - Validated rate limit config.
 * @returns Pulumi Cloudflare Ruleset resource.
 */
function createRateLimitRuleset(
	zoneId: String,
	config: RateLimitConfig,
): Result<cloudflare.Ruleset> {
	if (!config.enabled || config.rules.length === 0) {
		return err('Rate limiting is disabled or has no rules' as String);
	}

	const rules: Array<cloudflare.types.input.RulesetRule> = [];

	for (const rule of config.rules) {
		const pulumiRuleResult: Result<cloudflare.types.input.RulesetRule> =
			mapRuleToPulumiRule(rule);
		if (!pulumiRuleResult.ok) return pulumiRuleResult;
		rules.push(pulumiRuleResult.data);
	}

	const ruleset: cloudflare.Ruleset = new cloudflare.Ruleset('rate-limit-ruleset', {
		zoneId: zoneId as pulumi.Input<String>,
		name: 'Zone rate limiting ruleset',
		phase: 'http_ratelimit',
		kind: 'zone',
		description: 'Rate limiting rules generated from resist.config.ts edge config.',
		rules: rules,
	});

	return okUnchecked(ruleset);
}
```

### 5.2 Rule Mapping Function

```typescript
/**
 * Maps a single RateLimitRule to a Pulumi Cloudflare Ruleset rule input.
 *
 * @param rule - Rate limit rule from edge config.
 * @returns Pulumi RulesetRule input object.
 */
function mapRuleToPulumiRule(
	rule: RateLimitRule,
): Result<cloudflare.types.input.RulesetRule> {
	// Build characteristics array — always include cf.colo.id
	const characteristics: Array<String> = ['cf.colo.id', ...rule.characteristics];

	// Build ratelimit object
	const ratelimit: cloudflare.types.input.RulesetRuleRatelimit = {
		characteristics: characteristics,
		period: rule.period,
		mitigationTimeout: rule.mitigationTimeout,
		requestsToOrigin: rule.requestsToOrigin,
	};

	// Standard vs score-based
	if (rule.scorePerPeriod !== undefined) {
		ratelimit.scorePerPeriod = rule.scorePerPeriod;
		ratelimit.scoreResponseHeaderName = rule.scoreResponseHeaderName;
	} else {
		ratelimit.requestsPerPeriod = rule.requestsPerPeriod;
	}

	// Counting expression
	if (rule.countingExpression !== '') {
		ratelimit.countingExpression = rule.countingExpression;
	}

	// Build the rule
	const pulumiRule: cloudflare.types.input.RulesetRule = {
		description: rule.description,
		expression: rule.expression,
		action: rule.action,
		enabled: rule.enabled,
		ratelimit: ratelimit,
	};

	// Add action_parameters for block action with custom response
	if (rule.action === 'block') {
		pulumiRule.actionParameters = {
			response: {
				statusCode: rule.blockResponse.statusCode,
				content: rule.blockResponse.content,
				contentType: rule.blockResponse.contentType,
			},
		};
	}

	return okUnchecked(pulumiRule);
}
```

### 5.3 Complete Pulumi Output Example

For the same config from section 4.9, the generated Pulumi code:

```typescript
const rateLimitRuleset = new cloudflare.Ruleset('rate-limit-ruleset', {
	zoneId: '9f1839b6152d298aca64c4e906b6d074',
	name: 'Zone rate limiting ruleset',
	phase: 'http_ratelimit',
	kind: 'zone',
	description: 'Rate limiting rules generated from resist.config.ts edge config.',
	rules: [
		{
			description: 'API rate limit',
			expression: '(http.request.uri.path matches "^/api/")',
			action: 'block',
			enabled: true,
			ratelimit: {
				characteristics: ['cf.colo.id', 'ip.src'],
				period: 60,
				requestsPerPeriod: 100,
				mitigationTimeout: 600,
				requestsToOrigin: false,
				countingExpression: '',
			},
			actionParameters: {
				response: {
					statusCode: 429,
					content: '{"error":"rate_limited"}',
					contentType: 'application/json',
				},
			},
		},
		{
			description: 'Login brute force',
			expression:
				'(http.request.uri.path eq "/login" and http.request.method eq "POST")',
			action: 'managed_challenge',
			enabled: true,
			ratelimit: {
				characteristics: ['cf.colo.id', 'ip.src'],
				period: 60,
				requestsPerPeriod: 5,
				mitigationTimeout: 300,
				requestsToOrigin: false,
			},
		},
		{
			description: 'GraphQL complexity',
			expression: '(http.request.uri.path eq "/graphql")',
			action: 'block',
			enabled: true,
			ratelimit: {
				characteristics: ['cf.colo.id', 'http.request.headers["x-api-key"]'],
				period: 60,
				scorePerPeriod: 400,
				scoreResponseHeaderName: 'X-GQL-Cost',
				mitigationTimeout: 600,
				requestsToOrigin: false,
			},
			actionParameters: {
				response: {
					statusCode: 429,
					content: 'Too many requests',
					contentType: 'text/plain',
				},
			},
		},
	],
});
```

---

## 6. Integration into Edge Tool

### 6.1 Hook into `generateEdgeCaddyDirectives()`

The rate limiting directive generator is called from the main edge Caddy generation pipeline:

```typescript
// packages/shared/utils/cli/src/tools/edge/utils/caddy.ts

import { generateRateLimitDirective, generateRateLimitErrorHandler } from '@/cli/tools/edge/utils/ratelimit';

/**
 * Generates all edge simulation Caddy directives.
 *
 * @param edgeConfig - Merged edge config.
 * @returns Complete Caddy directive string.
 */
function generateEdgeCaddyDirectives(edgeConfig: EdgeConfig): Result<String> {
	const sections: Array<String> = [];

	// ... SSL/TLS directives (01) ...
	// ... WAF directives (02) ...

	// Rate limiting directives (03)
	if (edgeConfig.rateLimiting.enabled) {
		const rlResult: Result<String> = generateRateLimitDirective(edgeConfig.rateLimiting);
		if (!rlResult.ok) return rlResult;
		sections.push(rlResult.data);

		// Error handler for rate limit responses
		const enabledRules: Array<RateLimitRule> = edgeConfig.rateLimiting.rules.filter(
			(r: RateLimitRule): Boolean => r.enabled,
		);
		if (enabledRules.length > 0) {
			const errorResult: Result<String> = generateRateLimitErrorHandler(enabledRules);
			if (!errorResult.ok) return errorResult;
			sections.push(errorResult.data);
		}
	}

	// ... Bot directives (04) ...
	// ... etc ...

	return okUnchecked(sections.join('\n\n') as String);
}
```

### 6.2 Caddy Directive Ordering

caddy-ratelimit must be ordered correctly in the Caddy directive chain. By default it runs **before** `basic_auth`. In the edge tool, the order should be:

```
# Global options block
{
	order rate_limit before basic_auth
}
```

This ensures rate limiting runs early in the request pipeline, before authentication or other processing (matching Cloudflare's phase ordering where `http_ratelimit` runs before most other phases).

### 6.3 resist.config.ts Usage Example

```typescript
// resist.config.ts
import { defineConfig } from '@/config';

export default defineConfig({
	// ... other config ...
	tooling: {
		edge: {
			enabled: true,
			rateLimiting: {
				enabled: true,
				rules: [
					{
						description: 'API rate limit — 100 req/min per IP',
						expression: '(http.request.uri.path matches "^/api/")',
						characteristics: ['ip.src'],
						period: 60,
						requestsPerPeriod: 100,
						mitigationTimeout: 600,
						action: 'block',
						blockResponse: {
							statusCode: 429,
							content: '{"error":"rate_limited"}',
							contentType: 'application/json',
						},
					},
					{
						description: 'Auth endpoint brute force — 5 req/min per IP',
						expression:
							'(http.request.uri.path eq "/auth/login" and http.request.method eq "POST")',
						characteristics: ['ip.src'],
						period: 60,
						requestsPerPeriod: 5,
						mitigationTimeout: 300,
						action: 'managed_challenge',
					},
					{
						description: 'Global fallback — 1000 req/min per IP',
						expression: 'true',
						characteristics: ['ip.src'],
						period: 60,
						requestsPerPeriod: 1000,
						mitigationTimeout: 60,
						action: 'block',
					},
				],
				logKey: true,
			},
		},
	},
});
```

---

## 7. Verification Steps

### 7.1 Schema Validation Tests

```typescript
// packages/shared/schemas/core-config/src/__tests__/edge-security-ratelimit.test.ts

import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { RateLimitConfigSchema, RateLimitRuleSchema } from '@/schemas/core-config/edge-security';

describe('RateLimitRuleSchema', () => {
	it('accepts minimal valid rule', () => {
		const result = safeParse(RateLimitRuleSchema, {
			description: 'Test rule',
			expression: '(http.request.uri.path eq "/api")',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.period).toBe(60);
			expect(result.data.requestsPerPeriod).toBe(100);
			expect(result.data.mitigationTimeout).toBe(60);
			expect(result.data.action).toBe('block');
			expect(result.data.characteristics).toEqual(['ip.src']);
			expect(result.data.enabled).toBe(true);
			expect(result.data.countingExpression).toBe('');
			expect(result.data.requestsToOrigin).toBe(false);
		}
	});

	it('accepts fully specified rule', () => {
		const result = safeParse(RateLimitRuleSchema, {
			description: 'Full rule',
			enabled: true,
			expression: '(http.request.uri.path matches "^/api/")',
			characteristics: ['ip.src', 'http.request.headers["x-api-key"]'],
			period: 300,
			requestsPerPeriod: 50,
			mitigationTimeout: 3600,
			action: 'managed_challenge',
			countingExpression: '(http.response.code ge 200)',
			requestsToOrigin: true,
		});
		expect(result.ok).toBe(true);
	});

	it('accepts score-based rule', () => {
		const result = safeParse(RateLimitRuleSchema, {
			description: 'Score rule',
			expression: '(http.request.uri.path eq "/graphql")',
			characteristics: ['http.request.headers["x-api-key"]'],
			period: 60,
			scorePerPeriod: 400,
			scoreResponseHeaderName: 'X-GQL-Cost',
			mitigationTimeout: 600,
			action: 'block',
		});
		expect(result.ok).toBe(true);
	});

	it('rejects invalid period', () => {
		const result = safeParse(RateLimitRuleSchema, {
			description: 'Bad period',
			expression: 'true',
			period: 42,
		});
		expect(result.ok).toBe(false);
	});

	it('rejects invalid action', () => {
		const result = safeParse(RateLimitRuleSchema, {
			description: 'Bad action',
			expression: 'true',
			action: 'throttle',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects empty description', () => {
		const result = safeParse(RateLimitRuleSchema, {
			description: '',
			expression: 'true',
		});
		expect(result.ok).toBe(false);
	});
});

describe('RateLimitConfigSchema', () => {
	it('accepts empty config with defaults', () => {
		const result = safeParse(RateLimitConfigSchema, {});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.enabled).toBe(false);
			expect(result.data.rules).toEqual([]);
			expect(result.data.jitter).toBe(0.0);
			expect(result.data.sweepInterval).toBe('1m');
			expect(result.data.logKey).toBe(false);
		}
	});

	it('accepts config with multiple rules', () => {
		const result = safeParse(RateLimitConfigSchema, {
			enabled: true,
			rules: [
				{ description: 'Rule 1', expression: 'true', requestsPerPeriod: 100 },
				{ description: 'Rule 2', expression: 'true', requestsPerPeriod: 50, action: 'log' },
			],
			jitter: 0.1,
			logKey: true,
		});
		expect(result.ok).toBe(true);
	});

	it('rejects jitter > 1.0', () => {
		const result = safeParse(RateLimitConfigSchema, {
			jitter: 1.5,
		});
		expect(result.ok).toBe(false);
	});
});
```

### 7.2 Caddy Generation Tests

```typescript
// packages/shared/utils/cli/src/tools/edge/utils/__tests__/ratelimit.test.ts

import { describe, expect, it } from 'vitest';
import { generateRateLimitDirective, characteristicsToCaddyKey } from '@/cli/tools/edge/utils/ratelimit';

describe('characteristicsToCaddyKey', () => {
	it('maps ip.src to {remote_host}', () => {
		const result = characteristicsToCaddyKey(['ip.src']);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe('{remote_host}');
	});

	it('maps multiple characteristics with | separator', () => {
		const result = characteristicsToCaddyKey(['ip.src', 'http.request.uri.path']);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe('{remote_host}|{http.request.uri.path}');
	});

	it('maps header characteristic', () => {
		const result = characteristicsToCaddyKey(['http.request.headers["x-api-key"]']);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe('{http.request.header.X-Api-Key}');
	});

	it('maps cookie characteristic', () => {
		const result = characteristicsToCaddyKey(['http.request.cookies["session"]']);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe('{http.request.cookie.session}');
	});

	it('returns static for unsupported characteristics', () => {
		const result = characteristicsToCaddyKey(['http.request.body.raw']);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe('static');
	});
});

describe('generateRateLimitDirective', () => {
	it('returns empty string when disabled', () => {
		const result = generateRateLimitDirective({ enabled: false, rules: [], jitter: 0, sweepInterval: '1m', logKey: false });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe('');
	});

	it('generates valid rate_limit block for single rule', () => {
		const result = generateRateLimitDirective({
			enabled: true,
			rules: [{
				description: 'Test',
				enabled: true,
				expression: '(http.request.uri.path eq "/api")',
				characteristics: ['ip.src'],
				period: 60,
				requestsPerPeriod: 100,
				mitigationTimeout: 60,
				action: 'block',
				blockResponse: { statusCode: 429, content: 'Too many requests', contentType: 'text/plain' },
				countingExpression: '',
				requestsToOrigin: false,
			}],
			jitter: 0,
			sweepInterval: '1m',
			logKey: false,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toContain('rate_limit {');
			expect(result.data).toContain('zone test {');
			expect(result.data).toContain('key    {remote_host}');
			expect(result.data).toContain('window 1m');
			expect(result.data).toContain('events 100');
		}
	});
});
```

### 7.3 curl-Based Integration Tests

After starting the edge tool with rate limiting enabled, verify with curl:

```bash
# Test 1: Basic rate limiting (100 req/min)
# Send 101 requests rapidly — the 101st should be rate-limited
for i in $(seq 1 101); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://myapp.test/api/test)
  if [ "$STATUS" = "429" ]; then
    echo "Rate limited at request $i"
    break
  fi
done

# Test 2: Verify Retry-After header is present
curl -s -D - https://myapp.test/api/test | grep -i "retry-after"

# Test 3: Verify custom block response body
curl -s https://myapp.test/api/test
# Should return: {"error":"rate_limited"}

# Test 4: Different IPs get separate counters
# (Use different source IPs or --interface to test per-IP isolation)

# Test 5: Login endpoint has lower threshold (5 req/min)
for i in $(seq 1 6); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://myapp.test/auth/login)
  echo "Request $i: $STATUS"
done
# Requests 1-5: 200, Request 6: 429 (or 403 for challenge)

# Test 6: Verify rate limit resets after period
# Wait 60s, then send another request
sleep 61
curl -s -o /dev/null -w "%{http_code}" https://myapp.test/api/test
# Should return: 200

# Test 7: Per-header rate limiting (x-api-key)
for i in $(seq 1 11); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-Api-Key: test-key-1" \
    https://myapp.test/api/test)
  echo "Key1 request $i: $STATUS"
done
# Different API keys should have independent counters
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Api-Key: test-key-2" \
  https://myapp.test/api/test
# Should return: 200 (separate counter)
```

### 7.4 Dry Run Verification

```bash
# Verify generated Caddyfile includes rate limiting directives
pnpm tool edge --dry-run 2>&1 | grep -A 30 "rate_limit"
```

---

## 8. Known Limitations & Simulation Gaps

| Feature | Cloudflare | Local Simulation | Gap |
|---------|-----------|-----------------|-----|
| Score-based counting | Reads response header, accumulates score | Counts requests (1 per request) | Score values not accumulated |
| Counting expression with response fields | `http.response.code`, response headers | Not supported in caddy-ratelimit matchers | Counting expression ignored for response fields |
| `cf.unique_visitor_id` (NAT-aware) | True NAT-aware client identification | Maps to `{remote_host}` (same as `ip.src`) | No NAT awareness locally |
| Challenge actions | Interactive CAPTCHA/JS challenge pages | Static HTML response (403/503) | No actual challenge solving |
| Throttle mode (Enterprise) | Allows requests below rate through | Always blocks during mitigation | No throttle mode |
| `cf.colo.id` separation | Each data center counts independently | Single instance = single counter | No colo separation |
| Plan-based field restrictions | Fields gated by plan tier | All fields available locally | No plan enforcement |
| JA3/JA4 fingerprints | Computed from TLS handshake | Simulated via injected header (see 15-cf-fields.md) | Not real fingerprints |
| Body/form characteristics | Reads request body for counting | Not available in caddy-ratelimit keys | Body-based keys not supported |
| Missing vs empty field distinction | Tracked separately for counting | Not distinguished | Single counter for both |

---

## 9. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-security.ts` | `RateLimitConfigSchema`, `RateLimitRuleSchema`, all primitive schemas |
| `packages/shared/utils/cli/src/tools/edge/utils/ratelimit.ts` | `generateRateLimitDirective()`, `characteristicsToCaddyKey()`, `generateRateLimitErrorHandler()`, `calculateEffectiveWindow()`, `validateRateLimitConfig()` |
| `packages/shared/utils/cli/src/tools/edge/utils/cf-expression.ts` | `translateCfExpressionToCaddyMatcher()` (shared with WAF + other features) |
| `packages/shared/utils/cli/src/tools/edge/utils/caddy.ts` | `generateEdgeCaddyDirectives()` — calls rate limit generator |
| `packages/products/[product]/iac/src/rate-limiting.ts` | `createRateLimitRuleset()`, `mapRuleToPulumiRule()` — Pulumi IaC |
| `packages/shared/schemas/core-config/src/__tests__/edge-security-ratelimit.test.ts` | Schema validation tests |
| `packages/shared/utils/cli/src/tools/edge/utils/__tests__/ratelimit.test.ts` | Caddy generation + key mapping tests |

---

## 10. Dependencies

- **00-foundation.md** — Edge tool rename, config inheritance, `EdgeConfigSchema`, custom Caddy build with `caddy-ratelimit` module
- **02-waf.md** — `cf-expression.ts` translator is shared (define it there or here — whoever implements first creates it)
- **15-cf-fields.md** — Header injection for simulating `ip.src.country`, `cf.bot_management.ja3_hash`, etc. as Caddy placeholders

---

## 11. Implementation Order

1. Add primitive schemas to `edge-security.ts` (periods, actions, characteristics)
2. Add `RateLimitBlockResponseSchema` to `edge-security.ts`
3. Add `RateLimitRuleSchema` to `edge-security.ts`
4. Add `RateLimitConfigSchema` to `edge-security.ts`
5. Create `cf-expression.ts` with basic expression translator (if not already from 02-waf.md)
6. Create `ratelimit.ts` with `characteristicsToCaddyKey()`
7. Add `validateRateLimitConfig()` to `ratelimit.ts`
8. Add `generateZoneBlock()` to `ratelimit.ts`
9. Add `calculateEffectiveWindow()` to `ratelimit.ts`
10. Add `generateRateLimitDirective()` to `ratelimit.ts`
11. Add `generateRateLimitErrorHandler()` to `ratelimit.ts`
12. Hook into `generateEdgeCaddyDirectives()` in `caddy.ts`
13. Create `rate-limiting.ts` in product `iac/src/` with Pulumi mapping
14. Write schema validation tests
15. Write Caddy generation tests
16. Write curl integration test script
17. Test end-to-end with `pnpm tool edge --dry-run`
