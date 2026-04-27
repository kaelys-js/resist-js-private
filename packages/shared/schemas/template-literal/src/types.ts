/**
 * Type definitions for the template literal schema package.
 *
 * Defines the schema interface, issue type, supported part types,
 * and the centralized cast helper.
 *
 * @module
 */

import type * as v from 'valibot';

// =============================================================================
// Template Literal Issue
// =============================================================================

/**
 * Issue type for template literal validation failures.
 *
 * Produced when a string does not match the compiled regex pattern
 * derived from the template literal parts.
 *
 * @example
 * ```typescript
 * const schema = templateLiteral(['user_', v.number()]);
 * const result = v.safeParse(schema, 'bad');
 * if (!result.success) {
 *   const issue: TemplateLiteralIssue = result.issues[0];
 *   issue.kind;     // 'schema'
 *   issue.type;     // 'template_literal'
 *   issue.expected; // '`user_${number}`'
 * }
 * ```
 */
export type TemplateLiteralIssue = v.BaseIssue<string> & {
  /** Always `'schema'` — this is a schema-level issue, not a validation action. */
  readonly kind: 'schema';
  /** Always `'template_literal'` — identifies this issue's origin schema type. */
  readonly type: 'template_literal';
  /** Human-readable expected pattern, e.g., `` `user_${number}` ``. */
  readonly expected: string;
};

// =============================================================================
// Supported Part Schemas
// =============================================================================

/**
 * Schema types allowed as interpolation slots in a template literal.
 *
 * Must produce values that can be stringified in a template literal context:
 * `string | number | bigint | boolean | null | undefined`.
 *
 * Includes `v.SchemaWithPipe` to support piped schemas like
 * `v.pipe(v.string(), v.email())` — their pipe actions are introspected
 * for tighter regex generation.
 *
 * **Why type alias (not schema):** Union of Valibot generic schema interfaces
 * parameterized by `any`. No Valibot schema primitive can express this union
 * of schema-level types. Runtime validation is handled by `_schemaToRegex()`
 * which checks `schema.type` at runtime.
 */
export type TemplateLiteralPartSchema =
  | v.StringSchema<v.ErrorMessage<v.StringIssue> | undefined>
  | v.NumberSchema<v.ErrorMessage<v.NumberIssue> | undefined>
  | v.BooleanSchema<v.ErrorMessage<v.BooleanIssue> | undefined>
  | v.BigintSchema<v.ErrorMessage<v.BigintIssue> | undefined>
  | v.NullSchema<v.ErrorMessage<v.NullIssue> | undefined>
  | v.UndefinedSchema<v.ErrorMessage<v.UndefinedIssue> | undefined>
  | v.LiteralSchema<v.Literal, v.ErrorMessage<v.LiteralIssue> | undefined>
  | v.PicklistSchema<v.PicklistOptions, v.ErrorMessage<v.PicklistIssue> | undefined>
  | v.EnumSchema<v.Enum, v.ErrorMessage<v.EnumIssue> | undefined>
  | v.UnionSchema<v.UnionOptions, v.ErrorMessage<v.UnionIssue<v.BaseIssue<unknown>>> | undefined>
  | v.OptionalSchema<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>, unknown>
  | v.NullableSchema<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>, unknown>
  | v.NullishSchema<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>, unknown>
  | v.SchemaWithPipe<
      readonly [
        v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
        ...v.PipeItem<unknown, unknown, v.BaseIssue<unknown>>[],
      ]
    >
  | TemplateLiteralSchema<
      readonly TemplateLiteralPart[],
      string,
      v.ErrorMessage<TemplateLiteralIssue> | undefined
    >;

// =============================================================================
// Template Literal Part
// =============================================================================

/**
 * A single part of a template literal schema definition.
 *
 * Either a string literal (for fixed text segments) or a Valibot schema
 * (for interpolation slots).
 *
 * @example
 * ```typescript
 * // String literal part: fixed text
 * const part1: TemplateLiteralPart = 'user_';
 *
 * // Schema part: dynamic interpolation slot
 * const part2: TemplateLiteralPart = v.number();
 * ```
 */
export type TemplateLiteralPart = string | TemplateLiteralPartSchema;

// =============================================================================
// Template Literal Schema Interface
// =============================================================================

/**
 * Template literal schema interface.
 *
 * Implements Valibot's `BaseSchema` contract directly (not via `v.custom()`).
 * Carries `parts` (the template definition) and `regex` (compiled pattern)
 * as first-class introspectable properties.
 *
 * @typeParam TParts - The tuple of template literal parts.
 * @typeParam TOutput - The inferred template literal type.
 * @typeParam TMessage - Optional custom error message type.
 *
 * @example
 * ```typescript
 * const schema: TemplateLiteralSchema<
 *   readonly ['user_', v.NumberSchema<undefined>],
 *   `user_${number}`,
 *   undefined
 * > = templateLiteral(['user_', v.number()]);
 *
 * schema.type;   // 'template_literal'
 * schema.regex;  // /^user_-?\d+(?:\.\d+)?$/
 * schema.parts;  // ['user_', NumberSchema]
 * schema.expects; // '`user_${number}`'
 * ```
 */
export type TemplateLiteralSchema<
  TParts extends readonly TemplateLiteralPart[],
  TOutput extends string,
  TMessage extends v.ErrorMessage<TemplateLiteralIssue> | undefined,
> = v.BaseSchema<string, TOutput, TemplateLiteralIssue> & {
  /** Always `'template_literal'`. */
  readonly type: 'template_literal';
  /** Self-reference to the factory function. */
  readonly reference: typeof templateLiteralReference;
  /** The original parts array for introspection. */
  readonly parts: TParts;
  /** The compiled regex for runtime validation. */
  readonly regex: RegExp;
  /** Human-readable expected pattern, e.g., `` `user_${number}` ``. */
  readonly expects: string;
  /** Optional custom error message. */
  readonly message: TMessage;
};

/**
 * Placeholder reference for the `templateLiteral` factory function type.
 *
 * The actual function is defined in `template-literal.ts`. This declaration
 * exists solely to satisfy the `reference` property type in
 * {@link TemplateLiteralSchema} without creating a circular import.
 *
 * @internal
 */
declare const templateLiteralReference: (
  ...args: readonly unknown[]
) => v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

// =============================================================================
// Internal Cast Helper
// =============================================================================

/**
 * Casts a plain object to `TemplateLiteralSchema`.
 *
 * This is the **single centralized location** for the
 * `as TemplateLiteralSchema` cast in the template-literal package.
 * The `templateLiteral()` function constructs an object literal that
 * satisfies `BaseSchema`, but TypeScript cannot verify the structural
 * conformance of object literals to complex generic interfaces,
 * so a cast is unavoidable.
 *
 * @internal
 * @typeParam TParts - The parts tuple type.
 * @typeParam TOutput - The inferred output type.
 * @typeParam TMessage - The error message type.
 * @param value - The schema object to cast. Caller is responsible for
 *   ensuring all `BaseSchema` properties are correctly set.
 * @returns The value typed as `TemplateLiteralSchema`.
 */
export function _toTemplateLiteralSchema<
  TParts extends readonly TemplateLiteralPart[],
  TOutput extends string,
  TMessage extends v.ErrorMessage<TemplateLiteralIssue> | undefined,
>(
  value: v.BaseSchema<string, TOutput, TemplateLiteralIssue>,
): TemplateLiteralSchema<TParts, TOutput, TMessage> {
  return value as TemplateLiteralSchema<TParts, TOutput, TMessage>;
}
