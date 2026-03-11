/**
 * VS Code Setup Tool — Diff Flag
 *
 * `--diff` / `-d`: Show comparison between installed extensions and
 * configured ones. Displays missing (recommended but not installed),
 * extra (installed but not recommended), and unwanted (installed and
 * in unwantedRecommendations).
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
    short: '-d',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'diff',
    order: 230,
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
