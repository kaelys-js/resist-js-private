/**
 * Config Locale Schema
 *
 * Valibot schema and inferred type for config command strings.
 *
 * @module
 */

import * as v from 'valibot';

import { messageTemplate, type BuiltLocale } from '@/locale';
import { CommandLocaleStringsSchema } from '@/cli/schemas';
import { LocaleStringSchema, NonNegativeIntegerSchema, StrSchema } from '@/schemas/common';

// =============================================================================
// Schema
// =============================================================================

/** Valibot schema for config locale strings. */
export const ConfigStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    description: LocaleStringSchema,
    flags: v.strictObject({
      product: LocaleStringSchema,
      json: LocaleStringSchema,
      key: LocaleStringSchema,
    }),

    // Show action
    header: LocaleStringSchema,
    headerProduct: messageTemplate({ name: StrSchema }),
    configPath: messageTemplate({ path: StrSchema }),
    noProductsFound: messageTemplate({ productsDir: StrSchema }),

    // Get action
    getHeader: messageTemplate({ key: StrSchema }),
    getKeyNotFound: messageTemplate({ key: StrSchema }),
    getKeyRequired: LocaleStringSchema,
    getProductKeyNotFound: messageTemplate({ key: StrSchema, product: StrSchema }),

    // Validate action
    validateHeader: LocaleStringSchema,
    validatePassed: LocaleStringSchema,
    validateFailed: messageTemplate({ count: NonNegativeIntegerSchema }),
    validateIssue: messageTemplate({ path: StrSchema, message: StrSchema }),
    validateProductHeader: messageTemplate({ name: StrSchema }),
    validateProductPassed: messageTemplate({ name: StrSchema }),
    validateProductFailed: messageTemplate({ name: StrSchema, reason: StrSchema }),
    validateProductLoadError: messageTemplate({ name: StrSchema }),
    validateProductExportError: messageTemplate({ name: StrSchema }),
    validateAllHeader: LocaleStringSchema,
    validateSummary: messageTemplate({
      passed: NonNegativeIntegerSchema,
      failed: NonNegativeIntegerSchema,
      total: NonNegativeIntegerSchema,
    }),

    // List action
    listHeader: LocaleStringSchema,
    listKey: messageTemplate({ key: StrSchema, type: StrSchema }),
    listProductHeader: messageTemplate({ name: StrSchema }),
    listCount: messageTemplate({ count: NonNegativeIntegerSchema }),

    // Schema action
    schemaHeader: LocaleStringSchema,
    schemaKeyHeader: messageTemplate({ key: StrSchema }),
    schemaEntry: messageTemplate({ key: StrSchema, type: StrSchema, required: StrSchema }),
    schemaKeyNotFound: messageTemplate({ key: StrSchema }),

    // Path action
    pathHeader: LocaleStringSchema,
    pathGlobal: messageTemplate({ path: StrSchema }),
    pathProduct: messageTemplate({ name: StrSchema, path: StrSchema }),
    pathNotFound: LocaleStringSchema,

    // Init action
    initHeader: LocaleStringSchema,
    initCreated: messageTemplate({ path: StrSchema }),
    initAlreadyExists: messageTemplate({ path: StrSchema }),

    // Action validation
    unknownAction: messageTemplate({ action: StrSchema }),
  }),
]);

// =============================================================================
// Type
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type ConfigStrings = v.InferOutput<typeof ConfigStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltConfigStrings = BuiltLocale<typeof ConfigStringsSchema>;
