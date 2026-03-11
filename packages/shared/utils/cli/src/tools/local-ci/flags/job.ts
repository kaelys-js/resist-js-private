/**
 * Local CI Tool — Job Flag
 *
 * `--job` / `-j`: Specific job ID to run from the workflow.
 * When omitted, act runs all jobs in the workflow(s).
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

/** Flag definitions for the `--job` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'job',
    property: 'job',
    long: '--job',
    short: '-j',
    type: 'string',
    scope: 'tool',
    schema: StrSchema,
    descriptionKey: 'job',
    order: 210,
    /**
     * Passive flag — checked in run handler.
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
