/**
 * Format Tool — Check Tools Flag
 *
 * `--check-tools`: Check if required formatting tools are installed and exit.
 * Passive boolean flag — checked in `onStart` hook.
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

/** Flag definitions for the `--check-tools` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'check-tools',
    property: 'checkTools',
    long: '--check-tools',
    short: null,
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'checkTools',
    order: 200,
    /**
     * Passive flag — handled in onStart hook (checks tool availability and exits).
     *
     * @param _config - Standard flags configuration (unused).
     * @returns `Result<NullableStandardFlagsResult>` — always `ok(null)` to continue.
     */
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => okUnchecked(null),
  },
];

export default defs;
