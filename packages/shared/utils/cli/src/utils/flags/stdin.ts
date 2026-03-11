/**
 * Stdin Flag Definition
 *
 * Defines `--stdin` flag for reading from stdin.
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
 * Stdin flag definition.
 *
 * - `--stdin`: Read from stdin.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'stdin',
    property: 'stdin',
    long: '--stdin',
    short: null,
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    descriptionKey: 'stdin',
    order: 100,
    /** Suppress header when reading from stdin. */
    suppressHeader: (flags: DeepReadonly<ExtendedFlags>): Bool => flags.stdin,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
