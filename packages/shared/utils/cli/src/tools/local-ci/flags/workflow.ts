/**
 * Local CI Tool — Workflow Flag
 *
 * `--workflow` / `-w`: Path to a specific workflow file to run.
 * When omitted, act runs all workflows in `.github/workflows/`.
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

/** Flag definitions for the `--workflow` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'workflow',
    property: 'workflow',
    long: '--workflow',
    short: '-w',
    type: 'string',
    scope: 'tool',
    schema: StrSchema,
    descriptionKey: 'workflow',
    order: 200,
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
