/**
 * Secret Schemas
 *
 * Type-safe Valibot schemas for all secrets.
 * These schemas are used to validate secrets at runtime,
 * ensuring type safety and catching misconfigurations early.
 */

import * as v from 'valibot';

// ============================================
// Primitive Schemas
// ============================================

/**
 * Non-empty string with minimum length
 */
const NonEmptyString = v.pipe(v.string(), v.minLength(1, 'Value cannot be empty'));

/**
 * Secret key (min 32 chars for security)
 */
const SecretKey = v.pipe(
	v.string(),
	v.minLength(32, 'Secret keys must be at least 32 characters'),
	v.description('Cryptographic secret key')
);

/**
 * API key pattern
 */
const ApiKey = v.pipe(
	v.string(),
	v.minLength(8, 'API keys must be at least 8 characters'),
	v.description('External service API key')
);

/**
 * URL string
 */
const UrlString = v.pipe(v.string(), v.url('Must be a valid URL'));

/**
 * Database connection URL
 */
const DatabaseUrl = v.pipe(
	v.string(),
	v.regex(
		/^(postgres|postgresql|mysql|sqlite|libsql|mongodb(\+srv)?):\/\/.+/i,
		'Must be a valid database connection URL'
	),
	v.description('Database connection string')
);

/**
 * Boolean as string (for environment variables)
 */
const BooleanString = v.pipe(
	v.string(),
	v.transform((val) => val.toLowerCase()),
	v.picklist(['true', 'false', '1', '0', 'yes', 'no']),
	v.description('Boolean value as string')
);

/**
 * Port number as string
 */
const PortString = v.pipe(
	v.string(),
	v.regex(/^\d+$/, 'Must be a valid port number'),
	v.transform((val) => parseInt(val, 10)),
	v.number(),
	v.minValue(1),
	v.maxValue(65535),
	v.description('Port number')
);

// ============================================
// Global Secrets (Shared Across All Products)
// ============================================

/**
 * Cloudflare infrastructure secrets
 */
export const CloudflareSecretsSchema = v.object({
	/** Cloudflare API token with required permissions */
	CLOUDFLARE_API_TOKEN: v.pipe(ApiKey, v.description('Cloudflare API token')),

	/** Cloudflare account ID */
	CLOUDFLARE_ACCOUNT_ID: v.pipe(NonEmptyString, v.description('Cloudflare account identifier')),

	/** Cloudflare zone ID (optional, per-product) */
	CLOUDFLARE_ZONE_ID: v.optional(v.pipe(NonEmptyString, v.description('Cloudflare zone identifier'))),
});

/**
 * GitHub integration secrets
 */
export const GitHubSecretsSchema = v.object({
	/** GitHub personal access token or app token */
	GITHUB_TOKEN: v.optional(v.pipe(ApiKey, v.description('GitHub access token'))),

	/** GitHub App ID (if using GitHub App auth) */
	GITHUB_APP_ID: v.optional(v.pipe(NonEmptyString, v.description('GitHub App ID'))),

	/** GitHub App private key (if using GitHub App auth) */
	GITHUB_APP_PRIVATE_KEY: v.optional(v.pipe(NonEmptyString, v.description('GitHub App private key'))),
});

/**
 * Turborepo remote caching secrets
 */
export const TurboSecretsSchema = v.object({
	/** Turbo remote cache token */
	TURBO_TOKEN: v.optional(v.pipe(ApiKey, v.description('Turborepo remote cache token'))),

	/** Turbo team identifier */
	TURBO_TEAM: v.optional(v.pipe(NonEmptyString, v.description('Turborepo team slug'))),

	/** Turbo API URL (for self-hosted) */
	TURBO_API: v.optional(v.pipe(UrlString, v.description('Turborepo API endpoint'))),
});

/**
 * All global secrets combined
 */
export const GlobalSecretsSchema = v.object({
	...CloudflareSecretsSchema.entries,
	...GitHubSecretsSchema.entries,
	...TurboSecretsSchema.entries,
});

export type GlobalSecrets = v.InferOutput<typeof GlobalSecretsSchema>;

// ============================================
// Product Secrets (Per-Product Configuration)
// ============================================

/**
 * Database secrets
 */
export const DatabaseSecretsSchema = v.object({
	/** Primary database connection URL */
	DATABASE_URL: DatabaseUrl,

	/** Database auth token (for Turso/LibSQL) */
	DATABASE_AUTH_TOKEN: v.optional(v.pipe(ApiKey, v.description('Database authentication token'))),

	/** Read replica URL (optional) */
	DATABASE_REPLICA_URL: v.optional(DatabaseUrl),
});

/**
 * Authentication secrets
 */
export const AuthSecretsSchema = v.object({
	/** JWT signing secret for access tokens */
	JWT_SECRET: v.pipe(SecretKey, v.description('JWT access token signing secret')),

	/** JWT signing secret for refresh tokens */
	JWT_REFRESH_SECRET: v.pipe(SecretKey, v.description('JWT refresh token signing secret')),

	/** JWT issuer identifier */
	JWT_ISSUER: v.optional(v.pipe(NonEmptyString, v.description('JWT issuer claim'))),

	/** JWT audience identifier */
	JWT_AUDIENCE: v.optional(v.pipe(NonEmptyString, v.description('JWT audience claim'))),

	/** Access token expiry (e.g., "15m", "1h") */
	JWT_ACCESS_EXPIRY: v.optional(
		v.pipe(
			v.string(),
			v.regex(/^\d+[smhd]$/, 'Must be a duration like "15m" or "1h"'),
			v.description('Access token expiration duration')
		)
	),

	/** Refresh token expiry (e.g., "7d", "30d") */
	JWT_REFRESH_EXPIRY: v.optional(
		v.pipe(
			v.string(),
			v.regex(/^\d+[smhd]$/, 'Must be a duration like "7d" or "30d"'),
			v.description('Refresh token expiration duration')
		)
	),
});

/**
 * Payment processing secrets (Stripe)
 */
export const StripeSecretsSchema = v.object({
	/** Stripe secret key */
	STRIPE_SECRET_KEY: v.optional(
		v.pipe(
			v.string(),
			v.startsWith('sk_', 'Stripe secret key must start with sk_'),
			v.description('Stripe API secret key')
		)
	),

	/** Stripe publishable key */
	STRIPE_PUBLISHABLE_KEY: v.optional(
		v.pipe(
			v.string(),
			v.startsWith('pk_', 'Stripe publishable key must start with pk_'),
			v.description('Stripe API publishable key')
		)
	),

	/** Stripe webhook signing secret */
	STRIPE_WEBHOOK_SECRET: v.optional(
		v.pipe(
			v.string(),
			v.startsWith('whsec_', 'Stripe webhook secret must start with whsec_'),
			v.description('Stripe webhook signing secret')
		)
	),
});

/**
 * Email service secrets
 */
export const EmailSecretsSchema = v.object({
	/** Resend API key */
	RESEND_API_KEY: v.optional(
		v.pipe(
			v.string(),
			v.startsWith('re_', 'Resend API key must start with re_'),
			v.description('Resend email API key')
		)
	),

	/** SendGrid API key (alternative) */
	SENDGRID_API_KEY: v.optional(
		v.pipe(
			v.string(),
			v.startsWith('SG.', 'SendGrid API key must start with SG.'),
			v.description('SendGrid email API key')
		)
	),

	/** From email address */
	EMAIL_FROM: v.optional(v.pipe(v.string(), v.email(), v.description('Default from email address'))),

	/** Reply-to email address */
	EMAIL_REPLY_TO: v.optional(v.pipe(v.string(), v.email(), v.description('Default reply-to email address'))),
});

/**
 * RevenueCat (in-app purchases) secrets
 */
export const RevenueCatSecretsSchema = v.object({
	/** RevenueCat API key */
	REVENUECAT_API_KEY: v.optional(v.pipe(ApiKey, v.description('RevenueCat API key'))),

	/** RevenueCat webhook auth header */
	REVENUECAT_WEBHOOK_AUTH: v.optional(v.pipe(NonEmptyString, v.description('RevenueCat webhook authorization'))),
});

/**
 * Analytics and monitoring secrets
 */
export const AnalyticsSecretsSchema = v.object({
	/** Sentry DSN */
	SENTRY_DSN: v.optional(v.pipe(UrlString, v.description('Sentry error tracking DSN'))),

	/** Sentry auth token (for source maps) */
	SENTRY_AUTH_TOKEN: v.optional(v.pipe(ApiKey, v.description('Sentry authentication token'))),

	/** PostHog API key */
	POSTHOG_API_KEY: v.optional(v.pipe(ApiKey, v.description('PostHog analytics API key'))),

	/** PostHog host */
	POSTHOG_HOST: v.optional(v.pipe(UrlString, v.description('PostHog host URL'))),
});

/**
 * Storage secrets (S3-compatible)
 */
export const StorageSecretsSchema = v.object({
	/** S3/R2 access key ID */
	S3_ACCESS_KEY_ID: v.optional(v.pipe(NonEmptyString, v.description('S3 access key ID'))),

	/** S3/R2 secret access key */
	S3_SECRET_ACCESS_KEY: v.optional(v.pipe(ApiKey, v.description('S3 secret access key'))),

	/** S3/R2 bucket name */
	S3_BUCKET: v.optional(v.pipe(NonEmptyString, v.description('S3 bucket name'))),

	/** S3/R2 endpoint URL */
	S3_ENDPOINT: v.optional(v.pipe(UrlString, v.description('S3 endpoint URL'))),

	/** S3/R2 region */
	S3_REGION: v.optional(v.pipe(NonEmptyString, v.description('S3 region'))),
});

/**
 * Feature flags and configuration
 */
export const FeatureFlagsSchema = v.object({
	/** JSON-encoded feature flags */
	FEATURE_FLAGS: v.optional(
		v.pipe(
			v.string(),
			v.transform((val) => {
				try {
					return JSON.parse(val);
				} catch {
					return {};
				}
			}),
			v.description('JSON-encoded feature flags')
		)
	),

	/** Enable debug mode */
	DEBUG: v.optional(BooleanString),

	/** Log level */
	LOG_LEVEL: v.optional(v.picklist(['debug', 'info', 'warn', 'error'])),
});

/**
 * All product secrets combined
 */
export const ProductSecretsSchema = v.object({
	...DatabaseSecretsSchema.entries,
	...AuthSecretsSchema.entries,
	...StripeSecretsSchema.entries,
	...EmailSecretsSchema.entries,
	...RevenueCatSecretsSchema.entries,
	...AnalyticsSecretsSchema.entries,
	...StorageSecretsSchema.entries,
	...FeatureFlagsSchema.entries,
});

export type ProductSecrets = v.InferOutput<typeof ProductSecretsSchema>;

// ============================================
// Combined Schemas
// ============================================

/**
 * All secrets (global + product)
 */
export const AllSecretsSchema = v.object({
	...GlobalSecretsSchema.entries,
	...ProductSecretsSchema.entries,
});

export type AllSecrets = v.InferOutput<typeof AllSecretsSchema>;

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate secrets against a schema
 */
export function validateSecrets<T extends v.GenericSchema>(
	schema: T,
	secrets: Record<string, string | undefined>
): v.InferOutput<T> {
	const result = v.safeParse(schema, secrets);

	if (!result.success) {
		const issues = result.issues.map((issue) => {
			const path = issue.path?.map((p) => p.key).join('.') || 'root';
			return `  - ${path}: ${issue.message}`;
		});

		throw new Error(`Secret validation failed:\n${issues.join('\n')}`);
	}

	return result.output;
}

/**
 * Partially validate secrets (ignore missing optional fields)
 */
export function validatePartialSecrets<T extends v.GenericSchema>(
	schema: T,
	secrets: Record<string, string | undefined>
): Partial<v.InferOutput<T>> {
	// Filter out undefined values
	const defined = Object.fromEntries(Object.entries(secrets).filter(([, v]) => v !== undefined));

	return v.parse(v.partial(schema), defined);
}

/**
 * Get list of required secret keys from a schema
 */
export function getRequiredKeys(schema: v.GenericSchema): string[] {
	if ('entries' in schema && typeof schema.entries === 'object') {
		return Object.entries(schema.entries as Record<string, v.GenericSchema>)
			.filter(([, entrySchema]) => {
				// Check if it's not optional
				return !('wrapped' in entrySchema && entrySchema.type === 'optional');
			})
			.map(([key]) => key);
	}
	return [];
}

/**
 * Get list of all secret keys from a schema
 */
export function getAllKeys(schema: v.GenericSchema): string[] {
	if ('entries' in schema && typeof schema.entries === 'object') {
		return Object.keys(schema.entries as Record<string, unknown>);
	}
	return [];
}
