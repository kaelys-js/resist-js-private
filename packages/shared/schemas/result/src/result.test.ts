import { describe, expect, test } from 'vitest';
import { err, ERRORS, ok, okUnchecked, type Result } from '@/schemas/result/result';
import { StrSchema, type Str } from '@/schemas/common';

describe('Result system', () => {
  test('ok() creates a success result with validated data', () => {
    const result: Result<Str> = ok(StrSchema, 'hello');
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.data).toBe('hello');
    }
  });

  test('okUnchecked() creates a success result without validation', () => {
    const result: Result<Str> = okUnchecked('already validated' as Str);
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.data).toBe('already validated');
    }
  });

  test('err() creates a failure result with error details', () => {
    const result: Result<Str> = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'bad input');
    expect(result.ok).toBeFalsy();
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
      expect(result.error.message).toBe('bad input');
      expect(result.error.id).toBeDefined();
      expect(result.error.timestamp).toBeDefined();
    }
  });

  test('ERRORS registry contains WebForge domains', () => {
    expect(ERRORS.VALIDATION).toBeDefined();
    expect(ERRORS.SCENE).toBeDefined();
    expect(ERRORS.PLUGIN).toBeDefined();
    expect(ERRORS.PROJECT).toBeDefined();
    expect(ERRORS.ASSET).toBeDefined();
  });

  test('error propagation pattern works', () => {
    function inner(): Result<Str> {
      return err(ERRORS.IO.READ_FAILED, 'file not found');
    }

    function outer(): Result<Str> {
      const result: Result<Str> = inner();
      if (!result.ok) return result;
      return okUnchecked(result.data);
    }

    const result: Result<Str> = outer();
    expect(result.ok).toBeFalsy();
    if (!result.ok) {
      expect(result.error.code).toBe('IO.READ_FAILED');
    }
  });
});
