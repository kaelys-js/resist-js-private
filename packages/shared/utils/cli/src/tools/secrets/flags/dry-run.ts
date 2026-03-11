/**
 * Secrets Tool — Dry Run Flag
 *
 * `--dry-run`: Preview changes without applying them.
 * Used by set, delete, migrate, rotate, sync actions.
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

/** Flag definitions for the `--dry-run` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'dry-run',
    property: 'dryRun',
    long: '--dry-run',
    short: null,
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'dryRun',
    order: 240,
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
