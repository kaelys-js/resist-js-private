/**
 * Timing Flag Definition
 *
 * Defines `--timing` flag for showing timing for each file.
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
 * Timing flag definition.
 *
 * - `--timing`: Show timing for each file.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'timing',
    property: 'timing',
    long: '--timing',
    short: null,
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    descriptionKey: 'timing',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
