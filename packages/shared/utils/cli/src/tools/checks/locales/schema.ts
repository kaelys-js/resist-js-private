/**
 * Checks Tool Locale Schema
 *
 * Valibot schema and inferred type for checks command strings.
 *
 * Uses `messageTemplate()` for parameterized strings — placeholders are
 * validated at locale load time, and params are validated at render time.
 *
 * @module
 */

import * as v from 'valibot';

import { messageTemplate, type BuiltLocale } from '@/locale';
import { CommandLocaleStringsSchema } from '@/cli/schemas';
import { NonNegativeIntegerSchema, StrSchema } from '@/schemas/common';

// =============================================================================
// Schema
// =============================================================================

/** Valibot schema for checks locale strings. */
export const ChecksStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    // Headers
    headerSummary: messageTemplate(),

    // Pass labels
    passNodeLockfile: messageTemplate(),
    passNodeDevDeps: messageTemplate(),
    passMiseToml: messageTemplate(),
    passInstalledTools: messageTemplate(),
    passSchemaVersionCheck: messageTemplate(),
    passSchemaFreshness: messageTemplate(),
    passInternalConsistency: messageTemplate(),

    // Pass results
    resultPass: messageTemplate({ name: StrSchema, detail: StrSchema }),
    resultFail: messageTemplate({ name: StrSchema, detail: StrSchema }),
    resultWarn: messageTemplate({ name: StrSchema, detail: StrSchema }),
    resultSkip: messageTemplate({ name: StrSchema, detail: StrSchema }),

    // Detail messages
    detailVersionMatch: messageTemplate({ version: StrSchema }),
    detailVersionMismatch: messageTemplate({ expected: StrSchema, actual: StrSchema }),
    detailMissing: messageTemplate({ what: StrSchema }),
    detailPresent: messageTemplate(),
    detailNotInstalled: messageTemplate(),
    detailSchemaDrift: messageTemplate({ schemaVersion: StrSchema, installedVersion: StrSchema }),
    detailSchemaStale: messageTemplate({
      daysSince: NonNegativeIntegerSchema,
      fetchedAt: StrSchema,
    }),
    detailSchemaFresh: messageTemplate(),
    detailNoVolta: messageTemplate(),
    detailVoltaFound: messageTemplate(),
    detailFileNotFound: messageTemplate({ path: StrSchema }),
    detailNodeVersionMatch: messageTemplate({ version: StrSchema }),
    detailPackageManagerMatch: messageTemplate({ pm: StrSchema, version: StrSchema }),
    detailMiseTomlExists: messageTemplate(),
    detailMiseBootstrapExists: messageTemplate(),
    detailMiseVersionMatch: messageTemplate({ version: StrSchema }),
    detailGitignoreHasMise: messageTemplate(),

    // Summary
    infoSummary: messageTemplate({
      passed: NonNegativeIntegerSchema,
      failed: NonNegativeIntegerSchema,
      warnings: NonNegativeIntegerSchema,
      skipped: NonNegativeIntegerSchema,
    }),

    // Fix mode
    fixRunningInstall: messageTemplate(),
    fixRunningSync: messageTemplate(),
    fixRunningMiseInstall: messageTemplate({ tool: StrSchema, version: StrSchema }),
    fixRunningSchemaUpdater: messageTemplate(),
    fixSuccess: messageTemplate({ action: StrSchema }),
    fixFailed: messageTemplate({ action: StrSchema, error: StrSchema }),
    fixSkippedDryRun: messageTemplate({ action: StrSchema }),

    // Errors
    errorConfigLoad: messageTemplate(),
    errorLockfileRead: messageTemplate({ path: StrSchema }),
    errorPackageJsonRead: messageTemplate({ path: StrSchema }),
    errorMiseTomlRead: messageTemplate({ path: StrSchema }),
  }),
]);

// =============================================================================
// Types
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type ChecksStrings = v.InferOutput<typeof ChecksStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltChecksStrings = BuiltLocale<typeof ChecksStringsSchema>;
