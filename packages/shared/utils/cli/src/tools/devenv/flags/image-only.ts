/**
 * Devenv Tool — Image Only Flag
 *
 * `--image-only`: Only rebuild and push the workspace image (skip VPS provisioning).
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

/** Flag definitions for the `--image-only` flag. */
const defs: readonly FlagDefinition[] = [
  {
    name: 'image-only',
    property: 'imageOnly',
    long: '--image-only',
    short: null,
    type: 'boolean',
    scope: 'tool',
    schema: BoolSchema,
    descriptionKey: 'imageOnly',
    order: 220,
    /**
     * Passive flag — checked in deploy handler.
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
