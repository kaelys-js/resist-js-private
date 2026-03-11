/**
 * Slow Threshold Flag Definition
 *
 * Defines `--slow-threshold` flag for warning on files slower than threshold (ms).
 * Uses `NonNegativeIntegerSchema` for validation.
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
import { NonNegativeIntegerSchema } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Slow threshold flag definition.
 *
 * - `--slow-threshold`: Warn for files slower than threshold (ms).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'slow-threshold',
    property: 'slowThreshold',
    long: '--slow-threshold',
    short: null,
    type: 'number',
    scope: 'runner',
    schema: NonNegativeIntegerSchema,
    descriptionKey: 'slowThreshold',
    helpType: 'number',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
