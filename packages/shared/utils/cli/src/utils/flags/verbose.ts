/**
 * Verbose Flag Definition
 *
 * Defines `--verbose` / `-v` flag as shorthand for `--log-level=debug`.
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
 * Verbose flag definition.
 *
 * - `--verbose` / `-v`: Shorthand for `--log-level=debug`.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'verbose',
    property: 'verbose',
    long: '--verbose',
    short: '-v',
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    descriptionKey: 'verbose',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
