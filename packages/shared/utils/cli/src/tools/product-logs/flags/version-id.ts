/**
 * Product-Logs Tool — Version ID Flag
 *
 * `--version-id`: Tail logs from a specific Worker version deployment.
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

/** Flag definitions for the `--version-id` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'versionId',
    property: 'versionId',
    long: '--version-id',
    short: null,
    type: 'string',
    scope: 'tool',
    schema: StrSchema,
    descriptionKey: 'versionId',
    order: 290,
    /**
     * Passive flag — value read from `ctx.options.versionId` in handler.
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
