/**
 * Secrets Tool — Category Flag
 *
 * `--category` / `-c`: Secret category for rotation (jwt, api, database, all).
 * Used by the rotate action.
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

/** Flag definitions for the `--category` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'category',
    property: 'category',
    long: '--category',
    short: '-c',
    type: 'string',
    scope: 'tool',
    schema: StrSchema,
    descriptionKey: 'category',
    order: 260,
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
