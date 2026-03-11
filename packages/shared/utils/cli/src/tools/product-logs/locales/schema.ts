/**
 * Product Logs Locale Schema
 *
 * Valibot schema and inferred type for product-logs command strings.
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

/** Valibot schema for product-logs locale strings. */
export const ProductLogsStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    description: LocaleStringSchema,
    flags: v.strictObject({
      product: LocaleStringSchema,
      env: LocaleStringSchema,
      service: LocaleStringSchema,
      format: LocaleStringSchema,
      statusFilter: LocaleStringSchema,
      headerFilter: LocaleStringSchema,
      methodFilter: LocaleStringSchema,
      samplingRate: LocaleStringSchema,
      search: LocaleStringSchema,
      ipFilter: LocaleStringSchema,
      versionId: LocaleStringSchema,
      wranglerDebug: LocaleStringSchema,
    }),
    header: LocaleStringSchema,
    tailingLogs: messageTemplate({ product: StrSchema, service: StrSchema, env: StrSchema }),
    noProducts: LocaleStringSchema,
    multipleProducts: LocaleStringSchema,
    availableProducts: messageTemplate({ products: StrSchema }),
    projectNotFound: messageTemplate({ name: StrSchema }),
    serviceNotFound: messageTemplate({ service: StrSchema, product: StrSchema }),
    availableServices: messageTemplate({ services: StrSchema }),
    pressCtrlC: LocaleStringSchema,
    errorWranglerFailed: messageTemplate({ code: NonNegativeIntegerSchema }),
  }),
]);

// =============================================================================
// Type
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type ProductLogsStrings = v.InferOutput<typeof ProductLogsStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltProductLogsStrings = BuiltLocale<typeof ProductLogsStringsSchema>;
