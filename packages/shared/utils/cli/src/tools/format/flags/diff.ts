/**
 * Format Tool — Diff Flag
 *
 * `--diff` / `-D`: Show diff of changes.
 * Passive boolean flag — checked in task logic.
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

/** Flag definitions for the `--diff` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'diff',
    property: 'diff',
    long: '--diff',
    short: '-D',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'diff',
    order: 200,
    /**
     * Passive flag — no active handler. Checked in task logic.
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
