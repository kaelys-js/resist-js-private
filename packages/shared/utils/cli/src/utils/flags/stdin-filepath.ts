/**
 * Stdin Filepath Flag Definition
 *
 * Defines `--stdin-filepath` flag for specifying filepath for stdin content
 * (used for extension detection).
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
import { StrSchema } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Stdin filepath flag definition.
 *
 * - `--stdin-filepath`: Filepath for stdin content (for extension detection).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'stdin-filepath',
    property: 'stdinFilepath',
    long: '--stdin-filepath',
    short: null,
    type: 'string',
    scope: 'runner',
    schema: StrSchema,
    descriptionKey: 'stdinFilepath',
    helpType: 'string',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
