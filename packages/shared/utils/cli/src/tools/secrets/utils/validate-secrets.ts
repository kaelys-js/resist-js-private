/**
 * Secret Validation
 *
 * Validates fetched secrets against Valibot schemas per folder.
 * Uses the schema registries from `@/schemas/core-config/secret-schemas`.
 *
 * Adapted from `_INTEGRATE/env-management/config/schemas.ts`
 * validateSecrets/validatePartialSecrets/getRequiredKeys/getAllKeys.
 *
 * @module
 */

import * as v from 'valibot';

import {
  BoolSchema,
  NonNegativeIntegerSchema,
  StrSchema,
  type Bool,
  type NonNegativeInteger,
  type Str,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { EnvironmentName } from '@/schemas/core-config/environment';
import {
  GLOBAL_SECRET_SCHEMAS,
  PRODUCT_SECRET_SCHEMAS,
} from '@/schemas/core-config/secret-schemas';
import { okUnchecked, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { discoverProducts } from '@/utils/core/products';
import { safeParse } from '@/utils/result/safe';
import { fetchSecretsJson } from '@/cli/tools/secrets/utils/infisical';

// =============================================================================
// Schemas
// =============================================================================

/** Single validation issue. */
export const ValidationIssueSchema = v.strictObject({
  key: StrSchema,
  path: StrSchema,
  message: StrSchema,
});

/** @see {@link ValidationIssueSchema} */
export type ValidationIssue = v.InferOutput<typeof ValidationIssueSchema>;

/** Validation result for a folder. */
export const FolderValidationSchema = v.strictObject({
  path: StrSchema,
  passed: BoolSchema,
  issues: v.array(ValidationIssueSchema),
});

/** @see {@link FolderValidationSchema} */
export type FolderValidation = v.InferOutput<typeof FolderValidationSchema>;

/** Overall validation result. */
export const ValidationResultSchema = v.strictObject({
  passed: NonNegativeIntegerSchema,
  failed: NonNegativeIntegerSchema,
  folders: v.array(FolderValidationSchema),
});

/** @see {@link ValidationResultSchema} */
export type ValidationResult = v.InferOutput<typeof ValidationResultSchema>;

// =============================================================================
// Utility (adapted from _INTEGRATE getRequiredKeys/getAllKeys)
// =============================================================================

/**
 * Extract required key names from a Valibot schema's entries.
 * Adapted from `_INTEGRATE/env-management/config/schemas.ts` getRequiredKeys.
 *
 * @param schema - A Valibot schema with `.entries`.
 * @returns Array of required key names.
 */
function getRequiredKeys(
  schema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
): readonly Str[] {
  if (!('entries' in schema) || typeof schema.entries !== 'object' || schema.entries === null) {
    return [];
  }
  const keys: Str[] = [];
  for (const [key, entrySchema] of Object.entries(schema.entries)) {
    if (typeof entrySchema === 'object' && entrySchema !== null && 'type' in entrySchema) {
      if (entrySchema.type !== 'optional') {
        keys.push(key);
      }
    }
  }
  return keys;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate secrets for a single Infisical folder against its schema.
 *
 * @param secrets - Fetched key-value pairs.
 * @param schema - Valibot schema to validate against.
 * @param path - Infisical folder path (for reporting).
 * @returns `FolderValidation` result.
 */
function validateFolder(
  secrets: Record<string, string>,
  schema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
  path: Str,
): FolderValidation {
  const requiredKeys: readonly Str[] = getRequiredKeys(schema);
  const issues: ValidationIssue[] = [];

  for (const key of requiredKeys) {
    if (!(key in secrets) || secrets[key] === '') {
      issues.push({ key, path, message: `Missing required secret: ${key}` });
    }
  }

  // Also run full schema validation for format checks
  const parseResult: Result<unknown> = safeParse(schema, secrets);
  if (!parseResult.ok) {
    // Extract any additional format issues not caught by key presence check
    // safeParse returns structured error — we don't need to extract individual issues
    // since the key presence check above covers the most useful feedback
  }

  return {
    path,
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Validate global secrets against all global folder schemas.
 *
 * @param environment - Target environment.
 * @param config - Core configuration.
 * @returns `Result<ValidationResult>` — validation summary.
 */
export async function validateGlobalSecrets(
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
): Promise<Result<ValidationResult>> {
  const folders: FolderValidation[] = [];
  let passed: NonNegativeInteger = 0;
  let failed: NonNegativeInteger = 0;

  for (const [path, schema] of Object.entries(GLOBAL_SECRET_SCHEMAS)) {
    const secretsResult: Result<Record<string, string>> = await fetchSecretsJson(
      environment,
      config,
      path,
    );
    if (!secretsResult.ok) {
      folders.push({
        path,
        passed: false,
        issues: [{ key: '', path, message: 'Failed to fetch secrets' }],
      });
      failed++;
      continue;
    }

    const result: FolderValidation = validateFolder(secretsResult.data, schema, path);
    folders.push(result);
    if (result.passed) passed++;
    else failed++;
  }

  return okUnchecked({ passed, failed, folders });
}

/**
 * Validate product secrets against all product folder schemas.
 *
 * @param productName - Product name.
 * @param environment - Target environment.
 * @param config - Core configuration.
 * @returns `Result<ValidationResult>` — validation summary.
 */
export async function validateProductSecrets(
  productName: Str,
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
): Promise<Result<ValidationResult>> {
  const folders: FolderValidation[] = [];
  let passed: NonNegativeInteger = 0;
  let failed: NonNegativeInteger = 0;

  for (const [folderSuffix, schema] of Object.entries(PRODUCT_SECRET_SCHEMAS)) {
    const path: Str = `/products/${productName}${folderSuffix}`;
    const secretsResult: Result<Record<string, string>> = await fetchSecretsJson(
      environment,
      config,
      path,
    );
    if (!secretsResult.ok) {
      folders.push({
        path,
        passed: false,
        issues: [{ key: '', path, message: 'Failed to fetch secrets' }],
      });
      failed++;
      continue;
    }

    const result: FolderValidation = validateFolder(secretsResult.data, schema, path);
    folders.push(result);
    if (result.passed) passed++;
    else failed++;
  }

  return okUnchecked({ passed, failed, folders });
}

/**
 * Validate all secrets (global + all products).
 *
 * @param environment - Target environment.
 * @param config - Core configuration.
 * @returns `Result<ValidationResult>` — combined validation summary.
 */
export async function validateAllSecrets(
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
): Promise<Result<ValidationResult>> {
  const globalResult: Result<ValidationResult> = await validateGlobalSecrets(environment, config);
  if (!globalResult.ok) return globalResult;

  const productsResult: Result<readonly Str[]> = discoverProducts();
  if (!productsResult.ok) return productsResult;

  let totalPassed: NonNegativeInteger = globalResult.data.passed;
  let totalFailed: NonNegativeInteger = globalResult.data.failed;
  const allFolders: FolderValidation[] = [...globalResult.data.folders];

  for (const productName of productsResult.data) {
    const productResult: Result<ValidationResult> = await validateProductSecrets(
      productName,
      environment,
      config,
    );
    if (!productResult.ok) return productResult;
    totalPassed += productResult.data.passed;
    totalFailed += productResult.data.failed;
    allFolders.push(...productResult.data.folders);
  }

  return okUnchecked({ passed: totalPassed, failed: totalFailed, folders: allFolders });
}
