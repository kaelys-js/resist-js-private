/**
 * Filter Flag Definition
 *
 * Defines `--filter` / `-f` flag for filtering files by pattern.
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
 * Filter flag definition.
 *
 * - `--filter` / `-f`: Filter files by pattern.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'filter',
    property: 'filter',
    long: '--filter',
    short: '-f',
    type: 'string',
    scope: 'runner',
    schema: StrSchema,
    descriptionKey: 'filter',
    helpType: 'string',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
