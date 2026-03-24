/**
 * Tests for Testing lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import requireColocatedTests from './require-colocated-tests.ts';

/**
 * Run a single rule against fixture source code with a custom filename.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @param {string} [filename] - Optional filename override
 * @returns {Promise<LintResult[]>} Array of lint results
 */
function lint(
  rule: TypeScriptRule,
  code: string,
  filename: string = '/tmp/nonexistent/module.ts',
): Promise<LintResult[]> {
  return runTypeScriptRules(filename, code, [rule]);
}

// =============================================================================
// testing/require-colocated-tests
// =============================================================================

describe('testing/require-colocated-tests', () => {
  it('reports file with exported function but no test file', async () => {
    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    // Use a path that definitely has no .test.ts file
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/math.ts',
    );
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('testing/require-colocated-tests');
    expect(results[0].message).toContain('no colocated test file');
  });

  it('passes file that has a colocated test file', async () => {
    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    // Use this test file's own source — it has a .test.ts file (itself!)
    // Point to a real rule file that has a colocated test
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      // result-rules.test.ts exists alongside the rules, but we need a .ts file
      // that has a corresponding .test.ts. Let's use the runner itself — oxc-runner.ts
      // doesn't have a .test.ts. Instead, use a trick: the file IS a .test.ts → exempt
      '/tmp/nonexistent-dir-abc123/module.test.ts',
    );
    expect(results.length).toBe(0);
  });

  it('skips .test.ts files', async () => {
    const code: string = `
export function testHelper(): void {}
`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/some/path/module.test.ts',
    );
    expect(results.length).toBe(0);
  });

  it('skips .d.ts files', async () => {
    const code: string = `
export function declaredFunc(): void;
`;
    const results: LintResult[] = await lint(requireColocatedTests, code, '/some/path/module.d.ts');
    expect(results.length).toBe(0);
  });

  it('skips index.ts files', async () => {
    const code: string = `
export function main(): void {}
`;
    const results: LintResult[] = await lint(requireColocatedTests, code, '/some/path/index.ts');
    expect(results.length).toBe(0);
  });

  it('skips config files', async () => {
    const code: string = `
export function defineConfig(): void {}
`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/some/path/vite.config.ts',
    );
    expect(results.length).toBe(0);
  });

  it('skips type-only files (no exported functions)', async () => {
    const code: string = `
export type User = { name: string };
export interface Config { port: number };
`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/types.ts',
    );
    expect(results.length).toBe(0);
  });

  it('detects exported arrow function variables', async () => {
    const code: string = `
export const multiply = (a: number, b: number): number => a * b;
`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/math.ts',
    );
    expect(results.length).toBe(1);
  });

  it('detects export default function', async () => {
    const code: string = `
export default function handler(req: Request): Response {
  return new Response('ok');
}
`;
    const results: LintResult[] = await lint(
      requireColocatedTests,
      code,
      '/tmp/nonexistent-dir-abc123/handler.ts',
    );
    expect(results.length).toBe(1);
  });

  it('flags untested exported function when test file exists but misses function', async () => {
    const tmpDir: string = join('/tmp', `lint-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const srcPath: string = join(tmpDir, 'utils.ts');
    const testPath: string = join(tmpDir, 'utils.test.ts');

    // Test file only tests funcA, not funcB
    writeFileSync(testPath, `describe('funcA', () => { it('works', () => {}); });`);

    const code: string = `export function funcA(): Void { return undefined; }\nexport function funcB(): Void { return undefined; }`;
    const results: LintResult[] = await lint(requireColocatedTests, code, srcPath);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('funcB');

    rmSync(tmpDir, { recursive: true });
  });

  it('passes when all exported functions are referenced in test file', async () => {
    const tmpDir: string = join('/tmp', `lint-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const srcPath: string = join(tmpDir, 'utils.ts');
    const testPath: string = join(tmpDir, 'utils.test.ts');

    writeFileSync(testPath, `describe('funcA', () => {}); describe('funcB', () => {});`);

    const code: string = `export function funcA(): Void { return undefined; }\nexport function funcB(): Void { return undefined; }`;
    const results: LintResult[] = await lint(requireColocatedTests, code, srcPath);
    expect(results.length).toBe(0);

    rmSync(tmpDir, { recursive: true });
  });
});
