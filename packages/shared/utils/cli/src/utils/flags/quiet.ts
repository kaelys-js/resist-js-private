/**
 * Quiet Flag Definition
 *
 * Defines `--quiet` / `-q` flag as shorthand for `--log-level=error`.
 * Has a `suppressHeader` callback.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  ExtendedFlags,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { NullableStandardFlagsResultSchema } from '@/cli/schemas';
import { BoolSchema, type Bool } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Quiet flag definition.
 *
 * - `--quiet` / `-q`: Shorthand for `--log-level=error`.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'quiet',
    property: 'quiet',
    long: '--quiet',
    short: '-q',
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    descriptionKey: 'quiet',
    order: 100,
    /** Suppress header when `--quiet` is set. */
    suppressHeader: (flags: DeepReadonly<ExtendedFlags>): Bool => flags.quiet,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
