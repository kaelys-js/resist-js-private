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

import { getClient, ENV_VARS } from '@/secrets/infisical/client';
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
  type OptionalStr,
  type Str,
  type Void,
} from '@/schemas/common';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';
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

/** Options for fetching a single secret (excludes attachToProcessEnv). */
export const GetSecretOptionsSchema = v.omit(GetSecretsOptionsSchema, ['attachToProcessEnv']);

/** @see {@link GetSecretOptionsSchema} */
export type GetSecretOptions = v.InferOutput<typeof GetSecretOptionsSchema>;

/** Options for fetching secrets without path override. */
export const GetGlobalSecretsOptionsSchema = v.omit(GetSecretsOptionsSchema, ['path']);

/** @see {@link GetGlobalSecretsOptionsSchema} */
export type GetGlobalSecretsOptions = v.InferOutput<typeof GetGlobalSecretsOptionsSchema>;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Fetch and validate secrets against a Valibot schema.
 * The core accessor — all other functions delegate to this.
 *
 * @param {T} schema - Valibot schema to validate fetched secrets against.
 * @param {GetSecretsOptions} options - Fetch options (environment, projectId, path, etc.).
 * @returns {Promise<Result<v.InferOutput<T>>>} Validated secrets matching the schema.
 *
 * @example
 * ```typescript
 * const result = await getSecrets(AllSecretsSchema, { environment: 'production' });
 * if (!result.ok) return result;
 * result.data; // => AllSecrets
 * ```
 */
export async function getSecrets<T extends v.GenericSchema>(
  schema: T,
  options: GetSecretsOptions,
): Promise<Result<v.InferOutput<T>>> {
  const optionsResult: Result<GetSecretsOptions> = safeParse(GetSecretsOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }

  const validated: GetSecretsOptions = optionsResult.data as GetSecretsOptions; // cast safe: DeepReadonly preserves value
  const clientResult: Result<InfisicalClient> = getClient({});

  if (!clientResult.ok) {
    return clientResult;
  }

  const environment: Str = validated.environment ?? process.env[ENV_VARS.ENV] ?? 'development';
  const projectId: Str = validated.projectId ?? process.env[ENV_VARS.PROJECT_ID] ?? '';

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
      path: validated.path ?? '/',
      includeImports: validated.includeImports ?? true,
      ...(validated.tags && { tagSlugs: validated.tags }),
    });
  } catch (error: unknown) {
    // integration boundary: Infisical SDK threw — wrap as Result error
    return err(ERRORS.INTERNAL.UNEXPECTED, { meta: { cause: fromUnknownError(error) } });
  }

  // Convert array to key-value record via typeof narrowing
  const secretsObj: Record<Str, Str> = {};

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
  if (validated.attachToProcessEnv === true) {
    for (const [key, value] of Object.entries(secretsObj)) {
      process.env[key] = value;
    }
  }

  // Skip validation if requested — return unvalidated record
  if (validated.skipValidation === true) {
    // cast safe: user explicitly opted out of schema validation via skipValidation
    const unvalidated: Result<v.InferOutput<T>> = okUnchecked(secretsObj as v.InferOutput<T>);

    return unvalidated;
  }

  // Validate against schema
  const validatedOutput: Result<v.InferOutput<T>> = ok(schema, secretsObj);

  return validatedOutput;
}

/**
 * Fetch a single secret value by key.
 *
 * @param {Str} key - Secret key name.
 * @param {GetSecretOptions} options - Fetch options.
 * @returns {Promise<Result<Str>>} Secret value, or error if not found.
 *
 * @example
 * ```typescript
 * const result = await getSecret('DATABASE_URL', { environment: 'production' });
 * if (!result.ok) return result;
 * result.data; // => 'postgres://...'
 * ```
 */
export async function getSecret(key: Str, options: GetSecretOptions): Promise<Result<Str>> {
  const keyResult: Result<Str> = safeParse(StrSchema, key);

  if (!keyResult.ok) {
    return keyResult;
  }

  const optionsResult: Result<GetSecretOptions> = safeParse(GetSecretOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }

  const validated: GetSecretOptions = optionsResult.data as GetSecretOptions; // cast safe: DeepReadonly preserves value
  const clientResult: Result<InfisicalClient> = getClient({});

  if (!clientResult.ok) {
    return clientResult;
  }

  const environment: Str = validated.environment ?? process.env[ENV_VARS.ENV] ?? 'development';
  const projectId: Str = validated.projectId ?? process.env[ENV_VARS.PROJECT_ID] ?? '';

  if (!projectId) {
    return err(ERRORS.VALIDATION.REQUIRED_FIELD, {
      meta: { field: 'projectId', hint: 'Set INFISICAL_PROJECT_ID or pass projectId option' },
    });
  }

  try {
    const secret: unknown = await clientResult.data.getSecret({
      environment,
      projectId,
      secretName: keyResult.data,
      path: validated.path ?? '/',
      includeImports: validated.includeImports ?? true,
    });

    if (
      typeof secret === 'object' &&
      secret !== null &&
      'secretValue' in secret &&
      typeof secret.secretValue === 'string'
    ) {
      return ok(StrSchema, secret.secretValue);
    }

    return err(ERRORS.VALIDATION.REQUIRED_FIELD, {
      meta: { key: keyResult.data, message: 'Secret not found' },
    });
  } catch (error: unknown) {
    // integration boundary: Infisical SDK threw — wrap as Result error
    return err(ERRORS.INTERNAL.UNEXPECTED, { meta: { cause: fromUnknownError(error) } });
  }
}

// =============================================================================
// Typed Convenience Accessors
// =============================================================================

/**
 * Fetch global secrets (shared across products).
 * Validates against `GlobalSecretsSchema`.
 *
 * @param {GetGlobalSecretsOptions} options - Fetch options (path defaults to '/').
 * @returns {Promise<Result<GlobalSecrets>>} Typed global secrets.
 *
 * @example
 * ```typescript
 * const result = await getGlobalSecrets({ environment: 'production' });
 * if (!result.ok) return result;
 * result.data; // => GlobalSecrets
 * ```
 */
export async function getGlobalSecrets(
  options: GetGlobalSecretsOptions,
): Promise<Result<GlobalSecrets>> {
  const optionsResult: Result<GetGlobalSecretsOptions> = safeParse(
    GetGlobalSecretsOptionsSchema,
    options,
  );

  if (!optionsResult.ok) {
    return optionsResult;
  }

  const validated: GetGlobalSecretsOptions = optionsResult.data as GetGlobalSecretsOptions; // cast safe: DeepReadonly preserves value

  return await getSecrets(GlobalSecretsSchema, { ...validated, path: '/' });
}

/**
 * Fetch product-specific secrets.
 * Validates against `ProductSecretsSchema`.
 *
 * @param {GetSecretsOptions} options - Fetch options.
 * @returns {Promise<Result<ProductSecrets>>} Typed product secrets.
 *
 * @example
 * ```typescript
 * const result = await getProductSecrets({ environment: 'staging', path: '/my-product' });
 * if (!result.ok) return result;
 * result.data; // => ProductSecrets
 * ```
 */
export async function getProductSecrets(
  options: GetSecretsOptions,
): Promise<Result<ProductSecrets>> {
  const optionsResult: Result<GetSecretsOptions> = safeParse(GetSecretsOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }
  return await getSecrets(ProductSecretsSchema, optionsResult.data as GetSecretsOptions); // cast safe: DeepReadonly preserves value
}

/**
 * Fetch all secrets (global + product).
 * Validates against `AllSecretsSchema`.
 *
 * @param {GetSecretsOptions} options - Fetch options.
 * @returns {Promise<Result<AllSecrets>>} Typed combined secrets.
 *
 * @example
 * ```typescript
 * const result = await getAllSecrets({ environment: 'production' });
 * if (!result.ok) return result;
 * result.data; // => AllSecrets
 * ```
 */
export async function getAllSecrets(options: GetSecretsOptions): Promise<Result<AllSecrets>> {
  const optionsResult: Result<GetSecretsOptions> = safeParse(GetSecretsOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }
  return await getSecrets(AllSecretsSchema, optionsResult.data as GetSecretsOptions); // cast safe: DeepReadonly preserves value
}

/**
 * Check if a secret exists.
 *
 * @param {Str} key - Secret key name.
 * @param {GetSecretOptions} options - Fetch options.
 * @returns {Promise<Result<Bool>>} True if secret exists and has a value.
 *
 * @example
 * ```typescript
 * const result = await hasSecret('API_KEY', { environment: 'production' });
 * if (!result.ok) return result;
 * result.data; // => true or false
 * ```
 */
export async function hasSecret(key: Str, options: GetSecretOptions): Promise<Result<Bool>> {
  const keyResult: Result<Str> = safeParse(StrSchema, key);

  if (!keyResult.ok) {
    return keyResult;
  }

  const optionsResult: Result<GetSecretOptions> = safeParse(GetSecretOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }

  const result: Result<Str> = await getSecret(
    keyResult.data,
    optionsResult.data as GetSecretOptions,
  ); // cast safe: DeepReadonly preserves value

  return ok(BoolSchema, result.ok);
}

/**
 * Fetch multiple specific secrets by key.
 *
 * @param {readonly Str[]} keys - Array of secret key names.
 * @param {GetSecretOptions} options - Fetch options.
 * @returns {Promise<Result<Record<Str, OptionalStr>>>} Key-value map.
 *
 * @example
 * ```typescript
 * const result = await getSecretsByKeys(['DB_URL', 'API_KEY'], { environment: 'production' });
 * if (!result.ok) return result;
 * result.data['DB_URL']; // => 'postgres://...' or undefined
 * ```
 */
export async function getSecretsByKeys(
  keys: readonly Str[],
  options: GetSecretOptions,
): Promise<Result<Record<Str, OptionalStr>>> {
  const keysResult: Result<readonly Str[]> = safeParse(v.array(StrSchema), keys);

  if (!keysResult.ok) {
    return keysResult;
  }

  const optionsResult: Result<GetSecretOptions> = safeParse(GetSecretOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }
  // Fetch all secrets and filter (more efficient than individual calls)

  const allResult: Result<Record<Str, Str>> = await getSecrets(
    v.record(v.string(), v.string()),
    { ...(optionsResult.data as GetSecretOptions), skipValidation: true }, // cast safe: DeepReadonly preserves value
  );

  if (!allResult.ok) {
    return allResult;
  }

  const results: Record<Str, OptionalStr> = {};

  for (const key of keysResult.data) {
    results[key] = allResult.data[key];
  }

  return okUnchecked(results);
}

/**
 * Load secrets into process.env (for Node.js scripts).
 * Skips schema validation — attaches all secrets directly.
 *
 * @param {GetSecretsOptions} options - Fetch options.
 * @returns {Promise<Result<Void>>} Success or error.
 *
 * @example
 * ```typescript
 * const result = await loadSecretsToEnv({ environment: 'production' });
 * if (!result.ok) return result;
 * // secrets are now available via process.env
 * ```
 */
export async function loadSecretsToEnv(options: GetSecretsOptions): Promise<Result<Void>> {
  const optionsResult: Result<GetSecretsOptions> = safeParse(GetSecretsOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }

  const result: Result<AllSecrets> = await getSecrets(AllSecretsSchema, {
    ...(optionsResult.data as GetSecretsOptions), // cast safe: DeepReadonly preserves value
    attachToProcessEnv: true,
    skipValidation: true,
  });

  if (!result.ok) {
    return result;
  }
  return ok(VoidSchema, undefined);
}
