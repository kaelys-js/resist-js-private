/**
 * Dev Proxy Locale Schema
 *
 * Valibot schema and inferred type for dev-proxy command strings.
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

/** Valibot schema for dev-proxy locale strings. */
export const DevProxyStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    description: LocaleStringSchema,
    header: LocaleStringSchema,
    productsDiscovered: messageTemplate({ count: NonNegativeIntegerSchema }),
    noProductsFound: messageTemplate({ productsDir: StrSchema }),
    noProductsHint: LocaleStringSchema,
    createProductHint: LocaleStringSchema,
    globalServices: LocaleStringSchema,
    startingProxy: LocaleStringSchema,
    generatingCerts: LocaleStringSchema,
    certsCreated: messageTemplate({ count: NonNegativeIntegerSchema }),
    errorCaddyStart: LocaleStringSchema,
    errorCaddyHintInstall: LocaleStringSchema,
    errorCaddyHintPort: LocaleStringSchema,
    errorCaddyExit: LocaleStringSchema,
    errorCaddyExitCode: messageTemplate({ code: NonNegativeIntegerSchema }),
    errorCaddyHintLogs: LocaleStringSchema,
    errorCaddyHintCommon: LocaleStringSchema,

    // Dry-run mode
    dryRunPrefix: LocaleStringSchema,
    dryRunSkipCaddy: LocaleStringSchema,
    dryRunWouldGenerate: messageTemplate({ count: NonNegativeIntegerSchema }),

    // Config watching
    watchingConfig: messageTemplate({ configFilename: StrSchema }),
    configChanged: messageTemplate({ configFilename: StrSchema }),
    restarting: LocaleStringSchema,

    // Expose mode
    exposeWarning: LocaleStringSchema,
    exposeIps: messageTemplate({ ips: StrSchema }),
    exposeHostname: messageTemplate({ hostname: StrSchema }),
    exposeNoIps: LocaleStringSchema,

    // Auto-install
    installingPrerequisites: messageTemplate({ tools: StrSchema }),
    prerequisiteInstalled: messageTemplate({ tool: StrSchema }),

    // Tunnel mode
    tunnelStarting: LocaleStringSchema,
    tunnelFailed: messageTemplate({ service: StrSchema }),
    tunnelDryRun: messageTemplate({ count: NonNegativeIntegerSchema }),
    tunnelNamed: messageTemplate({ name: StrSchema, url: StrSchema }),

    // Health checks
    serviceHealthy: LocaleStringSchema,
    serviceUnhealthy: LocaleStringSchema,
    healthCheckRunning: LocaleStringSchema,
  }),
]);

// =============================================================================
// Type
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type DevProxyStrings = v.InferOutput<typeof DevProxyStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltDevProxyStrings = BuiltLocale<typeof DevProxyStringsSchema>;
