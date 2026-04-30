/**
 * Tests for @/schemas/function — types, schemas, pipe actions, and wrapper utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

import { ERRORS } from '@/schemas/result/result';
import { isGenericSchema } from '@/schemas/generic/generic';

import {
  ErrorModeSchema,
  FnTypeSchema,
  ArityConstraintSchema,
  CallTimeOptionsSchema,
  WrapperMetaSchema,
} from '@/schemas/function/types';
import { functionSchema, isAsyncFunction } from '@/schemas/function/function';
import { arity } from '@/schemas/function/arity';
import {
  WRAPPER_SYMBOL,
  _toBaseSchema,
  createWrapper,
  getWrapperMeta,
} from '@/schemas/function/wrapper-utils';
import { args } from '@/schemas/function/args';
import { returns } from '@/schemas/function/returns';
import { implement } from '@/schemas/function/implement';

// ─── Module-level test fixtures (hoisted from inside `it` blocks per consistent-function-scoping) ───
function namedFooFn(): void {}
const classlikeStringFn: () => void = function (): void {};
async function namedAsyncFn(): Promise<void> {}
function namedSyncFn(): void {}
function namedMyFunc(): number {
  return 1;
}
const namedMyFn = (x: number): number => x * 2;

class FooFixture {
  // Instance property required to avoid `no-extraneous-class` (no-static-only)
  // and `prefer-as-const` warnings while still keeping the `toString()` form
  // starting with `class ` so the schema's class-rejection branch fires.
  marker = 'fixture';
}

// =============================================================================
// TASK 1 — types.ts: Schema Definitions
// =============================================================================

describe('ErrorModeSchema', () => {
  it('accepts "throw"', () => {
    const result = v.safeParse(ErrorModeSchema, 'throw');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toBe('throw');
    }
  });

  it('accepts "result"', () => {
    const result = v.safeParse(ErrorModeSchema, 'result');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toBe('result');
    }
  });

  it('rejects invalid string', () => {
    expect(v.safeParse(ErrorModeSchema, 'invalid').success).toBe(false);
  });
});

describe('FnTypeSchema', () => {
  it('is a generic schema', () => {
    expect(isGenericSchema(FnTypeSchema)).toBe(true);
  });

  it('returns a schema when called', () => {
    const schema = FnTypeSchema();
    expect(schema).toBeDefined();
    expect(schema.type).toBeDefined();
  });

  it('accepts a function', () => {
    expect(v.safeParse(FnTypeSchema(), () => {}).success).toBe(true);
  });

  it('rejects a string', () => {
    expect(v.safeParse(FnTypeSchema(), 'hello').success).toBe(false);
  });

  it('rejects a number', () => {
    expect(v.safeParse(FnTypeSchema(), 42).success).toBe(false);
  });

  it('rejects null', () => {
    expect(v.safeParse(FnTypeSchema(), null).success).toBe(false);
  });
});

describe('ArityConstraintSchema', () => {
  it('accepts a number', () => {
    expect(v.safeParse(ArityConstraintSchema, 2).success).toBe(true);
  });

  it('accepts { min, max }', () => {
    expect(v.safeParse(ArityConstraintSchema, { min: 1, max: 3 }).success).toBe(true);
  });

  it('accepts { min } only', () => {
    expect(v.safeParse(ArityConstraintSchema, { min: 1 }).success).toBe(true);
  });

  it('accepts { max } only', () => {
    expect(v.safeParse(ArityConstraintSchema, { max: 3 }).success).toBe(true);
  });

  it('rejects a string', () => {
    expect(v.safeParse(ArityConstraintSchema, 'bad').success).toBe(false);
  });
});

describe('CallTimeOptionsSchema', () => {
  it('accepts empty object', () => {
    expect(v.safeParse(CallTimeOptionsSchema, {}).success).toBe(true);
  });

  it('accepts { onError: "throw" }', () => {
    const r = v.safeParse(CallTimeOptionsSchema, { onError: 'throw' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.output.onError).toBe('throw');
    }
  });

  it('accepts { onError: "result" }', () => {
    const r = v.safeParse(CallTimeOptionsSchema, { onError: 'result' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.output.onError).toBe('result');
    }
  });

  it('rejects extra fields (strictObject)', () => {
    expect(v.safeParse(CallTimeOptionsSchema, { onError: 'throw', extra: true }).success).toBe(
      false,
    );
  });
});

describe('WrapperMetaSchema', () => {
  it('accepts valid meta with required fields', () => {
    const r = v.safeParse(WrapperMetaSchema, {
      __original: () => {},
      __onError: 'throw' as const,
    });
    expect(r.success).toBe(true);
  });

  it('accepts valid meta with all optional fields', () => {
    const r = v.safeParse(WrapperMetaSchema, {
      __original: () => {},
      __argsSchema: v.tuple([v.string()]),
      __returnsSchema: v.number(),
      __onError: 'result' as const,
    });
    expect(r.success).toBe(true);
  });

  it('rejects non-function __original', () => {
    const r = v.safeParse(WrapperMetaSchema, {
      __original: 'not a function',
      __onError: 'throw',
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid __onError', () => {
    const r = v.safeParse(WrapperMetaSchema, {
      __original: () => {},
      __onError: 'invalid',
    });
    expect(r.success).toBe(false);
  });
});

// =============================================================================
// TASK 2 — function.ts: functionSchema() + isAsyncFunction()
// =============================================================================

describe('functionSchema()', () => {
  const schema = functionSchema();

  it('accepts arrow function', () => {
    expect(v.safeParse(schema, () => {}).success).toBe(true);
  });

  it('accepts named function', () => {
    expect(v.safeParse(schema, namedFooFn).success).toBe(true);
  });

  it('accepts async function', () => {
    expect(v.safeParse(schema, async () => {}).success).toBe(true);
  });

  it('rejects string', () => {
    expect(v.safeParse(schema, 'hello').success).toBe(false);
  });

  it('rejects number', () => {
    expect(v.safeParse(schema, 42).success).toBe(false);
  });

  it('rejects null', () => {
    expect(v.safeParse(schema, null).success).toBe(false);
  });

  it('rejects undefined', () => {
    expect(v.safeParse(schema, undefined).success).toBe(false);
  });

  it('rejects object', () => {
    expect(v.safeParse(schema, { call: () => {} }).success).toBe(false);
  });

  it('rejects class constructor (startsWith "class ")', () => {
    expect(v.safeParse(schema, FooFixture).success).toBe(false);
  });

  it('rejects function with toString starting with "class{"', () => {
    // Defensive branch for engines that omit the space after 'class'
    Object.defineProperty(classlikeStringFn, 'toString', {
      value: (): string => 'class{constructor(){}}',
      configurable: true,
    });
    expect(v.safeParse(schema, classlikeStringFn).success).toBe(false);
  });
});

describe('isAsyncFunction()', () => {
  it('returns true for async arrow function', () => {
    expect(isAsyncFunction(async () => {})).toBe(true);
  });

  it('returns true for async function declaration', () => {
    expect(isAsyncFunction(namedAsyncFn)).toBe(true);
  });

  it('returns false for sync arrow function', () => {
    expect(isAsyncFunction(() => {})).toBe(false);
  });

  it('returns false for sync function declaration', () => {
    expect(isAsyncFunction(namedSyncFn)).toBe(false);
  });
});

// =============================================================================
// TASK 3 — arity.ts: All Arity Branches
// =============================================================================

describe('arity()', () => {
  describe('exact arity', () => {
    it('arity(2) returns ok', () => {
      expect(arity(2).ok).toBe(true);
    });

    it('check accepts fn with matching length', () => {
      const r = arity(2);

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      expect(v.safeParse(schema, (_a: unknown, _b: unknown) => {}).success).toBe(true);
    });

    it('check rejects fn with non-matching length', () => {
      const r = arity(2);

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      expect(v.safeParse(schema, (_a: unknown) => {}).success).toBe(false);
    });

    it('arity(0) accepts zero-arg fn', () => {
      const r = arity(0);

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      expect(v.safeParse(schema, () => {}).success).toBe(true);
    });

    it('arity(-1) returns err INVALID_ARITY', () => {
      const r = arity(-1);
      expect(r.ok).toBe(false);
      if (r.ok) {
        return;
      }
      expect(r.error.code).toBe(ERRORS.FUNCTION.INVALID_ARITY);
    });

    it('arity(1.5) returns err (non-integer)', () => {
      const r = arity(1.5);
      expect(r.ok).toBe(false);
      if (r.ok) {
        return;
      }
      expect(r.error.code).toBe(ERRORS.FUNCTION.INVALID_ARITY);
    });
  });

  describe('range arity', () => {
    it('{ min: 1, max: 3 } accepts length 1', () => {
      const r = arity({ min: 1, max: 3 });

      if (!r.ok) {
        return;
      }
      expect(
        v.safeParse(
          v.pipe(
            functionSchema(),
            r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
          ),
          (_a: unknown) => {},
        ).success,
      ).toBe(true);
    });

    it('{ min: 1, max: 3 } accepts length 3', () => {
      const r = arity({ min: 1, max: 3 });

      if (!r.ok) {
        return;
      }
      expect(
        v.safeParse(
          v.pipe(
            functionSchema(),
            r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
          ),
          (_a: unknown, _b: unknown, _c: unknown) => {},
        ).success,
      ).toBe(true);
    });

    it('{ min: 1, max: 3 } rejects length 0', () => {
      const r = arity({ min: 1, max: 3 });

      if (!r.ok) {
        return;
      }
      expect(
        v.safeParse(
          v.pipe(
            functionSchema(),
            r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
          ),
          () => {},
        ).success,
      ).toBe(false);
    });

    it('{ min: 1, max: 3 } rejects length 4', () => {
      const r = arity({ min: 1, max: 3 });

      if (!r.ok) {
        return;
      }
      expect(
        v.safeParse(
          v.pipe(
            functionSchema(),
            r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
          ),
          (_a: unknown, _b: unknown, _c: unknown, _d: unknown) => {},
        ).success,
      ).toBe(false);
    });

    it('{ min: 2 } accepts length 2+', () => {
      const r = arity({ min: 2 });

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      expect(v.safeParse(schema, (_a: unknown, _b: unknown) => {}).success).toBe(true);
      expect(v.safeParse(schema, (_a: unknown, _b: unknown, _c: unknown) => {}).success).toBe(true);
    });

    it('{ min: 2 } rejects length 1', () => {
      const r = arity({ min: 2 });

      if (!r.ok) {
        return;
      }
      expect(
        v.safeParse(
          v.pipe(
            functionSchema(),
            r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
          ),
          (_a: unknown) => {},
        ).success,
      ).toBe(false);
    });

    it('{ max: 2 } accepts length 0-2', () => {
      const r = arity({ max: 2 });

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      expect(v.safeParse(schema, () => {}).success).toBe(true);
      expect(v.safeParse(schema, (_a: unknown, _b: unknown) => {}).success).toBe(true);
    });

    it('{ max: 2 } rejects length 3', () => {
      const r = arity({ max: 2 });

      if (!r.ok) {
        return;
      }
      expect(
        v.safeParse(
          v.pipe(
            functionSchema(),
            r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
          ),
          (_a: unknown, _b: unknown, _c: unknown) => {},
        ).success,
      ).toBe(false);
    });

    it('{} accepts any length', () => {
      const r = arity({});

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      expect(v.safeParse(schema, () => {}).success).toBe(true);
      expect(v.safeParse(schema, (_a: unknown, _b: unknown, _c: unknown) => {}).success).toBe(true);
    });
  });

  describe('invalid range constraints', () => {
    it('{ min: -1 } returns err', () => {
      const r = arity({ min: -1 });
      expect(r.ok).toBe(false);
      if (r.ok) {
        return;
      }
      expect(r.error.code).toBe(ERRORS.FUNCTION.INVALID_ARITY);
      expect(r.error.message).toContain('min');
    });

    it('{ max: -1 } returns err', () => {
      const r = arity({ max: -1 });
      expect(r.ok).toBe(false);
      if (r.ok) {
        return;
      }
      expect(r.error.code).toBe(ERRORS.FUNCTION.INVALID_ARITY);
      expect(r.error.message).toContain('max');
    });

    it('{ min: 1.5 } returns err', () => {
      const r = arity({ min: 1.5 });
      expect(r.ok).toBe(false);
      if (r.ok) {
        return;
      }
      expect(r.error.code).toBe(ERRORS.FUNCTION.INVALID_ARITY);
    });

    it('{ max: 1.5 } returns err', () => {
      const r = arity({ max: 1.5 });
      expect(r.ok).toBe(false);
      if (r.ok) {
        return;
      }
      expect(r.error.code).toBe(ERRORS.FUNCTION.INVALID_ARITY);
    });
  });

  describe('description messages', () => {
    it('exact: message says "exactly N"', () => {
      const r = arity(2);

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      const pr = v.safeParse(schema, (_a: unknown) => {});
      expect(pr.success).toBe(false);
      if (pr.success) {
        return;
      }
      expect(pr.issues[0]?.message).toContain('exactly 2');
    });

    it('range: message says ">= min and <= max"', () => {
      const r = arity({ min: 1, max: 3 });

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      const pr = v.safeParse(schema, () => {});
      expect(pr.success).toBe(false);
      if (pr.success) {
        return;
      }

      const msg = pr.issues[0]?.message ?? '';
      expect(msg).toContain('>= 1');
      expect(msg).toContain('<= 3');
    });

    it('min-only: message says ">= min"', () => {
      const r = arity({ min: 2 });

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      const pr = v.safeParse(schema, (_a: unknown) => {});
      expect(pr.success).toBe(false);
      if (pr.success) {
        return;
      }
      expect(pr.issues[0]?.message).toContain('>= 2');
    });

    it('max-only: message says "<= max"', () => {
      const r = arity({ max: 1 });

      if (!r.ok) {
        return;
      }

      const schema = v.pipe(
        functionSchema(),
        r.data as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
      );
      const pr = v.safeParse(schema, (_a: unknown, _b: unknown) => {});
      expect(pr.success).toBe(false);
      if (pr.success) {
        return;
      }
      expect(pr.issues[0]?.message).toContain('<= 1');
    });
  });
});

// =============================================================================
// TASK 4 — wrapper-utils.ts: createWrapper, validateArgs, validateReturn
// =============================================================================

describe('getWrapperMeta()', () => {
  it('returns undefined for unwrapped function', () => {
    expect(getWrapperMeta(() => {})).toBeUndefined();
  });

  it('returns WrapperMeta for wrapped function', () => {
    const wrapper = createWrapper(() => 42, undefined, undefined, 'throw');
    const meta = getWrapperMeta(wrapper);
    expect(meta).toBeDefined();
    expect(meta?.__onError).toBe('throw');
  });
});

describe('createWrapper()', () => {
  describe('no validation schemas', () => {
    it('passes through to original', () => {
      const wrapper = createWrapper((a: number, b: number) => a + b, undefined, undefined, 'throw');
      expect(wrapper(2, 3)).toBe(5);
    });
  });

  describe('wrapper metadata', () => {
    it('sets name to "validated(fnName)"', () => {
      const wrapper = createWrapper(namedMyFunc, undefined, undefined, 'throw');
      expect(wrapper.name).toBe('validated(namedMyFunc)');
    });

    it('sets name to "validated(<anonymous>)" for unnamed fn', () => {
      const wrapper = createWrapper(() => 1, undefined, undefined, 'throw');
      expect(wrapper.name).toBe('validated(<anonymous>)');
    });

    it('attaches WRAPPER_SYMBOL with correct meta', () => {
      const argsSchema = _toBaseSchema(v.tuple([v.string()]));
      const returnsSchema = _toBaseSchema(v.number());
      const wrapper = createWrapper(() => 42, argsSchema, returnsSchema, 'result');

      expect(WRAPPER_SYMBOL in wrapper).toBe(true);
      const meta = getWrapperMeta(wrapper);
      expect(meta?.__argsSchema).toBe(argsSchema);
      expect(meta?.__returnsSchema).toBe(returnsSchema);
      expect(meta?.__onError).toBe('result');
    });
  });

  describe('args validation — throw mode', () => {
    it('passes valid args', () => {
      const wrapper = createWrapper(
        (s: string) => s.length,
        _toBaseSchema(v.tuple([v.string()])),
        undefined,
        'throw',
      );
      expect(wrapper('hello')).toBe(5);
    });

    it('throws on invalid args', () => {
      const wrapper = createWrapper(
        (s: string) => s.length,
        _toBaseSchema(v.tuple([v.string()])),
        undefined,
        'throw',
      );
      expect(() => wrapper(42 as unknown as string)).toThrow('parameter validation failed');
    });
  });

  describe('args validation — result mode', () => {
    it('returns err with PARAM_VALIDATION_FAILED', () => {
      const wrapper = createWrapper(
        (s: string) => s.length,
        _toBaseSchema(v.tuple([v.string()])),
        undefined,
        'result',
      );
      const r = wrapper(42 as unknown as string) as unknown as {
        ok: boolean;
        error: { code: string };
      };
      expect(r.ok).toBe(false);
      expect(r.error.code).toBe(ERRORS.FUNCTION.PARAM_VALIDATION_FAILED);
    });
  });

  describe('validateArgs message ternary', () => {
    it('uses nested issues (tuple schema with wrong element types)', () => {
      const wrapper = createWrapper(
        (_a: string, _b: number) => {},
        _toBaseSchema(v.tuple([v.string(), v.number()])),
        undefined,
        'throw',
      );
      // Wrong types produce nested issues in flatten()
      expect(() => wrapper(42 as unknown as string, 'bad' as unknown as number)).toThrow(
        'parameter validation failed',
      );
    });

    it('uses join when no nested issues (custom schema)', () => {
      const wrapper = createWrapper(
        (_a: unknown) => {},
        _toBaseSchema(
          v.custom(
            (val) => Array.isArray(val) && (val as unknown[]).length === 1,
            'Expected single arg',
          ),
        ),
        undefined,
        'throw',
      );
      expect(() => (wrapper as (...args: unknown[]) => unknown)('a', 'b' as unknown)).toThrow(
        'parameter validation failed',
      );
    });
  });

  describe('return validation — non-Result, throw mode', () => {
    it('passes valid return', () => {
      const wrapper = createWrapper(() => 42, undefined, _toBaseSchema(v.number()), 'throw');
      expect(wrapper()).toBe(42);
    });

    it('throws on invalid return', () => {
      const wrapper = createWrapper(() => 'bad', undefined, _toBaseSchema(v.number()), 'throw');
      expect(() => wrapper()).toThrow('return value validation failed');
    });
  });

  describe('return validation — non-Result, result mode', () => {
    it('returns err with RETURN_VALIDATION_FAILED', () => {
      const wrapper = createWrapper(() => 'bad', undefined, _toBaseSchema(v.number()), 'result');
      const r = wrapper() as unknown as { ok: boolean; error: { code: string } };
      expect(r.ok).toBe(false);
      expect(r.error.code).toBe(ERRORS.FUNCTION.RETURN_VALIDATION_FAILED);
    });
  });

  describe('return validation — Result-aware', () => {
    it('ok Result with valid .data passes through', () => {
      const okResult = { ok: true, data: 42, error: null };
      const wrapper = createWrapper(() => okResult, undefined, _toBaseSchema(v.number()), 'throw');
      expect(wrapper()).toBe(okResult);
    });

    it('ok Result with invalid .data throws (throw mode)', () => {
      const wrapper = createWrapper(
        () => ({ ok: true, data: 'not a number', error: null }),
        undefined,
        _toBaseSchema(v.number()),
        'throw',
      );
      expect(() => wrapper()).toThrow('return value (.data) validation failed');
    });

    it('ok Result with invalid .data returns err (result mode)', () => {
      const wrapper = createWrapper(
        () => ({ ok: true, data: 'not a number', error: null }),
        undefined,
        _toBaseSchema(v.number()),
        'result',
      );
      const r = wrapper() as unknown as { ok: boolean; error: { code: string } };
      expect(r.ok).toBe(false);
      expect(r.error.code).toBe(ERRORS.FUNCTION.RETURN_VALIDATION_FAILED);
    });

    it('err Result passes through without validation', () => {
      const errResult = { ok: false, data: null, error: { code: 'SOME_ERR', message: 'fail' } };
      const wrapper = createWrapper(() => errResult, undefined, _toBaseSchema(v.number()), 'throw');
      expect(wrapper()).toBe(errResult);
    });
  });

  describe('async (Promise) return validation', () => {
    it('resolves valid async return', async () => {
      const wrapper = createWrapper(
        async () => {
          await Promise.resolve();
          return 42;
        },
        undefined,
        _toBaseSchema(v.number()),
        'throw',
      );
      await expect(wrapper()).resolves.toBe(42);
    });

    it('rejects invalid async return (throw mode)', async () => {
      const wrapper = createWrapper(
        async () => {
          await Promise.resolve();
          return 'bad';
        },
        undefined,
        _toBaseSchema(v.number()),
        'throw',
      );
      await expect(wrapper()).rejects.toThrow('return value validation failed');
    });

    it('resolves with err for invalid async return (result mode)', async () => {
      const wrapper = createWrapper(
        async () => {
          await Promise.resolve();
          return 'bad';
        },
        undefined,
        _toBaseSchema(v.number()),
        'result',
      );
      const r = (await (wrapper() as unknown as Promise<unknown>)) as {
        ok: boolean;
        error: { code: string };
      };
      expect(r.ok).toBe(false);
      expect(r.error.code).toBe(ERRORS.FUNCTION.RETURN_VALIDATION_FAILED);
    });
  });

  describe('isResult edge cases (via return validation)', () => {
    it('null return is treated as non-Result', () => {
      const wrapper = createWrapper(
        () => null,
        undefined,
        _toBaseSchema(v.nullable(v.number())),
        'throw',
      );
      expect(wrapper()).toBe(null);
    });

    it('plain object without ok is treated as non-Result', () => {
      const wrapper = createWrapper(
        () => ({ x: 42 }),
        undefined,
        _toBaseSchema(v.object({ x: v.number() })),
        'throw',
      );
      expect(wrapper()).toEqual({ x: 42 });
    });
  });

  it('preserves this context', () => {
    const obj = {
      value: 10,
      method: createWrapper(
        function (this: { value: number }) {
          return this.value;
        },
        undefined,
        undefined,
        'throw',
      ),
    };
    expect(obj.method()).toBe(10);
  });
});

// =============================================================================
// TASK 5 — args.ts + returns.ts + implement.ts: Pipe Actions
// =============================================================================

describe('args()', () => {
  it('wraps function with args validation (new wrapper)', () => {
    const schema = v.pipe(functionSchema(), args(v.tuple([v.string()])));
    const r = v.safeParse(schema, (s: string) => s.length);
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect(r.output('hello')).toBe(5);
    expect(() => r.output(42 as unknown as string)).toThrow();
  });

  it('coordinates with existing returns wrapper', () => {
    const schema = v.pipe(functionSchema(), returns(v.number()), args(v.tuple([v.string()])));
    const r = v.safeParse(schema, (s: string) => s.length);
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect(r.output('hello')).toBe(5);
  });

  it('passes onError option through to wrapper', () => {
    const schema = v.pipe(functionSchema(), args(v.tuple([v.string()]), { onError: 'result' }));
    const r = v.safeParse(schema, (s: string) => s.length);
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }

    const callR = r.output(42 as unknown as string) as unknown as {
      ok: boolean;
      error: { code: string };
    };
    expect(callR.ok).toBe(false);
    expect(callR.error.code).toBe(ERRORS.FUNCTION.PARAM_VALIDATION_FAILED);
  });
});

describe('returns()', () => {
  it('wraps function with return validation (new wrapper)', () => {
    const schema = v.pipe(functionSchema(), returns(v.number()));
    const r = v.safeParse(schema, () => 42);
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect(r.output()).toBe(42);
  });

  it('coordinates with existing args wrapper', () => {
    const schema = v.pipe(functionSchema(), args(v.tuple([v.string()])), returns(v.number()));
    const r = v.safeParse(schema, (s: string) => s.length);
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect(r.output('hello')).toBe(5);
  });

  it('passes onError option through to wrapper', () => {
    const schema = v.pipe(functionSchema(), returns(v.number(), { onError: 'result' }));
    const r = v.safeParse(schema, () => 'bad');
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }

    const callR = r.output() as unknown as { ok: boolean; error: { code: string } };
    expect(callR.ok).toBe(false);
    expect(callR.error.code).toBe(ERRORS.FUNCTION.RETURN_VALIDATION_FAILED);
  });
});

describe('args() + returns() combined', () => {
  const schema = v.pipe(functionSchema(), args(v.tuple([v.string()])), returns(v.number()));

  it('valid args + valid return succeeds', () => {
    const r = v.safeParse(schema, (s: string) => s.length);
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect(r.output('hello')).toBe(5);
  });

  it('invalid args throws before fn called', () => {
    const r = v.safeParse(schema, (s: string) => s.length);
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect(() => r.output(42 as unknown as string)).toThrow('parameter validation failed');
  });

  it('invalid return throws after fn called', () => {
    const r = v.safeParse(schema, (s: string) => s.toUpperCase() as unknown as number);
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect(() => r.output('hello')).toThrow('return value validation failed');
  });
});

describe('implement()', () => {
  it('with prior wrapper — re-creates with new implementation', () => {
    const schema = v.pipe(
      functionSchema(),
      args(v.tuple([v.string()])),
      returns(v.number()),
      implement((s: string) => s.trim().length),
    );
    const r = v.safeParse(schema, () => {});
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect(r.output('  hello  ')).toBe(5);
  });

  it('without prior wrapper — returns fn as-is', () => {
    const schema = v.pipe(
      functionSchema(),
      implement(namedMyFn) as v.GenericPipeAction<v.InferOutput<ReturnType<typeof functionSchema>>>,
    );
    const r = v.safeParse(schema, () => {});
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect((r.output as (x: number) => number)(5)).toBe(10);
  });

  it('full pipe — validates args, calls fn, validates return', () => {
    const schema = v.pipe(
      functionSchema(),
      args(v.tuple([v.string(), v.number()])),
      returns(v.string()),
      implement((name: string, age: number) => `${name} is ${String(age)}`),
    );
    const r = v.safeParse(schema, () => {});
    expect(r.success).toBe(true);
    if (!r.success) {
      return;
    }
    expect(r.output('Alice', 30)).toBe('Alice is 30');
    expect(() => r.output(42 as unknown as string, 30)).toThrow('parameter validation failed');
  });
});
