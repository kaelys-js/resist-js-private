/**
 * Ignore Flag Definition
 *
 * Defines `--ignore` / `-i` flag for additional ignore patterns.
 * Repeatable — accumulates values into an array.
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
import { StrSchema } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Ignore flag definition.
 *
 * - `--ignore` / `-i`: Additional ignore patterns (repeatable).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'ignore',
    property: 'ignore',
    long: '--ignore',
    short: '-i',
    type: 'string',
    scope: 'runner',
    schema: StrSchema,
    repeatable: true,
    descriptionKey: 'ignore',
    helpType: 'string',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
