/**
 * VS Code Setup Locale Schema
 *
 * Valibot schema and inferred type for vscode-setup command strings.
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

/** Valibot schema for vscode-setup locale strings. */
export const VscodeSetupStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    description: LocaleStringSchema,
    flags: v.strictObject({
      list: LocaleStringSchema,
      filter: LocaleStringSchema,
      diff: LocaleStringSchema,
      force: LocaleStringSchema,
      json: LocaleStringSchema,
    }),

    // Headers
    headerRemoving: LocaleStringSchema,
    headerInstalling: LocaleStringSchema,
    headerSummary: LocaleStringSchema,

    // Info messages
    infoNoConflicting: LocaleStringSchema,
    infoAllInstalled: LocaleStringSchema,
    infoRestart: LocaleStringSchema,
    infoRemoving: messageTemplate({ ext: StrSchema }),
    infoInstalling: messageTemplate({ ext: StrSchema }),
    infoDone: LocaleStringSchema,
    infoFailed: LocaleStringSchema,

    // Summary
    summaryInstalled: messageTemplate({ count: NonNegativeIntegerSchema }),
    summaryAlreadyInstalled: messageTemplate({ count: NonNegativeIntegerSchema }),
    summaryUninstalled: messageTemplate({ count: NonNegativeIntegerSchema }),
    summaryFailed: messageTemplate({ count: NonNegativeIntegerSchema }),

    // Dry-run mode
    dryRunPrefix: LocaleStringSchema,
    dryRunWouldInstall: messageTemplate({ ext: StrSchema }),
    dryRunWouldUninstall: messageTemplate({ ext: StrSchema }),
    dryRunSummary: LocaleStringSchema,

    // Filter mode
    infoFilterActive: messageTemplate({
      filter: StrSchema,
      matched: NonNegativeIntegerSchema,
      total: NonNegativeIntegerSchema,
    }),

    // List mode
    listHeader: LocaleStringSchema,
    listEntry: messageTemplate({ ext: StrSchema, status: StrSchema }),
    listEntryWithVersion: messageTemplate({
      ext: StrSchema,
      status: StrSchema,
      version: StrSchema,
    }),
    listCategoryHeader: messageTemplate({ category: StrSchema }),
    listSummary: messageTemplate({
      installed: NonNegativeIntegerSchema,
      recommended: NonNegativeIntegerSchema,
      unwanted: NonNegativeIntegerSchema,
      extra: NonNegativeIntegerSchema,
    }),

    // Diff/audit mode
    diffHeader: LocaleStringSchema,
    diffMissing: messageTemplate({ ext: StrSchema }),
    diffExtra: messageTemplate({ ext: StrSchema }),
    diffUnwanted: messageTemplate({ ext: StrSchema }),
    diffOk: messageTemplate({ ext: StrSchema }),
    diffSummary: messageTemplate({
      missing: NonNegativeIntegerSchema,
      extra: NonNegativeIntegerSchema,
      unwanted: NonNegativeIntegerSchema,
      ok: NonNegativeIntegerSchema,
    }),

    // Force mode
    infoForceReinstalling: messageTemplate({ ext: StrSchema }),

    // Category grouping
    categoryUncategorized: LocaleStringSchema,

    // Health warnings
    warnInstallFailed: messageTemplate({ ext: StrSchema, error: StrSchema }),

    // Partial failure
    errorPartialFailure: messageTemplate({ failed: NonNegativeIntegerSchema }),
  }),
]);

// =============================================================================
// Type
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type VscodeSetupStrings = v.InferOutput<typeof VscodeSetupStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltVscodeSetupStrings = BuiltLocale<typeof VscodeSetupStringsSchema>;
