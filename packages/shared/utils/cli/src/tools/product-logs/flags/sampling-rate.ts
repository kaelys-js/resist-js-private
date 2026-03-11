/**
 * Product-Logs Tool — Sampling Rate Flag
 *
 * `--sampling-rate`: Fraction of requests to sample (0 to 1).
 * Useful for high-traffic Workers to reduce log volume.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { UnitIntervalSchema } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';

/** Flag definitions for the `--sampling-rate` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'samplingRate',
    property: 'samplingRate',
    long: '--sampling-rate',
    short: null,
    type: 'string',
    scope: 'tool',
    schema: UnitIntervalSchema,
    descriptionKey: 'samplingRate',
    helpType: 'number',
    order: 260,
    /**
     * Passive flag — value read from `ctx.options.samplingRate` in handler.
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
