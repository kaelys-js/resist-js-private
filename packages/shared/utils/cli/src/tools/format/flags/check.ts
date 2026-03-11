/**
 * Format Tool — Check Flag
 *
 * `--check` / `-C`: Run in check mode (exit 1 if files need formatting).
 * Passive boolean flag — checked in `onStart` and task logic.
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

/** Flag definitions for the `--check` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'check',
    property: 'check',
    long: '--check',
    short: '-C',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'check',
    order: 200,
    /**
     * Passive flag — no active handler. Checked in onStart/task.
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
