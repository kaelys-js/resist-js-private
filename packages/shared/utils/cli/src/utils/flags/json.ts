/**
 * JSON Flag Definition
 *
 * Defines `--json` flag as deprecated shorthand for `--format=json`.
 * Has a sideEffect that sets `format='json'`.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { NullableStandardFlagsResultSchema } from '@/cli/schemas';
import { BoolSchema } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * JSON flag definition.
 *
 * - `--json`: Deprecated shorthand for `--format=json` (sideEffect).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'json',
    property: 'json',
    long: '--json',
    short: null,
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    sideEffects: [{ property: 'format', value: 'json' }],
    descriptionKey: 'json',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
