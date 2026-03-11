/**
 * Format Flag Definition
 *
 * Defines `--format` flag for controlling output format.
 * Has `applyEnvDefault` for GitHub Actions auto-detection,
 * `formatError` for invalid values, and `suppressHeader` for
 * machine-readable formats.
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
  DEFAULT_OUTPUT_FORMAT,
  OutputFormatSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type EnvironmentConfig,
  type Str,
  type Void,
} from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Format flag definition.
 *
 * - `--format`: Output format (`pretty`|`compact`|`json`|`github`|`junit`).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'format',
    property: 'format',
    long: '--format',
    short: null,
    type: 'string',
    scope: 'runner',
    schema: OutputFormatSchema,
    default: DEFAULT_OUTPUT_FORMAT,
    descriptionKey: 'format',
    helpType: 'string',
    order: 100,
    /**
     * Auto-enables `github` format in GitHub Actions unless explicitly set.
     *
     * @param flags - Mutable flags record.
     * @param env - Detected environment configuration.
     * @param explicitFlags - Set of explicitly-provided flag names.
     */
    applyEnvDefault: (
      flags: ExtendedFlags,
      env: DeepReadonly<EnvironmentConfig>,
      explicitFlags: ReadonlySet<FlagName>,
    ): Result<Void> => {
      if (
        env.isGitHubActions &&
        !explicitFlags.has('format') &&
        !explicitFlags.has('json') &&
        !explicitFlags.has('github-actions')
      ) {
        flags.format = 'github';
      }
      return ok(VoidSchema, undefined);
    },
    /**
     * Formats invalid `--format` value errors.
     *
     * @param error - The flag validation error.
     * @param strings - CLI framework locale strings.
     * @returns `Result<Str>` — formatted error message.
     */
    formatError: (error: FlagValidationError, strings: BuiltCliStrings): Result<Str> => {
      const msgResult: Result<Str> = strings.errors.invalidFormat({
        flag: error.flag,
        value: error.value,
      });
      if (!msgResult.ok) return msgResult;
      return ok(StrSchema, msgResult.data);
    },
    /** Suppress header for machine-readable output formats. */
    suppressHeader: (flags: DeepReadonly<ExtendedFlags>): Bool =>
      ['json', 'github', 'junit'].includes(flags.format),
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
