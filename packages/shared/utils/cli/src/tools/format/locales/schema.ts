/**
 * Format Locale Schema
 *
 * Valibot schema and inferred type for format command strings.
 *
 * Uses `messageTemplate()` for parameterized strings — placeholders are
 * validated at locale load time, and params are validated at render time.
 *
 * @module
 */

import * as v from 'valibot';

import { messageTemplate, type BuiltLocale } from '@/locale';
import { RunnerLocaleStringsSchema } from '@/cli/schemas';
import { LocaleStringSchema, NonNegativeIntegerSchema } from '@/schemas/common';

// =============================================================================
// Schema
// =============================================================================

/** Valibot schema for format locale strings. */
export const FormatStringsSchema = v.intersect([
  RunnerLocaleStringsSchema,
  v.looseObject({
    // Info mode headers
    formatterListHeader: LocaleStringSchema,
    toolAvailabilityHeader: LocaleStringSchema,
    formatIgnoreHeader: LocaleStringSchema,
    noFormatIgnoreFound: LocaleStringSchema,

    // Tool availability
    toolInstalled: LocaleStringSchema,
    toolNotFound: LocaleStringSchema,
    toolSummary: messageTemplate({
      available: NonNegativeIntegerSchema,
      missing: NonNegativeIntegerSchema,
    }),

    // Formatter list
    formatterCount: messageTemplate({ count: NonNegativeIntegerSchema }),

    // Install tools
    installingToolsHeader: LocaleStringSchema,
    installSummary: messageTemplate({
      installed: NonNegativeIntegerSchema,
      failed: NonNegativeIntegerSchema,
      skipped: NonNegativeIntegerSchema,
    }),
    noToolsToInstall: LocaleStringSchema,

    // Brew lock
    brewLockWaiting: LocaleStringSchema,
    brewLockTimeout: LocaleStringSchema,
  }),
]);

// =============================================================================
// Type
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type FormatStrings = v.InferOutput<typeof FormatStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltFormatStrings = BuiltLocale<typeof FormatStringsSchema>;
