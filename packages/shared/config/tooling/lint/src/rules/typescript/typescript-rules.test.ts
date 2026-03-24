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
import noModuleSideEffects from './no-module-side-effects.ts';
import requireConstComment from './require-const-comment.ts';
import requireReturnType from './require-return-type.ts';
import noEmptyCatch from './no-empty-catch.ts';
import noThrow from './no-throw.ts';
import noBareDataTypes from './no-bare-data-types.ts';
import noUnionNull from './no-union-null.ts';
import requireNonNegativeInteger from './require-non-negative-integer.ts';
import noDefaultParams from './no-default-params.ts';
import noGenericFunctionType from './no-generic-function-type.ts';
import noUnionParams from './no-union-params.ts';
import requireFunctionSchema from './require-function-schema.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param rule - The rule to test
 * @param code - TypeScript source code
 * @param filename - Optional file name for path-based exemptions
 * @returns Array of lint results
 */
function lint(rule: TypeScriptRule, code: string, filename?: string): Promise<LintResult[]> {
  return runTypeScriptRules(filename ?? 'test.ts', code, [rule]);
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

  it('allows Schema const without type annotation (Valibot convention)', async () => {
    const code: string = `const GitInfoSchema = v.strictObject({ commit: v.string() });`;
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(0);
  });

  it('flags destructured array without type annotation', async () => {
    const code: string = `const [target] = targets;`;
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('array');
  });

  it('passes destructured array with type annotation', async () => {
    const code: string = `const [target]: string[] = targets;`;
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(0);
  });

  it('passes for-of destructured binding when iterable is typed', async () => {
    const code: string = `const entries: Array<[string, string[]]> = Object.entries(paths);\nfor (const [alias, targets] of entries) {\n  const [target]: string[] = targets;\n}`;
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(0);
  });

  it('passes for-of simple binding when iterable is typed', async () => {
    const code: string = `const items: string[] = getItems();\nfor (const item of items) {}`;
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(0);
  });

  it('flags destructured array outside for-of without annotation', async () => {
    const code: string = `const [a, b] = something;`;
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('array');
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

  it('reports string inside Record generic', async () => {
    const code: string = `const x: Record<string, Str> = {};`;
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Str');
  });

  it('reports number inside Array generic', async () => {
    const code: string = `const x: Array<number> = [];`;
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Num');
  });

  it('reports multiple builtins inside Map generic', async () => {
    const code: string = `const x: Map<string, number> = new Map();`;
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(2);
  });

  it('reports void in function type return', async () => {
    const code: string = `type Handler = () => void;`;
    const results: LintResult[] = await lint(noBuiltinTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Void');
  });

  it('passes Void in function type return', async () => {
    const code: string = `type Handler = () => Void;`;
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

  it('flags err() without cause in meta', async () => {
    const code: string = `try { } catch (e: unknown) {
  /* handled */
  const appError = fromUnknownError(e);
  return err(ERRORS.IO.READ_FAILED);
}`;
    const results: LintResult[] = await lint(noEmptyCatch, code);
    expect(results.some((r: LintResult): boolean => r.message.includes('cause'))).toBe(true);
  });

  it('flags generic INTERNAL.UNEXPECTED error code', async () => {
    const code: string = `try { } catch (e: unknown) {
  /* handled */
  const appError = fromUnknownError(e);
  return err(ERRORS.INTERNAL.UNEXPECTED, { cause: appError });
}`;
    const results: LintResult[] = await lint(noEmptyCatch, code);
    expect(results.some((r: LintResult): boolean => r.message.includes('specific error code'))).toBe(true);
  });

  it('passes err() with cause and specific code', async () => {
    const code: string = `try { } catch (e: unknown) {
  /* Convert error */
  const appError = fromUnknownError(e);
  return err(ERRORS.IO.WRITE_FAILED, { cause: appError });
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

  it('allows throw result.error with integration boundary comment', async () => {
    const code: string = `if (!gitResult.ok) throw gitResult.error; // integration boundary: Vite doesn't understand Result`;
    const results: LintResult[] = await lint(noThrow, code);
    expect(results.length).toBe(0);
  });

  it('still flags throw result.error WITHOUT integration boundary comment', async () => {
    const code: string = `if (!gitResult.ok) throw gitResult.error;`;
    const results: LintResult[] = await lint(noThrow, code);
    expect(results.length).toBe(1);
  });

  it('still flags throw new Error with integration boundary comment missing colon+reason', async () => {
    const code: string = `throw new Error('fail'); // integration boundary`;
    const results: LintResult[] = await lint(noThrow, code);
    expect(results.length).toBe(1);
  });

  it('allows throw new Error with proper integration boundary comment', async () => {
    const code: string = `throw new Error('fail'); // integration boundary: module initialization requires valid defaults`;
    const results: LintResult[] = await lint(noThrow, code);
    expect(results.length).toBe(0);
  });

  it('allows throw new Error with integration boundary comment on line above', async () => {
    const code: string = `
// integration boundary: module initialization requires valid defaults
throw new Error('fail');
`;
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

  it('reports inline object return type on function', async () => {
    const code: string = `
function getInfo(): { name: string; age: number } {
  return { name: 'test', age: 1 };
}
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('getInfo');
    expect(results[0].message).toContain('inline object');
  });

  it('reports inline object return type on arrow function', async () => {
    const code: string = `
const getInfo = (): { name: string; age: number } => ({ name: 'test', age: 1 });
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('inline object');
  });

  it('passes function with named return type', async () => {
    const code: string = `
function getInfo(): GitInfo {
  return { name: 'test', age: 1 };
}
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes function with Result return type', async () => {
    const code: string = `
function getInfo(): Result<GitInfo> {
  return ok(GitInfoSchema, data);
}
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes function with void return type', async () => {
    const code: string = `
function doStuff(): void {
  console.log('done');
}
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('reports inline object type on function parameter', async () => {
    const code: string = `
function process(options: { host: string; port: number }): void {
  console.log(options);
}
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain("'options'");
    expect(results[0].message).toContain('inline object');
  });

  it('passes parameter with named type', async () => {
    const code: string = `
function process(options: ProcessOptions): void {
  console.log(options);
}
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes parameter with primitive type', async () => {
    const code: string = `
function process(name: string): void {
  console.log(name);
}
`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('flags interface in config/tooling/svelte path (no longer exempt)', async () => {
    const code: string = `interface TsconfigJson { paths?: Record<string, string[]>; }`;
    const results: LintResult[] = await lint(
      noBareDataTypes,
      code,
      'packages/shared/config/tooling/svelte/src/index.ts',
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it('flags inline object type on variable annotation', async () => {
    const code: string = `const config: { host: string; port: number } = { host: 'localhost', port: 3000 };`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('inline object');
  });

  it('flags inline object type on destructured annotation', async () => {
    const code: string = `const { a, b }: { a: string; b: number } = data;`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Destructured');
  });

  it('flags inline object type on as cast', async () => {
    const code: string = `const x: unknown = data as { foo: string };`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Cast');
  });

  it('passes variable with named type', async () => {
    const code: string = `const config: Config = { host: 'localhost', port: 3000 };`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('passes generic type alias (type parameters have no runtime representation)', async () => {
    const code: string = `type Store<T> = { value: T; get: () => T };`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(0);
  });

  it('still flags non-generic bare type alias', async () => {
    const code: string = `type Config = { host: string; port: number };`;
    const results: LintResult[] = await lint(noBareDataTypes, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// typescript/no-module-side-effects (Fix 5)
// =============================================================================

describe('typescript/no-module-side-effects', () => {
  it('reports top-level throw', async () => {
    const code: string = `
throw new Error('module init failed');
`;
    const results: LintResult[] = await lint(noModuleSideEffects, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('typescript/no-module-side-effects');
    expect(results[0].message).toContain('throw');
  });

  it('reports top-level if-statement containing throw', async () => {
    const code: string = `
const parsed = safeParse(Schema, data);
if (!parsed.ok) {
  throw new Error('validation failed');
}
`;
    const results: LintResult[] = await lint(noModuleSideEffects, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('conditional throw');
  });

  it('reports top-level function call expression', async () => {
    const code: string = `
initializeGlobals();
`;
    const results: LintResult[] = await lint(noModuleSideEffects, code);
    expect(results.length).toBe(1);
    expect(results[0].severity).toBe('error');
  });

  it('passes import declarations', async () => {
    const code: string = `
import { foo } from './bar';
`;
    const results: LintResult[] = await lint(noModuleSideEffects, code);
    expect(results.length).toBe(0);
  });

  it('passes export declarations', async () => {
    const code: string = `
export function loadConfig(): Result<Config> {
  return safeParse(Schema, data);
}
`;
    const results: LintResult[] = await lint(noModuleSideEffects, code);
    expect(results.length).toBe(0);
  });

  it('passes variable declarations (even with function calls)', async () => {
    const code: string = `
const result = safeParse(Schema, data);
`;
    const results: LintResult[] = await lint(noModuleSideEffects, code);
    expect(results.length).toBe(0);
  });

  it('does not flag throw inside function body', async () => {
    const code: string = `
function example() {
  throw new Error('inside function');
}
`;
    const results: LintResult[] = await lint(noModuleSideEffects, code);
    expect(results.length).toBe(0);
  });

  it('passes top-level if-throw with integration boundary comment', async () => {
    const code: string = `
const parsed = safeParse(Schema, data);
if (!parsed.ok) {
  // integration boundary: module initialization requires valid defaults
  throw new Error('validation failed');
}
`;
    const results: LintResult[] = await lint(noModuleSideEffects, code);
    expect(results.length).toBe(0);
  });

  it('still flags top-level if-throw without integration boundary comment', async () => {
    const code: string = `
const parsed = safeParse(Schema, data);
if (!parsed.ok) {
  throw new Error('validation failed');
}
`;
    const results: LintResult[] = await lint(noModuleSideEffects, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// typescript/no-bare-as-cast — Fix 9: unvalidated cast escalation
// =============================================================================

describe('typescript/no-bare-as-cast — unvalidated cast detection', () => {
  it('reports unvalidated cast with specific message when no safeParse precedes', async () => {
    const code: string = `
const rawConfig = {};
const config = rawConfig as Config;
`;
    const results: LintResult[] = await lint(noBareAsCast, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Unvalidated');
    expect(results[0].message).toContain('no safeParse');
  });

  it('reports bare cast with standard message when safeParse precedes', async () => {
    const code: string = `
const parsed = safeParse(Schema, data);
const config = parsed.data as Config;
`;
    const results: LintResult[] = await lint(noBareAsCast, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toBe('Bare `as` cast without explanatory comment');
  });

  it('passes when cast has explanatory comment', async () => {
    const code: string = `
const config = rawConfig as Config; // Cast safe: validated by schema above
`;
    const results: LintResult[] = await lint(noBareAsCast, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/no-union-null
// =============================================================================

describe('typescript/no-union-null', () => {
  it('flags | null in type annotation', async () => {
    const code: string = `const x: string | null = null;`;
    const results: LintResult[] = await lint(noUnionNull, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('typescript/no-union-null');
    expect(results[0].message).toContain('NullableStr');
  });

  it('flags | undefined in type annotation', async () => {
    const code: string = `const x: string | undefined = undefined;`;
    const results: LintResult[] = await lint(noUnionNull, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('OptionalStr');
  });

  it('passes NullableStr type', async () => {
    const code: string = `const x: NullableStr = null;`;
    const results: LintResult[] = await lint(noUnionNull, code);
    expect(results.length).toBe(0);
  });

  it('exempts test files', async () => {
    const code: string = `const x: string | null = null;`;
    const results: LintResult[] = await lint(noUnionNull, code, 'my-module.test.ts');
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/require-non-negative-integer
// =============================================================================

describe('typescript/require-non-negative-integer', () => {
  it('flags .length typed as Num', async () => {
    const code: string = `const len: Num = arr.length;`;
    const results: LintResult[] = await lint(requireNonNegativeInteger, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('typescript/require-non-negative-integer');
    expect(results[0].message).toContain('NonNegativeInteger');
  });

  it('passes .length typed as NonNegativeInteger', async () => {
    const code: string = `const len: NonNegativeInteger = arr.length;`;
    const results: LintResult[] = await lint(requireNonNegativeInteger, code);
    expect(results.length).toBe(0);
  });

  it('does not flag indexOf typed as Num', async () => {
    const code: string = `const idx: Num = str.indexOf('x');`;
    const results: LintResult[] = await lint(requireNonNegativeInteger, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/no-default-params
// =============================================================================

describe('typescript/no-default-params', () => {
  it('flags function parameter with default value', async () => {
    const code: string = `function createConfig(name: string = 'default'): void {}`;
    const results: LintResult[] = await lint(noDefaultParams, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('typescript/no-default-params');
    expect(results[0].message).toContain('default value');
    expect(results[0].message).toContain('Valibot');
  });

  it('flags optional parameter with ?', async () => {
    const code: string = `function processData(input: string, options?: object): void {}`;
    const results: LintResult[] = await lint(noDefaultParams, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('optional');
    expect(results[0].message).toContain('options');
  });

  it('flags destructured parameter with default', async () => {
    const code: string = `function createConfig({ name = 'foo' }: Options): void {}`;
    const results: LintResult[] = await lint(noDefaultParams, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('name');
    expect(results[0].message).toContain('default value');
  });

  it('flags exported function parameter with default', async () => {
    const code: string = `export function createConfig(name: string = 'default'): void {}`;
    const results: LintResult[] = await lint(noDefaultParams, code);
    expect(results.length).toBe(1);
  });

  it('flags non-exported function parameter with default', async () => {
    const code: string = `function internal(count: number = 0): void {}`;
    const results: LintResult[] = await lint(noDefaultParams, code);
    expect(results.length).toBe(1);
  });

  it('passes function without defaults or optionals', async () => {
    const code: string = `function createConfig(name: string): void {}`;
    const results: LintResult[] = await lint(noDefaultParams, code);
    expect(results.length).toBe(0);
  });

  it('ignores test files', async () => {
    const code: string = `function helper(name: string = 'test'): void {}`;
    const results: LintResult[] = await runTypeScriptRules('foo.test.ts', code, [noDefaultParams]);
    expect(results.length).toBe(0);
  });

  it('flags arrow function with default', async () => {
    const code: string = `const fn = (name: string = 'default'): void => {};`;
    const results: LintResult[] = await lint(noDefaultParams, code);
    expect(results.length).toBe(1);
  });

  it('flags multiple defaults in same function', async () => {
    const code: string = `function multi(a: string = '', b: number = 0): void {}`;
    const results: LintResult[] = await lint(noDefaultParams, code);
    expect(results.length).toBe(2);
  });
});

// =============================================================================
// typescript/no-generic-function-type
// =============================================================================

describe('typescript/no-generic-function-type', () => {
  it('flags ...args: unknown[] in function type', async () => {
    const code: string = `type Handler = (...args: unknown[]) => void;`;
    const results: LintResult[] = await lint(noGenericFunctionType, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('unknown[]');
  });

  it('passes function type with specific params', async () => {
    const code: string = `type Handler = (name: string, count: number) => void;`;
    const results: LintResult[] = await lint(noGenericFunctionType, code);
    expect(results.length).toBe(0);
  });

  it('passes function type with typed rest params', async () => {
    const code: string = `type Logger = (...messages: string[]) => void;`;
    const results: LintResult[] = await lint(noGenericFunctionType, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/require-type-annotation — FunctionExpression
// =============================================================================

describe('typescript/require-type-annotation — FunctionExpression', () => {
  it('flags untyped parameter in object method', async () => {
    const code: string = `const obj = { handler: function(server) { return; } };`;
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.some((r: LintResult): boolean => r.message.includes("'server'"))).toBe(true);
  });

  it('passes typed parameter in object method', async () => {
    const code: string = `const obj: Obj = { handler: function(server: Server): void { return; } };`;
    const results: LintResult[] = await lint(requireTypeAnnotation, code);
    expect(results.some((r: LintResult): boolean => r.message.includes("'server'"))).toBe(false);
  });
});

// =============================================================================
// typescript/no-union-params
// =============================================================================

describe('typescript/no-union-params', () => {
  it('flags parameter with Str | undefined union', async () => {
    const code: string = `export function foo(x: Str | undefined): void {}`;
    const results: LintResult[] = await lint(noUnionParams, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('union type');
  });

  it('flags parameter with Style | undefined union', async () => {
    const code: string = `export function foo(style: DateTimeStyle | undefined): void {}`;
    const results: LintResult[] = await lint(noUnionParams, code);
    expect(results.length).toBe(1);
  });

  it('passes parameter without union type', async () => {
    const code: string = `export function foo(x: Str): void {}`;
    const results: LintResult[] = await lint(noUnionParams, code);
    expect(results.length).toBe(0);
  });

  it('passes Date | Num union (exempt external pattern)', async () => {
    const code: string = `export function foo(value: Date | Num): void {}`;
    const results: LintResult[] = await lint(noUnionParams, code);
    expect(results.length).toBe(0);
  });

  it('does not flag non-exported functions', async () => {
    const code: string = `function foo(x: Str | undefined): void {}`;
    const results: LintResult[] = await lint(noUnionParams, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// typescript/require-function-schema
// =============================================================================

describe('typescript/require-function-schema', () => {
  it('flags v.custom with function type parameter', async () => {
    const code: string = `const schema = v.strictObject({ handler: v.custom<() => void>(() => true) });`;
    const results: LintResult[] = await lint(requireFunctionSchema, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('functionSchema()');
  });

  it('flags v.custom with arrow function type parameter', async () => {
    const code: string = `const schema = v.strictObject({ cb: v.custom<(x: Str) => Result<Void>>(() => true) });`;
    const results: LintResult[] = await lint(requireFunctionSchema, code);
    expect(results.length).toBe(1);
  });

  it('passes v.custom with non-function type parameter', async () => {
    const code: string = `const schema = v.strictObject({ adapter: v.custom<Adapter>(() => true) });`;
    const results: LintResult[] = await lint(requireFunctionSchema, code);
    expect(results.length).toBe(0);
  });

  it('passes functionSchema() usage', async () => {
    const code: string = `const schema = v.strictObject({ handler: functionSchema() });`;
    const results: LintResult[] = await lint(requireFunctionSchema, code);
    expect(results.length).toBe(0);
  });

  it('exempts schemas/common path (circular dependency)', async () => {
    const code: string = `const Schema = v.custom<() => void>(() => true);`;
    const results: LintResult[] = await lint(
      requireFunctionSchema,
      code,
      'packages/shared/schemas/common/src/index.ts',
    );
    expect(results.length).toBe(0);
  });
});
