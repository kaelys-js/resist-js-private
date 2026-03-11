/**
 * GitHub Actions Flag Definition
 *
 * Defines `--github-actions` flag as deprecated shorthand for `--format=github`.
 * Has a sideEffect that sets `format='github'`.
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
 * GitHub Actions flag definition.
 *
 * - `--github-actions`: Deprecated shorthand for `--format=github` (sideEffect).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'github-actions',
    property: 'githubActions',
    long: '--github-actions',
    short: null,
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    sideEffects: [{ property: 'format', value: 'github' }],
    descriptionKey: 'githubActions',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
