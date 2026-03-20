/**
 * Tests for import lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import noRelativeImports from './no-relative-imports.ts';
import noBarrelFiles from './no-barrel-files.ts';
import noReexport from './no-reexport.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @param {string} filename - The filename to use
 * @returns {Promise<LintResult[]>} Array of lint results
 */
async function lint(
  rule: TypeScriptRule,
  code: string,
  filename: string = 'test.ts',
): Promise<LintResult[]> {
  return runTypeScriptRules(filename, code, [rule]);
}

// =============================================================================
// imports/no-relative-imports
// =============================================================================

describe('imports/no-relative-imports', () => {
  it('reports ./ relative imports', async () => {
    const code: string = "import { foo } from './foo.ts';";
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('imports/no-relative-imports');
    expect(results[0].message).toContain('./foo.ts');
    expect(results[0].fix).toBeDefined();
  });

  it('reports ../ relative imports', async () => {
    const code: string = "import { bar } from '../utils/bar.ts';";
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('../utils/bar.ts');
  });

  it('passes non-relative imports', async () => {
    const code: string = "import { safeParse } from '@/utils/result/safe';";
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(0);
  });

  it('passes package imports', async () => {
    const code: string = "import * as v from 'valibot';";
    const results: LintResult[] = await lint(noRelativeImports, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// imports/no-barrel-files
// =============================================================================

describe('imports/no-barrel-files', () => {
  it('reports index.ts with export * re-exports', async () => {
    const code: string = `export * from './foo.ts';\nexport * from './bar.ts';`;
    const results: LintResult[] = await lint(noBarrelFiles, code, 'index.ts');
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('imports/no-barrel-files');
    expect(results[0].message).toContain('Barrel file');
  });

  it('reports index.ts with named re-exports', async () => {
    const code: string = `export { foo } from './foo.ts';`;
    const results: LintResult[] = await lint(noBarrelFiles, code, 'index.ts');
    expect(results.length).toBe(1);
  });

  it('passes index.ts with original declarations only', async () => {
    const code: string = `export const FOO = 'bar';\nexport function baz(): void {}`;
    const results: LintResult[] = await lint(noBarrelFiles, code, 'index.ts');
    expect(results.length).toBe(0);
  });

  it('passes non-index.ts files with re-exports', async () => {
    const code: string = `export * from './foo.ts';`;
    const results: LintResult[] = await lint(noBarrelFiles, code, 'utils.ts');
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// imports/no-reexport
// =============================================================================

describe('imports/no-reexport', () => {
  it('reports export * from syntax', async () => {
    const code: string = `export * from './module.ts';`;
    const results: LintResult[] = await lint(noReexport, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('imports/no-reexport');
    expect(results[0].message).toContain('Re-export');
  });

  it('reports export { x } from syntax', async () => {
    const code: string = `export { foo, bar } from './module.ts';`;
    const results: LintResult[] = await lint(noReexport, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Re-export');
  });

  it('passes original export declarations', async () => {
    const code: string = `export const foo = 'bar';\nexport function baz(): void {}`;
    const results: LintResult[] = await lint(noReexport, code);
    expect(results.length).toBe(0);
  });

  it('passes regular export without source', async () => {
    const code: string = `const foo = 1;\nexport { foo };`;
    const results: LintResult[] = await lint(noReexport, code);
    expect(results.length).toBe(0);
  });
});
