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
import { ok, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { safeStringify } from '@/utils/core/object';

// =============================================================================
// Schemas
// =============================================================================

/**
 * Valibot schema for validating keys against ProductSecrets key names.
 * Used to validate the `key` parameter in accessor functions.
 */
const ProductSecretsKeySchema = v.picklist(
  Object.keys(ProductSecretsSchema.entries) as [keyof ProductSecrets, ...(keyof ProductSecrets)[]], // cast safe: Object.keys returns the known schema entry keys
);

/**
 * Valibot schema for validating Worker env is a non-null object.
 * Used to validate the `env` parameter before filtering string values.
 */
const EnvObjectSchema = v.record(v.string(), v.unknown());

// =============================================================================
// API
// =============================================================================

/**
 * Validate Worker environment bindings at startup.
 * Filters to string-only values (excludes D1, KV, Queue bindings),
 * then validates against ProductSecretsSchema.
 *
 * @param {unknown} env - Worker env bindings object.
 * @returns {Result<ProductSecrets>} Validated secrets.
 *
 * @example
 * ```typescript
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
  const envResult: Result<Record<Str, unknown>> = safeParse(EnvObjectSchema, env);

  if (!envResult.ok) {
    return envResult;
  }
  // Filter to only string values (exclude bindings like D1, KV, etc.)
  const secrets: Record<Str, unknown> = {};

  for (const [key, value] of Object.entries(envResult.data)) {
    if (typeof value === 'string') {
      secrets[key] = value;
    }
  }

  const result: Result<ProductSecrets> = safeParse(ProductSecretsSchema, secrets);

  return result;
}

/**
 * Create a type-safe secrets proxy with lazy validation.
 * Validates on first property access, caches the result.
 *
 * @param {unknown} env - Worker env bindings object.
 * @returns {ProductSecrets} Proxy (throws on invalid access for CF Worker compat).
 *
 * @example
 * ```typescript
 * const secrets = createSecretsProxy(env);
 * const dbUrl = secrets.DATABASE_URL; // Validated on first use
 * ```
 */
export function createSecretsProxy(env: unknown): ProductSecrets {
  const envResult: Result<Record<Str, unknown>> = safeParse(EnvObjectSchema, env);

  let validated: ProductSecrets | null = null;
  let validationError: Result<ProductSecrets> | null = null;

  function ensureValidated(): ProductSecrets {
    if (validated !== null) {
      return validated;
    }
    if (validationError !== null) {
      const msg: Result<Str> = safeStringify(validationError);

      if (!msg.ok) {
        throw new Error('Environment validation failed: unable to serialize error'); // integration boundary: Cloudflare Workers proxy requires throw
      }

      throw new Error(`Environment validation failed: ${msg.data}`); // integration boundary: Cloudflare Workers proxy requires throw
    }

    if (!envResult.ok) {
      const msg: Result<Str> = safeStringify(envResult);

      if (!msg.ok) {
        throw new Error('Environment validation failed: unable to serialize error'); // integration boundary: Cloudflare Workers proxy requires throw
      }

      throw new Error(`Environment validation failed: ${msg.data}`); // integration boundary: Cloudflare Workers proxy requires throw
    }

    const result: Result<ProductSecrets> = validateWorkerEnv(env);

    if (!result.ok) {
      validationError = result;
      const msg: Result<Str> = safeStringify(result);

      if (!msg.ok) {
        throw new Error('Environment validation failed: unable to serialize error'); // integration boundary: Cloudflare Workers proxy requires throw
      }

      throw new Error(`Environment validation failed: ${msg.data}`); // integration boundary: Cloudflare Workers proxy requires throw
    }

    validated = result.data;

    return validated;
  }

  return new Proxy({} as ProductSecrets, {
    // cast safe: empty object is immediately proxied and never accessed directly
    get(_target: ProductSecrets, prop: Str): unknown {
      const secrets: ProductSecrets = ensureValidated();

      return secrets[prop as keyof ProductSecrets]; // cast safe: proxy trap narrows string to known key
    },
    has(_target: ProductSecrets, prop: Str): Bool {
      const secrets: ProductSecrets = ensureValidated();

      return prop in secrets;
    },
    ownKeys(_target: ProductSecrets): Str[] {
      const secrets: ProductSecrets = ensureValidated();

      return Object.keys(secrets);
    },
    getOwnPropertyDescriptor(_target: ProductSecrets, prop: Str): PropertyDescriptor | undefined {
      const secrets: ProductSecrets = ensureValidated();

      if (prop in secrets) {
        return {
          configurable: true,
          enumerable: true,
          value: secrets[prop as keyof ProductSecrets], // cast safe: guarded by `prop in secrets` check above
        };
      }

      return undefined;
    },
  });
}

/**
 * Get a single secret from Worker env with type safety.
 *
 * @param {unknown} env - Worker env bindings object.
 * @param {K} key - Secret key name.
 * @returns {Result<ProductSecrets[K]>} The secret value.
 *
 * @example
 * ```typescript
 * const dbUrl = getEnvSecret(env, 'DATABASE_URL');
 * if (dbUrl.ok) console.log(dbUrl.data);
 * ```
 */
export function getEnvSecret<K extends keyof ProductSecrets>(
  env: unknown,
  key: K,
): Result<ProductSecrets[K]> {
  const envResult: Result<Record<Str, unknown>> = safeParse(EnvObjectSchema, env);

  if (!envResult.ok) {
    return envResult;
  }
  const keyResult: Result<keyof ProductSecrets> = safeParse(ProductSecretsKeySchema, key);

  if (!keyResult.ok) {
    return keyResult;
  }
  const result: Result<ProductSecrets> = validateWorkerEnv(env);

  if (!result.ok) {
    return result;
  }
  return okUnchecked(result.data[keyResult.data] as ProductSecrets[K]); // cast safe: DeepReadonly preserves value
}

/**
 * Check if a secret exists and is non-empty in Worker env.
 * Uses typeof narrowing instead of `as` casts.
 *
 * @param {unknown} env - Worker env bindings object.
 * @param {Str} key - Secret key name.
 * @returns {Result<Bool>} True if secret exists and is non-empty.
 *
 * @example
 * ```typescript
 * const hasDb = hasEnvSecret(env, 'DATABASE_URL');
 * if (hasDb.ok && hasDb.data) console.log('DB configured');
 * ```
 */
export function hasEnvSecret(env: unknown, key: Str): Result<Bool> {
  const keyResult: Result<Str> = safeParse(StrSchema, key);

  if (!keyResult.ok) {
    return keyResult;
  }
  const envResult: Result<Record<Str, unknown>> = safeParse(EnvObjectSchema, env);

  if (!envResult.ok) {
    return envResult;
  }
  const value: unknown = envResult.data[keyResult.data];

  return ok(BoolSchema, typeof value === 'string' && value.length > 0);
}

/**
 * Get a secret from Worker env with fallback default.
 *
 * @param {unknown} env - Worker env bindings object.
 * @param {K} key - Secret key name.
 * @param {ProductSecrets[K]} defaultValue - Fallback value if secret is missing or invalid.
 * @returns {Result<ProductSecrets[K]>} Secret value or default.
 *
 * @example
 * ```typescript
 * const host = getEnvSecretOrDefault(env, 'POSTHOG_HOST', 'https://app.posthog.com');
 * if (host.ok) console.log(host.data);
 * ```
 */
export function getEnvSecretOrDefault<K extends keyof ProductSecrets>(
  env: unknown,
  key: K,
  defaultValue: ProductSecrets[K],
): Result<ProductSecrets[K]> {
  const envResult: Result<Record<Str, unknown>> = safeParse(EnvObjectSchema, env);

  if (!envResult.ok) {
    return envResult;
  }
  const keyResult: Result<keyof ProductSecrets> = safeParse(ProductSecretsKeySchema, key);

  if (!keyResult.ok) {
    return keyResult;
  }
  const defaultResult: Result<Str> = safeParse(StrSchema, defaultValue);

  if (!defaultResult.ok) {
    return defaultResult;
  }
  const result: Result<ProductSecrets[K]> = getEnvSecret(env, keyResult.data as K); // cast safe: keyResult.data validated as keyof ProductSecrets above

  if (result.ok) {
    return okUnchecked(result.data as ProductSecrets[K]); // cast safe: DeepReadonly preserves value
  }

  return okUnchecked(defaultValue);
}

/**
 * Validate env and return Result-based outcome (for middleware use).
 * Replaces `_INTEGRATE` `withValidatedEnv()` which returned `{ secrets, error }`.
 *
 * @param {unknown} env - Worker env bindings object.
 * @returns {Result<ProductSecrets>} Validated secrets or typed error.
 *
 * @example
 * ```typescript
 * const result = withValidatedEnv(env);
 * if (!result.ok) return new Response('Invalid env', { status: 500 });
 * const secrets = result.data;
 * ```
 */
export function withValidatedEnv(env: unknown): Result<ProductSecrets> {
  const envResult: Result<Record<Str, unknown>> = safeParse(EnvObjectSchema, env);

  if (!envResult.ok) {
    return envResult;
  }
  return validateWorkerEnv(env);
}

/**
 * Check if Worker env has all required secrets.
 * Uses typeof narrowing instead of `as` casts.
 *
 * @param {unknown} env - Worker env bindings object.
 * @param {readonly (keyof ProductSecrets)[]} keys - Required secret key names.
 * @returns {Result<Bool>} True if all keys are present and non-empty.
 *
 * @example
 * ```typescript
 * const ready = hasRequiredSecrets(env, ['DATABASE_URL', 'API_SECRET_KEY'] as const);
 * if (ready.ok && ready.data) console.log('All secrets present');
 * ```
 */
export function hasRequiredSecrets(
  env: unknown,
  keys: ReadonlyArray<keyof ProductSecrets>,
): Result<Bool> {
  const keysResult: Result<Array<keyof ProductSecrets>> = safeParse(
    v.array(ProductSecretsKeySchema),
    [...keys],
  );

  if (!keysResult.ok) {
    return keysResult;
  }
  const envResult: Result<Record<Str, unknown>> = safeParse(EnvObjectSchema, env);

  if (!envResult.ok) {
    return envResult;
  }
  for (const key of keysResult.data) {
    const value: unknown = envResult.data[key];

    if (typeof value !== 'string' || value.length === 0) {
      return ok(BoolSchema, false);
    }
  }

  return ok(BoolSchema, true);
}
