/**
 * Config Tool — Key Flag
 *
 * `--key` / `-k`: Dot-notation key path for accessing specific config values.
 * Used by `get` and `schema` actions to target a specific config key.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { StrSchema } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';

/** Flag definitions for the `--key` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'key',
    property: 'key',
    long: '--key',
    short: '-k',
    type: 'string',
    scope: 'tool',
    schema: StrSchema,
    descriptionKey: 'key',
    order: 210,
    /**
     * Passive flag — checked in handler.
     *
     * @param _config - Standard flags configuration (unused).
     * @returns `Result<NullableStandardFlagsResult>` — always `ok(null)`.
     */
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => okUnchecked(null),
  },
];

export default defs;
