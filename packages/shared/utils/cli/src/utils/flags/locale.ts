/**
 * Locale Flag Definition
 *
 * Defines `--locale` flag with runtime validation against `config.locales`.
 * Actual locale resolution is handled by `locales.ts` — this flag definition
 * only handles parsing, default-from-config, and error formatting.
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
import { getConfig } from '@/config/loader';
import { StrSchema, type Str } from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Locale flag definition.
 *
 * - `--locale`: Override the CLI locale.
 *
 * The `schema` is `StrSchema` (any string). Actual locale validity is
 * checked later by the locale resolution system in `locales.ts`.
 * The `defaultFromConfig` pulls from `config.defaultLocale`.
 * The `formatError` callback provides locale-specific error messages
 * including the list of available locales from config.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'locale',
    property: 'locale',
    long: '--locale',
    short: null,
    type: 'string',
    scope: 'command',
    schema: StrSchema,
    defaultFromConfig: 'defaultLocale',
    descriptionKey: 'locale',
    helpType: 'string',
    order: 100,
    /**
     * Formats invalid `--locale` value errors.
     * Reads available locales from config to include in the error message.
     *
     * @param error - The flag validation error.
     * @param strings - CLI framework locale strings.
     * @returns `Result<Str>` — formatted error message.
     */
    formatError: (error: FlagValidationError, strings: BuiltCliStrings): Result<Str> => {
      const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
      if (!configResult.ok) return configResult;
      const available: Str = configResult.data.locales.join(', ');
      const msgResult: Result<Str> = strings.errors.invalidLocale({
        value: error.value,
        available,
      });
      if (!msgResult.ok) return msgResult;
      return ok(StrSchema, msgResult.data);
    },
    handle: (
      _config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => ok(NullableStandardFlagsResultSchema, null),
  },
];

export default defs;
