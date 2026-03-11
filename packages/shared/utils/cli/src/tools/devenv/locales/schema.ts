/**
 * Devenv Locale Schema
 *
 * Valibot schema and inferred type for devenv command strings.
 *
 * Uses `messageTemplate()` for parameterized strings — placeholders are
 * validated at locale load time, and params are validated at render time.
 *
 * @module
 */

import * as v from 'valibot';

import { messageTemplate, type BuiltLocale } from '@/locale';
import { CommandLocaleStringsSchema } from '@/cli/schemas';
import { LocaleStringSchema, StrSchema } from '@/schemas/common';

// =============================================================================
// Schema
// =============================================================================

/** Valibot schema for devenv locale strings. */
export const DevenvStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    // Prerequisites
    checkingPrereqs: LocaleStringSchema,
    prereqFound: messageTemplate({ tool: StrSchema, version: StrSchema }),
    prereqInstalling: messageTemplate({ tool: StrSchema }),
    prereqInstalled: messageTemplate({ tool: StrSchema }),
    prereqMissing: messageTemplate({ tool: StrSchema }),
    dockerNotFoundMac: LocaleStringSchema,
    dockerNotFoundLinux: LocaleStringSchema,
    dockerNotFoundWindows: LocaleStringSchema,
    dockerNotRunning: LocaleStringSchema,

    // Sync
    syncRunning: LocaleStringSchema,
    syncComplete: LocaleStringSchema,
    syncOutputsMissing: LocaleStringSchema,

    // Local (up)
    containerBuilding: LocaleStringSchema,
    containerRebuilding: LocaleStringSchema,
    containerReady: LocaleStringSchema,
    configChanged: LocaleStringSchema,
    openInVscode: LocaleStringSchema,
    dryRunUp: LocaleStringSchema,

    // Remote (deploy)
    provisioningVps: LocaleStringSchema,
    vpsExists: messageTemplate({ ip: StrSchema }),
    vpsCreated: messageTemplate({ ip: StrSchema }),
    installingK3s: LocaleStringSchema,
    k3sReady: LocaleStringSchema,
    installingCoder: LocaleStringSchema,
    coderReady: LocaleStringSchema,
    configuringDns: LocaleStringSchema,
    dnsConfigured: messageTemplate({ domain: StrSchema }),
    buildingImage: LocaleStringSchema,
    imagePushed: LocaleStringSchema,
    pushingTemplate: LocaleStringSchema,
    templatePushed: LocaleStringSchema,
    creatingWorkspace: LocaleStringSchema,
    workspaceReady: messageTemplate({ url: StrSchema }),
    dryRunDeploy: LocaleStringSchema,

    // Push
    pushComplete: LocaleStringSchema,
    coderNotAuthenticated: LocaleStringSchema,

    // Down (local teardown)
    containerStopping: LocaleStringSchema,
    containerStopped: LocaleStringSchema,
    containerNotRunning: LocaleStringSchema,
    imagesPruned: LocaleStringSchema,
    downComplete: LocaleStringSchema,

    // Destroy (remote teardown)
    destroyConfirmRequired: LocaleStringSchema,
    destroyStarting: LocaleStringSchema,
    destroyStep: messageTemplate({ step: StrSchema }),
    destroyComplete: LocaleStringSchema,

    // Infisical
    fetchingSecrets: LocaleStringSchema,
    installingInfisical: LocaleStringSchema,

    // Exec
    execContainerNotFound: LocaleStringSchema,

    // Restart
    containerRestarting: LocaleStringSchema,
    containerRestarted: LocaleStringSchema,

    // Logs
    logsStreaming: LocaleStringSchema,
    logsContainerNotFound: LocaleStringSchema,

    // Health check
    healthCheckPassed: LocaleStringSchema,
    healthCheckFailed: LocaleStringSchema,

    // Prebuild
    prebuildStarting: LocaleStringSchema,
    prebuildComplete: LocaleStringSchema,

    // Env file generation
    envGenerating: LocaleStringSchema,
    envGenerated: LocaleStringSchema,
    envFailed: LocaleStringSchema,

    // SSH
    sshConnecting: LocaleStringSchema,
    sshFailed: LocaleStringSchema,

    // Remote workspace lifecycle
    workspaceStopping: LocaleStringSchema,
    workspaceStopped: LocaleStringSchema,
    workspaceStarting: LocaleStringSchema,
    workspaceStarted: LocaleStringSchema,

    // Destroy preview
    destroyPreviewHeader: LocaleStringSchema,
    destroyPreviewItem: messageTemplate({ resource: StrSchema }),

    // Status
    statusHeader: LocaleStringSchema,
    statusLocalSection: LocaleStringSchema,
    statusRemoteSection: LocaleStringSchema,
    statusSecretsSection: LocaleStringSchema,
    statusAvailable: messageTemplate({ tool: StrSchema, version: StrSchema }),
    statusMissing: messageTemplate({ tool: StrSchema }),
    statusOutdated: messageTemplate({ tool: StrSchema, current: StrSchema, expected: StrSchema }),
    statusContainerSection: LocaleStringSchema,
    statusContainerRunning: messageTemplate({ status: StrSchema }),
    statusContainerStopped: LocaleStringSchema,
    statusCoderWorkspace: messageTemplate({ workspaces: StrSchema }),
  }),
]);

// =============================================================================
// Types
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type DevenvStrings = v.InferOutput<typeof DevenvStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltDevenvStrings = BuiltLocale<typeof DevenvStringsSchema>;
