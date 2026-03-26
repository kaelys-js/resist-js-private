# 05 — IP Firewall, User-Agent Blocking, Zone Lockdown, Security Level & Scrape Shield

## Context

This plan covers the `firewall` section of `EdgeConfigSchema` — the collection of Cloudflare WAF "Tools" features that control access by IP address, user agent, path-level lockdown, global security posture, and scrape protection. These are distinct from the WAF managed rulesets (plan 02), rate limiting (plan 03), and bot management (plan 04).

All features share the same dual-target architecture: the Valibot schema drives **both** local Caddy simulation via generated Caddyfile directives **and** Pulumi Cloudflare IaC generation (plan 19).

### Cloudflare Feature Mapping

| Cloudflare Feature | CF Dashboard Path | CF API Endpoint | Local Simulation |
|--------------------|-------------------|-----------------|------------------|
| IP Access Rules | Security > WAF > Tools | `firewall/access_rules/rules` | Caddy `remote_ip` matcher |
| User-Agent Blocking | Security > WAF > Tools | `firewall/ua_rules` | Caddy `header_regexp` matcher |
| Zone Lockdown | Security > WAF > Tools | `firewall/lockdowns` | Caddy `remote_ip` + `path` matcher combo |
| Security Level | Security > Settings | `settings/security_level` | Caddy challenge interstitial |
| Browser Integrity Check | Security > Settings | `settings/browser_check` | Caddy header presence matcher |
| Challenge Passage | Security > Settings | `settings/challenge_ttl` | Cookie TTL on challenge response |
| Hotlink Protection | Security > Settings | `settings/hotlink_protection` | Caddy `header` matcher on Referer |
| Email Obfuscation | Security > Settings | `settings/email_obfuscation` | Caddy response body filter |

### Documentation References

- IP Access Rules: https://developers.cloudflare.com/waf/tools/ip-access-rules/
- IP Access Rule Actions: https://developers.cloudflare.com/waf/tools/ip-access-rules/actions/
- User-Agent Blocking: https://developers.cloudflare.com/waf/tools/user-agent-blocking/
- Zone Lockdown: https://developers.cloudflare.com/waf/tools/zone-lockdown/
- Security Level: https://developers.cloudflare.com/waf/tools/security-level/
- Browser Integrity Check: https://developers.cloudflare.com/waf/tools/browser-integrity-check/
- Challenge Passage: https://developers.cloudflare.com/waf/tools/challenge-passage/
- Hotlink Protection: https://developers.cloudflare.com/waf/tools/scrape-shield/hotlink-protection/
- Email Obfuscation: https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/

### Files This Plan Defines

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-security.ts` | Valibot schemas for `FirewallConfigSchema` (and `WafConfigSchema`, `RateLimitConfigSchema`, `BotConfigSchema` stubs — those are filled by plans 02-04) |
| `packages/shared/utils/cli/src/tools/edge/utils/firewall.ts` | Caddy directive generator for all firewall features |
| `packages/shared/utils/cli/src/tools/edge/utils/challenge.ts` | Challenge page HTML generator and cookie management |

### Evaluation Order (Cloudflare)

Cloudflare evaluates these features in the following order. The local simulation must respect this:

```
1. IP Access Rules (allow rules bypass everything below)
2. Zone Lockdown (if path matches, non-allowlisted IPs get 403)
3. User-Agent Blocking (after zone lockdown — IPs allowed by lockdown bypass UA rules)
4. Browser Integrity Check (header validation)
5. Security Level (threat score challenge)
```

In Caddy, this maps to ordered `route` blocks within the site block.

---

## 1. Valibot Schema: `FirewallConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-security.ts`

This file exports `FirewallConfigSchema` plus the stub schemas for WAF, rate limiting, and bot management (to be filled by their respective plans).

```typescript
/**
 * Edge Security Schemas
 *
 * Valibot schemas for the security section of edge config:
 * IP Access Rules, User-Agent Blocking, Zone Lockdown, Security Level,
 * Browser Integrity Check, Challenge Passage, Hotlink Protection,
 * and Email Obfuscation.
 *
 * Also exports stub schemas for WAF, Rate Limiting, and Bot Management
 * (defined in detail by plans 02-04).
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Primitive Schemas
// =============================================================================

/**
 * IPv4 address string.
 * Matches standard dotted-quad notation (e.g., `192.168.1.1`).
 */
export const Ipv4AddressSchema = v.pipe(
	v.string(),
	v.regex(
		/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
		'Must be a valid IPv4 address (e.g., 192.168.1.1)',
	),
);

/** Inferred output type of {@link Ipv4AddressSchema}. */
export type Ipv4Address = v.InferOutput<typeof Ipv4AddressSchema>;

/**
 * IPv6 address string.
 * Accepts full and compressed notation (e.g., `2001:db8::1`).
 */
export const Ipv6AddressSchema = v.pipe(
	v.string(),
	v.regex(
		/^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:)*:(?::[0-9a-fA-F]{1,4})*$/,
		'Must be a valid IPv6 address (e.g., 2001:db8::1)',
	),
);

/** Inferred output type of {@link Ipv6AddressSchema}. */
export type Ipv6Address = v.InferOutput<typeof Ipv6AddressSchema>;

/**
 * CIDR notation string (IPv4 or IPv6 with prefix length).
 * Examples: `192.168.0.0/24`, `10.0.0.0/16`, `2001:db8::/32`.
 *
 * Cloudflare IP Access Rules support /16 and /24 for IPv4,
 * and /32, /48, /64 for IPv6. We accept any valid CIDR here
 * and let Pulumi mapping enforce CF-specific restrictions.
 */
export const CidrSchema = v.pipe(
	v.string(),
	v.regex(
		/^(?:(?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F:]+)\/\d{1,3}$/,
		'Must be valid CIDR notation (e.g., 192.168.0.0/24 or 2001:db8::/32)',
	),
);

/** Inferred output type of {@link CidrSchema}. */
export type Cidr = v.InferOutput<typeof CidrSchema>;

/**
 * IP target: single IP address (v4 or v6) or CIDR range.
 * Used for IP access rules, zone lockdown allowlists, etc.
 */
export const IpTargetSchema = v.union([Ipv4AddressSchema, Ipv6AddressSchema, CidrSchema]);

/** Inferred output type of {@link IpTargetSchema}. */
export type IpTarget = v.InferOutput<typeof IpTargetSchema>;

/**
 * Two-letter ISO 3166-1 alpha-2 country code.
 * Used for country-level IP access rules.
 */
export const CountryCodeSchema = v.pipe(
	v.string(),
	v.regex(/^[A-Z]{2}$/, 'Must be a 2-letter uppercase ISO country code (e.g., US, GB, DE)'),
);

/** Inferred output type of {@link CountryCodeSchema}. */
export type CountryCode = v.InferOutput<typeof CountryCodeSchema>;

/**
 * Autonomous System Number (ASN).
 * Cloudflare accepts ASNs as numeric values (e.g., 13335 for Cloudflare).
 */
export const AsnSchema = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(1),
	v.maxValue(4294967295),
);

/** Inferred output type of {@link AsnSchema}. */
export type Asn = v.InferOutput<typeof AsnSchema>;

/**
 * URL path pattern with optional wildcard support.
 * Used for zone lockdown URL matching and hotlink protection paths.
 * Supports `*` as a glob wildcard (e.g., `/admin/*`, `/api/v1/*`).
 */
export const PathPatternSchema = v.pipe(
	v.string(),
	v.regex(/^\//, 'Path pattern must start with /'),
	v.minLength(1),
);

/** Inferred output type of {@link PathPatternSchema}. */
export type PathPattern = v.InferOutput<typeof PathPatternSchema>;

/**
 * Domain or origin string for referer checking.
 * Used in hotlink protection allowed origins.
 * Example: `example.com`, `cdn.example.com`.
 */
export const OriginDomainSchema = v.pipe(
	v.string(),
	v.regex(
		/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/,
		'Must be a valid domain (e.g., example.com)',
	),
);

/** Inferred output type of {@link OriginDomainSchema}. */
export type OriginDomain = v.InferOutput<typeof OriginDomainSchema>;

// =============================================================================
// IP Access Rules
// =============================================================================

/**
 * Action for an IP access rule.
 *
 * - `allow`: Bypass all downstream security checks (BIC, WAF, Under Attack).
 *   Note: country-level allows do NOT bypass WAF managed rules.
 * - `block`: Return 403 Forbidden. Deny all access.
 * - `managed_challenge`: Dynamically select an appropriate challenge type
 *   based on request characteristics (Cloudflare default challenge).
 * - `js_challenge`: Serve a JavaScript challenge interstitial page.
 *   Requires JS support; filters basic bot traffic with minimal friction.
 * - `interactive_challenge`: Require human completion of a challenge.
 *   Highest friction; strongest bot defense.
 */
export const IpAccessActionSchema = v.picklist([
	'allow',
	'block',
	'managed_challenge',
	'js_challenge',
	'interactive_challenge',
]);

/** Inferred output type of {@link IpAccessActionSchema}. */
export type IpAccessAction = v.InferOutput<typeof IpAccessActionSchema>;

/**
 * Target type for an IP access rule.
 *
 * - `ip`: Single IPv4 or IPv6 address.
 * - `ip_range`: CIDR range (IPv4: /16, /24; IPv6: /32, /48, /64).
 * - `country`: Two-letter ISO country code.
 * - `asn`: Autonomous System Number.
 */
export const IpAccessTargetTypeSchema = v.picklist(['ip', 'ip_range', 'country', 'asn']);

/** Inferred output type of {@link IpAccessTargetTypeSchema}. */
export type IpAccessTargetType = v.InferOutput<typeof IpAccessTargetTypeSchema>;

/**
 * Scope of an IP access rule.
 *
 * - `zone`: Applies to the current zone only.
 * - `account`: Applies to all zones in the account.
 *
 * For local simulation, both scopes behave identically (single zone).
 * Pulumi mapping uses this to determine Cloudflare API scope.
 */
export const IpAccessScopeSchema = v.picklist(['zone', 'account']);

/** Inferred output type of {@link IpAccessScopeSchema}. */
export type IpAccessScope = v.InferOutput<typeof IpAccessScopeSchema>;

/**
 * Single IP access rule.
 *
 * Maps to Cloudflare's `firewall/access_rules/rules` API.
 * Maximum 50,000 rules per account (Enterprise can request more).
 *
 * @example
 * ```typescript
 * const rule = {
 *   target: 'ip',
 *   value: '192.168.1.100',
 *   action: 'allow',
 *   scope: 'zone',
 *   notes: 'Office static IP',
 * };
 * ```
 */
export const IpAccessRuleSchema = v.strictObject({
	/** Target type: ip, ip_range, country, or asn. */
	target: IpAccessTargetTypeSchema,

	/**
	 * Target value. Interpretation depends on `target`:
	 * - `ip`: IPv4/IPv6 address string (e.g., `"192.168.1.1"`)
	 * - `ip_range`: CIDR string (e.g., `"10.0.0.0/16"`)
	 * - `country`: ISO 3166-1 alpha-2 code (e.g., `"US"`)
	 * - `asn`: ASN as string (e.g., `"AS13335"`)
	 */
	value: v.string(),

	/** Action to take when the rule matches. */
	action: IpAccessActionSchema,

	/** Rule scope: zone-only or account-wide. Default: `zone`. */
	scope: v.optional(IpAccessScopeSchema, 'zone'),

	/** Human-readable note for this rule (e.g., "Payment gateway IP"). */
	notes: v.optional(v.string(), ''),
});

/** Inferred output type of {@link IpAccessRuleSchema}. */
export type IpAccessRule = v.InferOutput<typeof IpAccessRuleSchema>;

/**
 * IP Access Rules configuration.
 * Array of rules evaluated in order. Allow rules take precedence over block
 * at the same specificity level. IP-level allows override country-level blocks.
 *
 * Cloudflare evaluation precedence:
 * 1. IP allow > IP block
 * 2. IP-level rules > country-level rules
 * 3. Globally-allowed Cloudflare IPs override country blocks
 */
export const IpAccessRulesSchema = v.strictObject({
	/** Enable IP access rules. Default: `false`. */
	enabled: v.optional(v.boolean(), false),

	/**
	 * Array of IP access rules.
	 * Order matters for same-specificity conflicts.
	 * Maximum 50,000 rules per Cloudflare account.
	 */
	rules: v.optional(v.array(IpAccessRuleSchema), []),
});

/** Inferred output type of {@link IpAccessRulesSchema}. */
export type IpAccessRules = v.InferOutput<typeof IpAccessRulesSchema>;

// =============================================================================
// User-Agent Blocking
// =============================================================================

/**
 * Action for a user-agent blocking rule.
 *
 * - `block`: Return 403 Forbidden.
 * - `managed_challenge`: Dynamic challenge selection.
 * - `js_challenge`: JavaScript challenge interstitial.
 * - `interactive_challenge`: Human-solvable challenge.
 */
export const UaBlockActionSchema = v.picklist([
	'block',
	'managed_challenge',
	'js_challenge',
	'interactive_challenge',
]);

/** Inferred output type of {@link UaBlockActionSchema}. */
export type UaBlockAction = v.InferOutput<typeof UaBlockActionSchema>;

/**
 * Single user-agent blocking rule.
 *
 * Maps to Cloudflare's `firewall/ua_rules` API.
 *
 * **Cloudflare behavior**: The `value` is matched as an exact string against
 * the full `User-Agent` header. Wildcards are NOT supported in the CF API.
 *
 * **Local simulation enhancement**: For local development convenience,
 * the Caddy generator supports both exact match and regex patterns
 * (detected by presence of regex metacharacters). This allows testing
 * broader patterns locally. Pulumi mapping strips regex rules and warns.
 *
 * Rule limits by plan: Free=10, Pro=50, Business=250, Enterprise=1000.
 *
 * @example
 * ```typescript
 * const rule = {
 *   value: 'BadBot/1.0',
 *   action: 'block',
 *   description: 'Known scraper bot',
 * };
 * ```
 */
export const UaBlockRuleSchema = v.strictObject({
	/**
	 * User-Agent string to match.
	 * Exact match for Cloudflare API; regex supported for local simulation.
	 */
	value: v.pipe(v.string(), v.minLength(1)),

	/** Action to take when the UA matches. */
	action: UaBlockActionSchema,

	/** Human-readable description for this rule. */
	description: v.optional(v.string(), ''),
});

/** Inferred output type of {@link UaBlockRuleSchema}. */
export type UaBlockRule = v.InferOutput<typeof UaBlockRuleSchema>;

/**
 * User-Agent Blocking configuration.
 * Rules are evaluated AFTER Zone Lockdown — IPs allowed by Zone Lockdown
 * bypass UA blocking entirely.
 * Rules apply to the entire domain, not individual subdomains.
 */
export const UaBlockingSchema = v.strictObject({
	/** Enable user-agent blocking. Default: `false`. */
	enabled: v.optional(v.boolean(), false),

	/** Array of UA blocking rules. */
	rules: v.optional(v.array(UaBlockRuleSchema), []),
});

/** Inferred output type of {@link UaBlockingSchema}. */
export type UaBlocking = v.InferOutput<typeof UaBlockingSchema>;

// =============================================================================
// Zone Lockdown
// =============================================================================

/**
 * Single zone lockdown rule.
 *
 * Maps to Cloudflare's `firewall/lockdowns` API.
 * Only the specified IPs/CIDRs can access the specified URL patterns.
 * All other IPs receive HTTP 403 (Error 1106: Access Denied).
 *
 * Rule limits by plan: Free=0, Pro=3, Business=10, Enterprise=200.
 *
 * @example
 * ```typescript
 * const rule = {
 *   description: 'Admin panel - office IPs only',
 *   urls: ['/admin/*', '/api/admin/*'],
 *   configurations: [
 *     { target: 'ip', value: '203.0.113.50' },
 *     { target: 'ip_range', value: '10.0.0.0/24' },
 *   ],
 *   priority: 1,
 * };
 * ```
 */
export const ZoneLockdownRuleSchema = v.strictObject({
	/** Human-readable description for this rule. */
	description: v.optional(v.string(), ''),

	/**
	 * URL patterns to protect. Supports `*` wildcard.
	 * Each pattern must include the full URL or path.
	 * A rule on `/wiki/*` does NOT cover `/internal/wiki`.
	 * At least one URL pattern is required.
	 */
	urls: v.pipe(v.array(PathPatternSchema), v.minLength(1)),

	/**
	 * Allowed IP addresses and CIDR ranges.
	 * Each entry specifies a target type (`ip` or `ip_range`) and value.
	 * Supports IPv4, IPv6, and CIDR ranges simultaneously.
	 * At least one configuration is required.
	 */
	configurations: v.pipe(
		v.array(
			v.strictObject({
				/** Target type: `ip` for single address, `ip_range` for CIDR. */
				target: v.picklist(['ip', 'ip_range']),
				/** IP address or CIDR range string. */
				value: v.string(),
			}),
		),
		v.minLength(1),
	),

	/**
	 * Priority for overlapping rules (lower number = higher priority).
	 * Optional; Cloudflare uses rule order when omitted.
	 */
	priority: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 0),
});

/** Inferred output type of {@link ZoneLockdownRuleSchema}. */
export type ZoneLockdownRule = v.InferOutput<typeof ZoneLockdownRuleSchema>;

/**
 * Zone Lockdown configuration.
 * Per-path IP allowlisting: only specified IPs can access specified paths.
 * Evaluated BEFORE User-Agent Blocking — IPs allowed by lockdown bypass UA rules.
 */
export const ZoneLockdownSchema = v.strictObject({
	/** Enable zone lockdown. Default: `false`. */
	enabled: v.optional(v.boolean(), false),

	/** Array of zone lockdown rules. Sorted by priority for evaluation. */
	rules: v.optional(v.array(ZoneLockdownRuleSchema), []),
});

/** Inferred output type of {@link ZoneLockdownSchema}. */
export type ZoneLockdown = v.InferOutput<typeof ZoneLockdownSchema>;

// =============================================================================
// Security Level
// =============================================================================

/**
 * Security level setting.
 *
 * Controls Cloudflare's threat-score-based challenge behavior.
 * Note: As of 2025+, Cloudflare has deprecated the granular threat score
 * (it now returns 0 for all requests). Security level primarily controls
 * whether Under Attack Mode is active.
 *
 * For local simulation, the levels are approximated:
 * - `off` / `essentially_off`: No challenges served.
 * - `low` / `medium` / `high`: Simulated via random sampling at increasing rates.
 * - `under_attack`: JS challenge on EVERY request (5-second interstitial).
 *
 * Cloudflare API: `PATCH /zones/{zone_id}/settings/security_level`
 */
export const SecurityLevelSchema = v.picklist([
	'off',
	'essentially_off',
	'low',
	'medium',
	'high',
	'under_attack',
]);

/** Inferred output type of {@link SecurityLevelSchema}. */
export type SecurityLevel = v.InferOutput<typeof SecurityLevelSchema>;

/**
 * Security Level configuration.
 */
export const SecurityLevelConfigSchema = v.strictObject({
	/**
	 * Security level. Default: `medium`.
	 *
	 * | Level | Behavior |
	 * |-------|----------|
	 * | `off` | No security checks |
	 * | `essentially_off` | Only most obvious threats |
	 * | `low` | Challenge high-threat visitors only |
	 * | `medium` | Challenge moderate-threat visitors (default) |
	 * | `high` | Challenge all visitors showing threatening behavior |
	 * | `under_attack` | JS challenge on EVERY request (I'm Under Attack Mode) |
	 */
	level: v.optional(SecurityLevelSchema, 'medium'),
});

/** Inferred output type of {@link SecurityLevelConfigSchema}. */
export type SecurityLevelConfig = v.InferOutput<typeof SecurityLevelConfigSchema>;

// =============================================================================
// Browser Integrity Check
// =============================================================================

/**
 * Browser Integrity Check configuration.
 *
 * Checks for missing or suspicious HTTP headers commonly abused by spammers:
 * - Missing User-Agent header
 * - Non-standard User-Agent strings (known bot patterns)
 * - Abnormal HTTP headers associated with spam campaigns
 *
 * Enabled by default on Cloudflare. When a check fails, Cloudflare serves
 * a challenge page.
 *
 * Cloudflare API: `PATCH /zones/{zone_id}/settings/browser_check`
 *
 * Local simulation checks:
 * - Presence of `User-Agent` header
 * - UA not matching known bad bot patterns
 * - Absence of headers commonly injected by spam tools
 */
export const BrowserIntegrityCheckSchema = v.strictObject({
	/** Enable browser integrity check. Default: `true` (matches CF default). */
	enabled: v.optional(v.boolean(), true),

	/**
	 * Additional User-Agent patterns to flag as suspicious (regex strings).
	 * These are checked in addition to the built-in patterns.
	 * Local simulation only — not sent to Cloudflare.
	 */
	additionalSuspiciousPatterns: v.optional(v.array(v.string()), []),
});

/** Inferred output type of {@link BrowserIntegrityCheckSchema}. */
export type BrowserIntegrityCheck = v.InferOutput<typeof BrowserIntegrityCheckSchema>;

// =============================================================================
// Challenge Passage
// =============================================================================

/**
 * Allowed TTL values for challenge passage (in seconds).
 *
 * After a visitor solves a challenge, the `cf_clearance` cookie is set
 * with this TTL. Subsequent requests with a valid cookie bypass challenges.
 *
 * Cloudflare recommendation: 15-45 minutes (900-2700 seconds).
 * Default: 1800 (30 minutes).
 *
 * Note: Cloudflare adds a small clock-skew buffer during validation.
 * For XHR requests, an additional 1 hour is appended to the validation time.
 *
 * Does NOT apply to rate limiting rules — only WAF custom rules and
 * IP Access rules.
 *
 * Cloudflare API: `PATCH /zones/{zone_id}/settings/challenge_ttl`
 */
export const ChallengePassageTtlSchema = v.picklist([
	300,      // 5 minutes
	900,      // 15 minutes
	1800,     // 30 minutes (default, recommended)
	3600,     // 1 hour
	7200,     // 2 hours
	10800,    // 3 hours
	14400,    // 4 hours
	28800,    // 8 hours
	43200,    // 12 hours
	57600,    // 16 hours
	86400,    // 24 hours
	604800,   // 1 week
	2592000,  // 1 month (30 days)
	31536000, // 1 year
]);

/** Inferred output type of {@link ChallengePassageTtlSchema}. */
export type ChallengePassageTtl = v.InferOutput<typeof ChallengePassageTtlSchema>;

/**
 * Challenge Passage configuration.
 */
export const ChallengePassageSchema = v.strictObject({
	/**
	 * Duration in seconds before a visitor must re-solve a challenge.
	 * Default: `1800` (30 minutes).
	 */
	ttl: v.optional(ChallengePassageTtlSchema, 1800),
});

/** Inferred output type of {@link ChallengePassageSchema}. */
export type ChallengePassage = v.InferOutput<typeof ChallengePassageSchema>;

// =============================================================================
// Hotlink Protection
// =============================================================================

/**
 * Protected file extensions for hotlink protection.
 *
 * Cloudflare's default protected extensions: gif, ico, jpg, jpeg, png.
 * Local simulation can extend this list.
 */
export const HotlinkExtensionSchema = v.pipe(
	v.string(),
	v.regex(/^[a-z0-9]+$/, 'Must be a lowercase file extension without dot (e.g., jpg, png, gif)'),
);

/** Inferred output type of {@link HotlinkExtensionSchema}. */
export type HotlinkExtension = v.InferOutput<typeof HotlinkExtensionSchema>;

/**
 * Hotlink Protection configuration.
 *
 * Prevents other sites from embedding your images by checking the HTTP
 * `Referer` header on requests for protected file types.
 *
 * Referer check logic:
 * | Referer Value        | Result     |
 * |----------------------|------------|
 * | Blank / absent       | Allowed    |
 * | Matches own domain   | Allowed    |
 * | In allowed origins   | Allowed    |
 * | In `hotlink-ok` path | Allowed    |
 * | Third-party domain   | Blocked    |
 *
 * Cloudflare API: `PATCH /zones/{zone_id}/settings/hotlink_protection`
 *
 * Known behavior:
 * - Does NOT affect crawlers directly, but blocks image rendering on
 *   Google Images, Pinterest, Facebook, etc.
 * - Images in any folder named `hotlink-ok` in the URL path are exempt.
 * - SaaS providers must explicitly exempt customer hostname referers.
 */
export const HotlinkProtectionSchema = v.strictObject({
	/** Enable hotlink protection. Default: `false`. */
	enabled: v.optional(v.boolean(), false),

	/**
	 * Protected file extensions (without leading dot).
	 * Default: `['gif', 'ico', 'jpg', 'jpeg', 'png']` (Cloudflare defaults).
	 */
	extensions: v.optional(v.array(HotlinkExtensionSchema), [
		'gif',
		'ico',
		'jpg',
		'jpeg',
		'png',
	]),

	/**
	 * Additional allowed referer domains beyond the zone's own domain.
	 * Use this for CDN origins, partner sites, or SaaS customer domains.
	 */
	allowedOrigins: v.optional(v.array(OriginDomainSchema), []),

	/**
	 * Additional path patterns where hotlink protection is enforced.
	 * By default, hotlink protection applies zone-wide to matching extensions.
	 * Specify paths to restrict to specific directories.
	 * If empty, all paths are protected (Cloudflare default).
	 */
	protectedPaths: v.optional(v.array(PathPatternSchema), []),
});

/** Inferred output type of {@link HotlinkProtectionSchema}. */
export type HotlinkProtection = v.InferOutput<typeof HotlinkProtectionSchema>;

// =============================================================================
// Email Obfuscation
// =============================================================================

/**
 * Email Obfuscation configuration.
 *
 * Replaces visible email addresses in HTML responses with obfuscated
 * JavaScript-decoded versions. Human visitors see and can click the
 * address normally; bots/scrapers cannot extract it.
 *
 * Only applies to responses with `Content-Type: text/html` or
 * `application/xhtml+xml`.
 *
 * Exclusions (NOT obfuscated):
 * - HTML tag attributes other than `<a href="mailto:...">`
 * - Content inside `<script>`, `<noscript>`, `<textarea>`, `<xmp>`, `<head>`
 * - Pages with `Cache-Control: no-transform` header
 * - Content injected by Cloudflare Workers
 *
 * Bypass methods:
 * - Wrap addresses in `<!--email_off-->...<!--/email_off-->` HTML comments
 * - Return addresses via AJAX as `application/json`
 *
 * Known issues:
 * - May behave unexpectedly with `<template>` tags in the page.
 *
 * Cloudflare API: `PATCH /zones/{zone_id}/settings/email_obfuscation`
 */
export const EmailObfuscationSchema = v.strictObject({
	/** Enable email obfuscation. Default: `true` (matches CF default). */
	enabled: v.optional(v.boolean(), true),
});

/** Inferred output type of {@link EmailObfuscationSchema}. */
export type EmailObfuscation = v.InferOutput<typeof EmailObfuscationSchema>;

// =============================================================================
// Composed: FirewallConfigSchema
// =============================================================================

/**
 * Complete firewall configuration schema.
 *
 * Composes all firewall-related sub-features into a single schema
 * for the `firewall` key in `EdgeConfigSchema`.
 *
 * Evaluation order (matches Cloudflare):
 * 1. IP Access Rules (allow rules bypass everything below)
 * 2. Zone Lockdown (path-level IP allowlisting)
 * 3. User-Agent Blocking
 * 4. Browser Integrity Check
 * 5. Security Level (challenge behavior)
 * 6. Hotlink Protection (referer check on static assets)
 * 7. Email Obfuscation (response body filter)
 *
 * Challenge Passage controls the TTL of the `cf_clearance` cookie
 * used by all challenge-issuing features (1-5 above).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 *
 * const result = safeParse(FirewallConfigSchema, {
 *   ipAccess: {
 *     enabled: true,
 *     rules: [
 *       { target: 'ip', value: '127.0.0.1', action: 'allow', notes: 'Localhost' },
 *       { target: 'ip_range', value: '10.0.0.0/8', action: 'block', notes: 'Internal' },
 *       { target: 'country', value: 'CN', action: 'managed_challenge' },
 *     ],
 *   },
 *   zoneLockdown: {
 *     enabled: true,
 *     rules: [{
 *       urls: ['/admin/*'],
 *       configurations: [{ target: 'ip', value: '203.0.113.50' }],
 *     }],
 *   },
 *   securityLevel: { level: 'high' },
 *   challengePassage: { ttl: 3600 },
 * });
 * if (!result.ok) return result;
 * const config: FirewallConfig = result.data;
 * ```
 */
export const FirewallConfigSchema = v.strictObject({
	/** IP Access Rules: allow, block, or challenge by IP/CIDR/country/ASN. */
	ipAccess: v.optional(IpAccessRulesSchema, {}),

	/** User-Agent Blocking: block or challenge by User-Agent string. */
	uaBlocking: v.optional(UaBlockingSchema, {}),

	/** Zone Lockdown: per-path IP allowlisting. */
	zoneLockdown: v.optional(ZoneLockdownSchema, {}),

	/** Security Level: global threat-score-based challenge behavior. */
	securityLevel: v.optional(SecurityLevelConfigSchema, {}),

	/** Browser Integrity Check: suspicious header detection. */
	browserIntegrityCheck: v.optional(BrowserIntegrityCheckSchema, {}),

	/** Challenge Passage: cf_clearance cookie TTL. */
	challengePassage: v.optional(ChallengePassageSchema, {}),

	/** Hotlink Protection: referer-based image access control. */
	hotlinkProtection: v.optional(HotlinkProtectionSchema, {}),

	/** Email Obfuscation: HTML email address encoding. */
	emailObfuscation: v.optional(EmailObfuscationSchema, {}),
});

/** Inferred output type of {@link FirewallConfigSchema}. */
export type FirewallConfig = v.InferOutput<typeof FirewallConfigSchema>;

// =============================================================================
// Stub Schemas (filled by plans 02-04)
// =============================================================================

/** WAF configuration stub. See plan 02 for full schema. */
export const WafConfigSchema = v.strictObject({});
/** Inferred output type of {@link WafConfigSchema}. */
export type WafConfig = v.InferOutput<typeof WafConfigSchema>;

/** Rate limit configuration stub. See plan 03 for full schema. */
export const RateLimitConfigSchema = v.strictObject({});
/** Inferred output type of {@link RateLimitConfigSchema}. */
export type RateLimitConfig = v.InferOutput<typeof RateLimitConfigSchema>;

/** Bot management configuration stub. See plan 04 for full schema. */
export const BotConfigSchema = v.strictObject({});
/** Inferred output type of {@link BotConfigSchema}. */
export type BotConfig = v.InferOutput<typeof BotConfigSchema>;
```

### Schema Design Decisions

| Decision | Rationale |
|----------|-----------|
| `IpAccessRuleSchema` uses generic `value: v.string()` | The value type depends on `target` — a discriminated union here would be verbose and the Caddy/Pulumi generators already switch on `target`. Validation of value format happens in generators. |
| `UaBlockRuleSchema.value` supports regex locally | Cloudflare only supports exact UA match, but regex is useful for local testing. Pulumi mapping will warn and skip regex rules. |
| `ChallengePassageTtlSchema` uses `v.picklist` of numbers | Cloudflare only accepts these specific values. A freeform number would fail at Cloudflare API. |
| `BrowserIntegrityCheckSchema` defaults `enabled: true` | Matches Cloudflare's default (enabled for all zones). |
| `EmailObfuscationSchema` defaults `enabled: true` | Matches Cloudflare's default behavior. |
| Separate `SecurityLevelConfigSchema` wrapper | Allows adding future fields (e.g., `underAttackExcludePaths`) without breaking the picklist. |

---

## 2. Caddy IP Matcher Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/firewall.ts`

This file contains the complete Caddy directive generator for all firewall features.

### Architecture

```
firewall.ts
├── generateFirewallDirectives()      # Main entry — composes all sub-generators
├── generateIpAccessDirectives()      # IP access rules → Caddy remote_ip matchers
├── generateUaBlockingDirectives()    # UA blocking → Caddy header_regexp matchers
├── generateZoneLockdownDirectives()  # Zone lockdown → path + remote_ip combo matchers
├── generateSecurityLevelDirectives() # Security level → challenge route
├── generateBicDirectives()           # Browser integrity → header check route
├── generateHotlinkDirectives()       # Hotlink protection → referer check route
├── generateEmailObfuscation()        # Email obfuscation → response body filter
└── (helper) challengeResponse()      # Returns challenge HTML or 403 block
```

### Complete Implementation

```typescript
/**
 * Firewall Caddy Directive Generator
 *
 * Generates Caddyfile directives for IP access rules, user-agent blocking,
 * zone lockdown, security level, browser integrity check, challenge passage,
 * hotlink protection, and email obfuscation.
 *
 * All functions return `Result<Str>` containing Caddyfile directive fragments
 * that are injected into each site block by the main Caddyfile generator.
 *
 * @module
 */

import type { Str, Bool } from '@/types/primitives';
import type { Result } from '@/utils/result';
import { ok, err } from '@/utils/result';
import { okUnchecked } from '@/utils/result';
import { safeParse } from '@/utils/result/safe';
import type {
	FirewallConfig,
	IpAccessRule,
	UaBlockRule,
	ZoneLockdownRule,
	SecurityLevel,
	ChallengePassageTtl,
} from '@/schemas/core-config/edge-security';

// =============================================================================
// Constants
// =============================================================================

/**
 * Built-in suspicious User-Agent patterns for Browser Integrity Check.
 * These patterns are always checked when BIC is enabled.
 */
const BIC_SUSPICIOUS_UA_PATTERNS: ReadonlyArray<Str> = [
	'',                          // Empty UA
	'\\-',                       // Single hyphen (common bot marker)
	'^$',                        // Literally empty string
	'(?i)^mozilla/4\\.0$',       // Generic old Mozilla without details
	'(?i)python-requests',       // Python requests library
	'(?i)python-urllib',         // Python urllib
	'(?i)^java/',               // Java HTTP clients
	'(?i)^perl',                // Perl LWP
	'(?i)^wget',                // Wget
	'(?i)^curl/',               // curl (blocked by BIC, not by default)
	'(?i)libwww-perl',          // Perl LWP
	'(?i)^go-http-client',      // Go default HTTP client
	'(?i)^php/',                // PHP default UA
] as ReadonlyArray<Str>;

/**
 * Hotlink-protected file extensions regex fragment.
 * Built from the config's `extensions` array.
 */
const HOTLINK_OK_PATH_SEGMENT = 'hotlink-ok' as Str;

/**
 * Security level to simulated challenge probability mapping.
 * For local simulation only — approximates Cloudflare's threat-score behavior.
 *
 * | Level             | Challenge probability |
 * |-------------------|----------------------|
 * | off               | 0% (no challenges)   |
 * | essentially_off   | 0% (no challenges)   |
 * | low               | 2% (rare)            |
 * | medium            | 5% (occasional)      |
 * | high              | 15% (frequent)       |
 * | under_attack      | 100% (every request) |
 */
const SECURITY_LEVEL_CHALLENGE_RATES: Record<SecurityLevel, number> = {
	off: 0,
	essentially_off: 0,
	low: 2,
	medium: 5,
	high: 15,
	under_attack: 100,
};

// =============================================================================
// Main Entry
// =============================================================================

/**
 * Generates all firewall-related Caddyfile directives.
 *
 * Produces an ordered set of `route` blocks matching Cloudflare's evaluation
 * order:
 * 1. IP Access Rules (allow bypass + block/challenge)
 * 2. Zone Lockdown (path-level IP allowlisting)
 * 3. User-Agent Blocking
 * 4. Browser Integrity Check
 * 5. Security Level challenges
 * 6. Hotlink Protection
 * 7. Email Obfuscation (response filter — applied last)
 *
 * @param config - Validated `FirewallConfig` from edge config.
 * @param zoneDomain - The zone's domain (e.g., `myapp.localhost`).
 *   Used for hotlink referer matching.
 * @param challengeTtl - Challenge passage TTL in seconds.
 *   Controls `cf_clearance` cookie max-age.
 * @returns Caddyfile directive string fragment, or error.
 */
export function generateFirewallDirectives(
	config: FirewallConfig,
	zoneDomain: Str,
	challengeTtl: ChallengePassageTtl,
): Result<Str> {
	const fragments: Array<Str> = [];

	// --- 1. IP Access Rules ---
	if (config.ipAccess.enabled && config.ipAccess.rules.length > 0) {
		const ipResult: Result<Str> = generateIpAccessDirectives(
			config.ipAccess.rules,
			challengeTtl,
		);
		if (!ipResult.ok) return ipResult;
		fragments.push(ipResult.data);
	}

	// --- 2. Zone Lockdown ---
	if (config.zoneLockdown.enabled && config.zoneLockdown.rules.length > 0) {
		const lockdownResult: Result<Str> = generateZoneLockdownDirectives(
			config.zoneLockdown.rules,
		);
		if (!lockdownResult.ok) return lockdownResult;
		fragments.push(lockdownResult.data);
	}

	// --- 3. User-Agent Blocking ---
	if (config.uaBlocking.enabled && config.uaBlocking.rules.length > 0) {
		const uaResult: Result<Str> = generateUaBlockingDirectives(
			config.uaBlocking.rules,
			challengeTtl,
		);
		if (!uaResult.ok) return uaResult;
		fragments.push(uaResult.data);
	}

	// --- 4. Browser Integrity Check ---
	if (config.browserIntegrityCheck.enabled) {
		const bicResult: Result<Str> = generateBicDirectives(
			config.browserIntegrityCheck.additionalSuspiciousPatterns,
			challengeTtl,
		);
		if (!bicResult.ok) return bicResult;
		fragments.push(bicResult.data);
	}

	// --- 5. Security Level ---
	if (config.securityLevel.level !== 'off' && config.securityLevel.level !== 'essentially_off') {
		const secResult: Result<Str> = generateSecurityLevelDirectives(
			config.securityLevel.level,
			challengeTtl,
		);
		if (!secResult.ok) return secResult;
		fragments.push(secResult.data);
	}

	// --- 6. Hotlink Protection ---
	if (config.hotlinkProtection.enabled) {
		const hotlinkResult: Result<Str> = generateHotlinkDirectives(
			config.hotlinkProtection,
			zoneDomain,
		);
		if (!hotlinkResult.ok) return hotlinkResult;
		fragments.push(hotlinkResult.data);
	}

	// --- 7. Email Obfuscation ---
	if (config.emailObfuscation.enabled) {
		const emailResult: Result<Str> = generateEmailObfuscation();
		if (!emailResult.ok) return emailResult;
		fragments.push(emailResult.data);
	}

	const joined: Str = fragments.join('\n\n') as Str;
	return okUnchecked(joined);
}

// =============================================================================
// 2a. IP Access Rules → Caddy Directives
// =============================================================================

/**
 * Generates Caddy directives for IP access rules.
 *
 * **Strategy**:
 * - Allow rules: Use `@ip_allow` named matcher with `remote_ip` ranges.
 *   The `route` block returns immediately via `reverse_proxy` (no challenge).
 *   This must come FIRST to bypass all downstream security.
 * - Block rules: Use `@ip_block` matcher → `respond 403`.
 * - Challenge rules: Use `@ip_challenge_*` matchers → challenge HTML or
 *   check `cf_clearance` cookie.
 *
 * Caddy's `remote_ip` matcher supports IPv4, IPv6, and CIDR notation natively.
 * Country and ASN rules cannot be simulated without a GeoIP database.
 * When GeoIP is available (`.resist/geo/GeoLite2-Country.mmdb`), country rules
 * use the `maxmind_geolocation` Caddy module. Otherwise, country/ASN rules
 * emit a comment and are skipped with a log warning.
 *
 * @param rules - Array of IP access rules.
 * @param challengeTtl - TTL for cf_clearance cookie.
 * @returns Caddyfile directive fragment.
 */
function generateIpAccessDirectives(
	rules: ReadonlyArray<IpAccessRule>,
	challengeTtl: ChallengePassageTtl,
): Result<Str> {
	const lines: Array<Str> = [];
	lines.push('# === IP Access Rules ===' as Str);

	// Group rules by action
	const allowIps: Array<Str> = [];
	const blockIps: Array<Str> = [];
	const challengeIps: Array<Str> = [];
	const jsChallengeIps: Array<Str> = [];
	const interactiveChallengeIps: Array<Str> = [];
	const skippedRules: Array<Str> = [];

	for (const rule of rules) {
		if (rule.target === 'country' || rule.target === 'asn') {
			// Country/ASN rules require GeoIP — handled at runtime via
			// maxmind_geolocation module if .resist/geo/ exists.
			// For now, emit a skip comment.
			skippedRules.push(
				`# SKIP: ${rule.target}=${rule.value} action=${rule.action} (requires GeoIP)` as Str,
			);
			continue;
		}

		const ipValue: Str = rule.value as Str;

		switch (rule.action) {
			case 'allow':
				allowIps.push(ipValue);
				break;
			case 'block':
				blockIps.push(ipValue);
				break;
			case 'managed_challenge':
				challengeIps.push(ipValue);
				break;
			case 'js_challenge':
				jsChallengeIps.push(ipValue);
				break;
			case 'interactive_challenge':
				interactiveChallengeIps.push(ipValue);
				break;
		}
	}

	// Emit skipped rules as comments
	if (skippedRules.length > 0) {
		lines.push(...skippedRules);
	}

	// Allow rules — these IPs bypass ALL downstream security checks.
	// We use a named matcher and skip the rest of the firewall route.
	if (allowIps.length > 0) {
		lines.push('' as Str);
		lines.push(`@ip_allow remote_ip ${allowIps.join(' ')}` as Str);
		lines.push('route @ip_allow {' as Str);
		lines.push('\t# Allowed IPs bypass all downstream security' as Str);
		lines.push('\theader X-CF-IP-Access "allow"' as Str);
		lines.push('}' as Str);
	}

	// Block rules — return 403 Forbidden
	if (blockIps.length > 0) {
		lines.push('' as Str);
		lines.push(`@ip_block remote_ip ${blockIps.join(' ')}` as Str);
		lines.push('route @ip_block {' as Str);
		lines.push('\theader X-CF-IP-Access "block"' as Str);
		lines.push('\trespond "Access Denied" 403' as Str);
		lines.push('}' as Str);
	}

	// Challenge rules — serve challenge or check cf_clearance cookie
	const challengeGroups: Array<{
		name: Str;
		ips: Array<Str>;
		type: Str;
	}> = [
		{ name: 'ip_managed_challenge' as Str, ips: challengeIps, type: 'managed' as Str },
		{ name: 'ip_js_challenge' as Str, ips: jsChallengeIps, type: 'js' as Str },
		{
			name: 'ip_interactive_challenge' as Str,
			ips: interactiveChallengeIps,
			type: 'interactive' as Str,
		},
	];

	for (const group of challengeGroups) {
		if (group.ips.length > 0) {
			lines.push('' as Str);
			lines.push(`@${group.name} {` as Str);
			lines.push(`\tremote_ip ${group.ips.join(' ')}` as Str);
			lines.push(`\tnot header_regexp Cookie cf_clearance=.+` as Str);
			lines.push('}' as Str);
			lines.push(`route @${group.name} {` as Str);
			lines.push(`\theader X-CF-IP-Access "challenge:${group.type}"` as Str);
			lines.push(`\theader Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=${challengeTtl}; HttpOnly; SameSite=Lax"` as Str);
			lines.push(`\trespond <<HTML` as Str);
			lines.push(challengePageHtml(group.type) as Str);
			lines.push('\tHTML 403' as Str);
			lines.push('}' as Str);
		}
	}

	const result: Str = lines.join('\n') as Str;
	return okUnchecked(result);
}

// =============================================================================
// 2b. User-Agent Blocking → Caddy Directives
// =============================================================================

/**
 * Generates Caddy directives for user-agent blocking rules.
 *
 * **Cloudflare behavior**: Exact string match on full `User-Agent` header.
 * Wildcards are not supported in the Cloudflare API.
 *
 * **Local simulation**: Supports regex patterns for convenience. Detects
 * regex by checking for metacharacters (`[`, `(`, `*`, `+`, `?`, `{`, `|`, `\\`).
 * If the value contains no metacharacters, it is treated as an exact match
 * (wrapped in `^...$` anchors for the Caddy `header_regexp` matcher).
 *
 * Each rule generates a named matcher and corresponding route block.
 * Rules are numbered sequentially for unique matcher names.
 *
 * @param rules - Array of UA blocking rules.
 * @param challengeTtl - TTL for cf_clearance cookie.
 * @returns Caddyfile directive fragment.
 */
function generateUaBlockingDirectives(
	rules: ReadonlyArray<UaBlockRule>,
	challengeTtl: ChallengePassageTtl,
): Result<Str> {
	const lines: Array<Str> = [];
	lines.push('# === User-Agent Blocking ===' as Str);

	for (let i = 0; i < rules.length; i++) {
		const rule: UaBlockRule = rules[i];
		const matcherName: Str = `ua_block_${i}` as Str;

		// Determine if value is regex or exact match
		const isRegex: boolean = /[[\]()*+?{|\\^$]/.test(rule.value);
		const pattern: Str = isRegex
			? (rule.value as Str)
			: (`^${escapeRegex(rule.value)}$` as Str);

		if (rule.description) {
			lines.push(`# UA rule ${i}: ${rule.description}` as Str);
		}

		if (rule.action === 'block') {
			lines.push(`@${matcherName} header_regexp User-Agent "${pattern}"` as Str);
			lines.push(`route @${matcherName} {` as Str);
			lines.push('\theader X-CF-UA-Block "block"' as Str);
			lines.push('\trespond "Forbidden" 403' as Str);
			lines.push('}' as Str);
		} else {
			// Challenge actions — check cf_clearance cookie first
			const challengeType: Str = rule.action.replace('_challenge', '') as Str;
			lines.push(`@${matcherName} {` as Str);
			lines.push(`\theader_regexp User-Agent "${pattern}"` as Str);
			lines.push('\tnot header_regexp Cookie cf_clearance=.+' as Str);
			lines.push('}' as Str);
			lines.push(`route @${matcherName} {` as Str);
			lines.push(`\theader X-CF-UA-Block "challenge:${challengeType}"` as Str);
			lines.push(`\theader Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=${challengeTtl}; HttpOnly; SameSite=Lax"` as Str);
			lines.push(`\trespond <<HTML` as Str);
			lines.push(challengePageHtml(challengeType) as Str);
			lines.push('\tHTML 403' as Str);
			lines.push('}' as Str);
		}

		lines.push('' as Str);
	}

	const result: Str = lines.join('\n') as Str;
	return okUnchecked(result);
}

// =============================================================================
// 3. Zone Lockdown → Caddy Directives
// =============================================================================

/**
 * Generates Caddy directives for zone lockdown rules.
 *
 * Each rule creates a named matcher that combines:
 * - `path` matcher for the URL patterns (with wildcard support)
 * - `not remote_ip` matcher for IPs NOT in the allowlist
 *
 * When a request matches the path but the IP is NOT in the allowlist,
 * Caddy returns 403 (Cloudflare Error 1106: Access Denied).
 *
 * Rules are sorted by priority (lower number = higher priority)
 * and numbered sequentially for unique matcher names.
 *
 * @param rules - Array of zone lockdown rules, pre-sorted by priority.
 * @returns Caddyfile directive fragment.
 */
function generateZoneLockdownDirectives(
	rules: ReadonlyArray<ZoneLockdownRule>,
): Result<Str> {
	const lines: Array<Str> = [];
	lines.push('# === Zone Lockdown ===' as Str);

	// Sort by priority (lower = higher priority)
	const sorted: Array<ZoneLockdownRule> = [...rules].sort(
		(a, b) => a.priority - b.priority,
	);

	for (let i = 0; i < sorted.length; i++) {
		const rule: ZoneLockdownRule = sorted[i];
		const matcherName: Str = `zone_lockdown_${i}` as Str;

		// Collect all allowed IPs/CIDRs
		const allowedIps: Array<Str> = rule.configurations.map(
			(c) => c.value as Str,
		);

		// Convert URL patterns to Caddy path matchers
		// Cloudflare uses `*` as wildcard; Caddy uses `*` natively in path matcher
		const pathPatterns: Array<Str> = rule.urls.map((url) => url as Str);

		if (rule.description) {
			lines.push(`# Lockdown ${i}: ${rule.description}` as Str);
		}

		lines.push(`@${matcherName} {` as Str);
		lines.push(`\tpath ${pathPatterns.join(' ')}` as Str);
		lines.push(`\tnot remote_ip ${allowedIps.join(' ')}` as Str);
		lines.push('}' as Str);
		lines.push(`route @${matcherName} {` as Str);
		lines.push('\theader X-CF-Zone-Lockdown "denied"' as Str);
		lines.push('\trespond "Access Denied (Error 1106)" 403' as Str);
		lines.push('}' as Str);
		lines.push('' as Str);
	}

	const result: Str = lines.join('\n') as Str;
	return okUnchecked(result);
}

// =============================================================================
// 4. Security Level → Caddy Directives
// =============================================================================

/**
 * Generates Caddy directives for security level simulation.
 *
 * **`under_attack`**: Every request without a valid `cf_clearance` cookie
 * gets a JS challenge interstitial (5-second delay page).
 *
 * **`low`/`medium`/`high`**: Simulated via a Caddy `expression` matcher
 * that uses a hash of the client IP + timestamp to determine if a challenge
 * should be served. This produces a pseudo-random but deterministic
 * challenge rate matching the configured probability.
 *
 * The expression `{http.request.remote.host}` is hashed and the last
 * two hex digits are compared against a threshold derived from the
 * challenge rate percentage.
 *
 * @param level - Security level setting.
 * @param challengeTtl - TTL for cf_clearance cookie.
 * @returns Caddyfile directive fragment.
 */
function generateSecurityLevelDirectives(
	level: SecurityLevel,
	challengeTtl: ChallengePassageTtl,
): Result<Str> {
	const lines: Array<Str> = [];
	lines.push(`# === Security Level: ${level} ===` as Str);

	const rate: number = SECURITY_LEVEL_CHALLENGE_RATES[level];

	if (rate === 100) {
		// Under Attack Mode: challenge EVERY request without cf_clearance
		lines.push('@security_level_challenge {' as Str);
		lines.push('\tnot header_regexp Cookie cf_clearance=.+' as Str);
		lines.push('}' as Str);
		lines.push('route @security_level_challenge {' as Str);
		lines.push('\theader X-CF-Security-Level "under_attack"' as Str);
		lines.push(`\theader Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=${challengeTtl}; HttpOnly; SameSite=Lax"` as Str);
		lines.push('\trespond <<HTML' as Str);
		lines.push(underAttackPageHtml() as Str);
		lines.push('\tHTML 503' as Str);
		lines.push('}' as Str);
	} else if (rate > 0) {
		// Probabilistic challenge: hash-based sampling
		// Threshold: rate% of 256 (0xFF) = floor(rate * 2.56)
		const threshold: number = Math.floor(rate * 2.56);
		const hexThreshold: Str = threshold.toString(16).padStart(2, '0') as Str;

		lines.push('@security_level_challenge {' as Str);
		lines.push('\tnot header_regexp Cookie cf_clearance=.+' as Str);
		lines.push(`\t# Simulated ${rate}% challenge rate (hash threshold: 0x${hexThreshold})` as Str);
		lines.push(`\texpression {http.request.remote.host}.endsWith("${hexThreshold}")` as Str);
		lines.push('}' as Str);
		lines.push('route @security_level_challenge {' as Str);
		lines.push(`\theader X-CF-Security-Level "${level}"` as Str);
		lines.push(`\theader Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=${challengeTtl}; HttpOnly; SameSite=Lax"` as Str);
		lines.push('\trespond <<HTML' as Str);
		lines.push(challengePageHtml('managed') as Str);
		lines.push('\tHTML 403' as Str);
		lines.push('}' as Str);
	}

	const result: Str = lines.join('\n') as Str;
	return okUnchecked(result);
}

// =============================================================================
// 5. Browser Integrity Check → Caddy Directives
// =============================================================================

/**
 * Generates Caddy directives for Browser Integrity Check simulation.
 *
 * Checks for:
 * 1. Missing `User-Agent` header (empty or absent)
 * 2. User-Agent matching known suspicious patterns
 * 3. (Optional) User-provided additional suspicious patterns
 *
 * When a check fails, the request is served a challenge page.
 *
 * @param additionalPatterns - Extra UA patterns to flag as suspicious.
 * @param challengeTtl - TTL for cf_clearance cookie.
 * @returns Caddyfile directive fragment.
 */
function generateBicDirectives(
	additionalPatterns: ReadonlyArray<string>,
	challengeTtl: ChallengePassageTtl,
): Result<Str> {
	const lines: Array<Str> = [];
	lines.push('# === Browser Integrity Check ===' as Str);

	// Combine built-in and user-provided patterns
	const allPatterns: Array<Str> = [
		...BIC_SUSPICIOUS_UA_PATTERNS,
		...(additionalPatterns as Array<Str>),
	];

	// Build a single regex alternation for all patterns
	const combinedPattern: Str = allPatterns
		.filter((p) => p.length > 0)
		.join('|') as Str;

	// Check 1: Missing User-Agent header
	lines.push('@bic_no_ua {' as Str);
	lines.push('\tnot header User-Agent *' as Str);
	lines.push('\tnot header_regexp Cookie cf_clearance=.+' as Str);
	lines.push('}' as Str);
	lines.push('route @bic_no_ua {' as Str);
	lines.push('\theader X-CF-BIC "fail:no-ua"' as Str);
	lines.push(`\theader Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=${challengeTtl}; HttpOnly; SameSite=Lax"` as Str);
	lines.push('\trespond <<HTML' as Str);
	lines.push(challengePageHtml('managed') as Str);
	lines.push('\tHTML 403' as Str);
	lines.push('}' as Str);

	// Check 2: Suspicious User-Agent pattern
	if (combinedPattern.length > 0) {
		lines.push('' as Str);
		lines.push('@bic_suspicious_ua {' as Str);
		lines.push(`\theader_regexp User-Agent "${combinedPattern}"` as Str);
		lines.push('\tnot header_regexp Cookie cf_clearance=.+' as Str);
		lines.push('}' as Str);
		lines.push('route @bic_suspicious_ua {' as Str);
		lines.push('\theader X-CF-BIC "fail:suspicious-ua"' as Str);
		lines.push(`\theader Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=${challengeTtl}; HttpOnly; SameSite=Lax"` as Str);
		lines.push('\trespond <<HTML' as Str);
		lines.push(challengePageHtml('managed') as Str);
		lines.push('\tHTML 403' as Str);
		lines.push('}' as Str);
	}

	const result: Str = lines.join('\n') as Str;
	return okUnchecked(result);
}

// =============================================================================
// 6. Hotlink Protection → Caddy Directives
// =============================================================================

/**
 * Generates Caddy directives for hotlink protection.
 *
 * Checks the `Referer` header on requests for protected file types.
 * Blocks requests where the referer is a third-party domain.
 *
 * Allowed conditions (request passes):
 * - Referer is empty/absent (direct navigation, bookmarks)
 * - Referer matches the zone domain
 * - Referer matches any configured allowed origin
 * - URL path contains a `/hotlink-ok/` segment
 *
 * Blocked condition:
 * - Referer is present and does not match any allowed origin
 *
 * @param config - Hotlink protection configuration.
 * @param zoneDomain - Zone domain for self-referrer matching.
 * @returns Caddyfile directive fragment.
 */
function generateHotlinkDirectives(
	config: {
		extensions: ReadonlyArray<string>;
		allowedOrigins: ReadonlyArray<string>;
		protectedPaths: ReadonlyArray<string>;
	},
	zoneDomain: Str,
): Result<Str> {
	const lines: Array<Str> = [];
	lines.push('# === Hotlink Protection ===' as Str);

	// Build file extension matcher
	// Caddy path_regexp matches against the URI path
	const extPattern: Str = config.extensions.join('|') as Str;

	// Build allowed referer pattern
	// Includes: empty, zone domain, configured origins
	const allowedDomains: Array<Str> = [
		zoneDomain,
		...(config.allowedOrigins as Array<Str>),
	];
	// Escape dots for regex
	const domainPatterns: Array<Str> = allowedDomains.map(
		(d) => d.replace(/\./g, '\\.') as Str,
	);
	const allowedRefererPattern: Str = domainPatterns
		.map((d) => `https?://(www\\.)?${d}`)
		.join('|') as Str;

	// The matcher:
	// 1. Path ends in protected extension
	// 2. Referer IS present (non-empty)
	// 3. Referer does NOT match allowed domains
	// 4. Path does NOT contain /hotlink-ok/
	lines.push('@hotlink_violation {' as Str);
	lines.push(`\tpath_regexp hotlink_ext \\.(${extPattern})$` as Str);
	lines.push('\theader Referer *' as Str);
	lines.push(`\tnot header_regexp Referer "^(${allowedRefererPattern})"` as Str);
	lines.push(`\tnot path */${HOTLINK_OK_PATH_SEGMENT}/*` as Str);

	// If protectedPaths is specified, also require the request to match one
	if (config.protectedPaths.length > 0) {
		lines.push(`\tpath ${config.protectedPaths.join(' ')}` as Str);
	}

	lines.push('}' as Str);
	lines.push('route @hotlink_violation {' as Str);
	lines.push('\theader X-CF-Hotlink "blocked"' as Str);
	lines.push('\trespond "Hotlink not allowed" 403' as Str);
	lines.push('}' as Str);

	const result: Str = lines.join('\n') as Str;
	return okUnchecked(result);
}

// =============================================================================
// 7. Email Obfuscation → Caddy Response Filter
// =============================================================================

/**
 * Generates Caddy directives for email obfuscation.
 *
 * Uses Caddy's `templates` directive to process HTML responses and replace
 * email addresses with JavaScript-obfuscated versions.
 *
 * The implementation uses a response body filter that:
 * 1. Only processes `text/html` and `application/xhtml+xml` responses
 * 2. Skips responses with `Cache-Control: no-transform`
 * 3. Respects `<!--email_off-->...<!--/email_off-->` bypass markers
 * 4. Encodes email addresses using a simple XOR cipher decoded by inline JS
 *
 * Caddy does not have a built-in email obfuscation module, so this is
 * implemented using the `templates` directive with a custom Go template
 * function, or alternatively via a `response_body` plugin/filter.
 *
 * **Implementation approach**: Since Caddy lacks a native email obfuscation
 * filter, we use `header` directives to inject a small inline script via
 * Content-Security-Policy adjustment, combined with a `templates` directive
 * that processes HTML bodies. For simplicity in local simulation, we inject
 * a `<script>` tag at the end of `</body>` that scans for and obfuscates
 * email addresses client-side.
 *
 * @returns Caddyfile directive fragment.
 */
function generateEmailObfuscation(): Result<Str> {
	const lines: Array<Str> = [];
	lines.push('# === Email Obfuscation ===' as Str);
	lines.push('# Client-side email obfuscation via injected script' as Str);
	lines.push('# Only applies to text/html responses' as Str);
	lines.push('# Respects <!--email_off-->...<!--/email_off--> markers' as Str);
	lines.push('' as Str);

	// Use Caddy's templates directive to inject obfuscation script
	// The templates directive processes response bodies matching the MIME type
	lines.push('templates {' as Str);
	lines.push('\tmime text/html application/xhtml+xml' as Str);
	lines.push('}' as Str);

	// The actual obfuscation script is served as a static asset
	// from .resist/assets/email-obfuscation.js and injected via
	// a response header or template include.
	//
	// Alternative approach: use Caddy's `replace_response` handler
	// (available in custom Caddy builds) to do server-side replacement.
	lines.push('' as Str);
	lines.push('# Email obfuscation script injection' as Str);
	lines.push('# The script scans for email patterns in text nodes' as Str);
	lines.push('# and replaces them with encoded spans decoded by JS.' as Str);
	lines.push('# Bots without JS see [email protected].' as Str);
	lines.push('header_up X-CF-Email-Obfuscation "active"' as Str);

	const result: Str = lines.join('\n') as Str;
	return okUnchecked(result);
}

// =============================================================================
// Helper: Challenge Page HTML
// =============================================================================

/**
 * Returns a minimal challenge page HTML string for local simulation.
 *
 * In production Cloudflare, challenge pages are sophisticated JS applications.
 * For local simulation, we serve a simple page that:
 * - Displays the challenge type
 * - For JS challenges: auto-submits after a delay (simulating JS execution)
 * - For interactive challenges: shows a button to "solve"
 * - For managed challenges: auto-selects JS or interactive based on UA
 *
 * The page sets the `cf_clearance` cookie on "solve" via JavaScript,
 * then redirects back to the original URL.
 *
 * @param challengeType - Type of challenge: 'managed', 'js', or 'interactive'.
 * @returns HTML string for the challenge page.
 */
function challengePageHtml(challengeType: Str): Str {
	return `<!DOCTYPE html>
<html>
<head>
  <title>Checking your browser - Edge Simulation</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; display: flex;
           align-items: center; justify-content: center; min-height: 100vh;
           margin: 0; background: #f8f9fa; color: #1a1a2e; }
    .container { text-align: center; max-width: 480px; padding: 2rem; }
    .spinner { width: 40px; height: 40px; border: 4px solid #e0e0e0;
               border-top: 4px solid #f6821f; border-radius: 50%;
               animation: spin 1s linear infinite; margin: 1rem auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn { background: #f6821f; color: white; border: none; padding: 12px 32px;
           border-radius: 6px; font-size: 16px; cursor: pointer; margin-top: 1rem; }
    .btn:hover { background: #e5711e; }
    .type { color: #666; font-size: 14px; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Checking your browser</h2>
    <p>This is a simulated Cloudflare ${challengeType} challenge.</p>
    <p>This process is automatic. You will be redirected shortly.</p>
    <p class="type">Challenge type: ${challengeType}</p>
    <script>
      // Simulate challenge passage — redirect after 3 seconds
      setTimeout(function() { window.location.reload(); }, 3000);
    </script>
  </div>
</body>
</html>` as Str;
}

/**
 * Returns the "I'm Under Attack" mode interstitial page HTML.
 *
 * Simulates Cloudflare's 5-second JS challenge page shown when
 * security level is set to `under_attack`.
 *
 * The page displays a loading spinner and countdown, then reloads
 * (at which point the `cf_clearance` cookie will be present).
 *
 * @returns HTML string for the Under Attack interstitial.
 */
function underAttackPageHtml(): Str {
	return `<!DOCTYPE html>
<html>
<head>
  <title>DDoS Protection - Edge Simulation</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; display: flex;
           align-items: center; justify-content: center; min-height: 100vh;
           margin: 0; background: #1a1a2e; color: #eee; }
    .container { text-align: center; max-width: 480px; padding: 2rem; }
    .shield { font-size: 64px; margin-bottom: 1rem; }
    .bar { width: 100%; height: 4px; background: #333; border-radius: 2px;
           margin: 1.5rem 0; overflow: hidden; }
    .bar-fill { height: 100%; background: #f6821f; border-radius: 2px;
                animation: fill 5s linear forwards; }
    @keyframes fill { from { width: 0; } to { width: 100%; } }
    .countdown { font-size: 14px; color: #999; }
    .title { font-size: 14px; color: #666; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="shield">&#128737;</div>
    <h2>Checking your connection</h2>
    <p>DDoS protection by Cloudflare (simulated)</p>
    <div class="bar"><div class="bar-fill"></div></div>
    <p class="countdown" id="countdown">Verifying... please wait 5 seconds</p>
    <p class="title">I'm Under Attack Mode - Edge Simulation</p>
    <script>
      var seconds = 5;
      var el = document.getElementById('countdown');
      var timer = setInterval(function() {
        seconds--;
        if (seconds <= 0) {
          clearInterval(timer);
          el.textContent = 'Redirecting...';
          window.location.reload();
        } else {
          el.textContent = 'Verifying... please wait ' + seconds + ' seconds';
        }
      }, 1000);
    </script>
  </div>
</body>
</html>` as Str;
}

/**
 * Escapes special regex characters in a string for use in Caddy header_regexp.
 *
 * @param value - Plain string to escape.
 * @returns Regex-safe string.
 */
function escapeRegex(value: string): Str {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') as Str;
}
```

---

## 3. Challenge Page HTML & Cookie Management

### File: `packages/shared/utils/cli/src/tools/edge/utils/challenge.ts`

This file provides shared challenge-related utilities used by multiple firewall features and potentially by other edge features (Access, Turnstile — plan 09).

```typescript
/**
 * Challenge Utilities
 *
 * Shared utilities for challenge page generation and cf_clearance
 * cookie management. Used by firewall features and potentially
 * Access/Turnstile simulation.
 *
 * @module
 */

import type { Str } from '@/types/primitives';
import type { Result } from '@/utils/result';
import { okUnchecked } from '@/utils/result';
import type { ChallengePassageTtl } from '@/schemas/core-config/edge-security';

// =============================================================================
// Cookie Generation
// =============================================================================

/**
 * Generates the `Set-Cookie` header value for a `cf_clearance` cookie.
 *
 * The cookie signals that a visitor has successfully solved a challenge.
 * Subsequent requests carrying this cookie bypass challenge checks.
 *
 * Cookie attributes:
 * - `Path=/` — applies to all paths on the domain
 * - `Max-Age` — TTL from config (challenge passage setting)
 * - `HttpOnly` — not accessible via JavaScript
 * - `SameSite=Lax` — sent with same-site and top-level navigation
 * - `Secure` — only sent over HTTPS (when TLS is enabled)
 *
 * In Cloudflare production, the cookie value is a signed token.
 * For local simulation, we use a simple `simulated_<timestamp>` value.
 *
 * @param ttl - Cookie TTL in seconds.
 * @param secure - Whether to include the Secure attribute.
 * @returns Set-Cookie header value string.
 */
export function generateCfClearanceCookie(
	ttl: ChallengePassageTtl,
	secure: boolean,
): Result<Str> {
	const timestamp: Str = Date.now().toString(36) as Str;
	const value: Str = `simulated_${timestamp}` as Str;

	const parts: Array<Str> = [
		`cf_clearance=${value}` as Str,
		'Path=/' as Str,
		`Max-Age=${ttl}` as Str,
		'HttpOnly' as Str,
		'SameSite=Lax' as Str,
	];

	if (secure) {
		parts.push('Secure' as Str);
	}

	const cookie: Str = parts.join('; ') as Str;
	return okUnchecked(cookie);
}

/**
 * Generates the Caddy `header_regexp` matcher fragment for detecting
 * a valid `cf_clearance` cookie in the Cookie header.
 *
 * @returns Caddy matcher expression string.
 */
export function cfClearanceMatcher(): Str {
	return 'header_regexp Cookie cf_clearance=.+' as Str;
}
```

---

## 4. Email Obfuscation Script

### File: `.resist/assets/email-obfuscation.js`

This script is injected into HTML responses when email obfuscation is enabled. It is generated by the edge tool on startup and served as a static asset.

```javascript
/**
 * Email Obfuscation Script (Client-Side)
 *
 * Simulates Cloudflare's email obfuscation feature.
 * Scans text nodes for email addresses and replaces them with
 * encoded spans that are decoded by this script.
 *
 * Respects <!--email_off--> / <!--email_off--> markers.
 */
(function () {
  'use strict';

  var EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

  // XOR encode an email string with a single-byte key
  function encode(email, key) {
    var encoded = '';
    for (var i = 0; i < email.length; i++) {
      encoded += String.fromCharCode(email.charCodeAt(i) ^ key);
    }
    return btoa(encoded);
  }

  // Decode a previously encoded string
  function decode(encoded, key) {
    var raw = atob(encoded);
    var decoded = '';
    for (var i = 0; i < raw.length; i++) {
      decoded += String.fromCharCode(raw.charCodeAt(i) ^ key);
    }
    return decoded;
  }

  // Check if a node is inside an email_off region
  function isInEmailOffRegion(node) {
    var sibling = node.previousSibling;
    while (sibling) {
      if (sibling.nodeType === 8 && sibling.data.trim() === 'email_off') {
        return true;
      }
      if (sibling.nodeType === 8 && sibling.data.trim() === '/email_off') {
        return false;
      }
      sibling = sibling.previousSibling;
    }
    // Check parent
    if (node.parentNode && node.parentNode !== document.body) {
      return isInEmailOffRegion(node.parentNode);
    }
    return false;
  }

  // Skip these elements entirely
  var SKIP_TAGS = { SCRIPT: 1, NOSCRIPT: 1, TEXTAREA: 1, XMP: 1, HEAD: 1, STYLE: 1 };

  function processNode(node) {
    if (node.nodeType === 3) { // Text node
      if (SKIP_TAGS[node.parentNode.tagName]) return;
      if (isInEmailOffRegion(node)) return;

      var text = node.textContent;
      if (!EMAIL_REGEX.test(text)) return;
      EMAIL_REGEX.lastIndex = 0;

      var key = Math.floor(Math.random() * 255) + 1;
      var frag = document.createDocumentFragment();
      var lastIndex = 0;
      var match;

      while ((match = EMAIL_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        var encoded = encode(match[0], key);
        var span = document.createElement('span');
        span.setAttribute('data-cfemail', encoded);
        span.setAttribute('data-cfkey', key.toString());
        span.textContent = '[email\u00a0protected]';
        span.style.cursor = 'pointer';
        span.addEventListener('click', (function (enc, k) {
          return function () { this.textContent = decode(enc, k); };
        })(encoded, key));
        frag.appendChild(span);
        lastIndex = EMAIL_REGEX.lastIndex;
      }

      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === 1 && !SKIP_TAGS[node.tagName]) {
      // Element node — recurse into children
      var children = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < children.length; i++) {
        processNode(children[i]);
      }
    }
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      processNode(document.body);
    });
  } else {
    processNode(document.body);
  }
})();
```

---

## 5. Pulumi Mapping

### File context: `packages/products/<product>/iac/src/firewall.ts`

This section describes how the `FirewallConfig` schema maps to Cloudflare Pulumi resources. Full implementation details are in plan 19 (`19-pulumi-output.md`), but the mapping is documented here for completeness.

### IP Access Rules

```typescript
/**
 * Maps IP access rules from FirewallConfig to Cloudflare Pulumi resources.
 *
 * @param config - Validated FirewallConfig.
 * @param zoneId - Cloudflare zone ID.
 * @param accountId - Cloudflare account ID.
 * @returns Array of Pulumi resource definitions.
 */
// Pulumi resource: cloudflare.AccessRule
// One resource per rule in config.ipAccess.rules
//
// Mapping:
//   rule.target    → configuration.target ("ip" | "ip_range" | "country" | "asn")
//   rule.value     → configuration.value
//   rule.action    → mode ("allow" | "block" | "managed_challenge" | "js_challenge" | "challenge")
//   rule.scope     → "zone" → zoneId set; "account" → accountId set
//   rule.notes     → notes
//
// Note: Cloudflare API uses "challenge" for interactive_challenge.
// The Pulumi mapping must convert:
//   "interactive_challenge" → "challenge"
//   "managed_challenge" → "managed_challenge"
//   "js_challenge" → "js_challenge"
```

### User-Agent Blocking

```typescript
// Pulumi: cloudflare.UserAgentBlockingRule (or custom rule equivalent)
// Cloudflare recommends custom rules over UA blocking rules.
//
// Mapping:
//   rule.value       → configuration.value (exact string only)
//   rule.action      → mode
//   rule.description → description
//
// IMPORTANT: Regex values are LOCAL-ONLY. Pulumi mapping must:
//   1. Check if value contains regex metacharacters
//   2. If regex: skip and emit warning "UA rule '{description}' uses regex — local-only, skipped for CF"
//   3. If exact: create the Cloudflare resource
//
// Alternative: Convert to cloudflare.Ruleset custom rule:
//   expression: '(http.user_agent eq "{value}")'
//   action: "block" | "managed_challenge" | "js_challenge" | "challenge"
```

### Zone Lockdown

```typescript
// Pulumi: cloudflare.ZoneLockdown
// One resource per rule in config.zoneLockdown.rules
//
// Mapping:
//   rule.description    → description
//   rule.urls           → urls (array of path patterns)
//   rule.configurations → configurations (array of {target, value})
//   rule.priority       → priority
//
// Note: Cloudflare plan limits apply:
//   Free=0, Pro=3, Business=10, Enterprise=200
// The Pulumi mapping should warn if rule count exceeds plan limits.
```

### Zone Settings

```typescript
// Pulumi: cloudflare.ZoneSetting (one per setting)
//
// Security Level:
//   setting_id: "security_level"
//   value: config.securityLevel.level
//   (Maps directly: "off" | "essentially_off" | "low" | "medium" | "high" | "under_attack")
//
// Browser Integrity Check:
//   setting_id: "browser_check"
//   value: config.browserIntegrityCheck.enabled ? "on" : "off"
//
// Challenge Passage TTL:
//   setting_id: "challenge_ttl"
//   value: config.challengePassage.ttl.toString()
//
// Hotlink Protection:
//   setting_id: "hotlink_protection"
//   value: config.hotlinkProtection.enabled ? "on" : "off"
//   NOTE: Cloudflare hotlink protection is zone-wide — protectedPaths and
//   allowedOrigins are LOCAL-ONLY settings. For path-scoped hotlink protection
//   on CF, use a custom rule with expression matching.
//
// Email Obfuscation:
//   setting_id: "email_obfuscation"
//   value: config.emailObfuscation.enabled ? "on" : "off"
```

### Pulumi Mapping Summary Table

| Schema Field | Pulumi Resource | CF API | Notes |
|-------------|-----------------|--------|-------|
| `ipAccess.rules[*]` | `cloudflare.AccessRule` | `firewall/access_rules/rules` | 1:1 mapping |
| `uaBlocking.rules[*]` | `cloudflare.UserAgentBlockingRule` or `cloudflare.Ruleset` custom rule | `firewall/ua_rules` | Regex rules skipped |
| `zoneLockdown.rules[*]` | `cloudflare.ZoneLockdown` | `firewall/lockdowns` | Plan limits apply |
| `securityLevel.level` | `cloudflare.ZoneSetting` | `settings/security_level` | Direct value mapping |
| `browserIntegrityCheck.enabled` | `cloudflare.ZoneSetting` | `settings/browser_check` | `"on"`/`"off"` |
| `challengePassage.ttl` | `cloudflare.ZoneSetting` | `settings/challenge_ttl` | Number → string |
| `hotlinkProtection.enabled` | `cloudflare.ZoneSetting` | `settings/hotlink_protection` | Zone-wide only |
| `hotlinkProtection.allowedOrigins` | N/A (local only) | N/A | Use custom rules for CF |
| `hotlinkProtection.protectedPaths` | N/A (local only) | N/A | Use custom rules for CF |
| `emailObfuscation.enabled` | `cloudflare.ZoneSetting` | `settings/email_obfuscation` | `"on"`/`"off"` |

---

## 6. Integration with Main Caddyfile Generator

### Where firewall directives are injected

The `generateEdgeCaddyDirectives()` function in `packages/shared/utils/cli/src/tools/edge/utils/caddy.ts` (defined in plan 00) calls `generateFirewallDirectives()` and inserts the output into each site block.

```typescript
// packages/shared/utils/cli/src/tools/edge/utils/caddy.ts

import { generateFirewallDirectives } from '@/cli/tools/edge/utils/firewall';

/**
 * Generates all edge simulation Caddy directives for a single site block.
 *
 * @param config - Merged edge config.
 * @param zoneDomain - Zone domain for this site.
 * @returns Caddyfile directive fragment to insert in the site block.
 */
export function generateEdgeCaddyDirectives(
	config: EdgeConfig,
	zoneDomain: Str,
): Result<Str> {
	const sections: Array<Str> = [];

	// ... SSL directives (plan 01) ...
	// ... WAF directives (plan 02) ...
	// ... Rate limiting directives (plan 03) ...
	// ... Bot management directives (plan 04) ...

	// Firewall directives (this plan)
	const firewallResult: Result<Str> = generateFirewallDirectives(
		config.firewall,
		zoneDomain,
		config.firewall.challengePassage.ttl,
	);
	if (!firewallResult.ok) return firewallResult;
	if (firewallResult.data.length > 0) {
		sections.push(firewallResult.data);
	}

	// ... Rules engine directives (plan 06) ...
	// ... Cache directives (plan 07) ...
	// ... etc. ...

	const joined: Str = sections.join('\n\n') as Str;
	return okUnchecked(joined);
}
```

### Caddy directive ordering

Caddy evaluates directives based on its built-in order. For firewall features, the relevant ordering is:

```
{
  order route first
}

site.localhost {
  # 1. IP Access (allow bypass) — earliest in route block
  # 2. Zone Lockdown — after IP allow
  # 3. UA Blocking — after zone lockdown
  # 4. BIC — after UA blocking
  # 5. Security Level — after BIC
  # 6. Hotlink Protection — after security level
  # 7. Email Obfuscation — response filter (last)
  # 8. reverse_proxy — actual upstream
}
```

All firewall matchers are wrapped in `route` blocks to ensure deterministic evaluation order regardless of Caddy's default directive ordering.

---

## 7. Caddy `route` Block Structure (Complete Example)

A complete generated Caddyfile site block with all firewall features enabled:

```caddyfile
myapp.localhost {
	tls /path/to/cert.pem /path/to/key.pem

	# === IP Access Rules ===
	@ip_allow remote_ip 127.0.0.1 10.0.0.0/24
	route @ip_allow {
		# Allowed IPs bypass all downstream security
		header X-CF-IP-Access "allow"
	}

	@ip_block remote_ip 192.168.100.0/24
	route @ip_block {
		header X-CF-IP-Access "block"
		respond "Access Denied" 403
	}

	@ip_js_challenge {
		remote_ip 172.16.0.0/12
		not header_regexp Cookie cf_clearance=.+
	}
	route @ip_js_challenge {
		header X-CF-IP-Access "challenge:js"
		header Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax"
		respond <<HTML
		  ... challenge HTML ...
		HTML 403
	}

	# === Zone Lockdown ===
	# Lockdown 0: Admin panel - office IPs only
	@zone_lockdown_0 {
		path /admin/*
		not remote_ip 203.0.113.50 10.0.0.0/24
	}
	route @zone_lockdown_0 {
		header X-CF-Zone-Lockdown "denied"
		respond "Access Denied (Error 1106)" 403
	}

	# === User-Agent Blocking ===
	# UA rule 0: Known scraper bot
	@ua_block_0 header_regexp User-Agent "^BadBot/1\.0$"
	route @ua_block_0 {
		header X-CF-UA-Block "block"
		respond "Forbidden" 403
	}

	# === Browser Integrity Check ===
	@bic_no_ua {
		not header User-Agent *
		not header_regexp Cookie cf_clearance=.+
	}
	route @bic_no_ua {
		header X-CF-BIC "fail:no-ua"
		header Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax"
		respond <<HTML
		  ... challenge HTML ...
		HTML 403
	}

	@bic_suspicious_ua {
		header_regexp User-Agent "(?i)python-requests|(?i)^wget|(?i)^curl/"
		not header_regexp Cookie cf_clearance=.+
	}
	route @bic_suspicious_ua {
		header X-CF-BIC "fail:suspicious-ua"
		header Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax"
		respond <<HTML
		  ... challenge HTML ...
		HTML 403
	}

	# === Security Level: under_attack ===
	@security_level_challenge {
		not header_regexp Cookie cf_clearance=.+
	}
	route @security_level_challenge {
		header X-CF-Security-Level "under_attack"
		header Set-Cookie "cf_clearance=simulated; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax"
		respond <<HTML
		  ... under attack HTML (5-second interstitial) ...
		HTML 503
	}

	# === Hotlink Protection ===
	@hotlink_violation {
		path_regexp hotlink_ext \.(gif|ico|jpg|jpeg|png)$
		header Referer *
		not header_regexp Referer "^(https?://(www\.)?myapp\.localhost)"
		not path */hotlink-ok/*
	}
	route @hotlink_violation {
		header X-CF-Hotlink "blocked"
		respond "Hotlink not allowed" 403
	}

	# === Email Obfuscation ===
	templates {
		mime text/html application/xhtml+xml
	}
	header_up X-CF-Email-Obfuscation "active"

	# Upstream
	reverse_proxy localhost:3000
}
```

---

## 8. GeoIP Integration (Optional Enhancement)

Country and ASN-based IP access rules require a GeoIP database. This is an optional enhancement that can be implemented if the MaxMind GeoLite2 database is available.

### GeoIP database location

```
.resist/geo/GeoLite2-Country.mmdb
```

### Caddy module requirement

The custom Caddy build (plan 00) would need an additional module:

```diff
# mise.toml build-caddy task
 xcaddy build v{{versions.systemTools.caddy}} \
   --with github.com/corazawaf/coraza-caddy/v2 \
   --with github.com/mholt/caddy-ratelimit \
+  --with github.com/porech/caddy-maxmind-geolocation \
   --output .resist/bin/caddy-edge
```

### Schema addition for GeoIP

```typescript
/**
 * GeoIP configuration for country/ASN-based rules.
 * Optional — requires MaxMind GeoLite2 database.
 */
export const GeoIpConfigSchema = v.strictObject({
	/** Enable GeoIP lookups. Requires .resist/geo/GeoLite2-Country.mmdb. */
	enabled: v.optional(v.boolean(), false),

	/**
	 * MaxMind license key for automatic database download.
	 * If provided, the edge tool downloads/updates the database on startup.
	 * Get a free key at: https://www.maxmind.com/en/geolite2/signup
	 */
	maxmindLicenseKey: v.optional(v.string(), ''),
});
```

This enhancement is **not** part of the core implementation. Country/ASN rules emit skip comments when GeoIP is unavailable.

---

## 9. Verification Steps

### Unit Tests

```
packages/shared/utils/cli/src/tools/edge/utils/__tests__/firewall.test.ts
```

| Test | Description |
|------|-------------|
| `schema: FirewallConfigSchema accepts defaults` | `safeParse(FirewallConfigSchema, {})` returns ok with all defaults |
| `schema: FirewallConfigSchema accepts full config` | Full config with all features populated validates successfully |
| `schema: IpAccessRuleSchema validates all target types` | `ip`, `ip_range`, `country`, `asn` all validate |
| `schema: IpAccessRuleSchema validates all actions` | All 5 actions validate |
| `schema: IpAccessRuleSchema rejects invalid action` | `action: 'drop'` fails validation |
| `schema: ChallengePassageTtlSchema accepts valid values` | All 14 TTL values validate |
| `schema: ChallengePassageTtlSchema rejects invalid values` | `999` fails validation |
| `schema: HotlinkExtensionSchema validates extensions` | `'jpg'`, `'png'`, `'gif'` pass; `'.jpg'`, `'JPG'` fail |
| `caddy: generateIpAccessDirectives produces allow matcher` | Allow IPs generate `@ip_allow remote_ip` |
| `caddy: generateIpAccessDirectives produces block route` | Block IPs generate `respond 403` |
| `caddy: generateIpAccessDirectives produces challenge route with cookie check` | Challenge IPs check `cf_clearance` cookie |
| `caddy: generateIpAccessDirectives skips country/ASN rules` | Country rules emit skip comment |
| `caddy: generateUaBlockingDirectives exact match` | Non-regex UA gets `^...$` anchors |
| `caddy: generateUaBlockingDirectives regex match` | Regex UA passed through directly |
| `caddy: generateUaBlockingDirectives block vs challenge` | Block → `respond 403`; challenge → cookie check |
| `caddy: generateZoneLockdownDirectives path + IP combo` | Generates `path` + `not remote_ip` matcher |
| `caddy: generateZoneLockdownDirectives sorts by priority` | Lower priority number appears first |
| `caddy: generateSecurityLevelDirectives under_attack` | Generates unconditional challenge route with 503 |
| `caddy: generateSecurityLevelDirectives off` | Generates no directives |
| `caddy: generateSecurityLevelDirectives medium` | Generates probabilistic challenge |
| `caddy: generateBicDirectives no UA check` | Generates `not header User-Agent *` matcher |
| `caddy: generateBicDirectives suspicious patterns` | Combines built-in + custom patterns |
| `caddy: generateHotlinkDirectives referer check` | Checks Referer against zone domain |
| `caddy: generateHotlinkDirectives hotlink-ok bypass` | Includes `not path */hotlink-ok/*` |
| `caddy: generateHotlinkDirectives custom allowed origins` | Extra domains in referer pattern |
| `caddy: generateEmailObfuscation active header` | Sets `X-CF-Email-Obfuscation: active` |
| `caddy: generateFirewallDirectives respects evaluation order` | IP access before zone lockdown before UA blocking |
| `caddy: generateFirewallDirectives skips disabled features` | Disabled features produce no output |

### Integration Tests

| Test | Description |
|------|-------------|
| `IP allow bypasses block` | Request from allowed IP reaches upstream even when same IP range is blocked |
| `IP block returns 403` | Request from blocked IP gets 403 response |
| `Challenge sets cf_clearance cookie` | Challenge response includes Set-Cookie header |
| `cf_clearance cookie bypasses challenge` | Second request with cookie reaches upstream |
| `Zone lockdown blocks non-allowed IP` | Request to locked path from wrong IP gets 403 |
| `Zone lockdown allows listed IP` | Request to locked path from allowed IP reaches upstream |
| `UA block returns 403` | Request with blocked UA gets 403 |
| `BIC blocks missing UA` | Request without User-Agent header gets challenge |
| `Under attack mode challenges every request` | Every request without cookie gets 503 interstitial |
| `Hotlink blocks third-party referer` | Image request with foreign referer gets 403 |
| `Hotlink allows empty referer` | Image request without referer reaches upstream |
| `Hotlink allows own domain referer` | Image request with own domain referer reaches upstream |
| `Hotlink-ok path bypasses protection` | Image in `/images/hotlink-ok/` path always served |

### Manual Verification Checklist

1. Start edge tool: `pnpm tool edge`
2. Verify IP blocking:
   - `curl -v https://myapp.localhost/` (should succeed from allowed IP)
   - `curl -v --interface 192.168.100.1 https://myapp.localhost/` (should get 403 if blocked)
3. Verify UA blocking:
   - `curl -v -A "BadBot/1.0" https://myapp.localhost/` (should get 403)
   - `curl -v -A "Mozilla/5.0" https://myapp.localhost/` (should succeed)
4. Verify zone lockdown:
   - `curl -v https://myapp.localhost/admin/` (should get 403 from non-allowed IP)
5. Verify BIC:
   - `curl -v -H "User-Agent: " https://myapp.localhost/` (should get challenge)
6. Verify Under Attack Mode:
   - Set `securityLevel.level: 'under_attack'` in config
   - Every browser request should show 5-second interstitial
   - After 5 seconds, page loads normally (cookie set)
7. Verify hotlink protection:
   - `curl -v -e "https://evil.com" https://myapp.localhost/images/logo.png` (should get 403)
   - `curl -v https://myapp.localhost/images/logo.png` (should succeed — no referer)
   - `curl -v -e "https://myapp.localhost" https://myapp.localhost/images/logo.png` (should succeed)
8. Verify `--dry-run` outputs firewall directives in Caddyfile preview

---

## 10. Dependencies

| Dependency | Plan | Required Before Implementation? |
|-----------|------|-------------------------------|
| Plan 00 — Foundation | Schema stub, Caddyfile generator hook, custom Caddy build | Yes |
| Plan 01 — SSL/TLS | TLS config for Secure cookie flag | No (can default to `true`) |
| Plan 09 — Access/Challenges | Shared challenge utilities | No (challenge.ts can be created independently) |
| Plan 15 — CF Fields | `cf.threat_score` header injection | No (security level works without it) |
| Plan 19 — Pulumi Output | Pulumi resource mapping | No (Caddy simulation works independently) |

---

## 11. Implementation Order

1. Create primitive schemas (`Ipv4AddressSchema`, `CidrSchema`, etc.) in `edge-security.ts`
2. Create `IpAccessRuleSchema` and `IpAccessRulesSchema`
3. Create `UaBlockRuleSchema` and `UaBlockingSchema`
4. Create `ZoneLockdownRuleSchema` and `ZoneLockdownSchema`
5. Create `SecurityLevelConfigSchema`
6. Create `BrowserIntegrityCheckSchema`
7. Create `ChallengePassageSchema`
8. Create `HotlinkProtectionSchema`
9. Create `EmailObfuscationSchema`
10. Compose into `FirewallConfigSchema`
11. Create `challenge.ts` shared utilities
12. Create `firewall.ts` — implement `generateIpAccessDirectives`
13. Implement `generateZoneLockdownDirectives`
14. Implement `generateUaBlockingDirectives`
15. Implement `generateBicDirectives`
16. Implement `generateSecurityLevelDirectives`
17. Implement `generateHotlinkDirectives`
18. Implement `generateEmailObfuscation`
19. Compose into `generateFirewallDirectives`
20. Create email obfuscation client-side script
21. Wire into `generateEdgeCaddyDirectives` in `caddy.ts`
22. Write unit tests
23. Write integration tests
24. Manual verification
