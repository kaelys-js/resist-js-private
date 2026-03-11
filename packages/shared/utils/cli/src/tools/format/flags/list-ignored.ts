/**
 * Format Tool — List Ignored Flag
 *
 * `--list-ignored`: List ignored file patterns and exit.
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

/** Flag definitions for the `--list-ignored` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'list-ignored',
    property: 'listIgnored',
    long: '--list-ignored',
    short: null,
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'listIgnored',
    order: 200,
    /**
     * Passive flag — handled in onStart hook (lists ignored patterns and exits).
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
