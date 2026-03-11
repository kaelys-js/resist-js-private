/**
 * Debug Flag Definition
 *
 * Defines `--debug` / `-d` flag as shorthand for `--log-level=debug`.
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
 * Debug flag definition.
 *
 * - `--debug` / `-d`: Shorthand for `--log-level=debug`.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'debug',
    property: 'debug',
    long: '--debug',
    short: '-d',
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    descriptionKey: 'debug',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
