/**
 * Local CI Tool Locale Schema
 *
 * Valibot schema and inferred type for local-ci command strings.
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

/** Valibot schema for local-ci tool locale strings. */
export const LocalCiStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    description: LocaleStringSchema,
    flags: v.strictObject({
      workflow: LocaleStringSchema,
      job: LocaleStringSchema,
      json: LocaleStringSchema,
      filter: LocaleStringSchema,
    }),

    // Provider
    providerNotSupported: messageTemplate({ provider: StrSchema }),

    // CI Disabled
    ciDisabled: LocaleStringSchema,

    // Prerequisites
    checkingPrereqs: LocaleStringSchema,
    dockerNotReady: LocaleStringSchema,
    actNotFound: LocaleStringSchema,
    actInstalling: LocaleStringSchema,
    actInstalled: messageTemplate({ version: StrSchema }),
    actionlintNotFound: LocaleStringSchema,
    actionlintInstalling: LocaleStringSchema,
    actrcNotFound: LocaleStringSchema,

    // Run
    runningWorkflow: messageTemplate({ workflow: StrSchema }),
    runningAllWorkflows: LocaleStringSchema,
    runningJob: messageTemplate({ job: StrSchema }),
    runComplete: LocaleStringSchema,
    runFailed: LocaleStringSchema,
    appleArmDetected: LocaleStringSchema,
    dryRunAct: messageTemplate({ command: StrSchema }),

    // Lint
    lintingWorkflows: LocaleStringSchema,
    lintPassed: LocaleStringSchema,
    lintFailed: messageTemplate({ output: StrSchema }),

    // List
    listingWorkflows: LocaleStringSchema,
    noWorkflowsFound: LocaleStringSchema,

    // Secrets
    secretsGenerated: LocaleStringSchema,

    // Status
    statusHeader: LocaleStringSchema,
    statusDockerReady: LocaleStringSchema,
    statusDockerNotReady: LocaleStringSchema,
    statusToolAvailable: messageTemplate({ tool: StrSchema, version: StrSchema }),
    statusToolMissing: messageTemplate({ tool: StrSchema }),
    statusActrcFound: LocaleStringSchema,
    statusActrcMissing: LocaleStringSchema,
    statusWorkflowsFound: messageTemplate({ count: NonNegativeIntegerSchema }),
    statusNoWorkflows: LocaleStringSchema,

    // GitLab Prerequisites
    gitlabCiLocalNotFound: LocaleStringSchema,
    gitlabCiLocalInstalling: LocaleStringSchema,
    gitlabCiLocalInstalled: messageTemplate({ version: StrSchema }),
    gitlabCiYmlNotFound: LocaleStringSchema,

    // GitLab Run
    runningGitlabJob: messageTemplate({ job: StrSchema }),
    runningAllGitlabJobs: LocaleStringSchema,
    gitlabRunComplete: LocaleStringSchema,
    gitlabRunFailed: LocaleStringSchema,
    dryRunGitlabCiLocal: messageTemplate({ command: StrSchema }),

    // GitLab Lint
    validatingGitlabCi: LocaleStringSchema,
    gitlabValidationPassed: LocaleStringSchema,
    gitlabValidationFailed: messageTemplate({ output: StrSchema }),

    // GitLab List
    listingGitlabJobs: LocaleStringSchema,
    noGitlabJobsFound: LocaleStringSchema,

    // GitLab Status
    statusGitlabCiYmlFound: LocaleStringSchema,
    statusGitlabCiYmlMissing: LocaleStringSchema,
    statusGitlabJobsFound: messageTemplate({ count: NonNegativeIntegerSchema }),
    statusNoGitlabJobs: LocaleStringSchema,

    // Timing
    runDuration: messageTemplate({ duration: StrSchema }),
    gitlabRunDuration: messageTemplate({ duration: StrSchema }),

    // Filter
    filterActive: messageTemplate({
      filter: StrSchema,
      matched: NonNegativeIntegerSchema,
      total: NonNegativeIntegerSchema,
    }),
  }),
]);

// =============================================================================
// Types
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type LocalCiStrings = v.InferOutput<typeof LocalCiStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltLocalCiStrings = BuiltLocale<typeof LocalCiStringsSchema>;
