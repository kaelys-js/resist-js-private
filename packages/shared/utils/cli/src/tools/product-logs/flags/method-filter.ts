/**
 * Product-Logs Tool — Method Filter Flag
 *
 * `--method`: Filter logs by HTTP request method. Repeatable.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { HttpMethodSchema } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';

/** Flag definitions for the `--method` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'method',
    property: 'method',
    long: '--method',
    short: null,
    type: 'string',
    scope: 'tool',
    schema: HttpMethodSchema,
    repeatable: true,
    descriptionKey: 'methodFilter',
    helpType: 'string',
    order: 250,
    /**
     * Passive flag — value read from `ctx.options.method` in handler.
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
