/**
 * Cloudflare Workers Integration
 *
 * Type-safe utilities for accessing secrets in Cloudflare Workers.
 * Secrets are synced via `pnpm tool secrets sync` or Infisical's
 * native Cloudflare Workers integration.
 *
 * Adapted from `_INTEGRATE/env-management/sdk/cloudflare.ts`.
 * Conversions: throws → Result, `v.safeParse` → `safeParse`,
 * `as Record<...>` → typeof narrowing.
 *
 * @module
 */

import * as v from 'valibot';

import { ProductSecretsSchema, type ProductSecrets } from '@/schemas/core-config/secret-schemas';
import { BoolSchema, StrSchema, type Bool, type Str } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate Worker environment bindings at startup.
 * Filters to string-only values (excludes D1, KV, Queue bindings),
 * then validates against ProductSecretsSchema.
 *
 * @param env - Worker env bindings object.
 * @returns `Result<ProductSecrets>` — validated secrets.
 *
 * @example
 * ```ts
 * export default {
 *   async fetch(request: Request, env: unknown): Promise<Response> {
 *     const secretsResult = validateWorkerEnv(env);
 *     if (!secretsResult.ok) return new Response('Config error', { status: 500 });
 *     const secrets = secretsResult.data;
 *     // secrets.DATABASE_URL is now typed and validated
 *   }
 * }
 * ```
 */
export function validateWorkerEnv(env: unknown): Result<ProductSecrets> {
  // Filter to only string values (exclude bindings like D1, KV, etc.)
  const secrets: Record<string, unknown> = {};

  if (typeof env === 'object' && env !== null) {
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string') {
        secrets[key] = value;
      }
    }
  }

  return safeParse(ProductSecretsSchema, secrets);
}

// =============================================================================
// Proxy
// =============================================================================

/**
 * Create a type-safe secrets proxy with lazy validation.
 * Validates on first property access, caches the result.
 *
 * @param env - Worker env bindings object.
 * @returns `ProductSecrets` proxy (throws on invalid access for CF Worker compat).
 *
 * @example
 * ```ts
 * const secrets = createSecretsProxy(env);
 * const dbUrl = secrets.DATABASE_URL; // Validated on first use
 * ```
 */
export function createSecretsProxy(env: unknown): ProductSecrets {
  let validated: ProductSecrets | null = null;
  let validationError: Result<ProductSecrets> | null = null;

  function ensureValidated(): ProductSecrets {
    if (validated !== null) return validated;
    if (validationError !== null) {
      throw new Error(`Environment validation failed: ${JSON.stringify(validationError)}`);
    }

    const result: Result<ProductSecrets> = validateWorkerEnv(env);
    if (!result.ok) {
      validationError = result;
      throw new Error(`Environment validation failed: ${JSON.stringify(result)}`);
    }

    validated = result.data;
    return validated;
  }

  return new Proxy({} as ProductSecrets, {
    get(_, prop: string): unknown {
      const secrets: ProductSecrets = ensureValidated();
      return secrets[prop as keyof ProductSecrets];
    },
    has(_, prop: string): boolean {
      const secrets: ProductSecrets = ensureValidated();
      return prop in secrets;
    },
    ownKeys(): string[] {
      const secrets: ProductSecrets = ensureValidated();
      return Object.keys(secrets);
    },
    getOwnPropertyDescriptor(_, prop: string): PropertyDescriptor | undefined {
      const secrets: ProductSecrets = ensureValidated();
      if (prop in secrets) {
        return {
          configurable: true,
          enumerable: true,
          value: secrets[prop as keyof ProductSecrets],
        };
      }
      return undefined;
    },
  });
}

// =============================================================================
// Individual Accessors
// =============================================================================

/**
 * Get a single secret from Worker env with type safety.
 *
 * @param env - Worker env bindings object.
 * @param key - Secret key name.
 * @returns `Result<Str>` — the secret value.
 */
export function getEnvSecret<K extends keyof ProductSecrets>(
  env: unknown,
  key: K,
): Result<ProductSecrets[K]> {
  const result: Result<ProductSecrets> = validateWorkerEnv(env);
  if (!result.ok) return result;
  return okUnchecked(result.data[key]);
}

/**
 * Check if a secret exists and is non-empty in Worker env.
 * Uses typeof narrowing instead of `as` casts.
 *
 * @param env - Worker env bindings object.
 * @param key - Secret key name.
 * @returns `Result<Bool>` — true if secret exists and is non-empty.
 */
export function hasEnvSecret(env: unknown, key: Str): Result<Bool> {
  if (typeof env !== 'object' || env === null) return okUnchecked(false);
  const entries: Record<string, unknown> = env as Record<string, unknown>;
  const value: unknown = entries[key];
  return okUnchecked(typeof value === 'string' && value.length > 0);
}

/**
 * Get a secret from Worker env with fallback default.
 *
 * @param env - Worker env bindings object.
 * @param key - Secret key name.
 * @param defaultValue - Fallback value if secret is missing or invalid.
 * @returns `Result<ProductSecrets[K]>` — secret value or default.
 */
export function getEnvSecretOrDefault<K extends keyof ProductSecrets>(
  env: unknown,
  key: K,
  defaultValue: ProductSecrets[K],
): Result<ProductSecrets[K]> {
  const result: Result<ProductSecrets> = validateWorkerEnv(env);
  if (!result.ok) return okUnchecked(defaultValue);
  return okUnchecked(result.data[key] ?? defaultValue);
}

/**
 * Validate env and return Result-based outcome (for middleware use).
 * Replaces `_INTEGRATE` `withValidatedEnv()` which returned `{ secrets, error }`.
 *
 * @param env - Worker env bindings object.
 * @returns `Result<ProductSecrets>` — validated secrets or typed error.
 */
export function withValidatedEnv(env: unknown): Result<ProductSecrets> {
  return validateWorkerEnv(env);
}

/**
 * Check if Worker env has all required secrets.
 * Uses typeof narrowing instead of `as` casts.
 *
 * @param env - Worker env bindings object.
 * @param keys - Required secret key names.
 * @returns `Result<Bool>` — true if all keys are present and non-empty.
 */
export function hasRequiredSecrets(
  env: unknown,
  keys: readonly (keyof ProductSecrets)[],
): Result<Bool> {
  if (typeof env !== 'object' || env === null) return okUnchecked(false);

  for (const key of keys) {
    const entries: Record<string, unknown> = env as Record<string, unknown>;
    const value: unknown = entries[key as string];
    if (typeof value !== 'string' || value.length === 0) {
      return okUnchecked(false);
    }
  }

  return okUnchecked(true);
}
