/**
 * CWD Flag Definition & Validation
 *
 * Defines `--cwd` flag with an active handler that validates the directory
 * exists and aborts with exit code 2 on failure.
 *
 * Also exports `validateCwd` for use by other modules.
 *
 * All functions return `Result<T>`. No function throws.
 *
 * @module
 */

import {
  ExitCodeValue,
  NullableStandardFlagsResultSchema,
  type BaseLocaleStrings,
  type FlagDefinition,
  type NullableStandardFlagsResult,
  type StandardFlagsConfig,
  type StandardFlagsResult,
} from '@/cli/schemas';
import {
  PathSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type Path,
  type Str,
  type Void,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok } from '@/schemas/result/result';
import { isDirectory } from '@/utils/core/fs';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates that the `--cwd` directory exists and is a directory.
 *
 * Pure validation — returns error Results with plain messages.
 * The caller handles locale-specific formatting.
 *
 * @param cwdPath - The directory path to validate.
 * @returns `Result<Void>` — success, or an error if the path is invalid.
 */
export function validateCwd(cwdPath: Str): Result<Void> {
  const pathResult: Result<Path> = safeParse(PathSchema, cwdPath);
  if (!pathResult.ok) return pathResult;

  const dirResult: Result<Bool> = isDirectory(pathResult.data);
  if (!dirResult.ok) {
    return err(ERRORS.IO.STAT_FAILED, {
      meta: { path: pathResult.data },
    });
  }
  if (!dirResult.data) {
    return err(ERRORS.CLI.INVALID_FLAG, {
      meta: { flag: '--cwd', value: pathResult.data },
    });
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * CWD flag definition.
 *
 * - `--cwd`: Override working directory.
 *
 * Handler (order 50) validates the directory and aborts with exit code 2 on failure.
 * Returns `null` (continue) if `--cwd` was not provided or if validation passes.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'cwd',
    property: 'cwd',
    long: '--cwd',
    short: null,
    type: 'string',
    scope: 'command',
    schema: StrSchema,
    descriptionKey: 'cwd',
    helpType: 'string',
    order: 50,
    /**
     * Validates the `--cwd` directory exists.
     * Aborts with exit code 2 (INVALID_USAGE) if validation fails.
     *
     * @param config - Standard flags configuration.
     * @returns `Result<NullableStandardFlagsResult>` — exit(2) on failure, null to continue.
     */
    handle: (
      config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => {
      if (!config.flags.cwd) return ok(NullableStandardFlagsResultSchema, null);

      const cwdValidation: Result<Void> = validateCwd(config.flags.cwd);
      if (!cwdValidation.ok) {
        return err(ERRORS.CLI.INVALID_FLAG, {
          cause: cwdValidation.error,
          meta: { exitCode: ExitCodeValue.INVALID_USAGE },
        });
      }

      return ok(NullableStandardFlagsResultSchema, null);
    },
  },
];

export default defs;
