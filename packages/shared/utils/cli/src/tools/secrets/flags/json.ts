/**
 * Secrets Tool — JSON Flag
 *
 * `--json`: Output raw JSON (no formatting).
 * Used by show, get, list, search, doctor, validate actions.
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

/** Flag definitions for the `--json` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'json',
    property: 'json',
    long: '--json',
    short: null,
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'json',
    order: 220,
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
