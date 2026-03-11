/**
 * Log Level Flag Definition & Behavior
 *
 * Defines `--log-level` flag with an active handler (order 20) that
 * initializes the log level from resolved flags.
 *
 * Includes `applyEnvDefault` callback that resolves shorthand flags
 * (`--debug`, `--verbose`, `--quiet`) to log level values, and
 * `formatError` for invalid `--log-level` value errors.
 *
 * @module
 */

import type { BuiltCliStrings } from '@/cli/locale/schema';
import type {
  BaseLocaleStrings,
  ExtendedFlags,
  FlagDefinition,
  FlagName,
  FlagValidationError,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { NullableStandardFlagsResultSchema } from '@/cli/schemas';
import {
  DEFAULT_LOG_LEVEL,
  LogLevelSchema,
  StrSchema,
  VoidSchema,
  type EnvironmentConfig,
  type Str,
  type Void,
} from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { setLogLevel } from '@/utils/core/logger';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Log level flag definition.
 *
 * - `--log-level`: Explicit log level (`silent`|`error`|`warn`|`info`|`debug`).
 *
 * The handler (order 20) initializes the log level. The `applyEnvDefault`
 * resolves shorthand flags. The `formatError` provides locale-aware errors.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'log-level',
    property: 'logLevel',
    long: '--log-level',
    short: null,
    type: 'string',
    scope: 'command',
    schema: LogLevelSchema,
    default: DEFAULT_LOG_LEVEL,
    descriptionKey: 'logLevel',
    helpType: 'string',
    order: 20,
    /**
     * Resolves shorthand flags (`--debug`, `--verbose`, `--quiet`) to log level.
     * Only applies when `--log-level` was not explicitly provided.
     *
     * @param flags - Mutable flags record.
     * @param _env - Detected environment (unused).
     * @param explicitFlags - Set of explicitly-provided flag names.
     */
    applyEnvDefault: (
      flags: ExtendedFlags,
      _env: DeepReadonly<EnvironmentConfig>,
      explicitFlags: ReadonlySet<FlagName>,
    ): Result<Void> => {
      if (!explicitFlags.has('log-level')) {
        if (flags.debug) flags.logLevel = 'debug';
        else if (flags.verbose) flags.logLevel = 'debug';
        else if (flags.quiet) flags.logLevel = 'error';
      }
      return ok(VoidSchema, undefined);
    },
    /**
     * Formats invalid `--log-level` value errors.
     *
     * @param error - The flag validation error.
     * @param strings - CLI framework locale strings.
     * @returns `Result<Str>` — formatted error message.
     */
    formatError: (error: FlagValidationError, strings: BuiltCliStrings): Result<Str> => {
      const msgResult: Result<Str> = strings.errors.invalidLogLevel({
        flag: error.flag,
        value: error.value,
      });
      if (!msgResult.ok) return msgResult;
      return ok(StrSchema, msgResult.data);
    },
    /**
     * Initializes the log level from resolved flags.
     * Runs at order 20 — after color, before help/version.
     *
     * @param config - Standard flags configuration.
     * @returns `Result<NullableStandardFlagsResult>` — null to continue.
     */
    handle: (
      config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => {
      const logLevelResult: Result<Void> = setLogLevel(config.flags.logLevel);
      if (!logLevelResult.ok) return logLevelResult;
      return ok(NullableStandardFlagsResultSchema, null);
    },
  },
];

export default defs;
