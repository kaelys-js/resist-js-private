/**
 * Tests for the generic schema package.
 *
 * Covers the `generic()` factory, `_toGenericSchema()` cast (implicitly),
 * `isGenericSchema()` type guard (all branches), and `GenericSchemaMetaSchema`.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

import { generic, isGenericSchema } from '@/schemas/generic/generic';
import { GenericSchemaMetaSchema } from '@/schemas/generic/types';

// =============================================================================
// generic() factory
// =============================================================================

describe('generic()', () => {
  it('attaches __isGenericSchema metadata to the factory', () => {
    const factory = generic(<T>(s: v.GenericSchema<T>) => v.object({ value: s }));
    expect(factory.__isGenericSchema).toBe(true);
  });

  it('returns a callable factory that produces valid schemas', () => {
    const BoxSchema = generic(<T>(s: v.GenericSchema<T>) => v.object({ value: s }));
    const StringBox = BoxSchema(v.string());
    const result = v.safeParse(StringBox, { value: 'hello' });
    expect(result.success).toBe(true);
  });

  it('property __isGenericSchema is non-enumerable', () => {
    const factory = generic(<T>(s: v.GenericSchema<T>) => v.object({ value: s }));
    expect(Object.keys(factory)).not.toContain('__isGenericSchema');
  });

  it('property __isGenericSchema is non-writable and non-configurable', () => {
    const factory = generic(<T>(s: v.GenericSchema<T>) => v.object({ value: s }));
    const descriptor = Object.getOwnPropertyDescriptor(factory, '__isGenericSchema');
    expect(descriptor).toBeDefined();
    expect(descriptor?.writable).toBe(false);
    expect(descriptor?.configurable).toBe(false);
    expect(descriptor?.enumerable).toBe(false);
    expect(descriptor?.value).toBe(true);
  });
});

// =============================================================================
// isGenericSchema() type guard
// =============================================================================

describe('isGenericSchema()', () => {
  it('returns true for a function created by generic()', () => {
    const factory = generic(<T>(s: v.GenericSchema<T>) => v.object({ value: s }));
    expect(isGenericSchema(factory)).toBe(true);
  });

  it('returns false for a plain string', () => {
    expect(isGenericSchema('hello')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isGenericSchema(42)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isGenericSchema(null)).toBe(false);
  });

  it('returns false for a plain object', () => {
    expect(isGenericSchema({})).toBe(false);
  });

  it('returns false for a plain function without __isGenericSchema', () => {
    const plainFn = () => v.string();
    expect(isGenericSchema(plainFn)).toBe(false);
  });

  it('returns false for a function with __isGenericSchema set to false', () => {
    const fn = () => v.string();
    Object.defineProperty(fn, '__isGenericSchema', { value: false });
    expect(isGenericSchema(fn)).toBe(false);
  });
});

// =============================================================================
// GenericSchemaMetaSchema
// =============================================================================

describe('GenericSchemaMetaSchema', () => {
  it('accepts valid meta { __isGenericSchema: true }', () => {
    const result = v.safeParse(GenericSchemaMetaSchema, { __isGenericSchema: true });
    expect(result.success).toBe(true);
  });

  it('rejects { __isGenericSchema: false }', () => {
    const result = v.safeParse(GenericSchemaMetaSchema, { __isGenericSchema: false });
    expect(result.success).toBe(false);
  });

  it('rejects empty object {}', () => {
    const result = v.safeParse(GenericSchemaMetaSchema, {});
    expect(result.success).toBe(false);
  });

  it('rejects extra properties (strictObject)', () => {
    const result = v.safeParse(GenericSchemaMetaSchema, {
      __isGenericSchema: true,
      extra: 1,
    });
    expect(result.success).toBe(false);
  });
});
