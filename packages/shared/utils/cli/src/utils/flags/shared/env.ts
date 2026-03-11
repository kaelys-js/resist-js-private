/**
 * Shared Environment Flag Definition
 *
 * Canonical `--env` flag used by any tool that targets a specific
 * environment. Each tool imports this via a thin `flags/env.ts`
 * wrapper so `import.meta.glob` auto-discovery picks it up.
 *
 * Uses `EnvironmentNameSchema` (development | staging | production | feature/branch-name)
 * by default. Tools that accept only standard environments override `schema` in their wrapper.
 *
 * @module
 */

import type { BuiltCliStrings } from '@/cli/locale/schema';
import type {
  BaseLocaleStrings,
  FlagDefinition,
  FlagValidationError,
  NullableStandardFlagsResult,
  StandardFlagsConfig,
  StandardFlagsResult,
} from '@/cli/schemas';
import { NullableStandardFlagsResultSchema } from '@/cli/schemas';
import { StrSchema, type Str } from '@/schemas/common';
import { EnvironmentNameSchema } from '@/schemas/core-config/environment';
import { ok, type Result } from '@/schemas/result/result';

/**
 * Base `--env` flag definition.
 *
 * Passive — always returns null (continues). Each tool's command handler
 * reads the parsed value from `ctx.options.env`.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'env',
    property: 'env',
    long: '--env',
    short: null,
    type: 'string',
    scope: 'tool',
    schema: EnvironmentNameSchema,
    defaultFromConfig: 'environment',
    descriptionKey: 'env',
    order: 200,
    /**
     * Format invalid environment errors.
     *
     * @param error - The flag validation error.
     * @param strings - CLI framework locale strings (unused).
     * @returns `Result<Str>` — formatted error message.
     */
    formatError: (error: FlagValidationError, strings: BuiltCliStrings): Result<Str> => {
      const msgResult: Result<Str> = strings.errors.invalidEnvironment({ value: error.value });
      if (!msgResult.ok) return msgResult;
      return ok(StrSchema, msgResult.data);
    },
    /**
     * Passive flag — checked in handler.
     *
     * @param _config - Standard flags configuration (unused).
     * @returns `Result<null>` — always continues.
     */
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
