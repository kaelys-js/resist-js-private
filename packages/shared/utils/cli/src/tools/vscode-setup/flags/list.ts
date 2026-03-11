/**
 * VS Code Setup Tool — List Flag
 *
 * `--list` / `-l`: Display currently installed extensions with status
 * annotations (recommended, unwanted, extra) without making changes.
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

/** Flag definitions for the `--list` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'list',
    property: 'list',
    long: '--list',
    short: '-l',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'list',
    order: 210,
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
