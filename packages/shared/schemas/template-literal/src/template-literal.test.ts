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

// =============================================================================
// Runtime Validation
// =============================================================================

describe('templateLiteral() runtime validation', () => {
  it('validates a plain string literal', () => {
    const result = templateLiteral(['hello']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'hello')).toBe(true);
    expect(v.is(result.data, 'world')).toBe(false);
  });

  it('validates string interpolation slot', () => {
    const result = templateLiteral(['user_', v.string()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'user_alice')).toBe(true);
    expect(v.is(result.data, 'user_')).toBe(true);
    expect(v.is(result.data, 'admin_alice')).toBe(false);
  });

  it('validates number interpolation slot', () => {
    const result = templateLiteral(['id_', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'id_42')).toBe(true);
    expect(v.is(result.data, 'id_3.14')).toBe(true);
    expect(v.is(result.data, 'id_-1')).toBe(true);
    expect(v.is(result.data, 'id_abc')).toBe(false);
  });

  it('validates boolean interpolation slot', () => {
    const result = templateLiteral(['is_', v.boolean()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'is_true')).toBe(true);
    expect(v.is(result.data, 'is_false')).toBe(true);
    expect(v.is(result.data, 'is_maybe')).toBe(false);
  });

  it('validates literal interpolation slot', () => {
    const result = templateLiteral([v.literal('GET'), ' /api/', v.string()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'GET /api/users')).toBe(true);
    expect(v.is(result.data, 'POST /api/users')).toBe(false);
  });

  it('validates picklist interpolation slot', () => {
    const result = templateLiteral([
      v.picklist(['GET', 'POST', 'PUT', 'DELETE']),
      ' /api/',
      v.string(),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'GET /api/users')).toBe(true);
    expect(v.is(result.data, 'POST /api/orders')).toBe(true);
    expect(v.is(result.data, 'PATCH /api/users')).toBe(false);
  });

  it('validates union interpolation slot', () => {
    const result = templateLiteral(['value_', v.union([v.literal('a'), v.literal('b')])]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'value_a')).toBe(true);
    expect(v.is(result.data, 'value_b')).toBe(true);
    expect(v.is(result.data, 'value_c')).toBe(false);
  });

  it('validates nullable interpolation slot', () => {
    const result = templateLiteral(['val_', v.nullable(v.number())]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'val_42')).toBe(true);
    expect(v.is(result.data, 'val_null')).toBe(true);
    expect(v.is(result.data, 'val_abc')).toBe(false);
  });

  it('validates multiple interpolation slots', () => {
    const result = templateLiteral([v.string(), ':', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'host:8080')).toBe(true);
    expect(v.is(result.data, ':42')).toBe(true);
    expect(v.is(result.data, 'host:abc')).toBe(false);
  });

  it('rejects non-string input', () => {
    const result = templateLiteral(['hello']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 42)).toBe(false);
    expect(v.is(result.data, null)).toBe(false);
    expect(v.is(result.data, undefined)).toBe(false);
  });

  it('escapes regex special characters in string parts', () => {
    const result = templateLiteral(['price: $', v.number(), '.00']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'price: $42.00')).toBe(true);
    expect(v.is(result.data, 'price: X42Y00')).toBe(false);
  });

  it('works with v.parse', () => {
    const result = templateLiteral(['user_', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.parse(result.data, 'user_42')).toBe('user_42');
    expect(() => v.parse(result.data, 'invalid')).toThrow();
  });

  it('works as a v.record() key schema', () => {
    const keyResult = templateLiteral(['env_', v.string()]);
    expect(keyResult.ok).toBe(true);
    if (!keyResult.ok) return;
    const schema = v.record(keyResult.data, v.string());
    const parseResult = v.safeParse(schema, { env_NODE_ENV: 'production' });
    expect(parseResult.success).toBe(true);
  });

  it('produces correct error issue', () => {
    const result = templateLiteral(['id_', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parseResult = v.safeParse(result.data, 'id_abc');
    expect(parseResult.success).toBe(false);
    if (parseResult.success) return;
    expect(parseResult.issues[0]?.kind).toBe('schema');
    expect(parseResult.issues[0]?.type).toBe('template_literal');
  });

  it('supports custom error messages', () => {
    const result = templateLiteral(['id_', v.number()], 'Must be a valid ID');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parseResult = v.safeParse(result.data, 'bad');
    expect(parseResult.success).toBe(false);
    if (parseResult.success) return;
    expect(parseResult.issues[0]?.message).toBe('Must be a valid ID');
  });

  it('validates nested template literals', () => {
    const innerResult = templateLiteral(['v', v.number()]);
    expect(innerResult.ok).toBe(true);
    if (!innerResult.ok) return;
    const outerResult = templateLiteral(['app_', innerResult.data, '_release']);
    expect(outerResult.ok).toBe(true);
    if (!outerResult.ok) return;
    expect(v.is(outerResult.data, 'app_v42_release')).toBe(true);
    expect(v.is(outerResult.data, 'app_vABC_release')).toBe(false);
  });
});

// =============================================================================
// Pipe Introspection
// =============================================================================

describe('templateLiteral() pipe introspection', () => {
  it('uses UUID regex for v.pipe(v.string(), v.uuid())', () => {
    const result = templateLiteral(['id_', v.pipe(v.string(), v.uuid())]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'id_550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(v.is(result.data, 'id_not-a-uuid')).toBe(false);
  });

  it('uses integer regex for v.pipe(v.number(), v.integer())', () => {
    const result = templateLiteral(['n_', v.pipe(v.number(), v.integer())]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'n_42')).toBe(true);
    expect(v.is(result.data, 'n_3.14')).toBe(false);
  });

  it('uses length constraints for v.pipe(v.string(), v.minLength(3), v.maxLength(10))', () => {
    const result = templateLiteral(['code_', v.pipe(v.string(), v.minLength(3), v.maxLength(10))]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'code_abc')).toBe(true);
    expect(v.is(result.data, 'code_ab')).toBe(false);
    expect(v.is(result.data, 'code_abcdefghijk')).toBe(false);
  });

  it('uses user-provided regex for v.pipe(v.string(), v.regex(...))', () => {
    const result = templateLiteral(['tag_', v.pipe(v.string(), v.regex(/^[A-Z]+$/))]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(v.is(result.data, 'tag_ABC')).toBe(true);
    expect(v.is(result.data, 'tag_abc')).toBe(false);
  });
});

// =============================================================================
// Type-Level Inference
// =============================================================================

describe('templateLiteral() type inference', () => {
  it('infers plain string literal', () => {
    const result = templateLiteral(['hello']);
    if (!result.ok) return;
    expectTypeOf<v.InferOutput<typeof result.data>>().toEqualTypeOf<'hello'>();
  });

  it('infers string interpolation', () => {
    const result = templateLiteral(['user_', v.string()]);
    if (!result.ok) return;
    expectTypeOf<v.InferOutput<typeof result.data>>().toEqualTypeOf<`user_${string}`>();
  });

  it('infers number interpolation', () => {
    const result = templateLiteral(['id_', v.number()]);
    if (!result.ok) return;
    expectTypeOf<v.InferOutput<typeof result.data>>().toEqualTypeOf<`id_${number}`>();
  });

  it('infers boolean interpolation', () => {
    const result = templateLiteral(['is_', v.boolean()]);
    if (!result.ok) return;
    expectTypeOf<v.InferOutput<typeof result.data>>().toEqualTypeOf<`is_${boolean}`>();
  });

  it('infers literal interpolation', () => {
    const result = templateLiteral([v.literal('GET'), ' /api']);
    if (!result.ok) return;
    expectTypeOf<v.InferOutput<typeof result.data>>().toEqualTypeOf<'GET /api'>();
  });

  it('infers picklist distribution', () => {
    const result = templateLiteral([v.picklist(['a', 'b']), '_suffix']);
    if (!result.ok) return;
    expectTypeOf<v.InferOutput<typeof result.data>>().toEqualTypeOf<'a_suffix' | 'b_suffix'>();
  });

  it('infers multiple slots', () => {
    const result = templateLiteral([v.string(), ':', v.number()]);
    if (!result.ok) return;
    expectTypeOf<v.InferOutput<typeof result.data>>().toEqualTypeOf<`${string}:${number}`>();
  });
});

// =============================================================================
// Regex Generation
// =============================================================================

describe('templateLiteral() regex generation', () => {
  it('generates correct regex for string part only', () => {
    const result = templateLiteral(['hello']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.regex.source).toBe('^hello$');
  });

  it('escapes regex special characters', () => {
    const result = templateLiteral(['$100.00']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.regex.source).toBe('^\\$100\\.00$');
  });

  it('generates correct regex for number slot', () => {
    const result = templateLiteral(['n:', v.number()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.regex.source).toBe('^n:-?\\d+(?:\\.\\d+)?$');
  });

  it('generates correct regex for boolean slot', () => {
    const result = templateLiteral(['b:', v.boolean()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.regex.source).toBe('^b:(?:true|false)$');
  });

  it('generates correct regex for picklist slot', () => {
    const result = templateLiteral([v.picklist(['a', 'b', 'c'])]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.regex.source).toBe('^(?:a|b|c)$');
  });
});
