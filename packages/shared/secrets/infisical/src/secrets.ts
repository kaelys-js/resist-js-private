/**
 * Secret Fetching — Type-Safe Accessors
 *
 * Provides `getSecrets<T>()`, `getSecret()`, `getGlobalSecrets()`,
 * `getProductSecrets()`, and `loadSecretsToEnv()` — the `getConfig()`
 * equivalent for secrets.
 *
 * All functions return `Result<T>`, use `safeParse` from `@/utils/result/safe`.
 *
 * Adapted from `_INTEGRATE/env-management/sdk/secrets.ts`.
 * Conversions: throws → Result, `as` casts → typeof narrowing,
 * `v.safeParse` → `safeParse` from `@/utils/result/safe`.
 *
 * @module
 */

import type { InfisicalClient } from '@infisical/sdk';
import * as v from 'valibot';

import { getClient, ENV_VARS, type ClientOptions } from '@/secrets/infisical/client';
import {
  GlobalSecretsSchema,
  ProductSecretsSchema,
  AllSecretsSchema,
  type GlobalSecrets,
  type ProductSecrets,
  type AllSecrets,
} from '@/schemas/core-config/secret-schemas';
import {
  BoolSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type Str,
  type Void,
} from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Options for fetching secrets. */
export const GetSecretsOptionsSchema = v.strictObject({
  /** Environment to fetch from (auto-detected if not provided). */
  environment: v.optional(StrSchema),
  /** Infisical project ID (falls back to INFISICAL_PROJECT_ID env var). */
  projectId: v.optional(StrSchema),
  /** Folder path within the project. */
  path: v.optional(StrSchema),
  /** Whether to attach secrets to process.env. */
  attachToProcessEnv: v.optional(BoolSchema),
  /** Whether to include imported secrets. */
  includeImports: v.optional(BoolSchema),
  /** Skip schema validation. */
  skipValidation: v.optional(BoolSchema),
  /** Tag slugs to filter by. */
  tags: v.optional(v.array(StrSchema)),
});

/** @see {@link GetSecretsOptionsSchema} */
export type GetSecretsOptions = v.InferOutput<typeof GetSecretsOptionsSchema>;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Fetch and validate secrets against a Valibot schema.
 * The core accessor — all other functions delegate to this.
 *
 * @param schema - Valibot schema to validate fetched secrets against.
 * @param options - Fetch options (environment, projectId, path, etc.).
 * @returns `Result<T>` — validated secrets matching the schema.
 */
export async function getSecrets<T extends v.GenericSchema>(
  schema: T,
  options: GetSecretsOptions = {},
): Promise<Result<v.InferOutput<T>>> {
  const clientResult: Result<InfisicalClient> = getClient();
  if (!clientResult.ok) return clientResult;

  const environment: Str = options.environment ?? process.env[ENV_VARS.ENV] ?? 'development';
  const projectId: Str = options.projectId ?? process.env[ENV_VARS.PROJECT_ID] ?? '';

  if (!projectId) {
    return err(ERRORS.VALIDATION.REQUIRED_FIELD, {
      meta: { field: 'projectId', hint: 'Set INFISICAL_PROJECT_ID or pass projectId option' },
    });
  }

  // Fetch secrets from Infisical
  let rawSecrets: unknown[];
  try {
    rawSecrets = await clientResult.data.listSecrets({
      environment,
      projectId,
      path: options.path ?? '/',
      includeImports: options.includeImports ?? true,
      ...(options.tags && { tagSlugs: options.tags }),
    });
  } catch (error: unknown) {
    return fromUnknownError(error);
  }

  // Convert array to key-value record via typeof narrowing
  const secretsObj: Record<string, string> = {};
  if (Array.isArray(rawSecrets)) {
    for (const entry of rawSecrets) {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        'secretKey' in entry &&
        'secretValue' in entry &&
        typeof entry.secretKey === 'string' &&
        typeof entry.secretValue === 'string'
      ) {
        secretsObj[entry.secretKey] = entry.secretValue;
      }
    }
  }

  // Optionally attach to process.env
  if (options.attachToProcessEnv === true) {
    for (const [key, value] of Object.entries(secretsObj)) {
      process.env[key] = value;
    }
  }

  // Skip validation if requested
  if (options.skipValidation === true) {
    return okUnchecked(secretsObj as v.InferOutput<T>);
  }

  // Validate against schema
  return safeParse(schema, secretsObj);
}

/**
 * Fetch a single secret value by key.
 *
 * @param key - Secret key name.
 * @param options - Fetch options.
 * @returns `Result<Str>` — secret value, or error if not found.
 */
export async function getSecret(
  key: Str,
  options: Omit<GetSecretsOptions, 'attachToProcessEnv'> = {},
): Promise<Result<Str>> {
  const clientResult: Result<InfisicalClient> = getClient();
  if (!clientResult.ok) return clientResult;

  const environment: Str = options.environment ?? process.env[ENV_VARS.ENV] ?? 'development';
  const projectId: Str = options.projectId ?? process.env[ENV_VARS.PROJECT_ID] ?? '';

  if (!projectId) {
    return err(ERRORS.VALIDATION.REQUIRED_FIELD, {
      meta: { field: 'projectId', hint: 'Set INFISICAL_PROJECT_ID or pass projectId option' },
    });
  }

  try {
    const secret: unknown = await clientResult.data.getSecret({
      environment,
      projectId,
      secretName: key,
      path: options.path ?? '/',
      includeImports: options.includeImports ?? true,
    });

    if (
      typeof secret === 'object' &&
      secret !== null &&
      'secretValue' in secret &&
      typeof secret.secretValue === 'string'
    ) {
      return okUnchecked(secret.secretValue);
    }

    return err(ERRORS.VALIDATION.REQUIRED_FIELD, {
      meta: { key, message: 'Secret not found' },
    });
  } catch (error: unknown) {
    return fromUnknownError(error);
  }
}

// =============================================================================
// Typed Convenience Accessors
// =============================================================================

/**
 * Fetch global secrets (shared across products).
 * Validates against `GlobalSecretsSchema`.
 *
 * @param options - Fetch options (path defaults to '/').
 * @returns `Result<GlobalSecrets>` — typed global secrets.
 */
export async function getGlobalSecrets(
  options: Omit<GetSecretsOptions, 'path'> = {},
): Promise<Result<GlobalSecrets>> {
  return getSecrets(GlobalSecretsSchema, { ...options, path: '/' });
}

/**
 * Fetch product-specific secrets.
 * Validates against `ProductSecretsSchema`.
 *
 * @param options - Fetch options.
 * @returns `Result<ProductSecrets>` — typed product secrets.
 */
export async function getProductSecrets(
  options: GetSecretsOptions = {},
): Promise<Result<ProductSecrets>> {
  return getSecrets(ProductSecretsSchema, options);
}

/**
 * Fetch all secrets (global + product).
 * Validates against `AllSecretsSchema`.
 *
 * @param options - Fetch options.
 * @returns `Result<AllSecrets>` — typed combined secrets.
 */
export async function getAllSecrets(options: GetSecretsOptions = {}): Promise<Result<AllSecrets>> {
  return getSecrets(AllSecretsSchema, options);
}

/**
 * Check if a secret exists.
 *
 * @param key - Secret key name.
 * @param options - Fetch options.
 * @returns `Result<Bool>` — true if secret exists and has a value.
 */
export async function hasSecret(
  key: Str,
  options: Omit<GetSecretsOptions, 'attachToProcessEnv'> = {},
): Promise<Result<Bool>> {
  const result: Result<Str> = await getSecret(key, options);
  return okUnchecked(result.ok);
}

/**
 * Fetch multiple specific secrets by key.
 *
 * @param keys - Array of secret key names.
 * @param options - Fetch options.
 * @returns `Result<Record<string, Str | undefined>>` — key-value map.
 */
export async function getSecretsByKeys(
  keys: readonly Str[],
  options: Omit<GetSecretsOptions, 'attachToProcessEnv'> = {},
): Promise<Result<Record<string, Str | undefined>>> {
  // Fetch all secrets and filter (more efficient than individual calls)
  const allResult: Result<Record<string, string>> = await getSecrets(
    v.record(v.string(), v.string()),
    { ...options, skipValidation: true },
  );
  if (!allResult.ok) return allResult;

  const results: Record<string, Str | undefined> = {};
  for (const key of keys) {
    results[key] = allResult.data[key];
  }

  return okUnchecked(results);
}

/**
 * Load secrets into process.env (for Node.js scripts).
 * Skips schema validation — attaches all secrets directly.
 *
 * @param options - Fetch options.
 * @returns `Result<Void>` — success or error.
 */
export async function loadSecretsToEnv(options: GetSecretsOptions = {}): Promise<Result<Void>> {
  const result: Result<AllSecrets> = await getSecrets(AllSecretsSchema, {
    ...options,
    attachToProcessEnv: true,
    skipValidation: true,
  });
  if (!result.ok) return result;

  return okUnchecked(undefined);
}
