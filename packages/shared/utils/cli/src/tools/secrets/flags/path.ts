/**
 * Secrets Tool — Path Flag
 *
 * `--path`: Infisical folder path (default: /).
 * Used by get, set, delete, list, validate actions.
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

/** Flag definitions for the `--path` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'path',
    property: 'path',
    long: '--path',
    short: null,
    type: 'string',
    scope: 'tool',
    schema: StrSchema,
    descriptionKey: 'path',
    order: 230,
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
