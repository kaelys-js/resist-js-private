/**
 * Devenv Tool — Prune Flag
 *
 * `--prune` / `-P`: Also remove Docker images when stopping the container.
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

/** Flag definitions for the `--prune` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'prune',
    property: 'prune',
    long: '--prune',
    short: '-P',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'prune',
    order: 200,
    /**
     * Passive flag — checked in down handler.
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
