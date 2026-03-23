/**
 * Type-level inference for template literal schemas.
 *
 * Pure TypeScript type machinery — zero runtime code. Maps an array of
 * Valibot schemas and string literals to the resulting TypeScript
 * template literal type.
 *
 * @module
 */

import type * as v from 'valibot';

import type { TemplateLiteralPart, TemplateLiteralSchema } from '@/schemas/template-literal/types';

// =============================================================================
// Schema → Template Literal String Mapping
// =============================================================================

/**
 * Maps a single Valibot schema to its string representation
 * in a template literal position.
 *
 * Handles all supported schema types:
 * - `v.string()` → `string`
 * - `v.number()` → `` `${number}` ``
 * - `v.boolean()` → `` `${boolean}` `` (= `'true' | 'false'`)
 * - `v.bigint()` → `` `${bigint}` ``
 * - `v.null()` → `'null'`
 * - `v.undefined()` → `'undefined'`
 * - `v.literal(L)` → `` `${L}` ``
 * - `v.picklist(O)` → `` `${O[number]}` ``
 * - `v.enum(E)` → `` `${E[keyof E]}` ``
 * - `v.union([A, B])` → `SchemaToTemplateLiteralString<A> | SchemaToTemplateLiteralString<B>`
 * - `v.optional(T)` → `SchemaToTemplateLiteralString<T> | 'undefined'`
 * - `v.nullable(T)` → `SchemaToTemplateLiteralString<T> | 'null'`
 * - `v.nullish(T)` → `SchemaToTemplateLiteralString<T> | 'null' | 'undefined'`
 * - `v.pipe(S, ...)` → `SchemaToTemplateLiteralString<S>` (base schema type)
 * - `TemplateLiteralSchema` → `v.InferOutput<T>` (nested)
 *
 * **Why type alias (not schema):** Recursive conditional mapped type
 * operating on schema types at the type level. No Valibot schema
 * primitive can express type-level conditional branching.
 */
export type SchemaToTemplateLiteralString<TSchema> =
  // v.string() → string
  TSchema extends v.StringSchema<unknown>
    ? string
    : // v.number() → `${number}`
      TSchema extends v.NumberSchema<unknown>
      ? `${number}`
      : // v.boolean() → `${boolean}` (= 'true' | 'false')
        TSchema extends v.BooleanSchema<unknown>
        ? `${boolean}`
        : // v.bigint() → `${bigint}`
          TSchema extends v.BigintSchema<unknown>
          ? `${bigint}`
          : // v.null() → 'null'
            TSchema extends v.NullSchema<unknown>
            ? 'null'
            : // v.undefined() → 'undefined'
              TSchema extends v.UndefinedSchema<unknown>
              ? 'undefined'
              : // v.literal(L) → `${L}`
                TSchema extends v.LiteralSchema<infer TLiteral, unknown>
                ? TLiteral extends string | number | bigint | boolean | null | undefined
                  ? `${TLiteral}`
                  : never
                : // v.picklist([...]) → union of stringified options
                  TSchema extends v.PicklistSchema<infer TOptions, unknown>
                  ? TOptions[number] extends string | number | bigint | boolean | null | undefined
                    ? `${TOptions[number]}`
                    : never
                  : // v.enum(E) → union of stringified enum values
                    TSchema extends v.EnumSchema<infer TEnum, unknown>
                    ? TEnum[keyof TEnum] extends
                        | string
                        | number
                        | bigint
                        | boolean
                        | null
                        | undefined
                      ? `${TEnum[keyof TEnum]}`
                      : never
                    : // v.union([...]) → union of inner string representations
                      TSchema extends v.UnionSchema<infer TOptions, unknown>
                      ? TOptions extends ReadonlyArray<v.BaseSchema<
                          unknown,
                          unknown,
                          v.BaseIssue<unknown>
                        >>
                        ? SchemaToTemplateLiteralString<TOptions[number]>
                        : never
                      : // v.optional(T) → inner | 'undefined'
                        TSchema extends v.OptionalSchema<infer TWrapped, unknown>
                        ? TWrapped extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
                          ? SchemaToTemplateLiteralString<TWrapped> | 'undefined'
                          : never
                        : // v.nullable(T) → inner | 'null'
                          TSchema extends v.NullableSchema<infer TWrapped, unknown>
                          ? TWrapped extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
                            ? SchemaToTemplateLiteralString<TWrapped> | 'null'
                            : never
                          : // v.nullish(T) → inner | 'null' | 'undefined'
                            TSchema extends v.NullishSchema<infer TWrapped, unknown>
                            ? TWrapped extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
                              ? SchemaToTemplateLiteralString<TWrapped> | 'null' | 'undefined'
                              : never
                            : // v.pipe(S, ...) → use base schema's type
                              TSchema extends v.SchemaWithPipe<infer TPipe>
                              ? TPipe extends readonly [
                                  infer TBase,
                                  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- pipe items not used
                                  ...infer _TRest,
                                ]
                                ? SchemaToTemplateLiteralString<TBase>
                                : never
                              : // Nested TemplateLiteralSchema → use its inferred output
                                TSchema extends TemplateLiteralSchema<
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    infer _TParts,
                                    infer TOutput,
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    infer _TMessage
                                  >
                                ? TOutput
                                : // Fallback: if it extends BaseSchema<string, string, any>
                                  TSchema extends v.BaseSchema<
                                      string,
                                      infer TOutput,
                                      v.BaseIssue<unknown>
                                    >
                                  ? TOutput extends string
                                    ? TOutput
                                    : never
                                  : never;

// =============================================================================
// Parts → Template Literal Type
// =============================================================================

/**
 * Recursively concatenates a tuple of template literal parts into
 * the resulting TypeScript template literal type.
 *
 * String literal parts concatenate directly. Schema parts are mapped
 * through {@link SchemaToTemplateLiteralString} to produce their string
 * representation. TypeScript naturally distributes unions in template
 * literal positions, producing the Cartesian product.
 *
 * @typeParam TParts - The readonly tuple of parts to concatenate.
 *
 * **Why type alias (not schema):** Recursive conditional type that
 * operates on tuples at the type level. No runtime representation.
 *
 * @example
 * ```typescript
 * // ['user_', v.number()] → `user_${number}`
 * // [v.picklist(['a','b']), '_x'] → 'a_x' | 'b_x'
 * // [v.string(), ':', v.number()] → `${string}:${number}`
 * ```
 */
export type InferTemplateLiteralParts<TParts extends readonly TemplateLiteralPart[]> =
  TParts extends readonly []
    ? ''
    : TParts extends readonly [
          infer THead extends TemplateLiteralPart,
          ...infer TTail extends readonly TemplateLiteralPart[],
        ]
      ? THead extends string
        ? `${THead}${InferTemplateLiteralParts<TTail>}`
        : `${SchemaToTemplateLiteralString<THead>}${InferTemplateLiteralParts<TTail>}`
      : string;
