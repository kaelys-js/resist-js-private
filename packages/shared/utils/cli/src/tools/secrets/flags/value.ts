/**
 * Secrets Tool — Value Flag
 *
 * `--value` / `-v`: Secret value for the set action.
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

/** Flag definitions for the `--value` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'value',
    property: 'value',
    long: '--value',
    short: '-v',
    type: 'string',
    scope: 'tool',
    schema: StrSchema,
    descriptionKey: 'value',
    order: 211,
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
