/**
 * Devenv Tool — Confirm Flag
 *
 * `--confirm` / `-C`: Confirm destructive operations (required for `destroy`).
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

/** Flag definitions for the `--confirm` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'confirm',
    property: 'confirm',
    long: '--confirm',
    short: '-C',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'confirm',
    order: 210,
    /**
     * Passive flag — checked in destroy handler.
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
