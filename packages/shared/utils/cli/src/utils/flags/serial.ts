/**
 * Serial Flag Definition
 *
 * Defines `--serial` / `-s` flag for running tasks serially.
 * Has a sideEffect that sets `concurrency=1`.
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
 * Serial flag definition.
 *
 * - `--serial` / `-s`: Run tasks serially (`concurrency=1` sideEffect).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'serial',
    property: 'serial',
    long: '--serial',
    short: '-s',
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    sideEffects: [{ property: 'concurrency', value: 1 }],
    descriptionKey: 'serial',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
