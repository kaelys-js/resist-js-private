/**
 * Product-Logs Tool — Search Flag
 *
 * `--search`: Filter logs by text substring match.
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

/** Flag definitions for the `--search` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'search',
    property: 'search',
    long: '--search',
    short: null,
    type: 'string',
    scope: 'tool',
    schema: StrSchema,
    descriptionKey: 'search',
    order: 270,
    /**
     * Passive flag — value read from `ctx.options.search` in handler.
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
