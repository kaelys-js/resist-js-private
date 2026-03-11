/**
 * Product-Logs Tool — Service Flag
 *
 * `--service` / `-S`: Target a specific product service layer (api, app, status, assets, marketing).
 * Defaults to `api` when omitted.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { ServiceNameSchema } from '@/schemas/core-config/tooling';
import { okUnchecked, type Result } from '@/schemas/result/result';

/** Flag definitions for the `--service` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'service',
    property: 'service',
    long: '--service',
    short: '-S',
    type: 'string',
    scope: 'tool',
    schema: ServiceNameSchema,
    default: 'api',
    descriptionKey: 'service',
    order: 210,
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
