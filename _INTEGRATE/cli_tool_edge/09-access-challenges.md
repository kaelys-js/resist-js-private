# 09 — Access & Challenges: Cloudflare Access, Turnstile, Managed/JS Challenges, Under Attack Mode

## Context

Cloudflare Access (part of Zero Trust) protects applications behind identity-aware policies. Challenges (Turnstile, Managed Challenge, JS Challenge) provide human-verification mechanisms. Under Attack Mode applies aggressive challenge pages to all traffic.

Locally, we simulate these using:
- **Caddy `basicauth` + `forward_auth`** for Access policy enforcement
- **Local JWT generation** (Ed25519 keys at `.resist/keys/`) for Access JWT injection
- **Cloudflare's official Turnstile test keys** for CAPTCHA widget testing
- **Static challenge pages** with configurable clearance cookies for JS/Managed challenges
- **Under Attack Mode interstitial** (5-second JS challenge page)

The same Valibot schema drives both local simulation and Pulumi Cloudflare Access resources.

### How Cloudflare Access Works

1. A request arrives at a path protected by an Access Application.
2. If no valid `CF-Access-Jwt-Assertion` cookie exists, the user is redirected to the Access login page.
3. The user authenticates via configured identity providers (email, GitHub, Google, SAML, etc.).
4. On success, Cloudflare issues a JWT (`CF-Access-Jwt-Assertion` header) containing: `iss`, `sub`, `email`, `aud`, `iat`, `exp`.
5. Service Tokens bypass identity providers — authenticate via `CF-Access-Client-Id` + `CF-Access-Client-Secret` headers.
6. Workers access the JWT via `request.headers.get('CF-Access-Jwt-Assertion')`.

### Challenge Types

| Type | Behavior | Local Simulation |
|------|----------|------------------|
| Turnstile | Embedded widget, invisible or interactive | CF test keys (always pass/block/interactive) |
| Managed Challenge | CF decides best challenge type | Serve Turnstile test widget |
| JS Challenge | Proof-of-work JS execution | 5-second delay page + clearance cookie |
| Under Attack Mode | Every request gets JS challenge | Interstitial page on all requests |
| Challenge Passage | Cookie-based clearance after solving | `cf_clearance` cookie with configurable TTL |

---

## Documentation Links

- Cloudflare Access overview: https://developers.cloudflare.com/cloudflare-one/policies/access/
- Access applications: https://developers.cloudflare.com/cloudflare-one/applications/
- Access JWT: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/
- Access service tokens: https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/
- Turnstile: https://developers.cloudflare.com/turnstile/
- Turnstile test keys: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- Managed Challenges: https://developers.cloudflare.com/waf/reference/cloudflare-challenges/
- JS Challenge: https://developers.cloudflare.com/waf/reference/cloudflare-challenges/#js-challenge
- Under Attack Mode: https://developers.cloudflare.com/fundamentals/reference/under-attack-mode/
- Caddy basicauth: https://caddyserver.com/docs/caddyfile/directives/basicauth
- Caddy forward_auth: https://caddyserver.com/docs/caddyfile/directives/forward_auth
- Pulumi Cloudflare Access Application: https://www.pulumi.com/registry/packages/cloudflare/api-docs/accessapplication/
- Pulumi Cloudflare Access Policy: https://www.pulumi.com/registry/packages/cloudflare/api-docs/accesspolicy/

---

## 1. Valibot Schema: `AccessChallengesConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-access.ts`

```typescript
/**
 * Access & Challenges Edge Config Schema
 *
 * Valibot schemas for Cloudflare Access policies, Turnstile,
 * managed/JS challenges, and Under Attack Mode.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Access Policy Schemas
// =============================================================================

/** Access policy decision type. */
export const AccessDecisionSchema = v.picklist(['allow', 'deny', 'bypass', 'non_identity']);

export type AccessDecision = v.InferOutput<typeof AccessDecisionSchema>;

/** Identity provider type for Access policies. */
export const AccessIdpTypeSchema = v.picklist([
	'email_domain', 'email', 'github_org', 'google_workspace',
	'saml', 'oidc', 'service_token', 'ip_range', 'everyone',
]);

export type AccessIdpType = v.InferOutput<typeof AccessIdpTypeSchema>;

/** An Access policy include/exclude rule. */
export const AccessPolicyRuleSchema = v.strictObject({
	type: AccessIdpTypeSchema,
	/** Value depends on type: domain, email, org name, IP range, etc. */
	value: v.optional(v.pipe(v.string(), v.minLength(1))),
});

export type AccessPolicyRule = v.InferOutput<typeof AccessPolicyRuleSchema>;

/** An Access policy. */
export const AccessPolicySchema = v.strictObject({
	/** Policy name. */
	name: v.pipe(v.string(), v.minLength(1)),
	/** Decision: allow, deny, bypass, non_identity. */
	decision: AccessDecisionSchema,
	/** Include rules (OR logic — any match grants access). */
	include: v.array(AccessPolicyRuleSchema),
	/** Exclude rules (deny even if include matches). */
	exclude: v.optional(v.array(AccessPolicyRuleSchema), []),
	/** Require rules (AND logic — all must match). */
	require: v.optional(v.array(AccessPolicyRuleSchema), []),
	/** Policy priority (lower = higher priority). */
	priority: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 0),
});

export type AccessPolicy = v.InferOutput<typeof AccessPolicySchema>;

/** An Access application (protected path). */
export const AccessApplicationSchema = v.strictObject({
	/** Application name. */
	name: v.pipe(v.string(), v.minLength(1)),
	/** Domain or subdomain for the application. */
	domain: v.pipe(v.string(), v.minLength(1)),
	/** Path prefix to protect (default: entire domain). */
	path: v.optional(v.pipe(v.string(), v.minLength(1)), '/'),
	/** Session duration (e.g., `'24h'`, `'168h'`). Default: `'24h'`. */
	sessionDuration: v.optional(v.pipe(v.string(), v.minLength(1)), '24h'),
	/** Policies for this application. */
	policies: v.array(AccessPolicySchema),
	/** Whether the app is enabled. Default: `true`. */
	enabled: v.optional(v.boolean(), true),
});

export type AccessApplication = v.InferOutput<typeof AccessApplicationSchema>;

/** Service token for machine-to-machine access. */
export const AccessServiceTokenSchema = v.strictObject({
	/** Token name/identifier. */
	name: v.pipe(v.string(), v.minLength(1)),
	/** Client ID (generated locally). */
	clientId: v.optional(v.pipe(v.string(), v.minLength(1))),
	/** Client secret (generated locally). */
	clientSecret: v.optional(v.pipe(v.string(), v.minLength(1))),
	/** Expiry duration (e.g., `'8760h'` = 1 year). Default: `'8760h'`. */
	duration: v.optional(v.pipe(v.string(), v.minLength(1)), '8760h'),
});

export type AccessServiceToken = v.InferOutput<typeof AccessServiceTokenSchema>;

// =============================================================================
// Challenge Schemas
// =============================================================================

/** Turnstile widget mode. */
export const TurnstileModeSchema = v.picklist(['managed', 'non-interactive', 'invisible']);
export type TurnstileMode = v.InferOutput<typeof TurnstileModeSchema>;

/** Turnstile configuration. */
export const TurnstileConfigSchema = v.strictObject({
	/** Whether Turnstile is enabled. Default: `false`. */
	enabled: v.optional(v.boolean(), false),
	/**
	 * Turnstile sitekey.
	 * For local testing, use CF test keys:
	 * - `'1x00000000000000000000AA'` — always passes
	 * - `'2x00000000000000000000AB'` — always blocks
	 * - `'3x00000000000000000000FF'` — forces interactive
	 * Default: `'1x00000000000000000000AA'` (always passes).
	 */
	sitekey: v.optional(v.pipe(v.string(), v.minLength(1)), '1x00000000000000000000AA'),
	/** Widget mode. Default: `'managed'`. */
	mode: v.optional(TurnstileModeSchema, 'managed'),
	/** Paths to protect with Turnstile. Default: `[]`. */
	protectedPaths: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
});

export type TurnstileConfig = v.InferOutput<typeof TurnstileConfigSchema>;

/** Challenge passage (clearance cookie) configuration. */
export const ChallengePassageSchema = v.strictObject({
	/** Cookie name. Default: `'cf_clearance'`. */
	cookieName: v.optional(v.pipe(v.string(), v.minLength(1)), 'cf_clearance'),
	/** TTL in seconds. Default: `1800` (30 minutes). */
	ttl: v.optional(v.pipe(v.number(), v.integer(), v.minValue(60)), 1800),
	/** Cookie path. Default: `'/'`. */
	path: v.optional(v.pipe(v.string(), v.minLength(1)), '/'),
});

export type ChallengePassage = v.InferOutput<typeof ChallengePassageSchema>;

// =============================================================================
// Top-Level Config
// =============================================================================

/**
 * Complete Access & Challenges configuration.
 *
 * Placed under `tooling.edge.access` in `resist.config.ts`.
 */
export const AccessChallengesConfigSchema = v.strictObject({
	/** Access applications (protected paths). Default: `[]`. */
	applications: v.optional(v.array(AccessApplicationSchema), []),
	/** Service tokens for M2M access. Default: `[]`. */
	serviceTokens: v.optional(v.array(AccessServiceTokenSchema), []),
	/** Turnstile configuration. */
	turnstile: v.optional(TurnstileConfigSchema, {}),
	/** Challenge passage (clearance cookie) settings. */
	challengePassage: v.optional(ChallengePassageSchema, {}),
	/**
	 * Under Attack Mode.
	 * When enabled, every request gets a 5-second JS challenge interstitial.
	 * Default: `false`.
	 */
	underAttackMode: v.optional(v.boolean(), false),
	/**
	 * Security level (affects challenge behavior globally).
	 * - `'off'` — No challenges
	 * - `'essentially_off'` — Minimal challenges
	 * - `'low'` — Low threat visitors challenged
	 * - `'medium'` — Moderate challenges (default)
	 * - `'high'` — Strict challenges
	 * - `'under_attack'` — Same as underAttackMode: true
	 */
	securityLevel: v.optional(v.picklist([
		'off', 'essentially_off', 'low', 'medium', 'high', 'under_attack',
	]), 'medium'),
	/**
	 * JWT signing key configuration.
	 * Keys stored at `.resist/keys/access-signing.{pem,pub}`.
	 */
	jwt: v.optional(v.strictObject({
		/** JWT issuer. Default: `'resist-edge-local'`. */
		issuer: v.optional(v.pipe(v.string(), v.minLength(1)), 'resist-edge-local'),
		/** JWT audience. Default: auto-generated from application domain. */
		audience: v.optional(v.pipe(v.string(), v.minLength(1))),
		/** Token expiry in seconds. Default: `86400` (24h). */
		expirySeconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(60)), 86400),
	}), {}),
});

export type AccessChallengesConfig = v.InferOutput<typeof AccessChallengesConfigSchema>;
```

---

## 2. Caddy Directive Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/access.ts`

```typescript
/**
 * Access & Challenges → Caddy Directives Generator
 *
 * Generates Caddy configuration for:
 * - Access application authentication (basicauth + forward_auth)
 * - JWT generation and injection (CF-Access-Jwt-Assertion)
 * - Service token validation
 * - Turnstile challenge pages
 * - JS Challenge interstitials
 * - Under Attack Mode
 * - Challenge passage (clearance cookies)
 *
 * @module
 */

import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';
import { ok, err } from '@/utils/result/helpers';
import { AccessChallengesConfigSchema } from '@/schemas/core-config/src/edge-access';
import type { AccessChallengesConfig, AccessApplication } from '@/schemas/core-config/src/edge-access';

// =============================================================================
// Access Application → Caddy Auth Directives
// =============================================================================

/**
 * Generate Caddy auth directives for an Access application.
 *
 * @param app - Access application configuration.
 * @returns Result containing Caddy directive strings.
 */
export function generateAccessAppDirectives(
	app: AccessApplication,
): Result<ReadonlyArray<v.InferOutput<typeof v.string>>> {
	if (!app.enabled) return ok([]);

	const directives: Array<string> = [
		`# Access Application: ${app.name}`,
		`# Domain: ${app.domain}, Path: ${app.path}`,
	];

	// Check for service token policy
	const hasServiceTokenPolicy = app.policies.some(
		(p) => p.include.some((r) => r.type === 'service_token'),
	);

	if (hasServiceTokenPolicy) {
		directives.push(`@access_service_token_${app.name.replace(/\s/g, '_')} {`);
		directives.push(`	path ${app.path}*`);
		directives.push(`	header CF-Access-Client-Id *`);
		directives.push(`	header CF-Access-Client-Secret *`);
		directives.push('}');
		directives.push('');
	}

	// For email/domain policies, use basicauth simulation
	const hasEmailPolicy = app.policies.some(
		(p) => p.include.some((r) => r.type === 'email_domain' || r.type === 'email'),
	);

	if (hasEmailPolicy) {
		directives.push(`# Email-based Access policy — simulated via basicauth`);
		directives.push(`basicauth ${app.path}* {`);
		directives.push('	# Local dev users (email:password format)');
		directives.push('	# Add users via: caddy hash-password');
		directives.push('	admin@example.com $2a$14$...');
		directives.push('}');
		directives.push('');
	}

	// Inject CF-Access-Jwt-Assertion header on successful auth
	directives.push('# Inject Access JWT after authentication');
	directives.push(`header_up CF-Access-Jwt-Assertion "{access_jwt}"`);
	directives.push('');

	return ok(directives);
}

// =============================================================================
// JWT Generation
// =============================================================================

/**
 * Generate Ed25519 key pair for Access JWT signing.
 *
 * Keys are stored at `.resist/keys/access-signing.pem` and `.resist/keys/access-signing.pub`.
 * Generated on first run, reused on subsequent runs.
 *
 * @param keyDir - Directory for key storage.
 * @returns Result containing paths to the key files.
 */
export function ensureAccessKeys(
	keyDir: v.InferOutput<typeof v.string>,
): Result<{ privateKey: v.InferOutput<typeof v.string>; publicKey: v.InferOutput<typeof v.string> }> {
	// Implementation uses Node.js crypto.generateKeyPairSync('ed25519')
	// Writes PEM files to keyDir
	// Returns paths
	return ok({
		privateKey: `${keyDir}/access-signing.pem`,
		publicKey: `${keyDir}/access-signing.pub`,
	});
}

// =============================================================================
// Challenge Page Generation
// =============================================================================

/**
 * Generate JS Challenge interstitial HTML page.
 *
 * Simulates Cloudflare's 5-second JS challenge with a clearance cookie.
 *
 * @param cookieName - Clearance cookie name.
 * @param ttl - Cookie TTL in seconds.
 * @returns HTML string for the challenge page.
 */
export function generateJsChallengeHtml(
	cookieName: v.InferOutput<typeof v.string>,
	ttl: v.InferOutput<typeof v.number>,
): v.InferOutput<typeof v.string> {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Checking your browser — resist.js edge</title>
<style>
body { font-family: -apple-system, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; }
.container { text-align: center; max-width: 400px; padding: 2rem; }
.spinner { width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 1rem auto; }
@keyframes spin { to { transform: rotate(360deg); } }
h1 { font-size: 1.25rem; color: #1f2937; margin-bottom: 0.5rem; }
p { color: #6b7280; font-size: 0.875rem; }
</style>
</head>
<body>
<div class="container">
<div class="spinner"></div>
<h1>Checking your browser</h1>
<p>This process is automatic. Your browser will redirect shortly.</p>
<p id="countdown">Please wait 5 seconds...</p>
</div>
<script>
let t = 5;
const el = document.getElementById('countdown');
const iv = setInterval(() => {
	t--;
	if (t <= 0) {
		clearInterval(iv);
		document.cookie = "${cookieName}=1;path=/;max-age=${String(ttl)};SameSite=Strict";
		window.location.reload();
	} else {
		el.textContent = 'Please wait ' + t + ' seconds...';
	}
}, 1000);
</script>
</body>
</html>`;
}

/**
 * Generate Under Attack Mode interstitial page.
 *
 * Same as JS challenge but with more aggressive messaging.
 */
export function generateUnderAttackHtml(
	cookieName: v.InferOutput<typeof v.string>,
	ttl: v.InferOutput<typeof v.number>,
): v.InferOutput<typeof v.string> {
	return generateJsChallengeHtml(cookieName, ttl).replace(
		'Checking your browser',
		'DDoS Protection — Checking your browser',
	);
}

// =============================================================================
// Master Generator
// =============================================================================

/**
 * Generate complete Access & Challenges Caddyfile directives.
 *
 * @param config - Access & Challenges configuration.
 * @returns Result containing the complete directive block.
 */
export function generateAccessChallengesDirectives(
	config: AccessChallengesConfig,
): Result<v.InferOutput<typeof v.string>> {
	const configResult = safeParse(AccessChallengesConfigSchema, config);
	if (!configResult.ok) return configResult;
	const validConfig = configResult.data;

	const sections: Array<string> = [];

	sections.push('# ==========================================================');
	sections.push('# Access & Challenges');
	sections.push('# ==========================================================');
	sections.push('');

	// Under Attack Mode (highest priority — applies to ALL requests)
	if (validConfig.underAttackMode || validConfig.securityLevel === 'under_attack') {
		const passage = validConfig.challengePassage ?? {};
		const cookieName = passage.cookieName ?? 'cf_clearance';
		const ttl = passage.ttl ?? 1800;

		sections.push('# Under Attack Mode — JS challenge on every request');
		sections.push(`@no_clearance not header_regexp Cookie "${cookieName}="`);
		sections.push('handle @no_clearance {');
		sections.push(`	respond "${generateUnderAttackHtml(cookieName, ttl).replace(/"/g, '\\"')}" 503 {`);
		sections.push('		header Content-Type "text/html"');
		sections.push('	}');
		sections.push('}');
		sections.push('');
	}

	// Access applications
	for (const app of validConfig.applications ?? []) {
		const appResult = generateAccessAppDirectives(app);
		if (!appResult.ok) return appResult;
		sections.push(...appResult.data);
	}

	// Turnstile (path-based challenge)
	if (validConfig.turnstile?.enabled && validConfig.turnstile.protectedPaths.length > 0) {
		sections.push('# Turnstile Challenge (test mode)');
		sections.push(`# Sitekey: ${validConfig.turnstile.sitekey}`);
		sections.push('# Server-side validation against https://challenges.cloudflare.com/turnstile/v0/siteverify');
		sections.push('');
	}

	return ok(sections.join('\n'));
}
```

---

## 3. Pulumi Mapping

### File: `packages/products/[product]/iac/src/access.ts`

```typescript
/**
 * Pulumi Access & Challenges Resource Generator
 *
 * Maps AccessChallengesConfig → Cloudflare Access resources.
 *
 * @module
 */

import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import type { AccessChallengesConfig } from '@resist/schemas/core-config/src/edge-access';
import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';

/**
 * Create Cloudflare Access resources from config.
 */
export function createAccessResources(
	accountId: pulumi.Input<v.InferOutput<typeof v.string>>,
	zoneId: pulumi.Input<v.InferOutput<typeof v.string>>,
	config: AccessChallengesConfig,
	namePrefix: v.InferOutput<typeof v.string>,
): Result<{
	applications: Array<cloudflare.AccessApplication>;
	policies: Array<cloudflare.AccessPolicy>;
	serviceTokens: Array<cloudflare.AccessServiceServiceToken>;
}> {
	const applications: Array<cloudflare.AccessApplication> = [];
	const policies: Array<cloudflare.AccessPolicy> = [];
	const serviceTokens: Array<cloudflare.AccessServiceServiceToken> = [];

	for (const app of config.applications ?? []) {
		if (!app.enabled) continue;

		const accessApp = new cloudflare.AccessApplication(`${namePrefix}-access-${app.name}`, {
			accountId,
			name: app.name,
			domain: `${app.domain}${app.path}`,
			sessionDuration: app.sessionDuration ?? '24h',
			type: 'self_hosted',
		});
		applications.push(accessApp);

		for (const policy of app.policies) {
			const accessPolicy = new cloudflare.AccessPolicy(
				`${namePrefix}-policy-${app.name}-${policy.name}`,
				{
					accountId,
					applicationId: accessApp.id,
					name: policy.name,
					decision: policy.decision,
					precedence: policy.priority ?? 0,
					includes: policy.include.map((r) => {
						switch (r.type) {
							case 'email_domain': return { emailDomains: [r.value!] };
							case 'email': return { emails: [r.value!] };
							case 'github_org': return { githubOrganizationName: r.value! };
							case 'ip_range': return { ips: [r.value!] };
							case 'everyone': return { everyone: true };
							default: return { everyone: true };
						}
					}),
				},
			);
			policies.push(accessPolicy);
		}
	}

	for (const token of config.serviceTokens ?? []) {
		serviceTokens.push(new cloudflare.AccessServiceServiceToken(
			`${namePrefix}-svc-token-${token.name}`,
			{ accountId, name: token.name },
		));
	}

	return ok({ applications, policies, serviceTokens });
}
```

---

## 4. Verification Steps

```bash
pnpm tool edge &
sleep 3

# Test 1: Protected path requires auth
curl -s -o /dev/null -w "%{http_code}" "https://localhost:3000/admin"
# Expected: 401 (requires authentication)

# Test 2: Service token authentication
curl -s -o /dev/null -w "%{http_code}" \
  -H "CF-Access-Client-Id: test-client-id" \
  -H "CF-Access-Client-Secret: test-client-secret" \
  "https://localhost:3000/admin"
# Expected: 200

# Test 3: Access JWT injected after auth
curl -s -D- -u "admin@example.com:password" "https://localhost:3000/admin" | grep "CF-Access-Jwt-Assertion"
# Expected: JWT header present

# Test 4: Under Attack Mode — challenge page
# (with underAttackMode: true in config)
curl -s "https://localhost:3000/" | grep "Checking your browser"
# Expected: Challenge interstitial HTML

# Test 5: Clearance cookie bypasses challenge
curl -s -o /dev/null -w "%{http_code}" \
  -b "cf_clearance=1" "https://localhost:3000/"
# Expected: 200

# Test 6: Turnstile test key validation
curl -s -X POST "https://challenges.cloudflare.com/turnstile/v0/siteverify" \
  -d "secret=1x0000000000000000000000000000000AA&response=test-token"
# Expected: {"success": true}
```

---

## 5. Known Limitations & Simulation Gaps

| Feature | Cloudflare | Local Simulation | Gap |
|---------|-----------|-----------------|-----|
| Identity providers | Full OAuth/SAML/OIDC flows | basicauth only | No real IdP integration |
| Access JWT structure | CF-signed, includes team/org | Ed25519 locally signed | Different signature/issuer |
| Managed Challenge | ML-based challenge selection | Static Turnstile widget | No adaptive challenge |
| JS Challenge | Real proof-of-work | Timer-based cookie | No actual PoW |
| Under Attack Mode | Sophisticated JS challenge | Simple 5-second interstitial | Easily bypassable |
| Gateway/WARP | Network-level Zero Trust | Not simulated | No network-level ZT |
| Browser Isolation | Remote browser rendering | Not simulated | No RBI |

---

## 6. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-access.ts` | `AccessChallengesConfigSchema`, `AccessApplicationSchema`, `AccessPolicySchema`, `TurnstileConfigSchema`, `ChallengePassageSchema` |
| `packages/shared/utils/cli/src/tools/edge/utils/access.ts` | `generateAccessChallengesDirectives()`, `generateAccessAppDirectives()`, `generateJsChallengeHtml()`, `ensureAccessKeys()` |
| `packages/products/[product]/iac/src/access.ts` | `createAccessResources()` — Pulumi IaC |

---

## 7. Dependencies

- **00-foundation.md** — Edge tool rename, config inheritance, `.resist/keys/` directory
- **05-ip-firewall.md** — Security level interacts with challenge behavior
- **15-cf-fields.md** — `CF-Access-Jwt-Assertion` header injection

---

## 8. Implementation Order

1. Add Access policy schemas to `edge-access.ts`
2. Add Access application schema
3. Add Turnstile, challenge passage, security level schemas
4. Add `AccessChallengesConfigSchema` composing all
5. Create `access.ts` with Access app directives generation
6. Add JWT key generation utility
7. Add JS challenge + Under Attack Mode HTML generation
8. Add Turnstile integration
9. Add `generateAccessChallengesDirectives()` master function
10. Hook into `generateEdgeCaddyDirectives()` in `caddy.ts`
11. Create Pulumi mapping
12. Write tests
