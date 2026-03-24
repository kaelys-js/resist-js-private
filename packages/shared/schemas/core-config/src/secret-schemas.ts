/**
 * Secret Validation Schemas
 *
 * Valibot schemas for validating secret structure per category.
 * Includes rich primitive validators (SecretKeySchema, ApiKeySchema, DatabaseUrlSchema, etc.)
 * and per-folder schemas for both global and product secrets.
 *
 * Adapted from `_INTEGRATE/env-management/config/schemas.ts`.
 * Conversions: `v.object()` → `v.strictObject()`, throws → Result returns,
 * TS interfaces → Valibot schemas.
 *
 * @module
 */

import * as v from 'valibot';

import type { Str } from '@/schemas/common';

// =============================================================================
// Primitive Validators (from _INTEGRATE/env-management/config/schemas.ts)
// =============================================================================

/** Non-empty secret value. */
const NonEmptyStringSchema = v.pipe(v.string(), v.minLength(1, 'Value cannot be empty'));

/**
 * Cryptographic secret key — minimum 32 characters.
 * Used for JWT secrets, encryption keys, etc.
 */
const SecretKeySchema = v.pipe(
  v.string(),
  v.minLength(32, 'Secret keys must be at least 32 characters'),
);

/**
 * External service API key — minimum 8 characters.
 * Used for third-party service tokens.
 */
const ApiKeySchema = v.pipe(v.string(), v.minLength(8, 'API keys must be at least 8 characters'));

/**
 * Database connection URL with protocol validation.
 * Supports postgres, mysql, sqlite, libsql, mongodb.
 */
const DatabaseUrlSchema = v.pipe(
  v.string(),
  v.regex(
    /^(postgres|postgresql|mysql|sqlite|libsql|mongodb(\+srv)?):\/\/.+/i,
    'Must be a valid database connection URL',
  ),
);

/** URL string. */
const UrlStringSchema = v.pipe(v.string(), v.url('Must be a valid URL'));

/**
 * Duration string (e.g., "15m", "1h", "7d").
 * Used for JWT token expiry configuration.
 */
const DurationStringSchema = v.pipe(
  v.string(),
  v.regex(/^\d+[smhd]$/, 'Must be a duration like "15m" or "7d"'),
);

// =============================================================================
// Global Secret Schemas
// =============================================================================

/** Cloudflare secrets (global /cloudflare folder). */
export const CloudflareSecretsSchema = v.strictObject({
  /** Cloudflare API token with required permissions. */
  CLOUDFLARE_API_TOKEN: v.pipe(ApiKeySchema),
  /** Cloudflare account ID. */
  CLOUDFLARE_ACCOUNT_ID: NonEmptyStringSchema,
  /** Cloudflare zone ID (optional, per-product). */
  CLOUDFLARE_ZONE_ID: v.optional(NonEmptyStringSchema),
});

/** GitHub secrets (global /github folder). */
export const GitHubSecretsSchema = v.strictObject({
  /** GitHub personal access token. */
  GITHUB_PAT: v.pipe(ApiKeySchema),
  /** GitHub OAuth client ID. */
  GITHUB_OAUTH_CLIENT_ID: NonEmptyStringSchema,
  /** GitHub OAuth client secret. */
  GITHUB_OAUTH_CLIENT_SECRET: NonEmptyStringSchema,
  /** GitHub App ID (optional, if using GitHub App auth). */
  GITHUB_APP_ID: v.optional(NonEmptyStringSchema),
  /** GitHub App private key (optional). */
  GITHUB_APP_PRIVATE_KEY: v.optional(NonEmptyStringSchema),
});

/** GitLab secrets (global /gitlab folder). */
export const GitLabSecretsSchema = v.strictObject({
  /** GitLab access token. */
  GITLAB_TOKEN: v.pipe(ApiKeySchema),
  /** GitLab OAuth application ID. */
  GITLAB_OAUTH_APP_ID: NonEmptyStringSchema,
  /** GitLab OAuth application secret. */
  GITLAB_OAUTH_APP_SECRET: NonEmptyStringSchema,
});

/** Turbo Remote Cache secrets (global /turbo folder). */
export const TurboSecretsSchema = v.strictObject({
  /** Turborepo remote cache token. */
  TURBO_TOKEN: v.pipe(ApiKeySchema),
  /** Turborepo team slug. */
  TURBO_TEAM: NonEmptyStringSchema,
  /** Turborepo API URL (optional, for self-hosted). */
  TURBO_API: v.optional(UrlStringSchema),
});

/** DevEnv/Hetzner secrets (global /devenv folder). */
export const DevEnvSecretsSchema = v.strictObject({
  /** Hetzner Cloud API token. */
  HETZNER_TOKEN: v.pipe(ApiKeySchema),
});

// =============================================================================
// Product Secret Schemas (from _INTEGRATE/env-management/config/schemas.ts)
// =============================================================================

/** Database secrets (product /api folder — database layer). */
export const DatabaseSecretsSchema = v.strictObject({
  /** D1 database ID (Cloudflare). */
  D1_DATABASE_ID: NonEmptyStringSchema,
  /** KV namespace ID (Cloudflare). */
  KV_NAMESPACE_ID: NonEmptyStringSchema,
  /** Primary database connection URL (optional, for non-D1 databases). */
  DATABASE_URL: v.optional(DatabaseUrlSchema),
  /** Database auth token (for Turso/LibSQL). */
  DATABASE_AUTH_TOKEN: v.optional(v.pipe(ApiKeySchema)),
  /** Read replica URL (optional). */
  DATABASE_REPLICA_URL: v.optional(DatabaseUrlSchema),
});

/** Authentication secrets (product /api folder — auth layer). */
export const AuthSecretsSchema = v.strictObject({
  /** API-level secret key. */
  API_SECRET_KEY: v.pipe(SecretKeySchema),
  /** JWT signing secret for access tokens (min 32 chars). */
  JWT_SECRET: v.optional(v.pipe(SecretKeySchema)),
  /** JWT signing secret for refresh tokens (min 32 chars). */
  JWT_REFRESH_SECRET: v.optional(v.pipe(SecretKeySchema)),
  /** JWT issuer identifier. */
  JWT_ISSUER: v.optional(NonEmptyStringSchema),
  /** JWT audience identifier. */
  JWT_AUDIENCE: v.optional(NonEmptyStringSchema),
  /** Access token expiry duration (e.g., "15m", "1h"). */
  JWT_ACCESS_EXPIRY: v.optional(DurationStringSchema),
  /** Refresh token expiry duration (e.g., "7d", "30d"). */
  JWT_REFRESH_EXPIRY: v.optional(DurationStringSchema),
});

/** Payment processing secrets (product /app folder — Lemon Squeezy). */
export const PaymentSecretsSchema = v.strictObject({
  /** Lemon Squeezy API key. */
  LEMON_SQUEEZY_API_KEY: v.pipe(ApiKeySchema),
  /** Lemon Squeezy webhook signing secret (optional). */
  LEMON_SQUEEZY_WEBHOOK_SECRET: v.optional(NonEmptyStringSchema),
});

/** RevenueCat in-app purchase secrets (product /app folder). */
export const RevenueCatSecretsSchema = v.strictObject({
  /** RevenueCat API key. */
  REVENUECAT_API_KEY: v.pipe(ApiKeySchema),
  /** RevenueCat webhook authorization header (optional). */
  REVENUECAT_WEBHOOK_AUTH: v.optional(NonEmptyStringSchema),
});

/** Analytics secrets (product /app folder — PostHog). */
export const AnalyticsSecretsSchema = v.strictObject({
  /** PostHog analytics API key. */
  POSTHOG_API_KEY: v.pipe(ApiKeySchema),
  /** PostHog host URL (optional, for self-hosted). */
  POSTHOG_HOST: v.optional(UrlStringSchema),
});

/** Email service secrets (product /marketing folder — Resend). */
export const EmailSecretsSchema = v.strictObject({
  /** Resend email API key (must start with `re_`). */
  RESEND_API_KEY: v.pipe(v.string(), v.startsWith('re_', 'Resend API key must start with re_')),
  /** Google Analytics measurement ID. */
  GA_MEASUREMENT_ID: NonEmptyStringSchema,
  /** Default from email address (optional). */
  EMAIL_FROM: v.optional(v.pipe(v.string(), v.email())),
  /** Default reply-to email address (optional). */
  EMAIL_REPLY_TO: v.optional(v.pipe(v.string(), v.email())),
});

/** Status page secrets (product /status folder). */
export const StatusSecretsSchema = v.strictObject({
  /** Status page monitoring token. */
  STATUS_PAGE_TOKEN: v.pipe(ApiKeySchema),
});

/** Storage secrets (product — optional S3/R2 bindings). */
export const StorageSecretsSchema = v.strictObject({
  /** S3/R2 access key ID. */
  S3_ACCESS_KEY_ID: v.optional(NonEmptyStringSchema),
  /** S3/R2 secret access key. */
  S3_SECRET_ACCESS_KEY: v.optional(v.pipe(ApiKeySchema)),
  /** S3/R2 bucket name. */
  S3_BUCKET: v.optional(NonEmptyStringSchema),
  /** S3/R2 endpoint URL. */
  S3_ENDPOINT: v.optional(UrlStringSchema),
  /** S3/R2 region. */
  S3_REGION: v.optional(NonEmptyStringSchema),
});

// =============================================================================
// Composite Schemas (for SDK typed accessors)
// =============================================================================

/**
 * All global secrets combined.
 * Used by `getGlobalSecrets()` in the Secrets SDK.
 */
export const GlobalSecretsSchema = v.strictObject({
  ...CloudflareSecretsSchema.entries,
  ...GitHubSecretsSchema.entries,
  ...TurboSecretsSchema.entries,
  ...DevEnvSecretsSchema.entries,
});

/**
 * All product secrets combined.
 * Used by `getProductSecrets()` in the Secrets SDK.
 */
export const ProductSecretsSchema = v.strictObject({
  ...DatabaseSecretsSchema.entries,
  ...AuthSecretsSchema.entries,
  ...PaymentSecretsSchema.entries,
  ...RevenueCatSecretsSchema.entries,
  ...AnalyticsSecretsSchema.entries,
  ...EmailSecretsSchema.entries,
  ...StatusSecretsSchema.entries,
  ...StorageSecretsSchema.entries,
});

/**
 * All secrets combined (global + product).
 * Used by `getAllSecrets()` in the Secrets SDK.
 */
export const AllSecretsSchema = v.strictObject({
  ...GlobalSecretsSchema.entries,
  ...ProductSecretsSchema.entries,
});

// =============================================================================
// Inferred Types
// =============================================================================

/** @see {@link CloudflareSecretsSchema} */
export type CloudflareSecrets = v.InferOutput<typeof CloudflareSecretsSchema>;
/** @see {@link GitHubSecretsSchema} */
export type GitHubSecrets = v.InferOutput<typeof GitHubSecretsSchema>;
/** @see {@link GitLabSecretsSchema} */
export type GitLabSecrets = v.InferOutput<typeof GitLabSecretsSchema>;
/** @see {@link TurboSecretsSchema} */
export type TurboSecrets = v.InferOutput<typeof TurboSecretsSchema>;
/** @see {@link DevEnvSecretsSchema} */
export type DevEnvSecrets = v.InferOutput<typeof DevEnvSecretsSchema>;
/** @see {@link DatabaseSecretsSchema} */
export type DatabaseSecrets = v.InferOutput<typeof DatabaseSecretsSchema>;
/** @see {@link AuthSecretsSchema} */
export type AuthSecrets = v.InferOutput<typeof AuthSecretsSchema>;
/** @see {@link PaymentSecretsSchema} */
export type PaymentSecrets = v.InferOutput<typeof PaymentSecretsSchema>;
/** @see {@link RevenueCatSecretsSchema} */
export type RevenueCatSecrets = v.InferOutput<typeof RevenueCatSecretsSchema>;
/** @see {@link AnalyticsSecretsSchema} */
export type AnalyticsSecrets = v.InferOutput<typeof AnalyticsSecretsSchema>;
/** @see {@link EmailSecretsSchema} */
export type EmailSecrets = v.InferOutput<typeof EmailSecretsSchema>;
/** @see {@link StatusSecretsSchema} */
export type StatusSecrets = v.InferOutput<typeof StatusSecretsSchema>;
/** @see {@link StorageSecretsSchema} */
export type StorageSecrets = v.InferOutput<typeof StorageSecretsSchema>;
/** @see {@link GlobalSecretsSchema} */
export type GlobalSecrets = v.InferOutput<typeof GlobalSecretsSchema>;
/** @see {@link ProductSecretsSchema} */
export type ProductSecrets = v.InferOutput<typeof ProductSecretsSchema>;
/** @see {@link AllSecretsSchema} */
export type AllSecrets = v.InferOutput<typeof AllSecretsSchema>;

// =============================================================================
// Schema Registry
// =============================================================================

/**
 * Registry of global secret schemas, keyed by Infisical folder path.
 *
 * @remarks Used by `secrets validate` to validate global secrets.
 */
export const GLOBAL_SECRET_SCHEMAS: Readonly<
  Record<Str, v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>
> = {
  '/cloudflare': CloudflareSecretsSchema,
  '/turbo': TurboSecretsSchema,
  '/devenv': DevEnvSecretsSchema,
};

/**
 * Registry of product secret schemas, keyed by Infisical folder path.
 *
 * @remarks Used by `secrets validate` to validate per-product secrets.
 */
export const PRODUCT_SECRET_SCHEMAS: Readonly<
  Record<Str, v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>
> = {
  '/api': DatabaseSecretsSchema,
  '/auth': AuthSecretsSchema,
  '/app': v.strictObject({
    ...PaymentSecretsSchema.entries,
    ...RevenueCatSecretsSchema.entries,
    ...AnalyticsSecretsSchema.entries,
  }),
  '/marketing': EmailSecretsSchema,
  '/status': StatusSecretsSchema,
  '/storage': StorageSecretsSchema,
};
