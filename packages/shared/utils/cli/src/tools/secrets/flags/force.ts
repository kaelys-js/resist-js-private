/**
 * Secrets Tool — Force Flag
 *
 * `--force` / `-f`: Skip confirmation prompts.
 * Used by rotate, delete actions.
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

/** Flag definitions for the `--force` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'force',
    property: 'force',
    long: '--force',
    short: '-f',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'force',
    order: 250,
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
