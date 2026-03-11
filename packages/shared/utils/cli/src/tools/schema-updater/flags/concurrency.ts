/**
 * Schema-Updater Tool — Concurrency Flag
 *
 * `--concurrency` / `-c`: Maximum number of concurrent HTTP requests.
 * Defaults to 6 when omitted.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { PositiveIntegerSchema } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';

/** Flag definitions for the `--concurrency` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'concurrency',
    property: 'concurrency',
    long: '--concurrency',
    short: '-c',
    type: 'string',
    scope: 'tool',
    schema: PositiveIntegerSchema,
    default: '6',
    descriptionKey: 'concurrency',
    helpType: 'number',
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
