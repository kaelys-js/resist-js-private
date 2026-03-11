/**
 * Concurrency Flag Definition
 *
 * Defines `--concurrency` / `-c` flag for controlling max parallel tasks.
 * Uses `PositiveIntegerSchema` for validation. Default: CPU cores.
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
import { PositiveIntegerSchema } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import { DEFAULT_CONCURRENCY } from '@/utils/core/process';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Concurrency flag definition.
 *
 * - `--concurrency` / `-c`: Max parallel tasks (default: CPU cores).
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'concurrency',
    property: 'concurrency',
    long: '--concurrency',
    short: '-c',
    type: 'number',
    scope: 'runner',
    schema: PositiveIntegerSchema,
    default: DEFAULT_CONCURRENCY,
    descriptionKey: 'concurrency',
    helpType: 'number',
    order: 100,
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
