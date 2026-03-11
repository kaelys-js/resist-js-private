/**
 * Schema Updater Locale Schema
 *
 * Valibot schema and inferred type for schema-updater command strings.
 *
 * Uses `messageTemplate()` for parameterized strings — placeholders are
 * validated at locale load time, and params are validated at render time.
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

/** Valibot schema for schema-updater locale strings. */
export const SchemaUpdaterStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    description: LocaleStringSchema,
    flags: v.strictObject({
      filter: LocaleStringSchema,
      concurrency: LocaleStringSchema,
      list: LocaleStringSchema,
      force: LocaleStringSchema,
    }),

    // Headers
    headerSummary: messageTemplate(),

    // Info messages
    infoWorkspaceRoot: messageTemplate({ path: StrSchema }),
    infoSchemaCount: messageTemplate({ count: NonNegativeIntegerSchema }),
    infoFetching: messageTemplate({ name: StrSchema, url: StrSchema }),
    infoCopying: messageTemplate({ name: StrSchema, path: StrSchema }),
    infoUpdated: messageTemplate({ name: StrSchema }),
    infoUnchanged: messageTemplate({ name: StrSchema }),
    infoSummaryUpdated: messageTemplate({
      success: NonNegativeIntegerSchema,
      total: NonNegativeIntegerSchema,
    }),
    infoSummaryFailed: messageTemplate({
      failed: NonNegativeIntegerSchema,
      total: NonNegativeIntegerSchema,
    }),
    infoSummaryUnchanged: messageTemplate({
      unchanged: NonNegativeIntegerSchema,
      total: NonNegativeIntegerSchema,
    }),
    infoVersionDetected: messageTemplate({ name: StrSchema, version: StrSchema }),
    infoFilterActive: messageTemplate({
      filter: StrSchema,
      matched: NonNegativeIntegerSchema,
      total: NonNegativeIntegerSchema,
    }),
    infoVscodeSettingsWritten: messageTemplate({ path: StrSchema }),

    // List mode
    listHeader: messageTemplate(),
    listEntry: messageTemplate({ name: StrSchema, type: StrSchema, source: StrSchema }),
    listEntryWithDate: messageTemplate({
      name: StrSchema,
      type: StrSchema,
      source: StrSchema,
      fetchedAt: StrSchema,
    }),

    // Warnings
    warnNoSchemas: messageTemplate(),
    warnSomeNotUpdated: messageTemplate(),
    warnUpdateFailed: messageTemplate({ name: StrSchema, error: StrSchema }),
    warnVersionNotFound: messageTemplate({ name: StrSchema, packageName: StrSchema }),
    warnVersionDrift: messageTemplate({
      name: StrSchema,
      tool: StrSchema,
      schemaVersion: StrSchema,
      installedVersion: StrSchema,
    }),
    warnDirtyTree: messageTemplate(),

    // Errors
    errorInvalidJson: messageTemplate(),
    errorMaxRetries: messageTemplate(),
    errorFetchFailed: messageTemplate({ name: StrSchema, error: StrSchema }),
    errorCopyFailed: messageTemplate({ name: StrSchema, error: StrSchema }),
    errorHttpStatus: messageTemplate({ status: NonNegativeIntegerSchema, statusText: StrSchema }),
    errorLocalSchemaNotFound: messageTemplate({ name: StrSchema, path: StrSchema }),
    errorCustomSchemaNotFound: messageTemplate({ name: StrSchema, path: StrSchema }),
    errorCriticalFailures: messageTemplate({ count: NonNegativeIntegerSchema }),
    errorDirtyTree: messageTemplate(),

    // Retry
    retryAttempt: messageTemplate({
      attempt: NonNegativeIntegerSchema,
      max: NonNegativeIntegerSchema,
      error: StrSchema,
      delayMs: NonNegativeIntegerSchema,
    }),
  }),
]);

// =============================================================================
// Types
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type SchemaUpdaterStrings = v.InferOutput<typeof SchemaUpdaterStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltSchemaUpdaterStrings = BuiltLocale<typeof SchemaUpdaterStringsSchema>;
