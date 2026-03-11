/**
 * Format Tool — Install Tools Flag
 *
 * `--install-tools`: Install missing formatting tools and exit.
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

/** Flag definitions for the `--install-tools` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'install-tools',
    property: 'installTools',
    long: '--install-tools',
    short: null,
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'installTools',
    order: 200,
    /**
     * Passive flag — handled in onStart hook (installs tools and exits).
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
