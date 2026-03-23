/**
 * Tests for TypeScript lint rules.
 *
 * Uses oxc-parser to parse fixture code and verifies each rule
 * produces the expected diagnostics.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import requireTypeAnnotation from './require-type-annotation.ts';
import noBareAsCast from './no-bare-as-cast.ts';
import noBuiltinTypes from './no-builtin-types.ts';
import requireConstComment from './require-const-comment.ts';
import requireReturnType from './require-return-type.ts';
import noEmptyCatch from './no-empty-catch.ts';
import noThrow from './no-throw.ts';
import noBareDataTypes from './no-bare-data-types.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param rule - The rule to test
 * @param code - TypeScript source code
 * @returns Array of lint results
 */
function lint(rule: TypeScriptRule, code: string): Promise<LintResult[]> {
  return runTypeScriptRules('test.ts', code, [rule]);
}

// =============================================================================
// typescript/require-type-annotation
// =============================================================================

describe('typescript/require-type-annotation', () => {
  it('reports const without type annotation', async () => {
    const code: string = 'const x = 42;';
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain("'x'");
    expect(results[0].fix).toBeDefined();
    expect(results[0].fix.text).toBe(': TYPE');
  });

  it('passes const with type annotation', async () => {
    const code: string = 'const x: number = 42;';
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(0);
  });

  it('reports function parameter without type', async () => {
    const code: string = 'function foo(x) { return x; }';
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain("'x'");
  });

  it('passes function parameter with type', async () => {
    const code: string = 'function foo(x: string): string { return x; }';
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(0);
  });

  it('passes const with as expression (type is explicit via cast)', async () => {
    const code: string = "const x = 'hello' as unknown;";
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/no-bare-as-cast
// =============================================================================

describe('typescript/no-bare-as-cast', () => {
  it('reports as cast without comment', async () => {
    const code: string = "const x: unknown = 'hello' as unknown;";
    const results: LintResult[] = await lint(noBareAsCast, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('typescript/no-bare-as-cast');
    expect(results[0].fix).toBeDefined();
  });

  it('passes as cast with inline comment', async () => {
    const code: string = "const x: unknown = 'hello' as unknown; // Cast safe: test value";
    const results: LintResult[] = await lint(noBareAsCast, code);
    expect(results.length).toBe(0);
  });

  it('passes as cast with comment on preceding line', async () => {
    const code: string = `// Cast safe: needed for testing
const x: unknown = 'hello' as unknown;`;
    const results: LintResult[] = await lint(noBareAsCast, code);
    expect(results.length).toBe(0);
  });

  it('does not report as const', async () => {
    const code: string = "const x = 'hello' as const;";
    const results: LintResult[] = await lint(noBareAsCast, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/no-builtin-types
// =============================================================================

describe('typescript/no-builtin-types', () => {
  it('reports string in type annotation', async () => {
    const code: string = 'const x: string = "";';
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Str');
    expect(results[0].fix.text).toBe('Str');
  });

  it('reports number in type annotation', async () => {
    const code: string = 'const x: number = 0;';
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Num');
  });

  it('reports boolean in type annotation', async () => {
    const code: string = 'const x: boolean = false;';
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Bool');
  });

  it('reports void in type annotation', async () => {
    const code: string = 'function foo(): void {}';
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Void');
  });

  it('allows void inside Promise<void>', async () => {
    const code: string = 'async function foo(): Promise<void> {}';
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(0);
  });

  it('does not report Str/Num/Bool/Void', async () => {
    const code: string = `
import type { Str, Num, Bool } from '@/schemas/common';
const x: Str = '';
const y: Num = 0;
const z: Bool = false;
`;
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/require-const-comment
// =============================================================================

describe('typescript/require-const-comment', () => {
  it('reports top-level const without comment', async () => {
    const code: string = 'const MAX_RETRIES: number = 3;';
    const results: LintResult[] = await lint(requireConstComment, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('typescript/require-const-comment');
    expect(results[0].message).toContain('MAX_RETRIES');
    expect(results[0].fix.text).toContain('/** Description. */');
  });

  it('passes top-level const with JSDoc comment', async () => {
    const code: string = `/** Maximum retries. */
const MAX_RETRIES: number = 3;`;
    const results: LintResult[] = await lint(requireConstComment, code);
    expect(results.length).toBe(0);
  });

  it('passes top-level const with // comment', async () => {
    const code: string = `// Maximum retries
const MAX_RETRIES: number = 3;`;
    const results: LintResult[] = await lint(requireConstComment, code);
    expect(results.length).toBe(0);
  });

  it('reports exported const without comment', async () => {
    const code: string = 'export const FOO: string = "bar";';
    const results: LintResult[] = await lint(requireConstComment, code);
    expect(results.length).toBe(1);
  });

  it('passes exported const with comment', async () => {
    const code: string = `/** Foo value. */
export const FOO: string = "bar";`;
    const results: LintResult[] = await lint(requireConstComment, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/require-return-type
// =============================================================================

describe('typescript/require-return-type', () => {
  it('reports function without return type', async () => {
    const code: string = 'function foo() { return 42; }';
    const results: LintResult[] = await lint(requireReturnType, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('typescript/require-return-type');
    expect(results[0].message).toContain('foo');
    expect(results[0].fix.text).toBe(': ReturnType');
  });

  it('passes function with return type', async () => {
    const code: string = 'function foo(): number { return 42; }';
    const results: LintResult[] = await lint(requireReturnType, code);
    expect(results.length).toBe(0);
  });

  it('reports arrow function without return type', async () => {
    const code: string = 'const foo = () => 42;';
    const results: LintResult[] = await lint(requireReturnType, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Arrow function');
  });

  it('passes arrow function with return type', async () => {
    const code: string = 'const foo = (): number => 42;';
    const results: LintResult[] = await lint(requireReturnType, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/no-empty-catch
// =============================================================================

describe('typescript/no-empty-catch', () => {
  it('reports empty catch without comment', async () => {
    const code: string = 'try { } catch (e) {}';
    const results: LintResult[] = await lint(noEmptyCatch, code);
    expect(results.some((r: LintResult): boolean => r.severity === 'error')).toBe(true);
    expect(results[0].ruleId).toBe('typescript/no-empty-catch');
  });

  it('passes empty catch with block comment', async () => {
    const code: string = 'try { } catch (e) { /* intentionally ignored */ }';
    const results: LintResult[] = await lint(noEmptyCatch, code);
    expect(results.length).toBe(0);
  });

  it('passes empty catch with line comment', async () => {
    const code: string = `try { } catch (e) {
  // intentionally ignored
}`;
    const results: LintResult[] = await lint(noEmptyCatch, code);
    expect(results.length).toBe(0);
  });

  it('warns on non-empty catch without fromUnknownError', async () => {
    const code: string = 'try { } catch (e) { /* handled */ console.log(e); }';
    const results: LintResult[] = await lint(noEmptyCatch, code);
    expect(results.some((r: LintResult): boolean => r.message.includes('fromUnknownError'))).toBe(
      true,
    );
  });

  it('warns on catch without err() return', async () => {
    const code: string = `try { } catch (e) {
  /* handled */
  const appError = fromUnknownError(e);
  console.log(appError);
}`;
    const results: LintResult[] = await lint(noEmptyCatch, code);
    expect(results.some((r: LintResult): boolean => r.message.includes('return err()'))).toBe(true);
  });

  it('passes catch with full fromUnknownError + err pattern', async () => {
    const code: string = `try { } catch (e: unknown) {
  /* Convert and propagate error */
  const appError = fromUnknownError(e);
  return err(ERRORS.IO.READ_FAILED, { cause: appError });
}`;
    const results: LintResult[] = await lint(noEmptyCatch, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/no-throw
// =============================================================================

describe('typescript/no-throw', () => {
  it('reports throw statement', async () => {
    const code: string = "throw new Error('fail');";
    const results: LintResult[] = await lint(noThrow, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('typescript/no-throw');
    expect(results[0].message).toContain('err(ERRORS');
  });

  it('passes code without throw', async () => {
    const code: string = "const x: string = 'hello';";
    const results: LintResult[] = await lint(noThrow, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/no-bare-data-types
// =============================================================================

describe('typescript/no-bare-data-types', () => {
  it('reports interface declaration', async () => {
    const code: string = `
interface User {
  name: string;
  age: number;
}
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('typescript/no-bare-data-types');
    expect(results[0].message).toContain("'User'");
    expect(results[0].message).toContain('Valibot');
  });

  it('reports type alias with object literal', async () => {
    const code: string = `
type Config = {
  host: string;
  port: number;
};
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain("'Config'");
  });

  it('passes type alias with v.InferOutput', async () => {
    const code: string = `
type User = v.InferOutput<typeof UserSchema>;
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes union types', async () => {
    const code: string = `
type Status = 'active' | 'inactive';
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes function types', async () => {
    const code: string = `
type Handler = (event: Event) => void;
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes intersection types', async () => {
    const code: string = `
type Combined = Base & Extra;
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });
});
