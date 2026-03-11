/**
 * Fail Fast Flag Definition
 *
 * Defines `--fail-fast` flag for stopping on first error.
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
 * Fail fast flag definition.
 *
 * - `--fail-fast`: Stop on first error.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'fail-fast',
    property: 'failFast',
    long: '--fail-fast',
    short: null,
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    descriptionKey: 'failFast',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
