/**
 * Shared Product Flag Definition
 *
 * Canonical `--product` / `-p` flag used by any tool that operates on a
 * specific product. Each tool imports this via a thin `flags/product.ts`
 * wrapper so `import.meta.glob` auto-discovery picks it up.
 *
 * Uses `ProductNameSchema` (kebab-case validation) by default. Tools that
 * accept special values (e.g. `"all"`) override `schema` in their wrapper.
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
import { ProductNameSchema, StrSchema, type Str } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';

/**
 * Base `--product` / `-p` flag definition.
 *
 * Passive — always returns null (continues). Each tool's command handler
 * reads the parsed value from `ctx.options.product`.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'product',
    property: 'product',
    long: '--product',
    short: '-p',
    type: 'string',
    scope: 'tool',
    schema: ProductNameSchema,
    descriptionKey: 'product',
    order: 200,
    /**
     * Format invalid product name errors.
     *
     * @param error - The flag validation error.
     * @param strings - CLI framework locale strings (unused).
     * @returns `Result<Str>` — formatted error message.
     */
    formatError: (error: FlagValidationError, strings: BuiltCliStrings): Result<Str> => {
      const msgResult: Result<Str> = strings.errors.invalidProductName({ value: error.value });
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
