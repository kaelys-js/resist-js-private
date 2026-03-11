/**
 * Secrets Locale Schema
 *
 * Valibot schema and inferred type for secrets command strings.
 *
 * @module
 */

import * as v from 'valibot';

import { messageTemplate, type BuiltLocale } from '@/locale';
import { CommandLocaleStringsSchema } from '@/cli/schemas';
import { LocaleStringSchema, NonNegativeIntegerSchema, StrSchema } from '@/schemas/common';

// =============================================================================
// Schema
// =============================================================================

/** Valibot schema for secrets locale strings. */
export const SecretsStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    description: LocaleStringSchema,
    flags: v.strictObject({
      product: LocaleStringSchema,
      env: LocaleStringSchema,
      json: LocaleStringSchema,
      key: LocaleStringSchema,
      value: LocaleStringSchema,
      path: LocaleStringSchema,
      dryRun: LocaleStringSchema,
      force: LocaleStringSchema,
      category: LocaleStringSchema,
      verbose: LocaleStringSchema,
      backup: LocaleStringSchema,
    }),
    // Show
    header: LocaleStringSchema,
    headerProduct: messageTemplate({ name: StrSchema }),
    fetchingSecrets: messageTemplate({ env: StrSchema }),
    fetchingProductSecrets: messageTemplate({ name: StrSchema, env: StrSchema }),
    noProductsFound: messageTemplate({ productsDir: StrSchema }),
    // Get
    getHeader: messageTemplate({ key: StrSchema }),
    getKeyNotFound: messageTemplate({ key: StrSchema, path: StrSchema }),
    getKeyRequired: LocaleStringSchema,
    // Set
    setSuccess: messageTemplate({ key: StrSchema, path: StrSchema, env: StrSchema }),
    setKeyRequired: LocaleStringSchema,
    setValueRequired: LocaleStringSchema,
    setDryRun: messageTemplate({ key: StrSchema, path: StrSchema, env: StrSchema }),
    // Delete
    deleteSuccess: messageTemplate({ key: StrSchema, path: StrSchema, env: StrSchema }),
    deleteKeyRequired: LocaleStringSchema,
    deleteDryRun: messageTemplate({ key: StrSchema, path: StrSchema, env: StrSchema }),
    // List
    listHeader: messageTemplate({ path: StrSchema, env: StrSchema }),
    listKey: messageTemplate({ key: StrSchema, value: StrSchema }),
    listCount: messageTemplate({ count: NonNegativeIntegerSchema }),
    listEmpty: messageTemplate({ path: StrSchema }),
    // Search
    searchHeader: messageTemplate({ query: StrSchema }),
    searchResult: messageTemplate({ key: StrSchema, path: StrSchema, project: StrSchema }),
    searchNoResults: messageTemplate({ query: StrSchema }),
    searchQueryRequired: LocaleStringSchema,
    // Doctor
    doctorHeader: LocaleStringSchema,
    doctorCheckPassed: messageTemplate({ name: StrSchema }),
    doctorCheckFailed: messageTemplate({ name: StrSchema, fix: StrSchema }),
    doctorCheckSkipped: messageTemplate({ name: StrSchema }),
    doctorSummary: messageTemplate({
      passed: NonNegativeIntegerSchema,
      failed: NonNegativeIntegerSchema,
      total: NonNegativeIntegerSchema,
    }),
    // Migrate
    migrateHeader: LocaleStringSchema,
    migrateFound: messageTemplate({ count: NonNegativeIntegerSchema }),
    migrateFile: messageTemplate({ file: StrSchema, env: StrSchema }),
    migrateUploading: messageTemplate({ key: StrSchema, path: StrSchema }),
    migrateComplete: messageTemplate({ count: NonNegativeIntegerSchema }),
    migrateNoFiles: LocaleStringSchema,
    migrateDryRun: LocaleStringSchema,
    migrateBackupCreated: messageTemplate({ path: StrSchema }),
    // Rotate
    rotateHeader: messageTemplate({ category: StrSchema }),
    rotateGenerating: messageTemplate({ key: StrSchema }),
    rotateSuccess: messageTemplate({ key: StrSchema }),
    rotateComplete: messageTemplate({ count: NonNegativeIntegerSchema }),
    rotateDryRun: messageTemplate({ key: StrSchema, category: StrSchema }),
    rotateCategoryRequired: LocaleStringSchema,
    // Sync
    syncHeader: messageTemplate({ env: StrSchema }),
    syncUploading: messageTemplate({ key: StrSchema, worker: StrSchema }),
    syncComplete: messageTemplate({ count: NonNegativeIntegerSchema }),
    syncDryRun: LocaleStringSchema,
    // Login/Logout/Whoami
    loginHeader: LocaleStringSchema,
    loginSuccess: LocaleStringSchema,
    logoutHeader: LocaleStringSchema,
    logoutSuccess: LocaleStringSchema,
    whoamiHeader: LocaleStringSchema,
    whoamiUser: messageTemplate({ email: StrSchema }),
    whoamiNotLoggedIn: LocaleStringSchema,
    // Validate
    validateHeader: messageTemplate({ env: StrSchema }),
    validatePassed: messageTemplate({ path: StrSchema }),
    validateFailed: messageTemplate({ path: StrSchema, count: NonNegativeIntegerSchema }),
    validateMissing: messageTemplate({ key: StrSchema, path: StrSchema }),
    validateSummary: messageTemplate({
      passed: NonNegativeIntegerSchema,
      failed: NonNegativeIntegerSchema,
    }),
    // Infisical CLI errors
    infisicalNotFound: LocaleStringSchema,
    // Action validation
    unknownAction: messageTemplate({ action: StrSchema }),
  }),
]);

// =============================================================================
// Type
// =============================================================================

/** Raw locale strings type (pre-build). */
export type SecretsStrings = v.InferOutput<typeof SecretsStringsSchema>;

/** Built locale type (post-build). */
export type BuiltSecretsStrings = BuiltLocale<typeof SecretsStringsSchema>;
