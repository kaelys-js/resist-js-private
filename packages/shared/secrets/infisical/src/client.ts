/**
 * Infisical Client Factory
 *
 * Creates and manages Infisical client instances.
 * Singleton pattern with safeStringify comparison for cache invalidation.
 * Supports token, machine-identity, and interactive auth methods.
 *
 * Adapted from `_INTEGRATE/env-management/sdk/client.ts`.
 * Conversions: try/catch → Result, TS interfaces → Valibot schemas,
 * boolean returns → Result<Bool>.
 *
 * @module
 */

import { InfisicalClient } from '@infisical/sdk';
import * as v from 'valibot';

import { getConfig } from '@/config/loader';
import {
  BoolSchema,
  NonNegativeIntegerSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type NullableStr,
  type NonNegativeInteger,
  type Num,
  type Str,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { InfisicalAuthMethodSchema, type InfisicalAuthMethod } from '@/schemas/core-config/tooling';
import { ERRORS, err, ok, okUnchecked, type AppError, type Result } from '@/schemas/result/result';
import { fromUnknownError, safeParse } from '@/utils/result/safe';
import { safeStringify, type DeepReadonly } from '@/utils/core/object';

// =============================================================================
// Schemas
// =============================================================================

/** Valibot schema for client configuration options. */
export const ClientOptionsSchema = v.strictObject({
  /** Infisical site URL (for self-hosted). */
  siteUrl: v.optional(StrSchema),
  /** Access token (machine identity or service token). */
  accessToken: v.optional(StrSchema),
  /** Client ID for machine identity auth. */
  clientId: v.optional(StrSchema),
  /** Client secret for machine identity auth. */
  clientSecret: v.optional(StrSchema),
  /** Cache TTL in milliseconds (default: 300000 = 5 minutes). */
  cacheTtl: v.optional(NonNegativeIntegerSchema),
  /** Enable debug logging. */
  debug: v.optional(BoolSchema),
});

/** @see {@link ClientOptionsSchema} */
export type ClientOptions = v.InferOutput<typeof ClientOptionsSchema>;

/** Resolved options with all fields required (post-env-var-resolution). */
export const ResolvedOptionsSchema = v.strictObject({
  /** Infisical site URL (for self-hosted). */
  siteUrl: StrSchema,
  /** Access token (machine identity or service token). */
  accessToken: StrSchema,
  /** Client ID for machine identity auth. */
  clientId: StrSchema,
  /** Client secret for machine identity auth. */
  clientSecret: StrSchema,
  /** Cache TTL in milliseconds. */
  cacheTtl: NonNegativeIntegerSchema,
  /** Enable debug logging. */
  debug: BoolSchema,
});

/** @see {@link ResolvedOptionsSchema} */
export type ResolvedOptions = v.InferOutput<typeof ResolvedOptionsSchema>;

// =============================================================================
// Environment Variable Names
// =============================================================================

/**
 * Environment variable names used by the client.
 * Adapted from `_INTEGRATE/env-management/sdk/client.ts` ENV_VARS.
 */
export const ENV_VARS = {
  SITE_URL: 'INFISICAL_SITE_URL',
  TOKEN: 'INFISICAL_TOKEN',
  CLIENT_ID: 'INFISICAL_CLIENT_ID',
  CLIENT_SECRET: 'INFISICAL_CLIENT_SECRET',
  PROJECT_ID: 'INFISICAL_PROJECT_ID',
  ENV: 'INFISICAL_ENV',
  CACHE_TTL: 'INFISICAL_CACHE_TTL',
  DEBUG: 'INFISICAL_DEBUG',
} as const;

// =============================================================================
// Singleton State
// =============================================================================

/** Cached client instance. */
let clientInstance: InfisicalClient | null = null;

/** Options used to create the cached client (for comparison). */
let cachedOptionsJson: NullableStr = null;

// =============================================================================
// Functions
// =============================================================================

/**
 * Resolve client options with environment variable fallbacks.
 * Reads from resist.config.ts for siteUrl and cacheTtl defaults.
 *
 * @param {ClientOptions} options - Optional overrides.
 * @returns {Result<ResolvedOptions>} `Result<ResolvedOptions>` — fully resolved options.
 *
 * @example
 * ```typescript
 * const result = resolveOptions({ siteUrl: 'https://secrets.example.com' });
 * if (!result.ok) return result;
 * const resolved = result.data;
 * ```
 */
export function resolveOptions(options: ClientOptions): Result<ResolvedOptions> {
  const optionsResult: Result<ClientOptions> = safeParse(ClientOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }

  const validatedOptions: ClientOptions = optionsResult.data;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();

  if (!configResult.ok) {
    return configResult;
  }

  const config: DeepReadonly<CoreConfig> = configResult.data;
  const infisicalConfig: DeepReadonly<CoreConfig['tooling']['infisical']> =
    config.tooling.infisical;

  const cacheTtlEnv: Str = process.env[ENV_VARS.CACHE_TTL] ?? '';
  const rawCacheTtl: Num = cacheTtlEnv // cast safe: parseInt returns number, schema validates below
    ? Number.parseInt(cacheTtlEnv, 10)
    : (infisicalConfig.auth.cacheTtlSeconds as Num) * 1000; // cast safe: DeepReadonly number is still number

  const cacheTtlResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    rawCacheTtl,
  );

  if (!cacheTtlResult.ok) {
    return cacheTtlResult;
  }

  const parsedCacheTtl: NonNegativeInteger = cacheTtlResult.data;

  const resolved: ResolvedOptions = {
    siteUrl:
      validatedOptions?.siteUrl ??
      process.env[ENV_VARS.SITE_URL] ??
      (infisicalConfig.siteUrl as unknown as Str), // cast safe: DeepReadonly branded Str → Str, value unchanged
    accessToken: validatedOptions?.accessToken ?? process.env[ENV_VARS.TOKEN] ?? '',
    clientId: validatedOptions?.clientId ?? process.env[ENV_VARS.CLIENT_ID] ?? '',
    clientSecret: validatedOptions?.clientSecret ?? process.env[ENV_VARS.CLIENT_SECRET] ?? '',
    cacheTtl: validatedOptions?.cacheTtl ?? parsedCacheTtl,
    debug: validatedOptions?.debug ?? process.env[ENV_VARS.DEBUG] === 'true',
  };

  return ok(ResolvedOptionsSchema, resolved);
}

/**
 * Get or create a singleton Infisical client.
 * Returns existing client if options match (safeStringify comparison).
 *
 * @param {ClientOptions} options - Optional client configuration.
 * @returns {Result<InfisicalClient>} `Result<InfisicalClient>` — the client instance.
 *
 * @example
 * ```typescript
 * const result = getClient({ debug: true });
 * if (!result.ok) return result;
 * const client = result.data;
 * ```
 */
export function getClient(options: ClientOptions): Result<InfisicalClient> {
  const optionsResult: Result<ClientOptions> = safeParse(ClientOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }

  const resolvedResult: Result<ResolvedOptions> = resolveOptions(optionsResult.data);

  if (!resolvedResult.ok) {
    return resolvedResult;
  }

  const resolved: ResolvedOptions = resolvedResult.data;
  const optionsJsonResult: Result<Str> = safeStringify(resolved);

  if (!optionsJsonResult.ok) {
    return optionsJsonResult;
  }

  const optionsJson: Str = optionsJsonResult.data;

  // Return existing client if options match
  if (clientInstance !== null && optionsJson === cachedOptionsJson) {
    return okUnchecked(clientInstance);
  }

  // Create new client
  const createResult: Result<InfisicalClient> = createClient(resolved);

  if (!createResult.ok) {
    return createResult;
  }

  const newClient: InfisicalClient = createResult.data as InfisicalClient; // cast safe: DeepReadonly doesn't affect InfisicalClient behavior
  clientInstance = newClient;
  cachedOptionsJson = optionsJson;

  return okUnchecked(newClient);
}

/**
 * Create a new Infisical client (non-singleton).
 *
 * @param {ResolvedOptions} resolved - Fully resolved options.
 * @returns {Result<InfisicalClient>} `Result<InfisicalClient>` — new client instance.
 *
 * @example
 * ```typescript
 * const resolvedResult = resolveOptions({});
 * if (!resolvedResult.ok) return resolvedResult;
 * const clientResult = createClient(resolvedResult.data);
 * ```
 */
export function createClient(resolved: ResolvedOptions): Result<InfisicalClient> {
  const resolvedResult: Result<ResolvedOptions> = safeParse(ResolvedOptionsSchema, resolved);

  if (!resolvedResult.ok) {
    return resolvedResult;
  }

  const validatedResolved: ResolvedOptions = resolvedResult.data;

  const client: InfisicalClient = new InfisicalClient({
    siteUrl: validatedResolved.siteUrl,
    // Auth options (in order of precedence)
    ...(validatedResolved.accessToken !== '' && {
      accessToken: validatedResolved.accessToken,
    }),
    ...(validatedResolved.clientId !== '' &&
      validatedResolved.clientSecret !== '' && {
        clientId: validatedResolved.clientId,
        clientSecret: validatedResolved.clientSecret,
      }),
    // Caching
    cacheTtl: validatedResolved.cacheTtl,
  });

  if (validatedResolved.debug) {
    process.stdout.write(
      `[infisical] Client created with options: siteUrl=${validatedResolved.siteUrl} hasAccessToken=${String(validatedResolved.accessToken !== '')} hasClientId=${String(validatedResolved.clientId !== '')} cacheTtl=${String(validatedResolved.cacheTtl)}\n`,
    );
  }

  return okUnchecked(client);
}

/**
 * Clear the cached client instance.
 * Call this when auth state changes (login/logout).
 *
 * @returns {Result<Void>} `Result<Void>` — always succeeds.
 *
 * @example
 * ```typescript
 * const result = clearClient();
 * if (!result.ok) return result;
 * ```
 */
export function clearClient(): Result<Void> {
  clientInstance = null;
  cachedOptionsJson = null;

  return ok(VoidSchema, undefined);
}

/**
 * Detect the authentication method being used.
 * Adapted from `_INTEGRATE/env-management/sdk/client.ts` getAuthMethod.
 *
 * @returns {Result<InfisicalAuthMethod>} The auth method: 'token', 'machine-identity', or 'interactive'.
 *
 * @example
 * ```typescript
 * const result = getAuthMethod();
 * if (!result.ok) return result;
 * const method = result.data;
 * ```
 */
export function getAuthMethod(): Result<InfisicalAuthMethod> {
  if (process.env[ENV_VARS.TOKEN]) {
    return ok(InfisicalAuthMethodSchema, 'token');
  }

  if (process.env[ENV_VARS.CLIENT_ID] && process.env[ENV_VARS.CLIENT_SECRET]) {
    return ok(InfisicalAuthMethodSchema, 'machine-identity');
  }

  return ok(InfisicalAuthMethodSchema, 'interactive');
}

/**
 * Check if the client is authenticated by attempting to list secrets.
 *
 * @param {ClientOptions} options - Optional client configuration.
 * @returns {Promise<Result<Bool>>} `Result<Bool>` — true if authenticated.
 *
 * @example
 * ```typescript
 * const result = await isAuthenticated({});
 * if (!result.ok) return result;
 * const authenticated = result.data;
 * ```
 */
export async function isAuthenticated(options: ClientOptions): Promise<Result<Bool>> {
  const optionsResult: Result<ClientOptions> = safeParse(ClientOptionsSchema, options);

  if (!optionsResult.ok) {
    return optionsResult;
  }

  const clientResult: Result<InfisicalClient> = getClient(optionsResult.data);

  if (!clientResult.ok) {
    return clientResult;
  }

  const projectId: Str = process.env[ENV_VARS.PROJECT_ID] ?? '';

  if (!projectId) {
    return ok(BoolSchema, false);
  }

  try {
    await clientResult.data.listSecrets({
      environment: process.env[ENV_VARS.ENV] ?? 'development',
      projectId,
    });

    return ok(BoolSchema, true);
  } catch (error: unknown) {
    // Authentication check failed — convert to typed error and propagate
    const authError: AppError = fromUnknownError(error);

    return err(ERRORS.INTERNAL.UNEXPECTED, { cause: authError });
  }
}
