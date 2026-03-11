/**
 * Secrets Setup — Skip Login Flag
 *
 * `--skip-login` / `-S`: Skip interactive Infisical login.
 * Useful for CI or when re-provisioning without re-authenticating.
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

/** Flag definitions for the `--skip-login` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'skipLogin',
    property: 'skipLogin',
    long: '--skip-login',
    short: '-S',
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'skipLogin',
    order: 200,
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
