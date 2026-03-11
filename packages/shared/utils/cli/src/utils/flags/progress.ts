/**
 * Progress Flag Definition
 *
 * Defines `--progress` / `-p` flag for showing progress bar.
 * Has an `applyEnvDefault` callback to disable in CI.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  ExtendedFlags,
  FlagDefinition,
  FlagName,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { NullableStandardFlagsResultSchema } from '@/cli/schemas';
import { BoolSchema, VoidSchema, type EnvironmentConfig, type Void } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Progress flag definition.
 *
 * - `--progress` / `-p`: Show progress bar (disabled in CI by default).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'progress',
    property: 'progress',
    long: '--progress',
    short: '-p',
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    descriptionKey: 'progress',
    order: 100,
    /**
     * Disables progress bar in CI environments unless explicitly enabled.
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
      if (env.isCI && !explicitFlags.has('progress')) {
        flags.progress = false;
      }
      return ok(VoidSchema, undefined);
    },
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
