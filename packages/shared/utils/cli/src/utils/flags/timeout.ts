/**
 * Timeout Flag Definition
 *
 * Defines `--timeout` / `-t` flag for task timeout in milliseconds.
 * Uses `NonNegativeIntegerSchema` for validation (0 = no timeout).
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
 * Timeout flag definition.
 *
 * - `--timeout` / `-t`: Task timeout in milliseconds (0 = no timeout).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'timeout',
    property: 'timeout',
    long: '--timeout',
    short: '-t',
    type: 'number',
    scope: 'runner',
    schema: NonNegativeIntegerSchema,
    descriptionKey: 'timeout',
    helpType: 'number',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
