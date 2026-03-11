/**
 * Product-Logs Tool — Format Flag
 *
 * `--format` / `-F`: Wrangler tail output format (`json` or `pretty`).
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

/** Wrangler tail output format options. */
const WranglerTailFormatSchema = v.picklist(['json', 'pretty']);

/** Flag definitions for the `--format` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'format',
    property: 'format',
    long: '--format',
    short: '-F',
    type: 'string',
    scope: 'tool',
    schema: WranglerTailFormatSchema,
    descriptionKey: 'format',
    order: 220,
    /**
     * Passive flag — value read from `ctx.options.format` in handler.
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
