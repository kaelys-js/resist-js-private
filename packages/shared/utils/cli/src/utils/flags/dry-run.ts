/**
 * Dry Run Flag Definition
 *
 * Defines `--dry-run` / `-n` flag for preview mode (no changes).
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
 * Dry run flag definition.
 *
 * - `--dry-run` / `-n`: Preview mode (no changes).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'dry-run',
    property: 'dryRun',
    long: '--dry-run',
    short: '-n',
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    descriptionKey: 'dryRun',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
