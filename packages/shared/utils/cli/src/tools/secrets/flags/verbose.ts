/**
 * Secrets Tool — Verbose Flag
 *
 * `--verbose`: Show detailed output.
 * Used by doctor, validate, migrate, sync actions.
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

/** Flag definitions for the `--verbose` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'verbose',
    property: 'verbose',
    long: '--verbose',
    short: null,
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'verbose',
    order: 270,
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
