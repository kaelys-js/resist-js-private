/**
 * Silent Flag Definition
 *
 * Defines `--silent` flag for suppressing output.
 * Has a sideEffect that sets `quiet=true`.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { NullableStandardFlagsResultSchema } from '@/cli/schemas';
import { BoolSchema } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Silent flag definition.
 *
 * - `--silent`: Like `--quiet` but also suppresses more output (sideEffect: `quiet=true`).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'silent',
    property: 'silent',
    long: '--silent',
    short: null,
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    sideEffects: [{ property: 'quiet', value: true }],
    descriptionKey: 'silent',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
