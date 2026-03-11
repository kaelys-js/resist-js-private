/**
 * Stats Flag Definition
 *
 * Defines `--stats` flag for showing detailed statistics.
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
 * Stats flag definition.
 *
 * - `--stats`: Show detailed statistics.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'stats',
    property: 'stats',
    long: '--stats',
    short: null,
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    descriptionKey: 'stats',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
