/**
 * Format Tool — List Formatters Flag
 *
 * `--list-formatters`: List available formatters and exit.
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

/** Flag definitions for the `--list-formatters` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'list-formatters',
    property: 'listFormatters',
    long: '--list-formatters',
    short: null,
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'listFormatters',
    order: 200,
    /**
     * Passive flag — handled in onStart hook (prints formatter list and exits).
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
