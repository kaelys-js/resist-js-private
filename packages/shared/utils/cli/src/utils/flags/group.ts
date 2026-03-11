/**
 * Group Flag Definition
 *
 * Defines `--group` / `-g` flag for grouping output by category.
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
 * Group flag definition.
 *
 * - `--group` / `-g`: Group output by category.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'group',
    property: 'group',
    long: '--group',
    short: '-g',
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    descriptionKey: 'group',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
