/**
 * Tests for the template literal schema.
 *
 * Covers runtime validation, type-level inference, regex generation,
 * pipe introspection, error messages, and integration with
 * `v.record()`, `v.parse()`, `v.safeParse()`, and `v.is()`.
 *
 * @module
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import * as v from 'valibot';

import { templateLiteral } from '@/schemas/template-literal/template-literal';
import type { TemplateLiteralPart } from '@/schemas/template-literal/types';

/**
 * Local equivalent of `v.InferOutput` that accepts TemplateLiteralSchema
 * even though its third generic argument is `TemplateLiteralIssue`
 * rather than `v.BaseIssue<unknown>` and therefore fails
 * `v.InferOutput`'s `TSchema extends v.BaseSchema<unknown, unknown,
 * v.BaseIssue<unknown>>` generic constraint under tsgo. Inference
 * walks the TemplateLiteralSchema generic slots first, then falls
 * back to a widened BaseSchema match.
 */
type InferOutputLoose<TSchema> = TSchema extends {
  readonly '~types'?: { readonly output: infer Out } | undefined;
}
  ? Out
  : never;

/**
 * Cast safe: tsgo cannot verify TemplateLiteralSchema conforms to BaseSchema generics.
 *
 * @param s - The unknown value to cast.
 * @returns The same value typed as a string-input/string-output BaseSchema.
 */
function asSchema(s: unknown): v.BaseSchema<string, string, v.BaseIssue<unknown>> {
  return s as v.BaseSchema<string, string, v.BaseIssue<unknown>>;
}

/**
 * Cast safe: tsgo cannot verify SchemaWithPipe/TemplateLiteralSchema conforms to TemplateLiteralPart.
 *
 * @param parts - The unknown parts array to cast.
 * @returns The same array typed as a readonly tuple of TemplateLiteralPart.
 */
function asParts(parts: readonly unknown[]): readonly TemplateLiteralPart[] {
  return parts as readonly TemplateLiteralPart[];
}

// =============================================================================
// Runtime Validation
// =============================================================================

describe('templateLiteral() runtime validation', () => {
  it('validates a plain string literal', () => {
    const result = templateLiteral(['hello']);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'hello')).toBe(true);
    expect(v.is(asSchema(result.data), 'world')).toBe(false);
  });

  it('validates string interpolation slot', () => {
    const result = templateLiteral(['user_', v.string()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'user_alice')).toBe(true);
    expect(v.is(asSchema(result.data), 'user_')).toBe(true);
    expect(v.is(asSchema(result.data), 'admin_alice')).toBe(false);
  });

  it('validates number interpolation slot', () => {
    const result = templateLiteral(['id_', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'id_42')).toBe(true);
    expect(v.is(asSchema(result.data), 'id_3.14')).toBe(true);
    expect(v.is(asSchema(result.data), 'id_-1')).toBe(true);
    expect(v.is(asSchema(result.data), 'id_abc')).toBe(false);
  });

  it('validates boolean interpolation slot', () => {
    const result = templateLiteral(['is_', v.boolean()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'is_true')).toBe(true);
    expect(v.is(asSchema(result.data), 'is_false')).toBe(true);
    expect(v.is(asSchema(result.data), 'is_maybe')).toBe(false);
  });

  it('validates literal interpolation slot', () => {
    const result = templateLiteral([v.literal('GET'), ' /api/', v.string()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'GET /api/users')).toBe(true);
    expect(v.is(asSchema(result.data), 'POST /api/users')).toBe(false);
  });

  it('validates picklist interpolation slot', () => {
    const result = templateLiteral([
      v.picklist(['GET', 'POST', 'PUT', 'DELETE']),
      ' /api/',
      v.string(),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'GET /api/users')).toBe(true);
    expect(v.is(asSchema(result.data), 'POST /api/orders')).toBe(true);
    expect(v.is(asSchema(result.data), 'PATCH /api/users')).toBe(false);
  });

  it('validates union interpolation slot', () => {
    const result = templateLiteral(['value_', v.union([v.literal('a'), v.literal('b')])]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'value_a')).toBe(true);
    expect(v.is(asSchema(result.data), 'value_b')).toBe(true);
    expect(v.is(asSchema(result.data), 'value_c')).toBe(false);
  });

  it('validates nullable interpolation slot', () => {
    const result = templateLiteral(['val_', v.nullable(v.number())]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'val_42')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_null')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_abc')).toBe(false);
  });

  it('validates multiple interpolation slots', () => {
    const result = templateLiteral([v.string(), ':', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'host:8080')).toBe(true);
    expect(v.is(asSchema(result.data), ':42')).toBe(true);
    expect(v.is(asSchema(result.data), 'host:abc')).toBe(false);
  });

  it('rejects non-string input', () => {
    const result = templateLiteral(['hello']);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 42)).toBe(false);
    expect(v.is(asSchema(result.data), null)).toBe(false);
    expect(v.is(asSchema(result.data), undefined)).toBe(false);
  });

  it('escapes regex special characters in string parts', () => {
    const result = templateLiteral(['price: $', v.number(), '.00']);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'price: $42.00')).toBe(true);
    expect(v.is(asSchema(result.data), 'price: X42Y00')).toBe(false);
  });

  it('works with v.parse', () => {
    const result = templateLiteral(['user_', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.parse(asSchema(result.data), 'user_42')).toBe('user_42');
    expect(() => v.parse(asSchema(result.data), 'invalid')).toThrow();
  });

  it('works as a v.record() key schema', () => {
    const keyResult = templateLiteral(['env_', v.string()]);
    expect(keyResult.ok).toBe(true);
    if (!keyResult.ok) {
      return;
    }

    const schema = v.record(asSchema(keyResult.data), v.string());
    const parseResult = v.safeParse(schema, { env_NODE_ENV: 'production' });
    expect(parseResult.success).toBe(true);
  });

  it('produces correct error issue', () => {
    const result = templateLiteral(['id_', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const parseResult = v.safeParse(asSchema(result.data), 'id_abc');
    expect(parseResult.success).toBe(false);
    if (parseResult.success) {
      return;
    }
    expect(parseResult.issues[0]?.kind).toBe('schema');
    expect(parseResult.issues[0]?.type).toBe('template_literal');
  });

  it('supports custom error messages', () => {
    const result = templateLiteral(['id_', v.number()], 'Must be a valid ID');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const parseResult = v.safeParse(asSchema(result.data), 'bad');
    expect(parseResult.success).toBe(false);
    if (parseResult.success) {
      return;
    }
    expect(parseResult.issues[0]?.message).toBe('Must be a valid ID');
  });

  it('validates nested template literals', () => {
    const innerResult = templateLiteral(['v', v.number()]);
    expect(innerResult.ok).toBe(true);
    if (!innerResult.ok) {
      return;
    }

    const outerResult = templateLiteral(asParts(['app_', innerResult.data, '_release']));
    expect(outerResult.ok).toBe(true);
    if (!outerResult.ok) {
      return;
    }
    expect(v.is(asSchema(outerResult.data), 'app_v42_release')).toBe(true);
    expect(v.is(asSchema(outerResult.data), 'app_vABC_release')).toBe(false);
  });
});

// =============================================================================
// schemaToRegex — Additional Schema Types
// =============================================================================

describe('schemaToRegex — additional schema types', () => {
  it('validates bigint interpolation slot', () => {
    const result = templateLiteral(asParts(['big_', v.bigint()]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'big_42')).toBe(true);
    expect(v.is(asSchema(result.data), 'big_-7')).toBe(true);
    expect(v.is(asSchema(result.data), 'big_0')).toBe(true);
    expect(v.is(asSchema(result.data), 'big_3.14')).toBe(false);
    expect(v.is(asSchema(result.data), 'big_abc')).toBe(false);
    expect(result.data.regex.source).toContain(String.raw`-?\d+`);
  });

  it('validates null interpolation slot', () => {
    const result = templateLiteral(asParts(['val_', v.null_()]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'val_null')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_undefined')).toBe(false);
    expect(v.is(asSchema(result.data), 'val_')).toBe(false);
  });

  it('validates undefined interpolation slot', () => {
    const result = templateLiteral(asParts(['val_', v.undefined_()]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'val_undefined')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_null')).toBe(false);
    expect(v.is(asSchema(result.data), 'val_')).toBe(false);
  });

  it('validates enum interpolation slot', () => {
    const MyEnum = { Active: 'active', Inactive: 'inactive' } as const;
    const result = templateLiteral(asParts(['status_', v.enum_(MyEnum)]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'status_active')).toBe(true);
    expect(v.is(asSchema(result.data), 'status_inactive')).toBe(true);
    expect(v.is(asSchema(result.data), 'status_pending')).toBe(false);
  });

  it('validates optional interpolation slot', () => {
    const result = templateLiteral(asParts(['opt_', v.optional(v.number())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'opt_42')).toBe(true);
    expect(v.is(asSchema(result.data), 'opt_-3.14')).toBe(true);
    expect(v.is(asSchema(result.data), 'opt_undefined')).toBe(true);
    expect(v.is(asSchema(result.data), 'opt_null')).toBe(false);
    expect(v.is(asSchema(result.data), 'opt_abc')).toBe(false);
  });

  it('validates nullish interpolation slot', () => {
    const result = templateLiteral(asParts(['ns_', v.nullish(v.number())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'ns_42')).toBe(true);
    expect(v.is(asSchema(result.data), 'ns_null')).toBe(true);
    expect(v.is(asSchema(result.data), 'ns_undefined')).toBe(true);
    expect(v.is(asSchema(result.data), 'ns_abc')).toBe(false);
  });
});

// =============================================================================
// Pipe Introspection
// =============================================================================

describe('templateLiteral() pipe introspection', () => {
  it('uses UUID regex for v.pipe(v.string(), v.uuid())', () => {
    const result = templateLiteral(asParts(['id_', v.pipe(v.string(), v.uuid())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'id_550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(v.is(asSchema(result.data), 'id_not-a-uuid')).toBe(false);
  });

  it('uses integer regex for v.pipe(v.number(), v.integer())', () => {
    const result = templateLiteral(asParts(['n_', v.pipe(v.number(), v.integer())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'n_42')).toBe(true);
    expect(v.is(asSchema(result.data), 'n_3.14')).toBe(false);
  });

  it('uses length constraints for v.pipe(v.string(), v.minLength(3), v.maxLength(10))', () => {
    const result = templateLiteral(
      asParts(['code_', v.pipe(v.string(), v.minLength(3), v.maxLength(10))]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'code_abc')).toBe(true);
    expect(v.is(asSchema(result.data), 'code_ab')).toBe(false);
    expect(v.is(asSchema(result.data), 'code_abcdefghijk')).toBe(false);
  });

  it('uses user-provided regex for v.pipe(v.string(), v.regex(...))', () => {
    const result = templateLiteral(asParts(['tag_', v.pipe(v.string(), v.regex(/^[A-Z]+$/))]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'tag_ABC')).toBe(true);
    expect(v.is(asSchema(result.data), 'tag_abc')).toBe(false);
  });

  it('uses email regex for v.pipe(v.string(), v.email())', () => {
    const result = templateLiteral(asParts(['user_', v.pipe(v.string(), v.email())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'user_test@example.com')).toBe(true);
    expect(v.is(asSchema(result.data), 'user_notanemail')).toBe(false);
  });

  it('uses ULID regex for v.pipe(v.string(), v.ulid())', () => {
    const result = templateLiteral(asParts(['id_', v.pipe(v.string(), v.ulid())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'id_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true);
    expect(v.is(asSchema(result.data), 'id_not-a-ulid')).toBe(false);
  });

  it('uses CUID2 regex for v.pipe(v.string(), v.cuid2())', () => {
    const result = templateLiteral(asParts(['id_', v.pipe(v.string(), v.cuid2())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'id_clh3am8jg0000lf08e8s2hqzq')).toBe(true);
    expect(v.is(asSchema(result.data), 'id_UPPERCASE')).toBe(false);
  });

  it('uses nanoid regex for v.pipe(v.string(), v.nanoid())', () => {
    const result = templateLiteral(asParts(['id_', v.pipe(v.string(), v.nanoid())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'id_V1StGXR8_Z5jdHi6B-myT')).toBe(true);
    expect(v.is(asSchema(result.data), 'id_has spaces!')).toBe(false);
  });

  it('uses IPv4 regex for v.pipe(v.string(), v.ipv4())', () => {
    const result = templateLiteral(asParts(['ip_', v.pipe(v.string(), v.ipv4())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'ip_192.168.1.1')).toBe(true);
    expect(v.is(asSchema(result.data), 'ip_10.0.0.1')).toBe(true);
    expect(v.is(asSchema(result.data), 'ip_999.999.999.999')).toBe(false);
  });

  it('uses hexadecimal regex for v.pipe(v.string(), v.hexadecimal())', () => {
    const result = templateLiteral(asParts(['hex_', v.pipe(v.string(), v.hexadecimal())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'hex_deadBEEF')).toBe(true);
    expect(v.is(asSchema(result.data), 'hex_0123456789abcdefABCDEF')).toBe(true);
    expect(v.is(asSchema(result.data), 'hex_xyz')).toBe(false);
  });

  it('uses octal regex for v.pipe(v.string(), v.octal())', () => {
    const result = templateLiteral(asParts(['oct_', v.pipe(v.string(), v.octal())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'oct_01234567')).toBe(true);
    expect(v.is(asSchema(result.data), 'oct_089')).toBe(false);
  });

  it('uses decimal regex for v.pipe(v.string(), v.decimal())', () => {
    const result = templateLiteral(asParts(['dec_', v.pipe(v.string(), v.decimal())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'dec_42')).toBe(true);
    expect(v.is(asSchema(result.data), 'dec_-3.14')).toBe(true);
    expect(v.is(asSchema(result.data), 'dec_abc')).toBe(false);
  });

  it('uses slug regex for v.pipe(v.string(), v.slug())', () => {
    const result = templateLiteral(asParts(['slug_', v.pipe(v.string(), v.slug())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'slug_my-cool-slug')).toBe(true);
    expect(v.is(asSchema(result.data), 'slug_simple')).toBe(true);
    expect(v.is(asSchema(result.data), 'slug_My Slug!')).toBe(false);
  });

  it('uses starts_with pattern for v.pipe(v.string(), v.startsWith(...))', () => {
    const result = templateLiteral(asParts(['key_', v.pipe(v.string(), v.startsWith('prefix_'))]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'key_prefix_hello')).toBe(true);
    expect(v.is(asSchema(result.data), 'key_prefix_')).toBe(true);
    expect(v.is(asSchema(result.data), 'key_hello_prefix')).toBe(false);
  });

  it('uses ends_with pattern for v.pipe(v.string(), v.endsWith(...))', () => {
    const result = templateLiteral(asParts(['key_', v.pipe(v.string(), v.endsWith('_suffix'))]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'key_hello_suffix')).toBe(true);
    expect(v.is(asSchema(result.data), 'key__suffix')).toBe(true);
    expect(v.is(asSchema(result.data), 'key_suffix_hello')).toBe(false);
  });
});

// =============================================================================
// Type-Level Inference
// =============================================================================

describe('templateLiteral() type inference', () => {
  it('infers plain string literal', () => {
    const result = templateLiteral(['hello']);

    if (!result.ok) {
      return;
    }
    expectTypeOf<InferOutputLoose<typeof result.data>>().toEqualTypeOf<'hello'>();
  });

  it('infers string interpolation', () => {
    const result = templateLiteral(['user_', v.string()]);

    if (!result.ok) {
      return;
    }
    expectTypeOf<InferOutputLoose<typeof result.data>>().toEqualTypeOf<`user_${string}`>();
  });

  it('infers number interpolation', () => {
    const result = templateLiteral(['id_', v.number()]);

    if (!result.ok) {
      return;
    }
    expectTypeOf<InferOutputLoose<typeof result.data>>().toEqualTypeOf<`id_${number}`>();
  });

  it('infers boolean interpolation', () => {
    const result = templateLiteral(['is_', v.boolean()]);

    if (!result.ok) {
      return;
    }
    expectTypeOf<InferOutputLoose<typeof result.data>>().toEqualTypeOf<`is_${boolean}`>();
  });

  it('infers literal interpolation', () => {
    const result = templateLiteral([v.literal('GET'), ' /api']);

    if (!result.ok) {
      return;
    }
    expectTypeOf<InferOutputLoose<typeof result.data>>().toEqualTypeOf<'GET /api'>();
  });

  it('infers picklist distribution', () => {
    const result = templateLiteral([v.picklist(['a', 'b']), '_suffix']);

    if (!result.ok) {
      return;
    }
    expectTypeOf<InferOutputLoose<typeof result.data>>().toEqualTypeOf<'a_suffix' | 'b_suffix'>();
  });

  it('infers multiple slots', () => {
    const result = templateLiteral([v.string(), ':', v.number()]);

    if (!result.ok) {
      return;
    }
    expectTypeOf<InferOutputLoose<typeof result.data>>().toEqualTypeOf<`${string}:${number}`>();
  });
});

// =============================================================================
// Regex Generation
// =============================================================================

describe('templateLiteral() regex generation', () => {
  it('generates correct regex for string part only', () => {
    const result = templateLiteral(['hello']);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.regex.source).toBe('^hello$');
  });

  it('escapes regex special characters', () => {
    const result = templateLiteral(['$100.00']);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.regex.source).toBe(String.raw`^\$100\.00$`);
  });

  it('generates correct regex for number slot', () => {
    const result = templateLiteral(['n:', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.regex.source).toBe(String.raw`^n:-?\d+(?:\.\d+)?$`);
  });

  it('generates correct regex for boolean slot', () => {
    const result = templateLiteral(['b:', v.boolean()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.regex.source).toBe('^b:(?:true|false)$');
  });

  it('generates correct regex for picklist slot', () => {
    const result = templateLiteral([v.picklist(['a', 'b', 'c'])]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.regex.source).toBe('^(?:a|b|c)$');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('templateLiteral() edge cases', () => {
  it('uses exact length quantifier for v.pipe(v.string(), v.length(5))', () => {
    const result = templateLiteral(asParts(['code_', v.pipe(v.string(), v.length(5))]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'code_abcde')).toBe(true);
    expect(v.is(asSchema(result.data), 'code_abcd')).toBe(false);
    expect(v.is(asSchema(result.data), 'code_abcdef')).toBe(false);
    expect(result.data.regex.source).toContain('{5,5}');
  });

  it('uses minLength-only quantifier for v.pipe(v.string(), v.minLength(3))', () => {
    const result = templateLiteral(asParts(['val_', v.pipe(v.string(), v.minLength(3))]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'val_abc')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_abcdef')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_ab')).toBe(false);
    expect(result.data.regex.source).toContain('{3,}');
  });

  it('uses maxLength-only quantifier for v.pipe(v.string(), v.maxLength(5))', () => {
    const result = templateLiteral(asParts(['val_', v.pipe(v.string(), v.maxLength(5))]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'val_abc')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_abcdef')).toBe(false);
    expect(result.data.regex.source).toContain('{0,5}');
  });

  it('hasUserRegex suppresses length constraints', () => {
    const result = templateLiteral(
      asParts(['tag_', v.pipe(v.string(), v.regex(/^[A-Z]+$/), v.minLength(2))]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // regex takes precedence — length constraint NOT applied
    // Single uppercase letter matches regex but would fail minLength(2)
    expect(v.is(asSchema(result.data), 'tag_A')).toBe(true);
    expect(v.is(asSchema(result.data), 'tag_AB')).toBe(true);
    // Does NOT contain length quantifier — regex overrides
    expect(result.data.regex.source).not.toContain('{2,}');
  });

  it('handles SchemaWithPipe in default branch of schemaToRegex', () => {
    // v.pipe(v.string(), v.trim()) — trim is not a recognized action type,
    // hits default case in schemaToRegex which checks for pipe property
    const result = templateLiteral(asParts(['val_', v.pipe(v.string(), v.trim())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // Should still work — falls back to string pattern via pipe introspection
    expect(v.is(asSchema(result.data), 'val_hello')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_')).toBe(true);
  });

  it('buildExpects falls back to unknown for schema without expects property', () => {
    // Create a minimal schema-like object with no expects property
    const fakeSchema = { type: 'custom', kind: 'schema', async: false } as unknown;
    const result = templateLiteral(asParts(['val_', fakeSchema]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.expects).toContain('unknown');
  });

  it('handles number pipe with integer action', () => {
    // Test the number pipe path (not string) — covers schemaToRegex number+pipe branch
    const result = templateLiteral(asParts(['n_', v.pipe(v.number(), v.integer())]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'n_42')).toBe(true);
    expect(v.is(asSchema(result.data), 'n_3.14')).toBe(false);
  });

  it('handles number without pipe', () => {
    const result = templateLiteral(['n_', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(v.is(asSchema(result.data), 'n_42')).toBe(true);
    expect(v.is(asSchema(result.data), 'n_3.14')).toBe(true);
  });

  it('schemaToRegex default fallback returns string pattern for unknown type', () => {
    // A schema with no pipe and unknown type falls through to STRING_PATTERN
    const fakeSchema = {
      type: 'custom_unknown',
      kind: 'schema',
      async: false,
    } as unknown;
    const result = templateLiteral(asParts(['val_', fakeSchema]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // Falls back to [\s\S]* — accepts anything
    expect(v.is(asSchema(result.data), 'val_anything')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_')).toBe(true);
  });

  it('schemaToRegex default branch handles SchemaWithPipe with pipe property', () => {
    // A schema with an unknown type but a pipe property — hits default branch pipe introspection
    const fakePipedSchema = {
      type: 'custom_piped',
      kind: 'schema',
      async: false,
      pipe: [
        { type: 'string', kind: 'schema', async: false, expects: 'string' },
        { type: 'email' },
      ],
    } as unknown;
    const result = templateLiteral(asParts(['val_', fakePipedSchema]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // Base schema is string, pipe action is email — email regex should be applied
    expect(v.is(asSchema(result.data), 'val_test@example.com')).toBe(true);
  });

  it('schemaToRegex default branch handles SchemaWithPipe with empty pipe', () => {
    // SchemaWithPipe with empty pipe array — falls through to STRING_PATTERN
    const fakePipedSchema = {
      type: 'custom_piped',
      kind: 'schema',
      async: false,
      pipe: [],
    } as unknown;
    const result = templateLiteral(asParts(['val_', fakePipedSchema]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // Falls back to STRING_PATTERN
    expect(v.is(asSchema(result.data), 'val_anything')).toBe(true);
  });

  it('pipe introspection skips non-object and null actions', () => {
    // Fake piped schema with non-object actions in the pipe — tests the continue branch
    const fakePipedSchema = {
      type: 'custom_piped',
      kind: 'schema',
      async: false,
      pipe: [
        { type: 'string', kind: 'schema', async: false, expects: 'string' },
        null,
        42,
        'not-an-object',
        { noTypeProperty: true },
        { type: 'uuid' },
      ],
    } as unknown;
    const result = templateLiteral(asParts(['val_', fakePipedSchema]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // Should still work — skips bad actions, processes uuid
    expect(v.is(asSchema(result.data), 'val_550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(v.is(asSchema(result.data), 'val_not-a-uuid')).toBe(false);
  });
});
