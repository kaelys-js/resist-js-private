/**
 * Tests for JSDoc lint rules.
 *
 * Uses oxc-parser to parse fixture code and verifies each rule
 * produces the expected diagnostics.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import requireJsdoc from './require-jsdoc.ts';
import requireParam from './require-param.ts';
import requireReturns from './require-returns.ts';
import requireExample from './require-example.ts';
import paramTypeMatch from './param-type-match.ts';
import requireModule from './require-module.ts';

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
// jsdoc/require-jsdoc
// =============================================================================

describe('jsdoc/require-jsdoc', () => {
  it('reports exported function without JSDoc', async () => {
    const results: LintResult[] = await lint(requireJsdoc, 'export function foo(): void {}');
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('jsdoc/require-jsdoc');
    expect(results[0].message).toContain('foo');
    expect(results[0].fix).toBeDefined();
    expect(results[0].fix.text).toContain('/** Description. */');
  });

  it('passes exported function with JSDoc', async () => {
    const code: string = `
/** Does something. */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireJsdoc, code);
    expect(results.length).toBe(0);
  });

  it('reports exported type without JSDoc', async () => {
    const results: LintResult[] = await lint(requireJsdoc, 'export type Foo = { bar: string };');
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Foo');
  });

  it('reports exported arrow function without JSDoc', async () => {
    const results: LintResult[] = await lint(requireJsdoc, 'export const foo = (): void => {};');
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('foo');
  });

  it('does not report non-exported functions', async () => {
    const results: LintResult[] = await lint(requireJsdoc, 'function internal(): void {}');
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// jsdoc/require-param
// =============================================================================

describe('jsdoc/require-param', () => {
  it('reports missing @param for each parameter', async () => {
    const code: string = `
/** Does something. */
export function foo(name: string, age: number): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(2);
    expect(results[0].message).toContain('name');
    expect(results[1].message).toContain('age');
  });

  it('passes when all @param tags are present with {Type}', async () => {
    const code: string = `
/**
 * Does something.
 * @param {string} name - The name
 * @param {number} age - The age
 */
export function foo(name: string, age: number): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(0);
  });

  it('reports @param missing {Type}', async () => {
    const code: string = `
/**
 * Does something.
 * @param name - The name
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('missing {Type}');
  });

  it('reports stale @param that does not match any parameter', async () => {
    const code: string = `
/**
 * Does something.
 * @param oldName - Stale param
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(requireParam, code);
    const stale: LintResult[] = results.filter((r: LintResult) => r.message.includes('oldName'));
    expect(stale.length).toBe(1);
    expect(stale[0].severity).toBe('warning');
  });

  it('does not report when there is no JSDoc at all', async () => {
    const code: string = 'export function foo(x: string): void {}';
    const results: LintResult[] = await lint(requireParam, code);
    // No JSDoc → handled by require-jsdoc, not require-param
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// jsdoc/require-returns
// =============================================================================

describe('jsdoc/require-returns', () => {
  it('reports missing @returns for non-void return type', async () => {
    const code: string = `
/** Does something. */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('@returns');
  });

  it('passes when @returns {Type} is present and matches', async () => {
    const code: string = `
/**
 * Does something.
 * @returns {string} The result
 */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(0);
  });

  it('reports @returns without {Type}', async () => {
    const code: string = `
/**
 * Does something.
 * @returns The result
 */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('missing {Type}');
  });

  it('reports @returns {Type} that does not match actual return type', async () => {
    const code: string = `
/**
 * Does something.
 * @returns {number} The result
 */
export function foo(): string { return ''; }
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('number');
    expect(results[0].message).toContain('string');
  });

  it('does not require @returns for void functions', async () => {
    const code: string = `
/** Does something. */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(0);
  });

  it('does not require @returns for Promise<void>', async () => {
    const code: string = `
/** Does something. */
export async function foo(): Promise<void> {}
`;
    const results: LintResult[] = await lint(requireReturns, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// jsdoc/require-example
// =============================================================================

describe('jsdoc/require-example', () => {
  it('reports missing @example', async () => {
    const code: string = `
/** Does something. */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('jsdoc/require-example');
  });

  it('passes when @example with ```typescript``` fence is present', async () => {
    const code: string = `
/**
 * Does something.
 * @example
 * \`\`\`typescript
 * foo();
 * \`\`\`
 */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(0);
  });

  it('reports @example without ```typescript``` fence', async () => {
    const code: string = `
/**
 * Does something.
 * @example
 * foo();
 */
export function foo(): void {}
`;
    const results: LintResult[] = await lint(requireExample, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('typescript');
  });
});

// =============================================================================
// jsdoc/param-type-match
// =============================================================================

describe('jsdoc/param-type-match', () => {
  it('reports when @param type does not match actual type', async () => {
    const code: string = `
/**
 * Does something.
 * @param {number} name - The name
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(paramTypeMatch, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('number');
    expect(results[0].message).toContain('string');
  });

  it('passes when @param type matches actual type', async () => {
    const code: string = `
/**
 * Does something.
 * @param {string} name - The name
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(paramTypeMatch, code);
    expect(results.length).toBe(0);
  });

  it('skips @param without type annotation', async () => {
    const code: string = `
/**
 * Does something.
 * @param name - The name
 */
export function foo(name: string): void {}
`;
    const results: LintResult[] = await lint(paramTypeMatch, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// jsdoc/require-module
// =============================================================================

describe('jsdoc/require-module', () => {
  it('reports file without @module', async () => {
    const code: string = "const x: string = 'hello';";
    const results: LintResult[] = await lint(requireModule, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('jsdoc/require-module');
    expect(results[0].fix.text).toContain('@module');
  });

  it('passes file with @module', async () => {
    const code: string = `/**
 * My module.
 *
 * @module
 */

const x: string = 'hello';`;
    const results: LintResult[] = await lint(requireModule, code);
    expect(results.length).toBe(0);
  });
});
