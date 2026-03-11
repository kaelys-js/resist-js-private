/**
 * Product-Logs Tool — Status Filter Flag
 *
 * `--status`: Filter logs by Worker invocation status. Repeatable.
 * Valid values: `ok`, `error`, `canceled`.
 *
 * @module
 */

import * as v from 'valibot';
import type {
  BaseLocaleStrings,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { okUnchecked, type Result } from '@/schemas/result/result';

/** Wrangler tail invocation status values. */
const WranglerTailStatusSchema = v.picklist(['ok', 'error', 'canceled']);

/** Flag definitions for the `--status` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'status',
    property: 'status',
    long: '--status',
    short: null,
    type: 'string',
    scope: 'tool',
    schema: WranglerTailStatusSchema,
    repeatable: true,
    descriptionKey: 'statusFilter',
    helpType: 'string',
    order: 230,
    /**
     * Passive flag — value read from `ctx.options.status` in handler.
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
