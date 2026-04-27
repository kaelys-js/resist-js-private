/**
 * Tests for primitives lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import noUnsafeInteger from './no-unsafe-integer.ts';
import noFloatEquality from './no-float-equality.ts';
import noInfinityArithmetic from './no-infinity-arithmetic.ts';
import useNumberIsFinite from './use-number-is-finite.ts';
import useNumberIsInteger from './use-number-is-integer.ts';
import noToFixedRounding from './no-toFixed-rounding.ts';
import preferBigintForIds from './prefer-bigint-for-ids.ts';
import noBigintNumberMix from './no-bigint-number-mix.ts';
import noMathRandomCrypto from './no-math-random-crypto.ts';
import divisionByZero from './division-by-zero.ts';
import noModuloNegative from './no-modulo-negative.ts';
import preferMathTrunc from './prefer-math-trunc.ts';
import noLossyMathOperation from './no-lossy-math-operation.ts';
import noStringLengthUnicode from './no-string-length-unicode.ts';
import noStringIndexUnicode from './no-string-index-unicode.ts';
import preferNormalizeComparison from './prefer-normalize-comparison.ts';
import noRegexOnUntrusted from './no-regex-on-untrusted.ts';
import noNewDateStringParse from './no-new-date-string-parse.ts';
import noDateMutation from './no-date-mutation.ts';
import noDateArithmetic from './no-date-arithmetic.ts';
import noJsonBigint from './no-json-bigint.ts';
import noJsonUndefined from './no-json-undefined.ts';
import noJsonCircular from './no-json-circular.ts';
import noJsonNanInfinity from './no-json-nan-infinity.ts';
import noCompareDifferentTypes from './no-compare-different-types.ts';
import noRelationalNullUndefined from './no-relational-null-undefined.ts';
import objectIsForSpecial from './object-is-for-special.ts';
import noArrayHole from './no-array-hole.ts';
import noArrayLengthMutation from './no-array-length-mutation.ts';
import noArrayIndexString from './no-array-index-string.ts';
import noObjectPrototypeAccess from './no-object-prototype-access.ts';
import noInOperatorPrimitive from './no-in-operator-primitive.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @param {string} filename - Optional filename override
 * @returns {Promise<LintResult[]>} Array of lint results
 */
function lint(
  rule: TypeScriptRule,
  code: string,
  filename: string = 'test.ts',
): Promise<LintResult[]> {
  return runTypeScriptRules(filename, code, [rule]);
}

// =============================================================================
// primitives/no-unsafe-integer
// =============================================================================

describe('primitives/no-unsafe-integer', () => {
  it('reports number exceeding MAX_SAFE_INTEGER', async () => {
    const code: string = `const id = 9007199254740992;`;
    const results: LintResult[] = await lint(noUnsafeInteger, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('exceeds MAX_SAFE_INTEGER');
  });

  it('passes safe integer', async () => {
    const code: string = `const x = 42;`;
    const results: LintResult[] = await lint(noUnsafeInteger, code);
    expect(results.length).toBe(0);
  });

  it('passes string literal', async () => {
    const code: string = `const s = "hello";`;
    const results: LintResult[] = await lint(noUnsafeInteger, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-float-equality
// =============================================================================

describe('primitives/no-float-equality', () => {
  it('reports float literal in === comparison', async () => {
    const code: string = `if (x === 0.3) {}`;
    const results: LintResult[] = await lint(noFloatEquality, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('equality comparison of floats');
  });

  it('reports float literal in !== comparison', async () => {
    const code: string = `if (total !== 19.99) {}`;
    const results: LintResult[] = await lint(noFloatEquality, code);
    expect(results.length).toBe(1);
  });

  it('passes integer comparison', async () => {
    const code: string = `if (x === 3) {}`;
    const results: LintResult[] = await lint(noFloatEquality, code);
    expect(results.length).toBe(0);
  });

  it('passes non-equality operator', async () => {
    const code: string = `if (x > 0.5) {}`;
    const results: LintResult[] = await lint(noFloatEquality, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-infinity-arithmetic
// =============================================================================

describe('primitives/no-infinity-arithmetic', () => {
  it('reports ** with large exponent', async () => {
    const code: string = `const x = base ** 200;`;
    const results: LintResult[] = await lint(noInfinityArithmetic, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Infinity');
  });

  it('reports division by literal zero', async () => {
    const code: string = `const x = y / 0;`;
    const results: LintResult[] = await lint(noInfinityArithmetic, code);
    expect(results.length).toBe(1);
  });

  it('passes safe exponent', async () => {
    const code: string = `const x = base ** 2;`;
    const results: LintResult[] = await lint(noInfinityArithmetic, code);
    expect(results.length).toBe(0);
  });

  it('passes non-arithmetic', async () => {
    const code: string = `const x = a + b;`;
    const results: LintResult[] = await lint(noInfinityArithmetic, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/use-number-is-finite
// =============================================================================

describe('primitives/use-number-is-finite', () => {
  it('reports global isFinite()', async () => {
    const code: string = `if (isFinite(value)) {}`;
    const results: LintResult[] = await lint(useNumberIsFinite, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Number.isFinite()');
  });

  it('passes Number.isFinite()', async () => {
    const code: string = `if (Number.isFinite(value)) {}`;
    const results: LintResult[] = await lint(useNumberIsFinite, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/use-number-is-integer
// =============================================================================

describe('primitives/use-number-is-integer', () => {
  it('reports x % 1 === 0 pattern', async () => {
    const code: string = `if (x % 1 === 0) {}`;
    const results: LintResult[] = await lint(useNumberIsInteger, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Number.isInteger()');
  });

  it('passes Number.isInteger()', async () => {
    const code: string = `if (Number.isInteger(x)) {}`;
    const results: LintResult[] = await lint(useNumberIsInteger, code);
    expect(results.length).toBe(0);
  });

  it('passes other modulo operations', async () => {
    const code: string = `if (x % 2 === 0) {}`;
    const results: LintResult[] = await lint(useNumberIsInteger, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-toFixed-rounding
// =============================================================================

describe('primitives/no-toFixed-rounding', () => {
  it('reports .toFixed() call', async () => {
    const code: string = `const price = (19.995).toFixed(2);`;
    const results: LintResult[] = await lint(noToFixedRounding, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('toFixed()');
  });

  it('passes other method calls', async () => {
    const code: string = `const str = value.toString();`;
    const results: LintResult[] = await lint(noToFixedRounding, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/prefer-bigint-for-ids
// =============================================================================

describe('primitives/prefer-bigint-for-ids', () => {
  it('reports id property as number in interface', async () => {
    const code: string = `interface User { id: number; name: string; }`;
    const results: LintResult[] = await lint(preferBigintForIds, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ID field');
    expect(results[0]!.message).toContain('lose precision');
  });

  it('reports userId property as number', async () => {
    const code: string = `interface Order { userId: number; }`;
    const results: LintResult[] = await lint(preferBigintForIds, code);
    expect(results.length).toBe(1);
  });

  it('passes id as string', async () => {
    const code: string = `interface User { id: string; name: string; }`;
    const results: LintResult[] = await lint(preferBigintForIds, code);
    expect(results.length).toBe(0);
  });

  it('passes non-id number property', async () => {
    const code: string = `interface User { age: number; }`;
    const results: LintResult[] = await lint(preferBigintForIds, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-bigint-number-mix
// =============================================================================

describe('primitives/no-bigint-number-mix', () => {
  it('reports bigint + number arithmetic', async () => {
    const code: string = `const sum = 123n + 456;`;
    const results: LintResult[] = await lint(noBigintNumberMix, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('mix bigint and number');
  });

  it('passes same-type arithmetic', async () => {
    const code: string = `const sum = 123n + 456n;`;
    const results: LintResult[] = await lint(noBigintNumberMix, code);
    expect(results.length).toBe(0);
  });

  it('passes number-only arithmetic', async () => {
    const code: string = `const sum = 123 + 456;`;
    const results: LintResult[] = await lint(noBigintNumberMix, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-math-random-crypto
// =============================================================================

describe('primitives/no-math-random-crypto', () => {
  it('reports Math.random() in auth file', async () => {
    const code: string = `const token = Math.random().toString(36);`;
    const results: LintResult[] = await lint(noMathRandomCrypto, code, 'auth/generate-token.ts');
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Math.random()');
    expect(results[0]!.message).toContain('not cryptographically secure');
  });

  it('passes Math.random() in non-sensitive file', async () => {
    const code: string = `const color = Math.random();`;
    const results: LintResult[] = await lint(noMathRandomCrypto, code, 'ui/colors.ts');
    expect(results.length).toBe(0);
  });

  it('reports Math.random() in file with "secret" in path', async () => {
    const code: string = `const x = Math.random();`;
    const results: LintResult[] = await lint(noMathRandomCrypto, code, 'utils/secret-gen.ts');
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// primitives/division-by-zero
// =============================================================================

describe('primitives/division-by-zero', () => {
  it('reports division by variable', async () => {
    const code: string = `const result = total / count;`;
    const results: LintResult[] = await lint(divisionByZero, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('division by zero');
  });

  it('passes division by non-zero literal', async () => {
    const code: string = `const half = x / 2;`;
    const results: LintResult[] = await lint(divisionByZero, code);
    expect(results.length).toBe(0);
  });

  it('passes non-division', async () => {
    const code: string = `const sum = a + b;`;
    const results: LintResult[] = await lint(divisionByZero, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-modulo-negative
// =============================================================================

describe('primitives/no-modulo-negative', () => {
  it('reports % operator', async () => {
    const code: string = `const rem = offset % length;`;
    const results: LintResult[] = await lint(noModuloNegative, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('% operator');
    expect(results[0]!.message).toContain('remainder, not modulo');
  });

  it('passes non-modulo operators', async () => {
    const code: string = `const sum = a + b;`;
    const results: LintResult[] = await lint(noModuloNegative, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/prefer-math-trunc
// =============================================================================

describe('primitives/prefer-math-trunc', () => {
  it('reports Math.floor()', async () => {
    const code: string = `const truncated = Math.floor(value);`;
    const results: LintResult[] = await lint(preferMathTrunc, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Math.floor()');
    expect(results[0]!.message).toContain('Math.trunc()');
  });

  it('passes Math.trunc()', async () => {
    const code: string = `const truncated = Math.trunc(value);`;
    const results: LintResult[] = await lint(preferMathTrunc, code);
    expect(results.length).toBe(0);
  });

  it('passes other Math methods', async () => {
    const code: string = `const x = Math.ceil(value);`;
    const results: LintResult[] = await lint(preferMathTrunc, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-lossy-math-operation
// =============================================================================

describe('primitives/no-lossy-math-operation', () => {
  it('reports Math.round(x) / N pattern', async () => {
    const code: string = `const rounded = Math.round(price * 100) / 100;`;
    const results: LintResult[] = await lint(noLossyMathOperation, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Lossy rounding');
  });

  it('passes normal division', async () => {
    const code: string = `const half = total / 2;`;
    const results: LintResult[] = await lint(noLossyMathOperation, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-string-length-unicode
// =============================================================================

describe('primitives/no-string-length-unicode', () => {
  it('reports .length on identifier', async () => {
    const code: string = `const len = username.length;`;
    const results: LintResult[] = await lint(noStringLengthUnicode, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('UTF-16 code units');
  });

  it('passes non-length property', async () => {
    const code: string = `const x = obj.name;`;
    const results: LintResult[] = await lint(noStringLengthUnicode, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-string-index-unicode
// =============================================================================

describe('primitives/no-string-index-unicode', () => {
  it('reports .charAt() call', async () => {
    const code: string = `const ch = str.charAt(0);`;
    const results: LintResult[] = await lint(noStringIndexUnicode, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('unicode');
  });

  it('passes other method calls', async () => {
    const code: string = `const upper = str.toUpperCase();`;
    const results: LintResult[] = await lint(noStringIndexUnicode, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/prefer-normalize-comparison
// =============================================================================

describe('primitives/prefer-normalize-comparison', () => {
  it('reports variable === variable comparison', async () => {
    const code: string = `if (name1 === name2) {}`;
    const results: LintResult[] = await lint(preferNormalizeComparison, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('normalize()');
  });

  it('passes literal comparison', async () => {
    const code: string = `if (x === "hello") {}`;
    const results: LintResult[] = await lint(preferNormalizeComparison, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-regex-on-untrusted
// =============================================================================

describe('primitives/no-regex-on-untrusted', () => {
  it('reports new RegExp(variable)', async () => {
    const code: string = `const re = new RegExp(userInput);`;
    const results: LintResult[] = await lint(noRegexOnUntrusted, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ReDoS');
  });

  it('passes new RegExp(literal)', async () => {
    const code: string = `const re = new RegExp("pattern");`;
    const results: LintResult[] = await lint(noRegexOnUntrusted, code);
    expect(results.length).toBe(0);
  });

  it('passes non-RegExp constructor', async () => {
    const code: string = `const d = new Date();`;
    const results: LintResult[] = await lint(noRegexOnUntrusted, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-new-date-string-parse
// =============================================================================

describe('primitives/no-new-date-string-parse', () => {
  it('reports new Date(string)', async () => {
    const code: string = `const d = new Date("01/15/2024");`;
    const results: LintResult[] = await lint(noNewDateStringParse, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Date string parsing');
  });

  it('passes new Date() with no args', async () => {
    const code: string = `const d = new Date();`;
    const results: LintResult[] = await lint(noNewDateStringParse, code);
    expect(results.length).toBe(0);
  });

  it('passes new Date(number)', async () => {
    const code: string = `const d = new Date(1704067200000);`;
    const results: LintResult[] = await lint(noNewDateStringParse, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-date-mutation
// =============================================================================

describe('primitives/no-date-mutation', () => {
  it('reports .setMonth() call', async () => {
    const code: string = `date.setMonth(date.getMonth() + 1);`;
    const results: LintResult[] = await lint(noDateMutation, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Date mutation');
  });

  it('reports .setFullYear() call', async () => {
    const code: string = `date.setFullYear(2025);`;
    const results: LintResult[] = await lint(noDateMutation, code);
    expect(results.length).toBe(1);
  });

  it('reports .setDate() call', async () => {
    const code: string = `d.setDate(15);`;
    const results: LintResult[] = await lint(noDateMutation, code);
    expect(results.length).toBe(1);
  });

  it('passes .getMonth() call', async () => {
    const code: string = `const m = date.getMonth();`;
    const results: LintResult[] = await lint(noDateMutation, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-date-arithmetic
// =============================================================================

describe('primitives/no-date-arithmetic', () => {
  it('reports subtraction involving new Date()', async () => {
    const code: string = `const elapsed = new Date() - new Date(0);`;
    const results: LintResult[] = await lint(noDateArithmetic, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Date arithmetic');
    expect(results[0]!.message).toContain('milliseconds');
  });

  it('passes getTime() subtraction', async () => {
    const code: string = `const diff = end.getTime() - start.getTime();`;
    const results: LintResult[] = await lint(noDateArithmetic, code);
    expect(results.length).toBe(0);
  });

  it('passes non-subtraction', async () => {
    const code: string = `const sum = a + b;`;
    const results: LintResult[] = await lint(noDateArithmetic, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-json-bigint
// =============================================================================

describe('primitives/no-json-bigint', () => {
  it('reports JSON.parse() without reviver', async () => {
    const code: string = `const data = JSON.parse(text);`;
    const results: LintResult[] = await lint(noJsonBigint, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('JSON.parse');
    expect(results[0]!.message).toContain('precision');
  });

  it('passes JSON.parse() with reviver', async () => {
    const code: string = `const data = JSON.parse(text, reviver);`;
    const results: LintResult[] = await lint(noJsonBigint, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-json-undefined
// =============================================================================

describe('primitives/no-json-undefined', () => {
  it('reports JSON.stringify() without replacer', async () => {
    const code: string = `const json = JSON.stringify(obj);`;
    const results: LintResult[] = await lint(noJsonUndefined, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('JSON.stringify');
    expect(results[0]!.message).toContain('undefined');
  });

  it('passes JSON.stringify() with replacer', async () => {
    const code: string = `const json = JSON.stringify(obj, replacer);`;
    const results: LintResult[] = await lint(noJsonUndefined, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-json-circular
// =============================================================================

describe('primitives/no-json-circular', () => {
  it('reports JSON.stringify() without replacer', async () => {
    const code: string = `const json = JSON.stringify(data);`;
    const results: LintResult[] = await lint(noJsonCircular, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('circular');
  });

  it('passes JSON.stringify() with replacer', async () => {
    const code: string = `const json = JSON.stringify(data, replacer);`;
    const results: LintResult[] = await lint(noJsonCircular, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-json-nan-infinity
// =============================================================================

describe('primitives/no-json-nan-infinity', () => {
  it('reports JSON.stringify() without replacer', async () => {
    const code: string = `const json = JSON.stringify(obj);`;
    const results: LintResult[] = await lint(noJsonNanInfinity, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('NaN');
    expect(results[0]!.message).toContain('Infinity');
  });

  it('passes JSON.stringify() with replacer', async () => {
    const code: string = `const json = JSON.stringify(obj, handler);`;
    const results: LintResult[] = await lint(noJsonNanInfinity, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-compare-different-types
// =============================================================================

describe('primitives/no-compare-different-types', () => {
  it('reports string > number comparison', async () => {
    const code: string = `if ("10" > 9) {}`;
    const results: LintResult[] = await lint(noCompareDifferentTypes, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('different types');
    expect(results[0]!.message).toContain('coercion');
  });

  it('passes same-type comparison', async () => {
    const code: string = `if (10 > 9) {}`;
    const results: LintResult[] = await lint(noCompareDifferentTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes equality operator (not relational)', async () => {
    const code: string = `if ("10" === 10) {}`;
    const results: LintResult[] = await lint(noCompareDifferentTypes, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-relational-null-undefined
// =============================================================================

describe('primitives/no-relational-null-undefined', () => {
  it('reports null >= 0', async () => {
    const code: string = `if (null >= 0) {}`;
    const results: LintResult[] = await lint(noRelationalNullUndefined, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('null/undefined');
    expect(results[0]!.message).toContain('counterintuitive');
  });

  it('reports undefined > 0', async () => {
    const code: string = `if (undefined > 0) {}`;
    const results: LintResult[] = await lint(noRelationalNullUndefined, code);
    expect(results.length).toBe(1);
  });

  it('passes null === null', async () => {
    const code: string = `if (x === null) {}`;
    const results: LintResult[] = await lint(noRelationalNullUndefined, code);
    expect(results.length).toBe(0);
  });

  it('passes normal relational comparison', async () => {
    const code: string = `if (a > b) {}`;
    const results: LintResult[] = await lint(noRelationalNullUndefined, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/object-is-for-special
// =============================================================================

describe('primitives/object-is-for-special', () => {
  it('reports === NaN', async () => {
    const code: string = `if (x === NaN) {}`;
    const results: LintResult[] = await lint(objectIsForSpecial, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Object.is()');
  });

  it('passes normal ===', async () => {
    const code: string = `if (x === y) {}`;
    const results: LintResult[] = await lint(objectIsForSpecial, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-array-hole
// =============================================================================

describe('primitives/no-array-hole', () => {
  it('reports sparse array literal', async () => {
    const code: string = `const arr = [1, , 3];`;
    const results: LintResult[] = await lint(noArrayHole, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Array holes');
  });

  it('reports Array.from({ length: n })', async () => {
    const code: string = `const arr = Array.from({ length: 5 });`;
    const results: LintResult[] = await lint(noArrayHole, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('sparse array');
  });

  it('reports delete arr[i]', async () => {
    const code: string = `delete arr[1];`;
    const results: LintResult[] = await lint(noArrayHole, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('delete');
    expect(results[0]!.message).toContain('hole');
  });

  it('passes dense array', async () => {
    const code: string = `const arr = [1, 2, 3];`;
    const results: LintResult[] = await lint(noArrayHole, code);
    expect(results.length).toBe(0);
  });

  it('passes new Array() without args', async () => {
    const code: string = `const arr = new Array();`;
    const results: LintResult[] = await lint(noArrayHole, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-array-length-mutation
// =============================================================================

describe('primitives/no-array-length-mutation', () => {
  it('reports arr.length = 0', async () => {
    const code: string = `arr.length = 0;`;
    const results: LintResult[] = await lint(noArrayLengthMutation, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.length mutation');
  });

  it('reports arr.length = 2', async () => {
    const code: string = `items.length = 2;`;
    const results: LintResult[] = await lint(noArrayLengthMutation, code);
    expect(results.length).toBe(1);
  });

  it('passes reading .length', async () => {
    const code: string = `const len = arr.length;`;
    const results: LintResult[] = await lint(noArrayLengthMutation, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-array-index-string
// =============================================================================

describe('primitives/no-array-index-string', () => {
  it('reports arr["key"] = value', async () => {
    const code: string = `arr["key"] = "value";`;
    const results: LintResult[] = await lint(noArrayIndexString, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('String index');
  });

  it('passes arr[0] = value (numeric)', async () => {
    const code: string = `arr[0] = "value";`;
    const results: LintResult[] = await lint(noArrayIndexString, code);
    expect(results.length).toBe(0);
  });

  it('passes arr["0"] = value (numeric string)', async () => {
    const code: string = `arr["0"] = "value";`;
    const results: LintResult[] = await lint(noArrayIndexString, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-object-prototype-access
// =============================================================================

describe('primitives/no-object-prototype-access', () => {
  it('reports .hasOwnProperty()', async () => {
    const code: string = `obj.hasOwnProperty("key");`;
    const results: LintResult[] = await lint(noObjectPrototypeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Object.hasOwn()');
  });

  it('passes Object.hasOwn()', async () => {
    const code: string = `Object.hasOwn(obj, "key");`;
    const results: LintResult[] = await lint(noObjectPrototypeAccess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// primitives/no-in-operator-primitive
// =============================================================================

describe('primitives/no-in-operator-primitive', () => {
  it('reports "key" in "string"', async () => {
    const code: string = `if ("length" in "hello") {}`;
    const results: LintResult[] = await lint(noInOperatorPrimitive, code);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'in' operator");
    expect(results[0]!.message).toContain('primitives');
  });

  it('reports "key" in 123', async () => {
    const code: string = `if (0 in 123) {}`;
    const results: LintResult[] = await lint(noInOperatorPrimitive, code);
    expect(results.length).toBe(1);
  });

  it('passes "key" in object', async () => {
    const code: string = `if ("key" in obj) {}`;
    const results: LintResult[] = await lint(noInOperatorPrimitive, code);
    expect(results.length).toBe(0);
  });
});
