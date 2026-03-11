/**
 * Product-Logs Tool — IP Filter Flag
 *
 * `--ip`: Filter logs by client IP address. Supports `"self"` for the current machine's IP. Repeatable.
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

/** IP address string or the literal `"self"`. */
const IpFilterSchema = v.pipe(
  v.string(),
  v.regex(/^(?:self|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/, 'Must be an IPv4 address or "self"'),
);

/** Flag definitions for the `--ip` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'ip',
    property: 'ip',
    long: '--ip',
    short: null,
    type: 'string',
    scope: 'tool',
    schema: IpFilterSchema,
    repeatable: true,
    descriptionKey: 'ipFilter',
    helpType: 'string',
    order: 280,
    /**
     * Passive flag — value read from `ctx.options.ip` in handler.
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
