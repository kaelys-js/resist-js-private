/**
 * Product-Logs Tool — Header Filter Flag
 *
 * `--header` / `-H`: Filter logs by request header. Format: `key:value`. Repeatable.
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

/** Validates `key:value` header filter format. */
const HeaderFilterSchema = v.pipe(v.string(), v.regex(/^.+:.+$/, 'Must be in key:value format'));

/** Flag definitions for the `--header` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'header',
    property: 'header',
    long: '--header',
    short: '-H',
    type: 'string',
    scope: 'tool',
    schema: HeaderFilterSchema,
    repeatable: true,
    descriptionKey: 'headerFilter',
    helpType: 'string',
    order: 240,
    /**
     * Passive flag — value read from `ctx.options.header` in handler.
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
