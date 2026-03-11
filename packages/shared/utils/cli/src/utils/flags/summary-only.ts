/**
 * Summary Only Flag Definition
 *
 * Defines `--summary-only` flag for showing only summary, not individual results.
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
 * Summary only flag definition.
 *
 * - `--summary-only`: Only show summary, not individual results.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'summary-only',
    property: 'summaryOnly',
    long: '--summary-only',
    short: null,
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    descriptionKey: 'summaryOnly',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
