/**
 * Template literal schema for Valibot.
 *
 * Provides `templateLiteral()` — a schema that validates strings against
 * a pattern defined by a sequence of string literal segments and Valibot
 * schema interpolation slots. Analogous to TypeScript's template literal
 * types at the value level.
 *
 * Implements `v.BaseSchema` directly (not via `v.custom()`) for:
 * - Custom `type: 'template_literal'` discriminant
 * - Custom `~run` method with regex-based validation
 * - `parts` and `regex` as introspectable schema properties
 * - Proper `TemplateLiteralIssue` error type
 * - Full `v.record()` key compatibility
 *
 * @module
 */

import * as v from 'valibot';

import type { Str } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';

import type { InferTemplateLiteralParts } from '@/schemas/template-literal/infer';
import { buildRegex, buildExpects } from '@/schemas/template-literal/regex';
import {
  _toTemplateLiteralSchema,
  type TemplateLiteralIssue,
  type TemplateLiteralPart,
  type TemplateLiteralSchema,
} from '@/schemas/template-literal/types';

// =============================================================================
// Template Literal Schema Factory
// =============================================================================

/**
 * Creates a template literal schema.
 *
 * Validates that a string matches a pattern defined by a sequence of
 * string literal segments and Valibot schema interpolation slots.
 * The TypeScript type is automatically inferred from the parts array —
 * no manual type annotation required.
 *
 * @typeParam TParts - The tuple of template literal parts. Inferred from
 *   the `parts` argument — do not specify manually.
 * @param parts - An array of string literals and Valibot schemas.
 *   String elements represent fixed text. Schema elements represent
 *   dynamic interpolation slots (e.g., `v.string()`, `v.number()`).
 * @param message - Optional custom error message.
 * @returns Result containing a `TemplateLiteralSchema` that validates strings
 *   against the compiled regex pattern.
 *
 * @example
 * ```typescript
 * // Basic: matches "user_123", "user_456"
 * const userIdResult = templateLiteral(['user_', v.number()]);
 * if (!userIdResult.ok) return userIdResult;
 * const UserIdSchema = userIdResult.data;
 * type UserId = v.InferOutput<typeof UserIdSchema>;
 * // => `user_${number}`
 *
 * // Picklist: distributes → `${number}px` | `${number}em`
 * const cssResult = templateLiteral([v.number(), v.picklist(['px', 'em'])]);
 * if (!cssResult.ok) return cssResult;
 * const CssSchema = cssResult.data;
 *
 * // With pipe introspection: uses UUID regex, not .*
 * const uuidPrefixResult = templateLiteral([
 *   'id_',
 *   v.pipe(v.string(), v.uuid()),
 * ]);
 *
 * // As a v.record() key
 * if (uuidPrefixResult.ok) {
 *   const ConfigSchema = v.record(uuidPrefixResult.data, v.string());
 * }
 *
 * // Runtime validation
 * if (userIdResult.ok) {
 *   v.parse(UserIdSchema, 'user_42');  // ✅ returns 'user_42'
 *   v.parse(UserIdSchema, 'nope');     // ❌ throws ValiError
 *   v.is(UserIdSchema, 'user_42');     // true (type guard)
 * }
 * ```
 */
export function templateLiteral<const TParts extends readonly TemplateLiteralPart[]>(
  parts: TParts,
  message?: v.ErrorMessage<TemplateLiteralIssue>,
): Result<TemplateLiteralSchema<TParts, InferTemplateLiteralParts<TParts>, typeof message>> {
  const regexResult: Result<RegExp> = buildRegex(parts);
  if (!regexResult.ok) {
    return regexResult;
  }

  const expectsResult: Result<Str> = buildExpects(parts);
  if (!expectsResult.ok) {
    return expectsResult;
  }

  const regex: RegExp = regexResult.data;
  const expects: Str = expectsResult.data;

  type TOutput = InferTemplateLiteralParts<TParts>;
  type TMessage = typeof message;

  const schema: v.BaseSchema<string, TOutput, TemplateLiteralIssue> = {
    kind: 'schema' as const,
    type: 'template_literal' as const,
    reference: templateLiteral as (
      ...args: readonly unknown[]
    ) => v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    expects,
    async: false as const,
    parts,
    regex,
    message,

    get '~standard'(): v.StandardProps<string, TOutput> {
      return v._getStandardProps(
        this as unknown as v.BaseSchema<string, TOutput, TemplateLiteralIssue>,
      );
    },

    '~run'(
      dataset: v.UnknownDataset,
      config: v.Config<v.BaseIssue<unknown>>,
    ): v.OutputDataset<TOutput, TemplateLiteralIssue> {
      if (typeof dataset.value === 'string' && regex.test(dataset.value)) {
        // Validation passed — mark as typed
        (dataset as { typed: boolean }).typed = true;
      } else {
        // Validation failed — add issue
        v._addIssue(
          this as unknown as v.BaseSchema<string, TOutput, TemplateLiteralIssue> & {
            expects: string;
            message: v.ErrorMessage<TemplateLiteralIssue> | undefined;
          },
          'type',
          dataset,
          config,
        );
      }
      return dataset as v.OutputDataset<TOutput, TemplateLiteralIssue>;
    },
  } as v.BaseSchema<string, TOutput, TemplateLiteralIssue>;

  return ok(
    v.custom<TemplateLiteralSchema<TParts, TOutput, TMessage>>(
      (val: unknown): boolean =>
        typeof val === 'object' &&
        val !== null &&
        'kind' in val &&
        (val as { kind: unknown }).kind === 'schema' &&
        'type' in val &&
        (val as { type: unknown }).type === 'template_literal',
    ),
    _toTemplateLiteralSchema<TParts, TOutput, TMessage>(schema),
  );
}
