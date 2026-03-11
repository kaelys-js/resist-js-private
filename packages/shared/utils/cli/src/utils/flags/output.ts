/**
 * Output Flag Definition
 *
 * Defines `--output` / `-o` flag for writing output to file.
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
 * Output flag definition.
 *
 * - `--output` / `-o`: Write output to file.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'output',
    property: 'output',
    long: '--output',
    short: '-o',
    type: 'string',
    scope: 'runner',
    schema: StrSchema,
    descriptionKey: 'output',
    helpType: 'string',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
