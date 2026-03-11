/**
 * Onboard Locale Schema
 *
 * Valibot schema and inferred type for onboard command strings.
 *
 * Uses `messageTemplate()` for parameterized strings — placeholders are
 * validated at locale load time, and params are validated at render time.
 *
 * @module
 */

import * as v from 'valibot';

import { messageTemplate, type BuiltLocale } from '@/locale';
import { CommandLocaleStringsSchema } from '@/cli/schemas';
import { BoolSchema, LocaleStringSchema, StrSchema } from '@/schemas/common';

// =============================================================================
// Schema
// =============================================================================

/** Valibot schema for onboard locale strings. */
export const OnboardStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    // Headers
    header: LocaleStringSchema,
    separator: LocaleStringSchema,
    sectionPrerequisites: LocaleStringSchema,
    sectionSetup: LocaleStringSchema,
    sectionComplete: LocaleStringSchema,

    // Mise (handleMise)
    checkingMise: LocaleStringSchema,
    miseFound: LocaleStringSchema,
    miseNotFound: LocaleStringSchema,
    miseInstalled: LocaleStringSchema,
    miseUpdated: LocaleStringSchema,
    // Mise tools (handleMiseInstall)
    installingMiseTools: LocaleStringSchema,
    miseToolsInstalled: LocaleStringSchema,
    miseReshimFailed: LocaleStringSchema,

    // Steps
    runningStep: messageTemplate({ step: StrSchema }),
    stepSucceeded: messageTemplate({ step: StrSchema }),
    stepFailed: messageTemplate({ step: StrSchema }),

    // Dry run
    dryRunPrefix: LocaleStringSchema,
    dryRunSkipping: messageTemplate({ step: StrSchema }),
    dryRunPreviewMode: LocaleStringSchema,
    dryRunMiseCheck: LocaleStringSchema,
    dryRunMiseInstall: LocaleStringSchema,

    // Debug
    debugOptions: messageTemplate({ dryRun: BoolSchema }),

    // Next steps (completion box)
    readyToDevHeader: LocaleStringSchema,
    inTwoTerminals: LocaleStringSchema,
    stepDevDescription: LocaleStringSchema,
    stepProxyDescription: LocaleStringSchema,
  }),
]);

// =============================================================================
// Type
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type OnboardStrings = v.InferOutput<typeof OnboardStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltOnboardStrings = BuiltLocale<typeof OnboardStringsSchema>;
