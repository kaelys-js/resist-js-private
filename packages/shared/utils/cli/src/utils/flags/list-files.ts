/**
 * List Files Flag Definition
 *
 * Defines `--list-files` / `-l` flag for listing files without processing.
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
 * List files flag definition.
 *
 * - `--list-files` / `-l`: List files without processing.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'list-files',
    property: 'listFiles',
    long: '--list-files',
    short: '-l',
    type: 'boolean',
    scope: 'runner',
    schema: BoolSchema,
    descriptionKey: 'listFiles',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
