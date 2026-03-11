/**
 * Secrets Setup Locale Schema
 *
 * Valibot schema and inferred type for secrets-setup command strings.
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

/** Valibot schema for secrets-setup locale strings. */
export const SecretsSetupStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    // CLI check
    checkingCli: LocaleStringSchema,
    cliFound: messageTemplate({ version: StrSchema }),
    cliInstalling: LocaleStringSchema,
    cliInstalled: LocaleStringSchema,
    cliInstallFailed: LocaleStringSchema,

    // Mode detection
    detectedBootstrapMode: LocaleStringSchema,
    detectedConnectMode: messageTemplate({ siteUrl: StrSchema }),

    // Server env (bootstrap only)
    generatingEnvFile: LocaleStringSchema,
    envFileExists: LocaleStringSchema,
    envFileGenerated: LocaleStringSchema,

    // Server management (bootstrap only)
    checkingServer: LocaleStringSchema,
    serverRunning: LocaleStringSchema,
    serverStarting: LocaleStringSchema,
    serverStarted: LocaleStringSchema,
    serverStartFailed: LocaleStringSchema,
    waitingForServer: LocaleStringSchema,
    serverReady: LocaleStringSchema,

    // Authentication
    authenticating: LocaleStringSchema,
    loginSuccess: LocaleStringSchema,
    loginSkipped: LocaleStringSchema,

    // Auto-provisioning (bootstrap only)
    provisioningStructure: LocaleStringSchema,
    creatingProject: messageTemplate({ name: StrSchema }),
    projectCreated: messageTemplate({ name: StrSchema, id: StrSchema }),
    creatingFolder: messageTemplate({ path: StrSchema, project: StrSchema }),
    creatingMachineIdentity: messageTemplate({ name: StrSchema }),
    machineIdentityCreated: messageTemplate({ name: StrSchema }),
    ciCredentialsPrint: messageTemplate({ clientId: StrSchema, clientSecret: StrSchema }),
    promptSecretValue: messageTemplate({ key: StrSchema, path: StrSchema }),
    secretSet: messageTemplate({ key: StrSchema }),
    secretSkipped: messageTemplate({ key: StrSchema }),
    provisioningComplete: LocaleStringSchema,

    // .infisical.json config
    configExists: LocaleStringSchema,
    configWritten: LocaleStringSchema,

    // VPS deploy prompt (bootstrap only)
    promptDeployVps: LocaleStringSchema,
    deployingVps: LocaleStringSchema,
    deployVpsComplete: LocaleStringSchema,
    deployVpsFailed: LocaleStringSchema,
    deployVpsSkipped: LocaleStringSchema,
    updateSiteUrlReminder: LocaleStringSchema,

    // Reset
    resetStoppingContainers: LocaleStringSchema,
    resetContainersStopped: LocaleStringSchema,
    resetFileRemoved: messageTemplate({ path: StrSchema }),
    resetBootstrapComplete: LocaleStringSchema,
    resetLoggingOut: LocaleStringSchema,
    resetLoggedOut: LocaleStringSchema,
    resetConnectComplete: LocaleStringSchema,
    resetReconnectHint: LocaleStringSchema,

    // Test
    testingConnection: LocaleStringSchema,
    testSuccess: LocaleStringSchema,
    testFailed: LocaleStringSchema,

    // Complete
    setupComplete: LocaleStringSchema,
  }),
]);

// =============================================================================
// Types
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type SecretsSetupStrings = v.InferOutput<typeof SecretsSetupStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltSecretsSetupStrings = BuiltLocale<typeof SecretsSetupStringsSchema>;
