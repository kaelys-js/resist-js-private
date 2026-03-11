/**
 * Devenv Tool — Rebuild Flag
 *
 * `--rebuild` / `-R`: Force rebuild of the container image even if it exists.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { BoolSchema } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';

/** Flag definitions for the `--rebuild` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'rebuild',
    property: 'rebuild',
    long: '--rebuild',
    short: '-R',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'rebuild',
    order: 210,
    /**
     * Passive flag — checked in up handler.
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
