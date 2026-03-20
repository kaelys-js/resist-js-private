/**
 * Tests for comments lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import noLintDisable from './no-lint-disable.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @returns {Promise<LintResult[]>} Array of lint results
 */
async function lint(rule: TypeScriptRule, code: string): Promise<LintResult[]> {
  return runTypeScriptRules('test.ts', code, [rule]);
}

// =============================================================================
// comments/no-lint-disable
// =============================================================================

describe('comments/no-lint-disable', () => {
  it('reports eslint-disable comment', async () => {
    const code: string = `// eslint-disable-next-line no-console\nconsole.log('hi');`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('eslint-disable');
  });

  it('reports oxlint-ignore comment', async () => {
    const code: string = `// oxlint-ignore no-unused-vars\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('oxlint-ignore');
  });

  it('reports @ts-ignore comment', async () => {
    const code: string = `// @ts-ignore\nconst x: string = 42;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('@ts-ignore');
  });

  it('reports @ts-nocheck comment', async () => {
    const code: string = `// @ts-nocheck\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('@ts-nocheck');
  });

  it('reports /* global */ comment', async () => {
    const code: string = `/* global window, document */\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('/* global */');
  });

  it('allows max-lines disable', async () => {
    const code: string = `// eslint-disable-next-line max-lines\nconst x = 1;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(0);
  });

  it('allows max-lines-per-function disable', async () => {
    const code: string = `// eslint-disable-next-line max-lines-per-function\nfunction big(): void {}`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(0);
  });

  it('passes clean code without disable comments', async () => {
    const code: string = `const x: number = 1;\nconst y: number = 2;`;
    const results: LintResult[] = await lint(noLintDisable, code);
    expect(results.length).toBe(0);
  });
});
