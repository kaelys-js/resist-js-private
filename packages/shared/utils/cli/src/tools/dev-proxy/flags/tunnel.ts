/**
 * Dev-Proxy Tool — Tunnel Flag
 *
 * `--tunnel` / `-t`: Create a Cloudflare tunnel for external access.
 *
 * Passive boolean flag — checked in the command handler.
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

const defs: readonly FlagDefinition[] = [
  {
    name: 'tunnel',
    property: 'tunnel',
    long: '--tunnel',
    short: '-t',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'tunnel',
    order: 200,
    /**
     * Passive flag — checked in handler.
     *
     * @param _config - Standard flags configuration (unused).
     * @returns `Result<NullableStandardFlagsResult>` — always continues.
     */
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => okUnchecked(null),
  },
];

export default defs;
