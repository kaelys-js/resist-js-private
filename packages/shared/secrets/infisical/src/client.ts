/**
 * Infisical Client Factory
 *
 * Creates and manages Infisical client instances.
 * Singleton pattern with JSON.stringify comparison for cache invalidation.
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
  type Bool,
  type NonNegativeInteger,
  type Str,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { InfisicalAuthMethod } from '@/schemas/core-config/tooling';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import type { DeepReadonly } from '@/utils/core/object';

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
  siteUrl: StrSchema,
  accessToken: StrSchema,
  clientId: StrSchema,
  clientSecret: StrSchema,
  cacheTtl: NonNegativeIntegerSchema,
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
let cachedOptionsJson: Str | null = null;

// =============================================================================
// Functions
// =============================================================================

/**
 * Resolve client options with environment variable fallbacks.
 * Reads from resist.config.ts for siteUrl and cacheTtl defaults.
 *
 * @param options - Optional overrides.
 * @returns `Result<ResolvedOptions>` — fully resolved options.
 */
export function resolveOptions(options?: ClientOptions): Result<ResolvedOptions> {
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const config: DeepReadonly<CoreConfig> = configResult.data;
  const infisicalConfig = config.tooling.infisical;

  const cacheTtlEnv: Str = process.env[ENV_VARS.CACHE_TTL] ?? '';
  const rawCacheTtl: number = cacheTtlEnv // cast safe: parseInt returns number, schema validates below
    ? parseInt(cacheTtlEnv, 10)
    : (infisicalConfig.auth.cacheTtlSeconds as number) * 1000; // cast safe: DeepReadonly number is still number
  const cacheTtlResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, rawCacheTtl);
  const parsedCacheTtl: NonNegativeInteger = cacheTtlResult.ok ? cacheTtlResult.data : (0 as NonNegativeInteger); // cast safe: 0 is a valid NonNegativeInteger

  const resolved: ResolvedOptions = {
    siteUrl: options?.siteUrl ?? process.env[ENV_VARS.SITE_URL] ?? (infisicalConfig.siteUrl as unknown as Str), // cast safe: DeepReadonly branded Str → Str, value unchanged
    accessToken: options?.accessToken ?? process.env[ENV_VARS.TOKEN] ?? '',
    clientId: options?.clientId ?? process.env[ENV_VARS.CLIENT_ID] ?? '',
    clientSecret: options?.clientSecret ?? process.env[ENV_VARS.CLIENT_SECRET] ?? '',
    cacheTtl: options?.cacheTtl ?? parsedCacheTtl,
    debug: options?.debug ?? process.env[ENV_VARS.DEBUG] === 'true',
  };

  return okUnchecked(resolved);
}

/**
 * Get or create a singleton Infisical client.
 * Returns existing client if options match (JSON.stringify comparison).
 *
 * @param options - Optional client configuration.
 * @returns `Result<InfisicalClient>` — the client instance.
 */
export function getClient(options?: ClientOptions): Result<InfisicalClient> {
  const resolvedResult: Result<ResolvedOptions> = resolveOptions(options);
  if (!resolvedResult.ok) return resolvedResult;

  const resolved: ResolvedOptions = resolvedResult.data;
  const optionsJson: Str = JSON.stringify(resolved);

  // Return existing client if options match
  if (clientInstance !== null && optionsJson === cachedOptionsJson) {
    return okUnchecked(clientInstance);
  }

  // Create new client
  const createResult: Result<InfisicalClient> = createClient(resolved);
  if (!createResult.ok) return createResult;

  const newClient: InfisicalClient = createResult.data as InfisicalClient; // cast safe: safeParse validates, DeepReadonly doesn't affect InfisicalClient behavior
  clientInstance = newClient;
  cachedOptionsJson = optionsJson;

  return okUnchecked(newClient);
}

/**
 * Create a new Infisical client (non-singleton).
 *
 * @param resolved - Fully resolved options.
 * @returns `Result<InfisicalClient>` — new client instance.
 */
export function createClient(resolved: ResolvedOptions): Result<InfisicalClient> {
  const client: InfisicalClient = new InfisicalClient({
    siteUrl: resolved.siteUrl,
    // Auth options (in order of precedence)
    ...(resolved.accessToken !== '' && {
      accessToken: resolved.accessToken,
    }),
    ...(resolved.clientId !== '' &&
      resolved.clientSecret !== '' && {
        clientId: resolved.clientId,
        clientSecret: resolved.clientSecret,
      }),
    // Caching
    cacheTtl: resolved.cacheTtl,
  });

  if (resolved.debug) {
    // eslint-disable-next-line no-console
    console.log('[infisical] Client created with options:', {
      siteUrl: resolved.siteUrl,
      hasAccessToken: resolved.accessToken !== '',
      hasClientId: resolved.clientId !== '',
      cacheTtl: resolved.cacheTtl,
    });
  }

  return okUnchecked(client);
}

/**
 * Clear the cached client instance.
 * Call this when auth state changes (login/logout).
 */
export function clearClient(): void {
  clientInstance = null;
  cachedOptionsJson = null;
}

/**
 * Detect the authentication method being used.
 * Adapted from `_INTEGRATE/env-management/sdk/client.ts` getAuthMethod.
 *
 * @returns The auth method: 'token', 'machine-identity', or 'interactive'.
 */
export function getAuthMethod(): InfisicalAuthMethod {
  if (process.env[ENV_VARS.TOKEN]) {
    return 'token';
  }
  if (process.env[ENV_VARS.CLIENT_ID] && process.env[ENV_VARS.CLIENT_SECRET]) {
    return 'machine-identity';
  }
  return 'interactive';
}

/**
 * Check if the client is authenticated by attempting to list secrets.
 *
 * @param options - Optional client configuration.
 * @returns `Result<Bool>` — true if authenticated.
 */
export async function isAuthenticated(options?: ClientOptions): Promise<Result<Bool>> {
  const clientResult: Result<InfisicalClient> = getClient(options);
  if (!clientResult.ok) return clientResult;

  const projectId: Str = process.env[ENV_VARS.PROJECT_ID] ?? '';
  if (!projectId) {
    return okUnchecked(false);
  }

  try {
    await clientResult.data.listSecrets({
      environment: process.env[ENV_VARS.ENV] ?? 'development',
      projectId,
    });
    return okUnchecked(true);
  } catch {
    return okUnchecked(false);
  }
}
