/**
 * Color Flag Definitions & Behavior
 *
 * Defines `--color` and `--no-color` flags, `NO_COLOR`/`FORCE_COLOR` environment
 * defaults, and terminal color initialization handler.
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
  StandardFlagsResult,
} from '@/cli/schemas';
import { NullableStandardFlagsResultSchema } from '@/cli/schemas';
import {
  BoolSchema,
  VoidSchema,
  type Bool,
  type EnvironmentConfig,
  type Str,
  type Void,
} from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { setColors } from '@/utils/core/terminal';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Color flag definitions.
 *
 * - `--color`: Force color output on.
 * - `--no-color`: Force color output off.
 *
 * The `--no-color` definition carries the active handler (order 10) and
 * the `applyEnvDefault` callback for `NO_COLOR`/`FORCE_COLOR` env vars.
 * `--color` is passive (order 100).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'color',
    property: 'color',
    long: '--color',
    short: null,
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    descriptionKey: 'color',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
  {
    name: 'no-color',
    property: 'noColor',
    long: '--no-color',
    short: null,
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    descriptionKey: 'noColor',
    order: 10,
    /**
     * Applies `NO_COLOR`/`FORCE_COLOR` env var defaults.
     * Only applies when neither `--color` nor `--no-color` was explicitly set.
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
      if (!explicitFlags.has('color') && !explicitFlags.has('no-color')) {
        if (env.noColor) flags.noColor = true;
        else if (env.forceColor) flags.color = true;
      }
      return ok(VoidSchema, undefined);
    },
    /**
     * Configures terminal color output based on resolved flags and TTY state.
     * Runs at order 10 — before any colored output.
     *
     * @param config - Standard flags configuration.
     * @returns `Result<NullableStandardFlagsResult>` — null to continue.
     */
    handle: (
      config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => {
      const useColors: Bool = !config.flags.noColor && (config.flags.color || config.env.isTTY);
      const colorResult: Result<Void> = setColors(useColors);
      if (!colorResult.ok) return colorResult;
      return ok(NullableStandardFlagsResultSchema, null);
    },
  },
];

export default defs;
