/**
 * Checks Tool — Fix Flag
 *
 * `--fix` / `-f`: Attempt auto-remediation of detected mismatches.
 * Passive boolean flag — checked in pass functions.
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

/** Flag definitions for the `--fix` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'fix',
    property: 'fix',
    long: '--fix',
    short: '-f',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'fix',
    order: 200,
    /**
     * Passive flag — no active handler. Checked in pass functions.
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
