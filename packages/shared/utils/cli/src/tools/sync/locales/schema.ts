/**
 * Sync Locale Schema
 *
 * Valibot schema and inferred type for sync command strings.
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

/** Valibot schema for sync locale strings. */
export const SyncStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    // Config
    configNotFound: messageTemplate({ configFilename: StrSchema }),
    creatingConfig: messageTemplate({ configFilename: StrSchema }),
    configCreated: messageTemplate({ configFilename: StrSchema }),
    loadingConfig: messageTemplate({ configFilename: StrSchema }),
    configLoaded: LocaleStringSchema,

    // Dry-run
    dryRunPrefix: LocaleStringSchema,
    dryRunWouldSync: LocaleStringSchema,
    dryRunWouldCreateConfig: messageTemplate({ configFilename: StrSchema }),
    dryRunTemplateCount: messageTemplate({ count: NonNegativeIntegerSchema }),

    // Progress
    syncing: LocaleStringSchema,

    // Success
    success: LocaleStringSchema,
    templatesProcessed: messageTemplate({ count: NonNegativeIntegerSchema }),

    // Package manager switch — detection
    warnPmSwitchDetected: messageTemplate({ newPm: StrSchema }),
    warnPmSwitchOldLockfile: messageTemplate({ lockfile: StrSchema }),

    // Package manager switch — auto-cleanup
    pmSwitchDeletingLockfile: messageTemplate({ lockfile: StrSchema }),
    pmSwitchDeletedLockfile: messageTemplate({ lockfile: StrSchema }),
    pmSwitchDryRunDeleteLockfile: messageTemplate({ lockfile: StrSchema }),
    pmSwitchDeletingWorkspaceFile: LocaleStringSchema,
    pmSwitchDeletedWorkspaceFile: LocaleStringSchema,
    pmSwitchDryRunDeleteWorkspaceFile: LocaleStringSchema,
    warnPmSwitchNodeModules: LocaleStringSchema,
    warnPmSwitchNodeModulesHint: messageTemplate({ pm: StrSchema }),
    warnPmSwitchDevcontainer: LocaleStringSchema,
    warnPmSwitchCoder: LocaleStringSchema,
    pmSwitchCleanupComplete: messageTemplate({ count: NonNegativeIntegerSchema }),

    // Stale conditional output cleanup
    staleConditionalDeleted: messageTemplate({ path: StrSchema }),
    staleConditionalDryRunDelete: messageTemplate({ path: StrSchema }),

    // Locale validation
    localeValidationHeader: LocaleStringSchema,
    localeValidationPassed: LocaleStringSchema,
    localeMissing: messageTemplate({ locale: StrSchema, directory: StrSchema }),
    localeOrphaned: messageTemplate({ locale: StrSchema, directory: StrSchema }),

    // Mise post-render
    miseVersionUpdated: messageTemplate({ version: StrSchema }),
    runningMiseInstall: LocaleStringSchema,
    miseInstallFailed: LocaleStringSchema,
    dryRunMiseInstall: LocaleStringSchema,
  }),
]);

// =============================================================================
// Type
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type SyncStrings = v.InferOutput<typeof SyncStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltSyncStrings = BuiltLocale<typeof SyncStringsSchema>;
