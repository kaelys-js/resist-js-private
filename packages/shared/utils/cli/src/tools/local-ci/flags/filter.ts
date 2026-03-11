/**
 * Local CI Tool — Filter Flag
 *
 * `--filter` / `-f`: Filter workflows/jobs by substring match (case-insensitive).
 * When omitted, all workflows/jobs are processed.
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

/** Flag definitions for the `--filter` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'filter',
    property: 'filter',
    long: '--filter',
    short: '-f',
    type: 'string',
    scope: 'tool',
    schema: StrSchema,
    descriptionKey: 'filter',
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
