/**
 * Secrets Rotation
 *
 * Generates cryptographically secure replacement values for secrets
 * by category. Supports jwt, api, database, and all categories.
 *
 * Adapted from `_INTEGRATE/env-management/cli/rotate.ts`.
 *
 * @module
 */

import { randomBytes } from 'node:crypto';

import * as v from 'valibot';

import {
  BoolSchema,
  NonNegativeIntegerSchema,
  StrArraySchema,
  StrSchema,
  type NonNegativeInteger,
  type Str,
  type StrArray,
} from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { execSyncSafe } from '@/utils/core/shell';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Valid rotation categories (from _INTEGRATE secretCategories). */
export const RotateCategorySchema = v.picklist(['jwt', 'api', 'database', 'all']);

/** @see {@link RotateCategorySchema} */
export type RotateCategory = v.InferOutput<typeof RotateCategorySchema>;

/** Schema for rotation options. */
export const RotateOptionsSchema = v.strictObject({
  environment: StrSchema,
  category: RotateCategorySchema,
  length: v.pipe(v.number(), v.integer(), v.minValue(16), v.maxValue(256)),
  dryRun: BoolSchema,
  force: BoolSchema,
});

/** @see {@link RotateOptionsSchema} */
export type RotateOptions = v.InferOutput<typeof RotateOptionsSchema>;

/** Schema for rotation result. */
export const RotateResultSchema = v.strictObject({
  rotated: NonNegativeIntegerSchema,
  keys: StrArraySchema,
});

/** @see {@link RotateResultSchema} */
export type RotateResult = v.InferOutput<typeof RotateResultSchema>;

// =============================================================================
// Category → Key Mapping (from _INTEGRATE secretCategories)
// =============================================================================

/**
 * Maps rotation categories to secret key names.
 * Adapted from `_INTEGRATE/env-management/cli/rotate.ts` secretCategories.
 */
const SECRET_CATEGORIES: Readonly<Record<string, readonly Str[]>> = {
  jwt: ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
  api: ['API_SECRET_KEY', 'RESEND_API_KEY', 'REVENUECAT_API_KEY', 'LEMON_SQUEEZY_API_KEY'],
  database: ['DATABASE_AUTH_TOKEN'],
};

// =============================================================================
// Crypto Generation (from _INTEGRATE)
// =============================================================================

/**
 * Generate a hex secret of specified length.
 * Adapted from `_INTEGRATE/env-management/cli/rotate.ts` generateSecret.
 *
 * @param length - Desired character length.
 * @returns `Result<Str>` — hex string.
 */
export function generateSecret(length: NonNegativeInteger): Result<Str> {
  const validLength: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, length);
  if (!validLength.ok) return validLength;
  const bytes: Buffer = randomBytes(Math.ceil(validLength.data / 2));
  return okUnchecked(bytes.toString('hex').slice(0, validLength.data));
}

/**
 * Generate a base64url secret of specified length.
 * Adapted from `_INTEGRATE/env-management/cli/rotate.ts` generateBase64Secret.
 *
 * @param length - Desired character length.
 * @returns `Result<Str>` — base64url string.
 */
export function generateBase64Secret(length: NonNegativeInteger): Result<Str> {
  const validLength: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, length);
  if (!validLength.ok) return validLength;
  const bytes: Buffer = randomBytes(validLength.data);
  return okUnchecked(bytes.toString('base64url').slice(0, validLength.data));
}

/**
 * Get rotatable keys for a category.
 *
 * @param category - Rotation category.
 * @returns `Result<StrArray>` — secret key names.
 */
export function getRotatableKeys(category: RotateCategory): Result<StrArray> {
  if (category === 'all') {
    const allKeys: StrArray = Object.values(SECRET_CATEGORIES).flat();
    return okUnchecked(allKeys);
  }
  const keys: readonly Str[] | undefined = SECRET_CATEGORIES[category];
  if (!keys) {
    return err(ERRORS.VALIDATION.INVALID_TYPE, { meta: { category } });
  }
  return okUnchecked([...keys]);
}

/**
 * Generate appropriate secret value based on key name.
 * Keys containing JWT/SECRET get base64url (min 64 chars).
 * Keys containing TOKEN/KEY get hex.
 * Adapted from _INTEGRATE rotate.ts lines 248-258.
 *
 * @param key - Secret key name.
 * @param length - Base length.
 * @returns `Result<Str>` — generated value.
 */
function generateForKey(key: Str, length: NonNegativeInteger): Result<Str> {
  const upperKey: Str = key.toUpperCase();
  if (upperKey.includes('JWT') || upperKey.includes('SECRET')) {
    return generateBase64Secret(Math.max(length, 64));
  }
  return generateSecret(length);
}

/**
 * Rotate secrets by category.
 *
 * @param options - Rotation options.
 * @returns `Result<RotateResult>` — rotation summary.
 */
export async function rotateSecrets(options: RotateOptions): Promise<Result<RotateResult>> {
  const keysResult: Result<StrArray> = getRotatableKeys(options.category);
  if (!keysResult.ok) return keysResult;

  const rotatedKeys: Str[] = [];

  for (const key of keysResult.data) {
    if (options.dryRun) {
      rotatedKeys.push(key);
      continue;
    }

    const valueResult: Result<Str> = generateForKey(key, options.length);
    if (!valueResult.ok) return valueResult;

    const setResult: Result<Str> = execSyncSafe(
      `infisical secrets set "${key}=${valueResult.data}" --env=${options.environment}`,
    );
    if (setResult.ok) {
      rotatedKeys.push(key);
    }
    // Non-fatal per key — continue on individual failure
  }

  return okUnchecked({
    rotated: rotatedKeys.length,
    keys: rotatedKeys,
  });
}
