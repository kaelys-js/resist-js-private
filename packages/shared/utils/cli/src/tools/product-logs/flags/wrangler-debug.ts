/**
 * Product-Logs Tool — Wrangler Debug Flag
 *
 * `--wrangler-debug`: Enable wrangler's own debug logging output.
 * Named `--wrangler-debug` to avoid collision with the framework's `--debug` / `-d` flag (command scope).
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

/** Flag definitions for the `--wrangler-debug` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'wranglerDebug',
    property: 'wranglerDebug',
    long: '--wrangler-debug',
    short: null,
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'wranglerDebug',
    order: 300,
    /**
     * Passive flag — value read from `ctx.options.wranglerDebug` in handler.
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
