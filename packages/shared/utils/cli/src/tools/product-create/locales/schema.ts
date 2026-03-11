/**
 * Product Create Locale Schema
 *
 * Valibot schema and inferred type for product-create command strings.
 *
 * Uses `messageTemplate()` for parameterized strings — placeholders are
 * validated at locale load time, and params are validated at render time.
 *
 * @module
 */

import * as v from 'valibot';

import { messageTemplate, type BuiltLocale } from '@/locale';
import { CommandLocaleStringsSchema } from '@/cli/schemas';
import { StrSchema } from '@/schemas/common';

// =============================================================================
// Schema
// =============================================================================

/** Valibot schema for product-create locale strings. */
export const ProductCreateStringsSchema = v.intersect([
  CommandLocaleStringsSchema,
  v.looseObject({
    // Dry-run
    dryRunPrefix: messageTemplate(),
    dryRunWouldCreate: messageTemplate({ name: StrSchema }),
    dryRunSourcePath: messageTemplate({ path: StrSchema }),
    dryRunTargetPath: messageTemplate({ path: StrSchema }),

    // Progress
    creating: messageTemplate({ name: StrSchema }),
    copyingTemplate: messageTemplate(),

    // Success
    success: messageTemplate({ name: StrSchema }),
    projectPath: messageTemplate({ path: StrSchema }),
    nextStepsHeader: messageTemplate(),
    stepInstall: messageTemplate(),
    stepCd: messageTemplate({ name: StrSchema, productsDir: StrSchema }),
    stepConfig: messageTemplate(),
    hintDevProxy: messageTemplate(),
  }),
]);

// =============================================================================
// Type
// =============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type ProductCreateStrings = v.InferOutput<typeof ProductCreateStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltProductCreateStrings = BuiltLocale<typeof ProductCreateStringsSchema>;
