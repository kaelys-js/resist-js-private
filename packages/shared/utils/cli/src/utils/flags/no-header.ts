/**
 * No Header Flag Definition
 *
 * Defines `--no-header` flag for hiding the header banner.
 * Has a `suppressHeader` callback.
 *
 * @module
 */

import type {
  BaseLocaleStrings,
  ExtendedFlags,
  FlagDefinition,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
} from '@/cli/schemas';
import { NullableStandardFlagsResultSchema } from '@/cli/schemas';
import { BoolSchema, type Bool } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * No header flag definition.
 *
 * - `--no-header`: Hide the header banner.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'no-header',
    property: 'noHeader',
    long: '--no-header',
    short: null,
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    descriptionKey: 'noHeader',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
    /** Suppress header when `--no-header` is set. */
    suppressHeader: (flags: DeepReadonly<ExtendedFlags>): Bool => flags.noHeader,
  },
];

export default defs;
